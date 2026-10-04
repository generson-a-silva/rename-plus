import type { Locale } from "../i18n";
import type { WatchRule } from "../watch";
import type { AppInfo } from "./appInfoTypes";
import type { BackgroundInfo } from "./backgroundTypes";
import type { RenameOperation, RenameResult } from "./batchRenameTypes";
import type { ContextMenuItem } from "./contextMenuTypes";
import type { ConfirmRequest } from "./dialogTypes";
import type { FileOperationResult } from "./fileOperationTypes";
import type { DirEntry, FileSystemRoot, ListOptions, ListResult } from "./fileSystemTypes";
import type {
	LaunchRequest,
	ShellIntegrationInfo,
	ShellIntegrationUpdate,
} from "./shellIntegrationTypes";
import type { ThemeMode } from "./themeModes";
import type { UpdateSettings, UpdateStatus } from "./updateTypes";
import type { WatchFoldersInfo } from "./watchFolderTypes";

/** API exposta ao renderer via `contextBridge` (disponível em `window.api`). */
export interface ElectronApi {
	platform: string;
	getAppInfo: () => Promise<AppInfo>;
	setTheme: (mode: ThemeMode) => Promise<void>;
	/** Idioma das mensagens do processo principal (erros, botões de diálogos). */
	setLocale: (locale: Locale) => Promise<void>;
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
	/**
	 * Caminho no disco de um arquivo/pasta solto na janela (arrastar e soltar).
	 * Síncrono e resolvido no preload (`webUtils`); "" se não vier do disco.
	 */
	getPathForFile: (file: File) => string;
	/** Move para a lixeira. Falhas com `trashUnavailable` indicam disco sem lixeira. */
	trashItems: (paths: string[]) => Promise<FileOperationResult>;
	/** Exclui permanentemente (sem lixeira). Só usar após confirmação explícita. */
	deleteItems: (paths: string[]) => Promise<FileOperationResult>;
	createFolder: (parentDir: string, name: string) => Promise<FileOperationResult>;
	/** Copia para `targetDir`; nomes repetidos ganham sufixo " (2)", " (3)"… */
	copyItems: (paths: string[], targetDir: string) => Promise<FileOperationResult>;
	moveItems: (paths: string[], targetDir: string) => Promise<FileOperationResult>;
	/** Ambiente e situação das entradas no menu de contexto dos gerenciadores de arquivos. */
	getShellIntegration: () => Promise<ShellIntegrationInfo>;
	/** Adiciona (`true`) ou remove as entradas de um gerenciador de arquivos. */
	setShellIntegration: (targetId: string, enabled: boolean) => Promise<ShellIntegrationUpdate>;
	/**
	 * Itens pedidos antes de a interface ficar pronta (ex.: o app foi aberto pelo menu
	 * de contexto). Depois disso, chegam por `onLaunchRequest`.
	 */
	takeLaunchRequests: () => Promise<LaunchRequest[]>;
	/** Itens a abrir enviados com o app já aberto. Devolve a função que cancela a inscrição. */
	onLaunchRequest: (listener: (request: LaunchRequest) => void) => () => void;
	/** Versão instalada, preferências e resultado da última verificação de atualizações. */
	getUpdateStatus: () => Promise<UpdateStatus>;
	/** Consulta agora as releases do GitHub (ignora a versão pulada: o usuário pediu). */
	checkForUpdates: () => Promise<UpdateStatus>;
	setUpdateSettings: (patch: Partial<UpdateSettings>) => Promise<UpdateStatus>;
	onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void;
	getWatchFolders: () => Promise<WatchFoldersInfo>;
	/** Salva todas as regras e reinicia o monitoramento conforme elas. */
	setWatchRules: (rules: WatchRule[]) => Promise<WatchFoldersInfo>;
	clearWatchActivity: () => Promise<WatchFoldersInfo>;
	onWatchFoldersChanged: (listener: (info: WatchFoldersInfo) => void) => () => void;
	/** Pastas monitoradas com o app fechado (início com o sistema, sem janela). */
	getBackground: () => Promise<BackgroundInfo>;
	setBackground: (enabled: boolean) => Promise<BackgroundInfo>;
}
