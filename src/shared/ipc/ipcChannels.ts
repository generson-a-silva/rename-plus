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
	/** Evento main → renderer: itens a abrir (menu de contexto do sistema, linha de comando). */
	LaunchRequest: "launch:request",
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];
