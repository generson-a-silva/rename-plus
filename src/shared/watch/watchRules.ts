import type { MessageRef } from "../i18n";
import type { FileEntry } from "../ipc";
import { getPlatformPaths } from "../paths";
import {
	createDefaultOptions,
	createMaskFilter,
	createRenamer,
	RenameConfigError,
	type RenameOptions,
	validateFileName,
} from "../rename";
import { mergeDefaults } from "../settings";

/**
 * Regra de pasta monitorada: cada arquivo que chega em `folder` e combina com `mask`
 * é renomeado com `rename` (o mesmo motor da tela principal) e, se houver
 * `destination`, movido para lá.
 */
export interface WatchRule {
	id: string;
	enabled: boolean;
	/** Nome dado pelo usuário ("" usa o nome da pasta). */
	name: string;
	/** Pasta observada (só o primeiro nível, sem subpastas). */
	folder: string;
	/** Máscara de nomes, como no filtro da tela principal ("*.pdf; *.jpg"); "" aceita todos. */
	mask: string;
	rename: RenameOptions;
	/** Pasta para onde os arquivos vão depois de renomeados ("" = ficam onde chegaram). */
	destination: string;
	/** Mostra uma notificação do sistema a cada arquivo processado. */
	notify: boolean;
}

/** Motivo para uma regra não monitorar nada (exibido nas configurações). */
export type WatchRuleProblem = "noFolder" | "noAction";

export function createWatchRule(id: string): WatchRule {
	return {
		id,
		enabled: true,
		name: "",
		folder: "",
		mask: "",
		rename: createDefaultOptions(),
		destination: "",
		notify: false,
	};
}

/** A regra altera o nome dos arquivos (alguma seção difere do padrão). */
export function ruleChangesName(rule: WatchRule): boolean {
	return JSON.stringify(rule.rename) !== JSON.stringify(createDefaultOptions());
}

/** Por que a regra não faria nada, ou `null` se está pronta para monitorar. */
export function watchRuleProblem(rule: WatchRule): WatchRuleProblem | null {
	if (!rule.folder.trim()) return "noFolder";
	if (!ruleChangesName(rule) && !rule.destination.trim()) return "noAction";
	return null;
}

/**
 * Confere regras vindas do disco ou da interface: descarta o que não for objeto,
 * completa campos ausentes com os padrões e remove ids repetidos.
 */
export function sanitizeWatchRules(value: unknown): WatchRule[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const rules: WatchRule[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const id = (item as { id?: unknown }).id;
		if (typeof id !== "string" || !id || seen.has(id)) continue;
		seen.add(id);
		rules.push(mergeDefaults(createWatchRule(id), item));
	}
	return rules;
}

/**
 * Downloads em andamento: os navegadores e clientes de download escrevem num arquivo
 * temporário e só o renomeiam para o nome final no fim.
 */
const INCOMPLETE_EXTENSIONS = new Set([
	"crdownload", // Chrome, Edge, Brave
	"part", // Firefox, wget
	"partial", // Edge antigo
	"download", // Safari
	"opdownload", // Opera
	"!qb", // qBittorrent
	"!ut", // µTorrent
	"tmp",
	"temp",
]);

export function isIncompleteDownload(name: string): boolean {
	const dot = name.lastIndexOf(".");
	return dot > 0 && INCOMPLETE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

export type WatchPlan =
	| { kind: "skip" }
	| { kind: "error"; error: MessageRef }
	/** Novo nome e pasta final (pode ser a mesma pasta). */
	| { kind: "move"; name: string; dir: string };

/**
 * Decide o que fazer com um arquivo que chegou na pasta da regra. `index` é a
 * posição do arquivo entre os processados pela regra (usada pela numeração).
 */
export function planWatchedFile(
	rule: WatchRule,
	entry: FileEntry,
	index: number,
	now: Date,
	platform: string,
): WatchPlan {
	if (entry.isDir || entry.name.startsWith(".") || isIncompleteDownload(entry.name)) {
		return { kind: "skip" };
	}
	if (!createMaskFilter(rule.mask)(entry.name)) return { kind: "skip" };

	let name: string;
	try {
		name = createRenamer(rule.rename, platform)(entry, { index, folderIndex: index, now });
	} catch (error) {
		if (error instanceof RenameConfigError) return { kind: "error", error: error.ref };
		throw error;
	}
	const invalid = validateFileName(name, platform);
	if (invalid) return { kind: "error", error: invalid };

	const paths = getPlatformPaths(platform);
	const destination = rule.destination.trim();
	const dir = destination && !paths.equals(destination, entry.dir) ? destination : entry.dir;
	if (dir === entry.dir && name === entry.name) return { kind: "skip" };
	return { kind: "move", name, dir };
}
