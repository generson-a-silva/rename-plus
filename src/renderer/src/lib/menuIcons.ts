import type { ContextMenuItem } from "@shared/ipc";
import type { FileCommand } from "./fileContextMenus";
import { type AppIconName, ICON_PATHS } from "./iconPaths";

/** Ícone de cada comando nos menus de contexto (os de marcar ficam só com o ✓). */
const MENU_ICONS: Partial<Record<FileCommand, AppIconName>> = {
	open: "external",
	showInFolder: "open",
	rename: "rename",
	cut: "cut",
	copy: "copy",
	paste: "paste",
	copyPath: "link",
	trash: "trash",
	newFolder: "folderPlus",
	selectAll: "selectAll",
	refresh: "refresh",
};

/** 16 px no menu, desenhados em 32 px (escala 2x) para ficarem nítidos em telas de alta densidade. */
const PIXELS = 32;
/**
 * Cinza médio, legível em menu claro e escuro: no Linux o menu nativo segue o tema do
 * sistema, não o escolhido no app, então a cor não pode depender do tema da interface.
 */
const COLOR = { normal: "#8c959f", disabled: "rgb(140 149 159 / 0.4)" };

const cache = new Map<string, string>();

/** PNG (`data:` URL) de um ícone do app, desenhado com os mesmos traços do `AppIcon`. */
function drawIcon(name: AppIconName, color: string): string {
	const key = `${name}|${color}`;
	let url = cache.get(key);
	if (!url) {
		const canvas = document.createElement("canvas");
		canvas.width = PIXELS;
		canvas.height = PIXELS;
		const context = canvas.getContext("2d");
		if (!context) return "";
		context.scale(PIXELS / 24, PIXELS / 24);
		context.strokeStyle = color;
		context.lineWidth = 1.8;
		context.lineCap = "round";
		context.lineJoin = "round";
		context.stroke(new Path2D(ICON_PATHS[name]));
		url = canvas.toDataURL("image/png");
		cache.set(key, url);
	}
	return url;
}

/** Acrescenta os ícones aos itens do menu (esmaecidos nos itens desabilitados). */
export function withMenuIcons(items: readonly ContextMenuItem[]): ContextMenuItem[] {
	return items.map((item) => {
		if (item.type === "separator" || item.type === "checkbox") return item;
		const name = MENU_ICONS[item.id as FileCommand];
		if (!name) return item;
		const icon = drawIcon(name, item.enabled === false ? COLOR.disabled : COLOR.normal);
		return icon ? { ...item, icon } : item;
	});
}
