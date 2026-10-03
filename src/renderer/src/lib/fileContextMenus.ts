import type { Translator } from "@shared/i18n";
import type { ContextMenuItem } from "@shared/ipc";

/** Comandos disparados pelos menus de contexto e pelos atalhos de teclado. */
export type FileCommand =
	| "open"
	| "showInFolder"
	| "rename"
	| "cut"
	| "copy"
	| "paste"
	| "copyPath"
	| "trash"
	| "newFolder"
	| "selectAll"
	| "refresh"
	| "toggleHidden";

/** Atalhos exibidos nos menus (o tratamento das teclas fica em `matchFileShortcut`). */
const ACCELERATORS: Partial<Record<FileCommand, string>> = {
	rename: "F2",
	cut: "CmdOrCtrl+X",
	copy: "CmdOrCtrl+C",
	paste: "CmdOrCtrl+V",
	trash: "Delete",
	newFolder: "CmdOrCtrl+Shift+N",
	selectAll: "CmdOrCtrl+A",
	refresh: "F5",
	toggleHidden: "CmdOrCtrl+H",
};

const SEPARATOR: ContextMenuItem = { type: "separator" };

type ActionMenuItem = Extract<ContextMenuItem, { id: string }>;

function item(id: FileCommand, label: string, enabled = true): ActionMenuItem {
	const accelerator = ACCELERATORS[id];
	return { id, label, enabled, ...(accelerator ? { accelerator } : {}) };
}

function hiddenToggle(t: Translator, showHidden: boolean): ContextMenuItem {
	return {
		...item("toggleHidden", t("menu.showHidden")),
		type: "checkbox",
		checked: showHidden,
	};
}

/** Menu sobre itens selecionados na lista. */
export function buildEntriesMenu(
	t: Translator,
	options: { count: number; singleIsDir: boolean; canPaste: boolean; showHidden: boolean },
): ContextMenuItem[] {
	const { count, singleIsDir, canPaste, showHidden } = options;
	const single = count === 1;
	return [
		item("open", t(singleIsDir ? "menu.openFolder" : "menu.open"), single),
		item("showInFolder", t("menu.showInFolder"), single),
		SEPARATOR,
		item("rename", t("menu.rename"), single),
		SEPARATOR,
		item("cut", t("menu.cut", { count })),
		item("copy", t("menu.copy", { count })),
		item("paste", t("menu.paste"), canPaste),
		item("copyPath", t("menu.copyPath", { count })),
		SEPARATOR,
		item("trash", t("menu.trash", { count })),
		SEPARATOR,
		hiddenToggle(t, showHidden),
	];
}

/** Menu da área livre da lista (age sobre a pasta atual). */
export function buildListBackgroundMenu(
	t: Translator,
	options: { canPaste: boolean; hasEntries: boolean; showHidden: boolean },
): ContextMenuItem[] {
	return [
		item("newFolder", t("menu.newFolder")),
		item("paste", t("menu.paste"), options.canPaste),
		SEPARATOR,
		item("selectAll", t("menu.selectAll"), options.hasEntries),
		item("refresh", t("menu.refresh")),
		item("showInFolder", t("menu.openInFileManager")),
		SEPARATOR,
		hiddenToggle(t, options.showHidden),
	];
}

/** Menu de uma pasta da árvore. Raízes (pasta pessoal, "/", unidades) não podem ser alteradas. */
export function buildFolderMenu(
	t: Translator,
	options: { isRoot: boolean; canPaste: boolean; showHidden: boolean },
): ContextMenuItem[] {
	const { isRoot, canPaste, showHidden } = options;
	return [
		item("open", t("menu.open")),
		item("showInFolder", t("menu.openInFileManager")),
		SEPARATOR,
		item("newFolder", t("menu.newSubfolder")),
		item("rename", t("menu.rename"), !isRoot),
		SEPARATOR,
		item("cut", t("menu.cut", { count: 1 }), !isRoot),
		item("copy", t("menu.copy", { count: 1 }), !isRoot),
		item("paste", t("menu.pasteHere"), canPaste),
		item("copyPath", t("menu.copyPath", { count: 1 })),
		SEPARATOR,
		item("trash", t("menu.trash", { count: 1 }), !isRoot),
		SEPARATOR,
		item("refresh", t("menu.refresh")),
		hiddenToggle(t, showHidden),
	];
}

/** Campos de um `KeyboardEvent` usados para reconhecer atalhos. */
export interface ShortcutKeyEvent {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
	altKey: boolean;
}

/** Converte uma tecla pressionada no comando correspondente, se houver. */
export function matchFileShortcut(event: ShortcutKeyEvent): FileCommand | null {
	const ctrl = event.ctrlKey || event.metaKey;
	const key = event.key.toLowerCase();
	if (event.key === "F2" && !ctrl) return "rename";
	if (event.key === "Delete" && !ctrl) return "trash";
	if (event.key === "F5") return "refresh";
	if (!ctrl || event.altKey) return null;
	if (event.shiftKey) return key === "n" ? "newFolder" : null;
	const byKey: Record<string, FileCommand> = { c: "copy", x: "cut", v: "paste", h: "toggleHidden" };
	return byKey[key] ?? null;
}
