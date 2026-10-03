import type { RenameOperation, RenameResult } from "./batchRenameTypes";
import type { ConfirmRequest } from "./dialogTypes";
import type { DirEntry, FileSystemRoot, ListOptions, ListResult } from "./fileSystemTypes";
import type { ThemeMode } from "./themeModes";

/** API exposta ao renderer via `contextBridge` (disponível em `window.api`). */
export interface ElectronApi {
	platform: string;
	getAppVersion: () => Promise<string>;
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
}
