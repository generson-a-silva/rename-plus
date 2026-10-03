/** Arquivo ou pasta listado no painel da direita. */
export interface FileEntry {
	/** Caminho absoluto. */
	path: string;
	/** Pasta que contém o item (caminho absoluto). */
	dir: string;
	/** Nome completo, incluindo extensão. */
	name: string;
	isDir: boolean;
	size: number;
	mtimeMs: number;
	birthtimeMs: number;
}

/** Pasta exibida na árvore da esquerda. */
export interface DirEntry {
	name: string;
	path: string;
}

export interface ListOptions {
	recursive: boolean;
	showHidden: boolean;
	includeFiles: boolean;
	includeFolders: boolean;
}

export interface ListResult {
	entries: FileEntry[];
	/** `true` quando a listagem foi interrompida por exceder o limite de itens. */
	truncated: boolean;
}
