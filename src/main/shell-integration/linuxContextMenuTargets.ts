import fs from "node:fs/promises";
import path from "node:path";
import type { MessageKey } from "../../shared/i18n";
import type { ContextMenuStatus, LaunchMode } from "../../shared/ipc";
import {
	dolphinServiceMenu,
	EMPTY_THUNAR_ACTIONS,
	expectedThunarSummary,
	fileManagerAction,
	fileManagerScript,
	LAUNCH_MODES,
	type MenuContext,
	mergeThunarActions,
	nemoAction,
	scriptMode,
	thunarActionSummary,
} from "./contextMenuEntries";
import type { IntegrationTarget } from "./integrationTarget";
import { isProgramInstalled, type LinuxDesktopEnvironment } from "./linuxDesktopEnvironment";

interface ManagedFile {
	path: string;
	content: string;
	executable: boolean;
}

interface TargetDefinition {
	id: string;
	name: string;
	desktops: string;
	/** Executáveis que indicam que o gerenciador está instalado. */
	programs: string[];
	/** Arquivos .desktop do gerenciador (para reconhecer o padrão do sistema). */
	desktopFiles: string[];
	/** Valores de XDG_CURRENT_DESKTOP em que ele é o gerenciador padrão. */
	desktopKeys: string[];
	note: MessageKey | null;
}

const DEFINITIONS = {
	dolphin: {
		id: "dolphin",
		name: "Dolphin",
		desktops: "KDE Plasma",
		programs: ["dolphin"],
		desktopFiles: ["org.kde.dolphin.desktop"],
		desktopKeys: ["kde"],
		note: null,
	},
	nautilus: {
		id: "nautilus",
		name: "Nautilus",
		desktops: "GNOME, Unity",
		programs: ["nautilus"],
		desktopFiles: ["org.gnome.nautilus.desktop", "nautilus.desktop"],
		desktopKeys: ["gnome", "unity"],
		note: "integration.noteScripts",
	},
	nemo: {
		id: "nemo",
		name: "Nemo",
		desktops: "Cinnamon",
		programs: ["nemo"],
		desktopFiles: ["nemo.desktop"],
		desktopKeys: ["x-cinnamon", "cinnamon"],
		note: null,
	},
	thunar: {
		id: "thunar",
		name: "Thunar",
		desktops: "Xfce",
		programs: ["thunar"],
		desktopFiles: ["thunar.desktop", "thunar-folder-handler.desktop"],
		desktopKeys: ["xfce"],
		note: "integration.noteThunar",
	},
	caja: {
		id: "caja",
		name: "Caja",
		desktops: "MATE",
		programs: ["caja"],
		desktopFiles: ["caja.desktop", "caja-folder-handler.desktop"],
		desktopKeys: ["mate"],
		note: "integration.noteScripts",
	},
	pcmanfm: {
		id: "pcmanfm",
		name: "PCManFM-Qt / PCManFM",
		desktops: "LXQt, LXDE",
		programs: ["pcmanfm-qt", "pcmanfm"],
		desktopFiles: ["pcmanfm-qt.desktop", "pcmanfm.desktop"],
		desktopKeys: ["lxqt", "lxde"],
		note: null,
	},
} as const satisfies Record<string, TargetDefinition>;

async function readText(file: string): Promise<string | null> {
	try {
		return await fs.readFile(file, "utf8");
	} catch {
		return null;
	}
}

async function isExecutable(file: string): Promise<boolean> {
	try {
		return ((await fs.stat(file)).mode & 0o111) !== 0;
	} catch {
		return false;
	}
}

async function existing(paths: string[]): Promise<string[]> {
	const found = await Promise.all(
		paths.map(async (item) => ((await readText(item)) === null ? null : item)),
	);
	return found.filter((item) => item !== null);
}

/** Arquivos de script criados pelo app numa pasta (os nomes mudam com o idioma). */
async function ownScripts(dir: string): Promise<string[]> {
	let names: string[];
	try {
		names = await fs.readdir(dir);
	} catch {
		return [];
	}
	const found = await Promise.all(
		names.map(async (name) => {
			const file = path.join(dir, name);
			const content = await readText(file);
			return content !== null && scriptMode(content) ? file : null;
		}),
	);
	return found.filter((item) => item !== null);
}

/** Destino baseado em arquivos próprios: criar, atualizar e remover é só gravar/apagar. */
function fileTarget(
	base: Omit<IntegrationTarget, "status" | "install" | "remove" | "locations">,
	expected: ManagedFile[],
	owned: () => Promise<string[]>,
	locations: string[],
): IntegrationTarget {
	return {
		...base,
		locations,
		status: async () => {
			const current = await owned();
			if (current.length === 0) return { status: "absent", installedBySystem: false };
			const matches = await Promise.all(
				expected.map(
					async (file) =>
						(await readText(file.path)) === file.content &&
						(!file.executable || (await isExecutable(file.path))),
				),
			);
			const extra = current.some((item) => !expected.some((file) => file.path === item));
			const status: ContextMenuStatus = matches.every(Boolean) && !extra ? "installed" : "outdated";
			return { status, installedBySystem: false };
		},
		install: async () => {
			for (const stale of await owned()) {
				if (!expected.some((file) => file.path === stale)) await fs.rm(stale, { force: true });
			}
			for (const file of expected) {
				await fs.mkdir(path.dirname(file.path), { recursive: true });
				await fs.writeFile(file.path, file.content, "utf8");
				await fs.chmod(file.path, file.executable ? 0o755 : 0o644);
			}
		},
		remove: async () => {
			for (const file of await owned()) await fs.rm(file, { force: true });
		},
	};
}

/** Nome de arquivo seguro a partir do texto do menu (scripts aparecem com o nome do arquivo). */
function scriptFileName(label: string): string {
	return label.replace(/[/\0]/g, "-");
}

function scriptsTarget(
	base: Omit<IntegrationTarget, "status" | "install" | "remove" | "locations">,
	dir: string,
	context: MenuContext,
	uriVariable: string,
): IntegrationTarget {
	const files = LAUNCH_MODES.map((mode) => ({
		path: path.join(dir, scriptFileName(context.labels[mode].current)),
		content: fileManagerScript(context, mode, uriVariable),
		executable: true,
	}));
	return fileTarget(
		base,
		files,
		() => ownScripts(dir),
		files.map((file) => file.path),
	);
}

function fixedFilesTarget(
	base: Omit<IntegrationTarget, "status" | "install" | "remove" | "locations">,
	files: ManagedFile[],
): IntegrationTarget {
	const paths = files.map((file) => file.path);
	return fileTarget(base, files, () => existing(paths), paths);
}

function perMode(
	dir: string,
	fileName: (mode: LaunchMode) => string,
	content: (mode: LaunchMode) => string,
	executable = false,
): ManagedFile[] {
	return LAUNCH_MODES.map((mode) => ({
		path: path.join(dir, fileName(mode)),
		content: content(mode),
		executable,
	}));
}

/** Thunar guarda todas as ações personalizadas num só arquivo (uca.xml). */
function thunarTarget(
	base: Omit<IntegrationTarget, "status" | "install" | "remove" | "locations">,
	env: LinuxDesktopEnvironment,
	context: MenuContext,
): IntegrationTarget {
	const file = path.join(env.configHome, "Thunar", "uca.xml");
	/** Sem uca.xml do usuário, o Thunar usa o do sistema: parte dele para não sumir com as ações padrão. */
	const readBase = async () => {
		const own = await readText(file);
		if (own !== null) return own;
		for (const dir of env.configDirs) {
			const system = await readText(path.join(dir, "Thunar", "uca.xml"));
			if (system?.includes("</actions>")) return system;
		}
		return EMPTY_THUNAR_ACTIONS;
	};
	return {
		...base,
		locations: [file],
		status: async () => {
			const own = await readText(file);
			const current = own ? thunarActionSummary(own) : [];
			if (current.length === 0) return { status: "absent", installedBySystem: false };
			const expected = expectedThunarSummary(context);
			const same = current.join("\n") === expected.join("\n");
			return { status: same ? "installed" : "outdated", installedBySystem: false };
		},
		install: async () => {
			const merged = mergeThunarActions(await readBase(), context);
			await fs.mkdir(path.dirname(file), { recursive: true });
			await fs.writeFile(file, merged, "utf8");
		},
		remove: async () => {
			const own = await readText(file);
			if (own === null) return;
			await fs.writeFile(file, mergeThunarActions(own, null), "utf8");
		},
	};
}

/** Gerenciadores de arquivos do Linux, com os instalados (e o padrão) primeiro. */
export function linuxTargets(
	env: LinuxDesktopEnvironment,
	context: MenuContext,
): IntegrationTarget[] {
	const defaultIsKnown = Object.values(DEFINITIONS).some((definition) =>
		(definition.desktopFiles as readonly string[]).includes(env.defaultFileManager ?? ""),
	);
	const base = (definition: TargetDefinition) => ({
		id: definition.id,
		name: definition.name,
		desktops: definition.desktops,
		detected: definition.programs.some(isProgramInstalled),
		// O padrão do sistema (xdg-mime); sem ele, o do ambiente gráfico atual.
		recommended: defaultIsKnown
			? definition.desktopFiles.includes(env.defaultFileManager ?? "")
			: definition.desktopKeys.some((key) => env.desktops.includes(key)),
		note: definition.note ? { key: definition.note } : null,
	});
	const name = (mode: LaunchMode) => `rename-plus-${mode}`;

	const targets = [
		fixedFilesTarget(
			base(DEFINITIONS.dolphin),
			perMode(
				path.join(env.dataHome, "kio", "servicemenus"),
				(mode) => `${name(mode)}.desktop`,
				(mode) => dolphinServiceMenu(context, mode),
				// O Plasma 6 só carrega service menus executáveis.
				true,
			),
		),
		scriptsTarget(
			base(DEFINITIONS.nautilus),
			path.join(env.dataHome, "nautilus", "scripts"),
			context,
			"NAUTILUS_SCRIPT_CURRENT_URI",
		),
		fixedFilesTarget(
			base(DEFINITIONS.nemo),
			perMode(
				path.join(env.dataHome, "nemo", "actions"),
				(mode) => `${name(mode)}.nemo_action`,
				(mode) => nemoAction(context, mode),
			),
		),
		thunarTarget(base(DEFINITIONS.thunar), env, context),
		scriptsTarget(
			base(DEFINITIONS.caja),
			path.join(env.configHome, "caja", "scripts"),
			context,
			"CAJA_SCRIPT_CURRENT_URI",
		),
		fixedFilesTarget(
			base(DEFINITIONS.pcmanfm),
			perMode(
				path.join(env.dataHome, "file-manager", "actions"),
				(mode) => `${name(mode)}.desktop`,
				(mode) => fileManagerAction(context, mode),
			),
		),
	];
	const rank = (target: IntegrationTarget) => (target.recommended ? 0 : target.detected ? 1 : 2);
	return targets.sort((a, b) => rank(a) - rank(b));
}
