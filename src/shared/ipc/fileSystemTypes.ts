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

/**
 * Item no formato compacto usado na IPC: [nome, é pasta, oculto, tamanho, modificação,
 * criação]. O caminho é montado na interface a partir da pasta do grupo.
 */
export type EntryTuple = [
	name: string,
	isDir: 0 | 1,
	hidden: 0 | 1,
	size: number,
	mtimeMs: number,
	birthtimeMs: number,
];

/** Itens de uma mesma pasta (a pasta vai uma vez só, não em cada item). */
export interface EntryGroup {
	dir: string;
	items: EntryTuple[];
}

/** Memória do JavaScript da interface, para calcular quantos itens ainda cabem. */
export interface MemoryReport {
	heapLimit: number;
	heapUsed: number;
}

/**
 * Eventos de uma listagem (main → renderer), identificados pelo `id` do pedido:
 * - `batch`: mais itens;
 * - `paused`: parou em `count` itens; `many` ao passar do limite inicial, `memory` ao
 *   chegar ao que a memória livre permite. Continua com `continueListing`;
 * - `done`: terminou; `memoryExhausted` quando parou por falta de memória;
 * - `cancelled`: interrompida (pedido do usuário ou nova listagem);
 * - `error`: falhou ao ler a pasta.
 */
export type ListingEvent =
	| { id: number; type: "batch"; groups: EntryGroup[] }
	| { id: number; type: "paused"; reason: "many" | "memory"; count: number }
	| { id: number; type: "done"; count: number; memoryExhausted: boolean }
	| { id: number; type: "cancelled"; count: number }
	| { id: number; type: "error"; message: string };
