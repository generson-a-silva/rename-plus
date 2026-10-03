import type { AppInfo } from "./appInfoTypes";
import type { RenameOperation, RenameResult } from "./batchRenameTypes";
import type { ContextMenuItem } from "./contextMenuTypes";
import type { ConfirmRequest } from "./dialogTypes";
import type { FileOperationResult } from "./fileOperationTypes";
import type { DirEntry, FileSystemRoot, ListOptions, ListResult } from "./fileSystemTypes";
import type { ThemeMode } from "./themeModes";

/** API exposta ao renderer via `contextBridge` (disponível em `window.api`). */
export interface ElectronApi {
	platform: string;
	getAppInfo: () => Promise<AppInfo>;
	setTheme: (mode: ThemeMode) => Promise<void>;
	getHomeDir: () => Promise<string>;
	listDirectories: (dir: string, showHidden: boolean) => Promise<DirEntry[]>;
	listEntries: (dir: string, options: ListOptions) => Promise<ListResult>;
	listRoots: () => Promise<FileSystemRoot[]>;
	/** Caminho absoluto e canônico da pasta, ou `null` se não existir/não for pasta. */
	resolveDirectory: (path: string) => Promise<string | null>;
	rename: (operations: RenameOperation[]) => Promise<RenameResult>;
	undo: () => Promise<RenameResult>;
	canUndo: () => Promise<boolean>;
	pickFolder: (defaultPath: string) => Promise<string | null>;
	confirm: (request: ConfirmRequest) => Promise<boolean>;
	/** Exibe um menu de contexto nativo e devolve o `id` do item clicado (ou `null`). */
	showContextMenu: (items: ContextMenuItem[]) => Promise<string | null>;
	/** Abre com o aplicativo padrão do sistema. Devolve a mensagem de erro, se houver. */
	openPath: (path: string) => Promise<string | null>;
	/** Abre o gerenciador de arquivos com o item selecionado. */
	showInFolder: (path: string) => Promise<void>;
	copyText: (text: string) => Promise<void>;
	/** Move para a lixeira. Falhas com `trashUnavailable` indicam disco sem lixeira. */
	trashItems: (paths: string[]) => Promise<FileOperationResult>;
	/** Exclui permanentemente (sem lixeira). Só usar após confirmação explícita. */
	deleteItems: (paths: string[]) => Promise<FileOperationResult>;
	createFolder: (parentDir: string, name: string) => Promise<FileOperationResult>;
	/** Copia para `targetDir`; nomes repetidos ganham sufixo " (2)", " (3)"… */
	copyItems: (paths: string[], targetDir: string) => Promise<FileOperationResult>;
	moveItems: (paths: string[], targetDir: string) => Promise<FileOperationResult>;
}
