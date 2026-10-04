/** Canais IPC compartilhados entre main, preload e renderer. */
export const IpcChannel = {
	GetAppInfo: "app:get-info",
	SetTheme: "app:set-theme",
	SetLocale: "app:set-locale",
	GetHomeDir: "fs:get-home-dir",
	ListDirectories: "fs:list-directories",
	ListEntries: "fs:list-entries",
	ListRoots: "fs:list-roots",
	ResolveDirectory: "fs:resolve-directory",
	Rename: "rename:execute",
	Undo: "rename:undo",
	CanUndo: "rename:can-undo",
	PickFolder: "dialog:pick-folder",
	Confirm: "dialog:confirm",
	ShowContextMenu: "dialog:show-context-menu",
	OpenPath: "shell:open-path",
	ShowInFolder: "shell:show-in-folder",
	CopyText: "shell:copy-text",
	TrashItems: "file:trash-items",
	DeleteItems: "file:delete-items",
	CreateFolder: "file:create-folder",
	CopyItems: "file:copy-items",
	MoveItems: "file:move-items",
	GetShellIntegration: "integration:get",
	SetShellIntegration: "integration:set",
	TakeLaunchRequests: "launch:take",
	GetUpdateStatus: "update:get-status",
	CheckForUpdates: "update:check",
	SetUpdateSettings: "update:set-settings",
	GetWatchFolders: "watch:get",
	SetWatchRules: "watch:set-rules",
	ClearWatchActivity: "watch:clear-activity",
	GetBackground: "background:get",
	SetBackground: "background:set",
	/** Evento main → renderer: itens a abrir (menu de contexto do sistema, linha de comando). */
	LaunchRequest: "launch:request",
	/** Evento main → renderer: a situação da verificação de atualizações mudou. */
	UpdateStatus: "update:status",
	/** Evento main → renderer: regras, situação ou atividade das pastas monitoradas mudaram. */
	WatchFoldersChanged: "watch:changed",
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];
