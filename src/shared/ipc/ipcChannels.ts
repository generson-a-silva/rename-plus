/** Canais IPC compartilhados entre main, preload e renderer. */
export const IpcChannel = {
	GetAppInfo: "app:get-info",
	SetTheme: "app:set-theme",
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
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];
