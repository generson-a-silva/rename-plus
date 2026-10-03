import { fileType, formatDateTime, formatSize, relativePath, type SortKey } from "@lib";
import type { FileEntry } from "@shared/ipc";

export type FileListColumnId = "name" | "newName" | "size" | "type" | "mtime" | "dir";

export interface FileListColumn {
	id: FileListColumnId;
	/** `null` = sem ordenação (o novo nome depende da ordem, por causa da numeração). */
	sortKey: SortKey | null;
	label: string;
	align?: "right";
	/** `false` = largura fixa (sempre a padrão), sem divisória de redimensionar. */
	resizable?: boolean;
}

export type ColumnWidths = Record<FileListColumnId, number>;

const ALL_COLUMNS: readonly FileListColumn[] = [
	{ id: "name", sortKey: "name", label: "Nome" },
	{ id: "newName", sortKey: null, label: "Novo nome" },
	{ id: "size", sortKey: "size", label: "Tamanho", align: "right" },
	{ id: "type", sortKey: "type", label: "Tipo" },
	// Largura fixa: a data e a hora aparecem sempre inteiras.
	{ id: "mtime", sortKey: "mtime", label: "Modificado", resizable: false },
	{ id: "dir", sortKey: "dir", label: "Pasta" },
];

export const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
	name: 280,
	newName: 280,
	size: 90,
	type: 90,
	mtime: 130,
	dir: 200,
};

export const MIN_COLUMN_WIDTH = 48;
export const MAX_COLUMN_WIDTH = 1200;
/** Limite do "ajustar ao conteúdo", para um nome enorme não ocupar a tela toda. */
const MAX_AUTO_FIT_WIDTH = 800;
const FALLBACK_FIT_WIDTH = 150;

/** Espaço horizontal da linha fora das colunas (padding de .file-row/.file-header). */
export const ROW_HORIZONTAL_PADDING = 16;

/** A coluna "Pasta" só aparece no modo recursivo (subpastas). */
export function visibleColumns(showDirColumn: boolean): FileListColumn[] {
	return ALL_COLUMNS.filter((column) => column.id !== "dir" || showDirColumn);
}

/** Largura em uso: a escolhida pelo usuário ou, nas colunas fixas, a padrão. */
export function columnWidth(column: FileListColumn, widths: ColumnWidths): number {
	return column.resizable === false ? DEFAULT_COLUMN_WIDTHS[column.id] : widths[column.id];
}

export function clampColumnWidth(width: number): number {
	return Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, width)));
}

/** Texto exibido numa célula; `newName` é o novo nome visível na pré-visualização ("" se não houver). */
export function cellText(
	columnId: FileListColumnId,
	entry: FileEntry,
	newName: string,
	rootDir: string,
): string {
	switch (columnId) {
		case "name":
			return entry.name;
		case "newName":
			return newName;
		case "size":
			return entry.isDir ? "" : formatSize(entry.size);
		case "type":
			return fileType(entry);
		case "mtime":
			return formatDateTime(entry.mtimeMs);
		case "dir":
			return relativePath(rootDir, entry.dir);
	}
}

/**
 * Largura que faz caber o título e o conteúdo mais longo da coluna (o "duplo clique
 * na divisória" dos gerenciadores de arquivos). Mede com canvas, sem depender das
 * linhas renderizadas (a lista é virtualizada).
 */
export function measureColumnFit(
	column: FileListColumn,
	entries: readonly FileEntry[],
	newNameOf: (entry: FileEntry) => string,
	rootDir: string,
	/** Elemento da lista, de onde vêm o tamanho e a família da fonte. */
	fontSource: Element,
): number {
	const context = document.createElement("canvas").getContext("2d");
	if (!context) return FALLBACK_FIT_WIDTH;
	const { fontSize, fontFamily } = getComputedStyle(fontSource);
	// Negrito cobre o caso mais largo (títulos e novos nomes alterados usam peso 600).
	context.font = `600 ${fontSize} ${fontFamily}`;

	const headerWidth = context.measureText(column.label).width + 14; // + seta de ordenação
	let widest = headerWidth;
	for (const entry of entries) {
		const text = cellText(column.id, entry, newNameOf(entry), rootDir);
		if (text) widest = Math.max(widest, context.measureText(text).width);
	}
	const iconSpace = column.id === "name" ? 20 : 0; // ícone de 14px + espaço de 6px
	const cellPadding = 12 + 8; // padding da célula + folga para não cortar com reticências
	return clampColumnWidth(
		Math.min(MAX_AUTO_FIT_WIDTH, Math.ceil(widest + iconSpace + cellPadding)),
	);
}
