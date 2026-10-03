/** Arquivo ou pasta listado no painel da direita. */
export interface FileEntry {
	/** Caminho absoluto. */
	path: string;
	/** Pasta que contém o item (caminho absoluto). */
	dir: string;
	/** Nome completo, incluindo extensão. */
	name: string;
	isDir: boolean;
	/** Oculto no sistema (ponto inicial no Linux, atributo "Oculto" no Windows). */
	hidden: boolean;
	size: number;
	mtimeMs: number;
	birthtimeMs: number;
}

/**
 * Raiz da árvore de pastas: a pasta pessoal, a raiz "/" (Linux) ou uma unidade
 * ("C:\", Windows).
 */
export interface FileSystemRoot {
	kind: "home" | "filesystem" | "drive";
	path: string;
}

/** Pasta exibida na árvore da esquerda. */
export interface DirEntry {
	name: string;
	path: string;
	hidden: boolean;
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
