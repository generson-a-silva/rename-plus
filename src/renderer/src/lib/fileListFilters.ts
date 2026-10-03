import type { ListOptions } from "@shared/ipc";

/** Filtros do painel (11): o que é listado e quais nomes aparecem. */
export interface ListFilters {
	mask: string;
	files: boolean;
	folders: boolean;
	hidden: boolean;
	subfolders: boolean;
}

export const DEFAULT_FILTERS: ListFilters = {
	mask: "*",
	files: true,
	folders: false,
	hidden: false,
	subfolders: false,
};

/** Filtros aplicados pelo processo principal ao listar a pasta (a máscara é aplicada no renderer). */
export function toListOptions(filters: Omit<ListFilters, "mask">): ListOptions {
	return {
		recursive: filters.subfolders,
		showHidden: filters.hidden,
		includeFiles: filters.files,
		includeFolders: filters.folders,
	};
}
