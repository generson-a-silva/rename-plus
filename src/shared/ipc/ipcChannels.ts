/** Canais IPC compartilhados entre main, preload e renderer. */
export const IpcChannel = {
	GetAppVersion: "app:get-version",
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
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];
