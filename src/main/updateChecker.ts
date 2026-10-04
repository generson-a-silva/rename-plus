import { app, Notification, net, shell } from "electron";
import {
	IpcChannel,
	type ReleaseInfo,
	type UpdateCheckState,
	type UpdateSettings,
	type UpdateStatus,
} from "../shared/ipc";
import {
	compareVersions,
	GITHUB_REPOSITORY,
	normalizeVersion,
	parseVersion,
	RELEASES_PAGE_URL,
} from "../shared/updates";
import { tMain } from "./mainLocale";
import { broadcast, readSettingsFile, writeSettingsFile } from "./settingsFile";

const SETTINGS_FILE = "updates.json";
const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`;
/** Espera após abrir o app, para não disputar rede/CPU com a primeira listagem. */
const STARTUP_DELAY_MS = 8_000;
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const DEFAULT_SETTINGS: UpdateSettings = { autoCheck: true, skippedVersion: "" };

let settings = loadSettings();
let state: UpdateCheckState = { status: "idle" };
let running: Promise<UpdateStatus> | null = null;
/** Versão já anunciada por notificação nesta sessão (evita repetir a cada 12 horas). */
let notifiedVersion = "";
let intervalTimer: ReturnType<typeof setInterval> | undefined;

function loadSettings(): UpdateSettings {
	const stored = readSettingsFile(SETTINGS_FILE) as Partial<UpdateSettings> | null;
	return {
		autoCheck:
			typeof stored?.autoCheck === "boolean" ? stored.autoCheck : DEFAULT_SETTINGS.autoCheck,
		skippedVersion:
			typeof stored?.skippedVersion === "string"
				? stored.skippedVersion
				: DEFAULT_SETTINGS.skippedVersion,
	};
}

export function getUpdateStatus(): UpdateStatus {
	return { currentVersion: app.getVersion(), settings, state };
}

function setState(next: UpdateCheckState): void {
	state = next;
	broadcast(IpcChannel.UpdateStatus, getUpdateStatus());
}

/** Só abre páginas do próprio repositório, mesmo que a resposta venha alterada. */
function safeReleaseUrl(url: unknown): string {
	return typeof url === "string" && url.startsWith(`https://github.com/${GITHUB_REPOSITORY}/`)
		? url
		: RELEASES_PAGE_URL;
}

async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
	const response = await net.fetch(LATEST_RELEASE_URL, {
		headers: {
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": `${app.getName()}/${app.getVersion()}`,
		},
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	// Sem nenhuma release publicada (rascunhos não contam): não há o que anunciar.
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(
			response.status === 403 || response.status === 429
				? tMain("updates.rateLimited")
				: `HTTP ${response.status}`,
		);
	}
	const data = (await response.json()) as Record<string, unknown>;
	const tag = typeof data.tag_name === "string" ? data.tag_name : "";
	if (!parseVersion(tag)) throw new Error(tMain("updates.invalidResponse"));
	return {
		version: normalizeVersion(tag),
		name: typeof data.name === "string" ? data.name : "",
		url: safeReleaseUrl(data.html_url),
		publishedAt: typeof data.published_at === "string" ? data.published_at : "",
	};
}

function notifyAvailable(release: ReleaseInfo): void {
	if (!Notification.isSupported()) return;
	notifiedVersion = release.version;
	const notification = new Notification({
		title: tMain("updates.notificationTitle"),
		body: tMain("updates.notificationBody", {
			version: release.version,
			current: app.getVersion(),
		}),
	});
	notification.on("click", () => void shell.openExternal(release.url));
	notification.show();
}

/**
 * Consulta a última release no GitHub. Na verificação automática, uma versão
 * ignorada pelo usuário ou já anunciada nesta sessão não gera notificação.
 */
export function checkForUpdates(manual: boolean): Promise<UpdateStatus> {
	running ??= (async () => {
		setState({ status: "checking" });
		try {
			const release = await fetchLatestRelease();
			const checkedAt = Date.now();
			if (release && compareVersions(release.version, app.getVersion()) > 0) {
				setState({ status: "available", release, checkedAt });
				const announce =
					!manual &&
					release.version !== settings.skippedVersion &&
					release.version !== notifiedVersion;
				if (announce) notifyAvailable(release);
			} else {
				setState({ status: "upToDate", checkedAt });
			}
		} catch (error) {
			const detail =
				error instanceof Error && error.name === "TimeoutError"
					? tMain("updates.timeout")
					: (error as Error).message;
			setState({
				status: "error",
				error: tMain("updates.failed", { detail }),
				checkedAt: Date.now(),
			});
		} finally {
			running = null;
		}
		return getUpdateStatus();
	})();
	return running;
}

function scheduleChecks(): void {
	clearInterval(intervalTimer);
	intervalTimer = undefined;
	if (!settings.autoCheck) return;
	intervalTimer = setInterval(() => void checkForUpdates(false), CHECK_INTERVAL_MS);
}

export function setUpdateSettings(patch: unknown): UpdateStatus {
	const value = (patch ?? {}) as Partial<UpdateSettings>;
	const wasAuto = settings.autoCheck;
	settings = {
		autoCheck: typeof value.autoCheck === "boolean" ? value.autoCheck : settings.autoCheck,
		skippedVersion:
			typeof value.skippedVersion === "string" ? value.skippedVersion : settings.skippedVersion,
	};
	writeSettingsFile(SETTINGS_FILE, settings);
	if (wasAuto !== settings.autoCheck) {
		scheduleChecks();
		// Ligou agora: já verifica, em vez de esperar 12 horas.
		if (settings.autoCheck && state.status === "idle") void checkForUpdates(false);
	}
	const status = getUpdateStatus();
	broadcast(IpcChannel.UpdateStatus, status);
	return status;
}

/** Verificação automática: logo após abrir o app e, enquanto aberto, a cada 12 horas. */
export function startUpdateChecks(): void {
	scheduleChecks();
	setTimeout(() => {
		// Confere de novo: o usuário pode ter desligado nesse meio-tempo.
		if (settings.autoCheck && state.status === "idle") void checkForUpdates(false);
	}, STARTUP_DELAY_MS);
}
