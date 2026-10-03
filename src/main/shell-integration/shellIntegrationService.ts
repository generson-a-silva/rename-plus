import fs from "node:fs/promises";
import path from "node:path";
import { app, nativeImage } from "electron";
import {
	createTranslator,
	LOCALES,
	type Locale,
	type MessageKey,
	type MessageRef,
} from "../../shared/i18n";
import type { LaunchMode, ShellIntegrationInfo, ShellIntegrationUpdate } from "../../shared/ipc";
import { tMain } from "../mainLocale";
import { quotePosixArg, quoteWindowsArg } from "./commandQuoting";
import type { MenuContext, MenuLabel } from "./contextMenuEntries";
import type { IntegrationTarget } from "./integrationTarget";
import { linuxTargets } from "./linuxContextMenuTargets";
import { detectLinuxDesktop } from "./linuxDesktopEnvironment";
import { windowsTargets } from "./windowsExplorerRegistry";

/** Nome do ícone instalado no tema do usuário (usado pelas entradas do Linux). */
const ICON_NAME = "rename-plus";
const ICON_SIZE = 256;
const appIconFile = path.join(__dirname, "../../../resources/icon.png");

/** Código de idioma das traduções `Name[xx]` nos arquivos .desktop (inglês é o padrão). */
const DESKTOP_LOCALES: Record<Locale, string | null> = { "pt-BR": "pt_BR", en: null, es: "es" };

const LABEL_KEYS: Record<LaunchMode, MessageKey> = {
	open: "shellMenu.open",
	select: "shellMenu.select",
};

/**
 * Como as entradas abrem o app: o AppImage (não o executável dentro dele, que só
 * existe enquanto o app roda), o executável instalado ou, em desenvolvimento, o
 * Electron com a pasta do projeto.
 */
function launchCommand(): string[] {
	if (process.env.APPIMAGE) return [process.env.APPIMAGE];
	if (!app.isPackaged) return [process.execPath, app.getAppPath()];
	return [process.execPath];
}

function menuLabel(key: MessageKey): MenuLabel {
	const translations: Record<string, string> = {};
	for (const locale of LOCALES) {
		const code = DESKTOP_LOCALES[locale];
		if (code) translations[code] = createTranslator(locale)(key);
	}
	return { current: tMain(key), fallback: createTranslator("en")(key), translations };
}

function menuContext(): MenuContext {
	return {
		command: launchCommand(),
		icon: process.platform === "win32" ? `${process.execPath},0` : ICON_NAME,
		labels: { open: menuLabel(LABEL_KEYS.open), select: menuLabel(LABEL_KEYS.select) },
	};
}

interface LoadedTargets {
	targets: IntegrationTarget[];
	/** Linux: pasta de dados do usuário (onde fica o ícone). */
	dataHome: string | null;
}

async function loadTargets(): Promise<LoadedTargets> {
	const context = menuContext();
	if (process.platform === "win32") {
		return { targets: windowsTargets(context), dataHome: null };
	}
	if (process.platform === "linux") {
		const env = await detectLinuxDesktop();
		return { targets: linuxTargets(env, context), dataHome: env.dataHome };
	}
	return { targets: [], dataHome: null };
}

const iconFile = (dataHome: string) =>
	path.join(dataHome, "icons", "hicolor", `${ICON_SIZE}x${ICON_SIZE}`, "apps", `${ICON_NAME}.png`);

/** Instala o ícone no tema do usuário, para os menus o acharem pelo nome. */
async function installIcon(dataHome: string): Promise<void> {
	// Lido com o fs do Node, que também lê de dentro do .asar.
	const image = nativeImage.createFromBuffer(await fs.readFile(appIconFile));
	const file = iconFile(dataHome);
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(
		file,
		image.resize({ width: ICON_SIZE, height: ICON_SIZE, quality: "best" }).toPNG(),
	);
	// Avisa os temas de ícones de que a pasta mudou.
	const now = new Date();
	await fs.utimes(path.join(dataHome, "icons", "hicolor"), now, now).catch(() => undefined);
}

async function removeIconIfUnused(loaded: LoadedTargets): Promise<void> {
	if (!loaded.dataHome) return;
	const statuses = await Promise.all(loaded.targets.map((target) => target.status()));
	if (statuses.every((item) => item.status === "absent")) {
		await fs.rm(iconFile(loaded.dataHome), { force: true });
	}
}

function warnings(command: string): MessageRef[] {
	if (process.platform !== "linux" && process.platform !== "win32") {
		return [{ key: "integration.unsupported" }];
	}
	if (!app.isPackaged) return [{ key: "integration.warningDevelopment", params: { command } }];
	if (process.env.APPIMAGE) return [{ key: "integration.warningAppImage" }];
	return [];
}

export async function getShellIntegrationInfo(): Promise<ShellIntegrationInfo> {
	const loaded = await loadTargets();
	const statuses = await Promise.all(loaded.targets.map((target) => target.status()));
	const quote = process.platform === "win32" ? quoteWindowsArg : quotePosixArg;
	const command = launchCommand().map(quote).join(" ");
	return {
		command,
		warnings: warnings(command),
		targets: loaded.targets.map((target, index) => ({
			id: target.id,
			name: target.name,
			desktops: target.desktops,
			detected: target.detected,
			recommended: target.recommended,
			note: target.note,
			locations: target.locations,
			status: statuses[index]?.status ?? "absent",
			installedBySystem: statuses[index]?.installedBySystem ?? false,
		})),
	};
}

// Alterações em sequência: trocar o idioma várias vezes seguidas não sobrepõe gravações.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
	const run = queue.then(task, task);
	queue = run.catch(() => undefined);
	return run;
}

/** Adiciona ou remove as entradas do menu de contexto de um gerenciador de arquivos. */
export function setContextMenuIntegration(
	targetId: string,
	enabled: boolean,
): Promise<ShellIntegrationUpdate> {
	return serialized(async () => {
		let error: string | null = null;
		try {
			const loaded = await loadTargets();
			const target = loaded.targets.find((item) => item.id === targetId);
			if (!target) throw new Error(targetId);
			if (enabled) {
				if (loaded.dataHome) await installIcon(loaded.dataHome);
				await target.install();
			} else {
				await target.remove();
				await removeIconIfUnused(loaded);
			}
		} catch (cause) {
			error = tMain("integration.failed", { detail: (cause as Error).message });
		}
		return { info: await getShellIntegrationInfo(), error };
	});
}

/**
 * Regrava as entradas existentes que ficaram desatualizadas: o AppImage mudou de lugar
 * ou de versão, o executável mudou, ou o idioma da interface mudou. Só no app
 * empacotado, para uma execução de desenvolvimento não tomar o lugar das entradas.
 */
export function refreshContextMenuIntegrations(): Promise<void> {
	if (!app.isPackaged) return Promise.resolve();
	return serialized(async () => {
		const loaded = await loadTargets();
		for (const target of loaded.targets) {
			try {
				if ((await target.status()).status !== "outdated") continue;
				if (loaded.dataHome) await installIcon(loaded.dataHome);
				await target.install();
			} catch {
				// Sem permissão ou arquivo inválido: fica como está; Configurações mostra o estado.
			}
		}
	});
}
