import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { app, Menu, Notification, nativeImage, Tray } from "electron";
import type { MessageRef } from "../shared/i18n";
import type { BackgroundInfo } from "../shared/ipc";
import { appLaunchCommand } from "./appLaunchCommand";
import {
	AUTOSTART_FILE,
	autostartDesktopEntry,
	BACKGROUND_FLAG,
	WINDOWS_RUN_VALUE,
} from "./backgroundLaunch";
import { tMain } from "./mainLocale";
import { readSettingsFile, writeSettingsFile } from "./settingsFile";
import { activeWatchCount, onWatchingChanged } from "./watchFolderService";

const PREFERENCE_FILE = "background.json";
const RUN_KEY = "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const trayIconFile = path.join(__dirname, "../../resources/icon.png");

const supported = process.platform === "linux" || process.platform === "win32";

/** Preferência efetiva (lida em `initBackground`); usada ao fechar a janela, que é síncrono. */
let enabled = false;
/** Windows: o instalador criou a entrada de início para todos os usuários (HKLM). */
let enabledByInstaller = false;
let tray: Tray | null = null;
let announcedResident = false;

interface WindowControls {
	open: () => void;
	hasWindow: () => boolean;
}
let windows: WindowControls = { open: () => {}, hasWindow: () => false };

function autostartPath(): string {
	const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
	return path.join(configHome, "autostart", AUTOSTART_FILE);
}

function storedPreference(): boolean | null {
	const stored = readSettingsFile(PREFERENCE_FILE) as { enabled?: unknown } | null;
	return typeof stored?.enabled === "boolean" ? stored.enabled : null;
}

function regQuery(args: string[]): Promise<boolean> {
	return new Promise((resolve) => {
		execFile("reg.exe", args, { windowsHide: true, timeout: 15_000 }, (error) => resolve(!error));
	});
}

/** O instalador grava em HKLM; um instalador 32 bits cairia na visão WOW6432Node. */
async function installerEntryExists(): Promise<boolean> {
	if (process.platform !== "win32") return false;
	for (const view of ["/reg:64", "/reg:32"]) {
		if (await regQuery(["query", RUN_KEY, "/v", WINDOWS_RUN_VALUE, view])) return true;
	}
	return false;
}

/** Cria ou remove a entrada que inicia o app com a sessão do usuário. */
async function applyStartupEntry(on: boolean): Promise<void> {
	const command = appLaunchCommand();
	if (process.platform === "linux") {
		const file = autostartPath();
		if (on) {
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(
				file,
				autostartDesktopEntry(command, tMain("background.autostartComment")),
			);
		} else {
			await fs.rm(file, { force: true });
		}
	} else if (process.platform === "win32") {
		const [executable = process.execPath, ...prefix] = command;
		// Com a entrada do instalador (todos os usuários), não cria outra: abriria duas vezes.
		app.setLoginItemSettings({
			openAtLogin: on && !enabledByInstaller,
			path: executable,
			args: [...prefix, BACKGROUND_FLAG],
			name: WINDOWS_RUN_VALUE,
		});
	}
}

/** Continuar rodando sem janela: modo ativado e alguma pasta sendo monitorada. */
export function shouldStayResident(): boolean {
	return enabled && activeWatchCount() > 0;
}

function trayMenu(count: number): Menu {
	return Menu.buildFromTemplate([
		{ label: tMain("background.trayOpen"), click: () => windows.open() },
		{ label: tMain("background.trayWatching", { count }), enabled: false },
		{ type: "separator" },
		{ label: tMain("background.trayQuit"), click: () => app.quit() },
	]);
}

/** Ícone na bandeja enquanto o app pode ficar sem janela: mostra que está ativo e permite sair. */
function updateTray(): void {
	if (!shouldStayResident()) {
		tray?.destroy();
		tray = null;
		return;
	}
	const count = activeWatchCount();
	if (!tray) {
		const size = process.platform === "win32" ? 16 : 24;
		tray = new Tray(nativeImage.createFromPath(trayIconFile).resize({ width: size, height: size }));
		// Windows: clique no ícone abre a janela (no Linux, quem decide é a bandeja do ambiente).
		tray.on("click", () => windows.open());
	}
	tray.setToolTip(`Rename Plus · ${tMain("background.trayWatching", { count })}`);
	tray.setContextMenu(trayMenu(count));
}

/**
 * Lê a preferência e prepara o ícone da bandeja. No app empacotado, regrava a entrada
 * de início com o sistema (o AppImage pode ter mudado de lugar ou de versão).
 */
export async function initBackground(controls: WindowControls): Promise<void> {
	windows = controls;
	if (!supported) return;
	enabledByInstaller = await installerEntryExists();
	enabled = storedPreference() ?? enabledByInstaller;
	if (enabled && app.isPackaged) {
		try {
			await applyStartupEntry(true);
		} catch {
			// Sem permissão: Configurações mostra o erro quando o usuário mexer na opção.
		}
	}
	onWatchingChanged(updateTray);
	updateTray();
}

function warnings(): MessageRef[] {
	if (!app.isPackaged) {
		return [
			{
				key: "background.warningDevelopment",
				params: { command: [...appLaunchCommand(), BACKGROUND_FLAG].join(" ") },
			},
		];
	}
	if (process.env.APPIMAGE) return [{ key: "background.warningAppImage" }];
	return [];
}

function location(): string | null {
	if (process.platform === "linux") return autostartPath();
	if (process.platform === "win32") {
		return enabledByInstaller
			? `${RUN_KEY}\\${WINDOWS_RUN_VALUE}`
			: `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\${WINDOWS_RUN_VALUE}`;
	}
	return null;
}

export function getBackgroundInfo(error: string | null = null): BackgroundInfo {
	return {
		supported,
		enabled,
		enabledByInstaller,
		location: location(),
		warnings: supported ? warnings() : [],
		error,
	};
}

export async function setBackground(value: unknown): Promise<BackgroundInfo> {
	if (!supported || typeof value !== "boolean") return getBackgroundInfo();
	let error: string | null = null;
	try {
		await applyStartupEntry(value);
	} catch (cause) {
		error = tMain("background.failed", { detail: (cause as Error).message });
	}
	// Mesmo com falha na entrada, a escolha vale para esta sessão (fechar a janela).
	enabled = value;
	writeSettingsFile(PREFERENCE_FILE, { enabled: value });
	updateTray();
	return getBackgroundInfo(error);
}

/** Na primeira vez que a janela fecha e o app continua rodando, avisa onde ele está. */
export function announceResident(): void {
	if (announcedResident || !Notification.isSupported()) return;
	announcedResident = true;
	new Notification({
		title: "Rename Plus",
		body: tMain("background.residentNotice", { count: activeWatchCount() }),
	}).show();
}
