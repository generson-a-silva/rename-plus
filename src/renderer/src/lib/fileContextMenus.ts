import type { ContextMenuItem } from "@shared/ipc";
import { pluralize } from "./textPluralization";

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

function hiddenToggle(showHidden: boolean): ContextMenuItem {
	return {
		...item("toggleHidden", "Mostrar itens ocultos"),
		type: "checkbox",
		checked: showHidden,
	};
}

/** Menu sobre itens selecionados na lista. */
export function buildEntriesMenu(options: {
	count: number;
	singleIsDir: boolean;
	canPaste: boolean;
	showHidden: boolean;
}): ContextMenuItem[] {
	const { count, singleIsDir, canPaste, showHidden } = options;
	const single = count === 1;
	const items = single ? "" : ` ${pluralize(count, "item", "itens")}`;
	return [
		item("open", singleIsDir ? "Abrir pasta" : "Abrir", single),
		item("showInFolder", "Mostrar no gerenciador de arquivos", single),
		SEPARATOR,
		item("rename", "Renomear…", single),
		SEPARATOR,
		item("cut", `Recortar${items}`),
		item("copy", `Copiar${items}`),
		item("paste", "Colar", canPaste),
		item("copyPath", single ? "Copiar caminho" : "Copiar caminhos"),
		SEPARATOR,
		item("trash", `Mover${items} para a lixeira`),
		SEPARATOR,
		hiddenToggle(showHidden),
	];
}

/** Menu da área livre da lista (age sobre a pasta atual). */
export function buildListBackgroundMenu(options: {
	canPaste: boolean;
	hasEntries: boolean;
	showHidden: boolean;
}): ContextMenuItem[] {
	return [
		item("newFolder", "Nova pasta…"),
		item("paste", "Colar", options.canPaste),
		SEPARATOR,
		item("selectAll", "Selecionar tudo", options.hasEntries),
		item("refresh", "Atualizar"),
		item("showInFolder", "Abrir no gerenciador de arquivos"),
		SEPARATOR,
		hiddenToggle(options.showHidden),
	];
}

/** Menu de uma pasta da árvore. Raízes (pasta pessoal, "/", unidades) não podem ser alteradas. */
export function buildFolderMenu(options: {
	isRoot: boolean;
	canPaste: boolean;
	showHidden: boolean;
}): ContextMenuItem[] {
	const { isRoot, canPaste, showHidden } = options;
	return [
		item("open", "Abrir"),
		item("showInFolder", "Abrir no gerenciador de arquivos"),
		SEPARATOR,
		item("newFolder", "Nova subpasta…"),
		item("rename", "Renomear…", !isRoot),
		SEPARATOR,
		item("cut", "Recortar", !isRoot),
		item("copy", "Copiar", !isRoot),
		item("paste", "Colar aqui", canPaste),
		item("copyPath", "Copiar caminho"),
		SEPARATOR,
		item("trash", "Mover para a lixeira", !isRoot),
		SEPARATOR,
		item("refresh", "Atualizar"),
		hiddenToggle(showHidden),
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
