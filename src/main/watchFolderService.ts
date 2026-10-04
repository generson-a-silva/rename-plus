import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Notification, shell } from "electron";
import {
	type FileEntry,
	IpcChannel,
	type WatchActivity,
	type WatchFoldersInfo,
	type WatchRuleStatus,
} from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import {
	planWatchedFile,
	sanitizeWatchRules,
	type WatchRule,
	watchRuleProblem,
} from "../shared/watch";
import { describeFileSystemError } from "./fileSystemErrors";
import { findAvailablePath, move } from "./fileTransferService";
import { tMain, tMainRef } from "./mainLocale";
import { broadcast, readSettingsFile, writeSettingsFile } from "./settingsFile";

const SETTINGS_FILE = "watch-folders.json";
/**
 * Intervalo entre as conferências de um arquivo que chegou. Ele só é processado quando
 * tamanho e data de modificação não mudam entre duas conferências (cópia/download terminou).
 */
const SETTLE_MS = 1_500;
/** Desiste de um arquivo que continua mudando depois de tanto tempo (≈ 2 horas). */
const MAX_SETTLE_CHECKS = 4_800;
/** Novas tentativas quando o arquivo ainda está em uso (comum no Windows logo após o download). */
const MOVE_RETRIES = 5;
const RETRY_DELAY_MS = 1_000;
/** Por quanto tempo os eventos dos arquivos gerados pelas próprias regras são ignorados. */
const PRODUCED_TTL_MS = 15_000;
const MAX_ACTIVITY = 100;

const platformPaths = getPlatformPaths(process.platform);

let rules: WatchRule[] = [];
const watchers = new Map<string, fs.FSWatcher>();
const statuses: Record<string, WatchRuleStatus> = {};
/** Arquivos já processados por regra nesta sessão (posição usada pela numeração). */
const counters = new Map<string, number>();
let activity: WatchActivity[] = [];
let nextActivityId = 1;

interface PendingFile {
	timer: ReturnType<typeof setTimeout>;
	size: number;
	mtimeMs: number;
	checks: number;
}

/** Arquivos esperando terminar de ser escritos, por chave de caminho. */
const pending = new Map<string, PendingFile>();
/** Caminhos criados pelas regras: renomear gera um evento do próprio arquivo novo. */
const produced = new Map<string, number>();

export function getWatchFoldersInfo(): WatchFoldersInfo {
	return { rules, statuses: { ...statuses }, activity };
}

/** Quantas regras estão de fato monitorando uma pasta agora. */
export function activeWatchCount(): number {
	return watchers.size;
}

const watchingListeners = new Set<(count: number) => void>();

/** Avisa quando a quantidade de pastas monitoradas muda (ex.: o modo em segundo plano). */
export function onWatchingChanged(listener: (count: number) => void): () => void {
	watchingListeners.add(listener);
	return () => watchingListeners.delete(listener);
}

function notifyChanged(): void {
	broadcast(IpcChannel.WatchFoldersChanged, getWatchFoldersInfo());
	for (const listener of watchingListeners) listener(watchers.size);
}

const ruleLabel = (rule: WatchRule) =>
	rule.name.trim() || path.basename(rule.folder) || rule.folder;

function isProduced(file: string): boolean {
	const key = platformPaths.key(file);
	const expiry = produced.get(key);
	if (expiry === undefined) return false;
	if (expiry > Date.now()) return true;
	produced.delete(key);
	return false;
}

function markProduced(file: string): void {
	const now = Date.now();
	for (const [key, expiry] of produced) if (expiry <= now) produced.delete(key);
	produced.set(platformPaths.key(file), now + PRODUCED_TTL_MS);
}

function record(rule: WatchRule, from: string, to: string | null, error: string | null): void {
	activity = [
		{
			id: nextActivityId++,
			time: Date.now(),
			ruleId: rule.id,
			ruleName: ruleLabel(rule),
			from,
			to,
			error,
		},
		...activity,
	].slice(0, MAX_ACTIVITY);
	notifyChanged();

	if (!rule.notify || !Notification.isSupported()) return;
	const notification = new Notification({
		title: tMain("watch.notificationTitle", { rule: ruleLabel(rule) }),
		body: to
			? tMain("watch.notificationMoved", { from: path.basename(from), to: path.basename(to) })
			: tMain("watch.notificationFailed", { name: path.basename(from), error: error ?? "" }),
	});
	if (to) notification.on("click", () => shell.showItemInFolder(to));
	notification.show();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function moveWithRetry(from: string, to: string): Promise<void> {
	for (let attempt = 1; ; attempt++) {
		try {
			await move(from, to);
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			const locked = code === "EBUSY" || code === "EPERM" || code === "EACCES";
			if (!locked || attempt >= MOVE_RETRIES) throw error;
			await delay(RETRY_DELAY_MS);
		}
	}
}

/** Regras ativas que observam a pasta `dir`, na ordem da lista. */
function rulesFor(dir: string): WatchRule[] {
	return rules.filter((rule) => watchers.has(rule.id) && platformPaths.equals(rule.folder, dir));
}

/** Aplica a primeira regra da pasta que se interessar pelo arquivo. */
async function processFile(file: string, stats: fs.Stats): Promise<void> {
	const dir = path.dirname(file);
	const name = path.basename(file);
	const entry: FileEntry = {
		path: file,
		dir,
		name,
		isDir: false,
		hidden: name.startsWith("."),
		size: stats.size,
		mtimeMs: stats.mtimeMs,
		birthtimeMs: stats.birthtimeMs,
	};
	for (const rule of rulesFor(dir)) {
		const index = counters.get(rule.id) ?? 0;
		const plan = planWatchedFile(rule, entry, index, new Date(), process.platform);
		if (plan.kind === "skip") continue;
		if (plan.kind === "error") {
			record(rule, file, null, tMainRef(plan.error));
			return;
		}
		try {
			await fsp.mkdir(plan.dir, { recursive: true });
			const direct = path.join(plan.dir, plan.name);
			// Só maiúsculas/minúsculas mudaram num disco que não as diferencia: é o mesmo arquivo.
			const target = platformPaths.equals(direct, file)
				? direct
				: await findAvailablePath(plan.dir, plan.name, false);
			markProduced(target);
			await moveWithRetry(file, target);
			counters.set(rule.id, index + 1);
			record(rule, file, target, null);
		} catch (error) {
			record(rule, file, null, describeFileSystemError(error));
		}
		return;
	}
}

/** Confere o arquivo até ele parar de mudar; então o processa. */
async function settle(file: string): Promise<void> {
	const key = platformPaths.key(file);
	const current = pending.get(key);
	if (!current) return;
	let stats: fs.Stats;
	try {
		stats = await fsp.lstat(file);
	} catch {
		// Sumiu (arquivo temporário, renomeado ou movido por outro programa).
		pending.delete(key);
		return;
	}
	if (!stats.isFile()) {
		pending.delete(key);
		return;
	}
	const stable = stats.size === current.size && stats.mtimeMs === current.mtimeMs;
	if (!stable && current.checks < MAX_SETTLE_CHECKS) {
		pending.set(key, {
			size: stats.size,
			mtimeMs: stats.mtimeMs,
			checks: current.checks + 1,
			timer: setTimeout(() => void settle(file), SETTLE_MS),
		});
		return;
	}
	pending.delete(key);
	if (stable) await processFile(file, stats);
}

function onFolderEvent(folder: string, filename: string | Buffer | null): void {
	if (!filename) return;
	const file = path.join(folder, filename.toString());
	if (isProduced(file)) return;
	const key = platformPaths.key(file);
	const existing = pending.get(key);
	if (existing) clearTimeout(existing.timer);
	// Tamanho -1: a primeira conferência nunca é "estável"; precisa de duas iguais.
	pending.set(key, {
		size: -1,
		mtimeMs: -1,
		checks: existing?.checks ?? 0,
		timer: setTimeout(() => void settle(file), SETTLE_MS),
	});
}

function stopAll(): void {
	for (const watcher of watchers.values()) watcher.close();
	watchers.clear();
	for (const item of pending.values()) clearTimeout(item.timer);
	pending.clear();
	for (const key of Object.keys(statuses)) delete statuses[key];
}

function startRule(rule: WatchRule): WatchRuleStatus {
	if (!rule.enabled) return { state: "disabled" };
	const problem = watchRuleProblem(rule);
	if (problem) return { state: "incomplete", problem };

	const { folder } = rule;
	try {
		if (!fs.statSync(folder).isDirectory())
			return { state: "error", error: tMain("watch.notAFolder") };
	} catch (error) {
		return { state: "error", error: describeFileSystemError(error) };
	}
	try {
		const watcher = fs.watch(folder, { persistent: true }, (_event, filename) =>
			onFolderEvent(folder, filename),
		);
		watcher.on("error", (error) => {
			// Ex.: a pasta foi apagada ou o disco foi desconectado.
			watcher.close();
			watchers.delete(rule.id);
			statuses[rule.id] = { state: "error", error: describeFileSystemError(error) };
			notifyChanged();
		});
		watchers.set(rule.id, watcher);
		return { state: "watching" };
	} catch (error) {
		return { state: "error", error: describeFileSystemError(error) };
	}
}

function applyRules(): void {
	stopAll();
	for (const rule of rules) statuses[rule.id] = startRule(rule);
	for (const id of counters.keys()) if (!rules.some((rule) => rule.id === id)) counters.delete(id);
}

function loadRules(value: unknown): WatchRule[] {
	return sanitizeWatchRules(value).map((rule) => ({
		...rule,
		folder: rule.folder.trim(),
		destination: rule.destination.trim(),
	}));
}

/** Carrega as regras salvas e começa a monitorar. Sem regras (o padrão), não faz nada. */
export function startWatchFolders(): void {
	rules = loadRules(readSettingsFile(SETTINGS_FILE));
	applyRules();
	notifyChanged();
}

export function setWatchRules(value: unknown): WatchFoldersInfo {
	rules = loadRules(value);
	writeSettingsFile(SETTINGS_FILE, rules);
	applyRules();
	notifyChanged();
	return getWatchFoldersInfo();
}

export function clearWatchActivity(): WatchFoldersInfo {
	activity = [];
	notifyChanged();
	return getWatchFoldersInfo();
}

export function stopWatchFolders(): void {
	stopAll();
}
