import { contextBridge, ipcRenderer } from "electron";
import type { ElectronApi, IpcChannel } from "../shared/ipc";

// Preload roda em sandbox: só pode importar "electron" em runtime. Por isso os
// canais são repetidos aqui; o `satisfies` garante que batem com ../shared/ipc/ipcChannels.ts.
const C = {
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
} as const satisfies typeof IpcChannel;

const api: ElectronApi = {
	platform: process.platform,
	getAppInfo: () => ipcRenderer.invoke(C.GetAppInfo),
	setTheme: (mode) => ipcRenderer.invoke(C.SetTheme, mode),
	getHomeDir: () => ipcRenderer.invoke(C.GetHomeDir),
	listDirectories: (dir, showHidden) => ipcRenderer.invoke(C.ListDirectories, dir, showHidden),
	listEntries: (dir, options) => ipcRenderer.invoke(C.ListEntries, dir, options),
	listRoots: () => ipcRenderer.invoke(C.ListRoots),
	resolveDirectory: (path) => ipcRenderer.invoke(C.ResolveDirectory, path),
	rename: (operations) => ipcRenderer.invoke(C.Rename, operations),
	undo: () => ipcRenderer.invoke(C.Undo),
	canUndo: () => ipcRenderer.invoke(C.CanUndo),
	pickFolder: (defaultPath) => ipcRenderer.invoke(C.PickFolder, defaultPath),
	confirm: (request) => ipcRenderer.invoke(C.Confirm, request),
	showContextMenu: (items) => ipcRenderer.invoke(C.ShowContextMenu, items),
	openPath: (path) => ipcRenderer.invoke(C.OpenPath, path),
	showInFolder: (path) => ipcRenderer.invoke(C.ShowInFolder, path),
	copyText: (text) => ipcRenderer.invoke(C.CopyText, text),
	trashItems: (paths) => ipcRenderer.invoke(C.TrashItems, paths),
	deleteItems: (paths) => ipcRenderer.invoke(C.DeleteItems, paths),
	createFolder: (parentDir, name) => ipcRenderer.invoke(C.CreateFolder, parentDir, name),
	copyItems: (paths, targetDir) => ipcRenderer.invoke(C.CopyItems, paths, targetDir),
	moveItems: (paths, targetDir) => ipcRenderer.invoke(C.MoveItems, paths, targetDir),
};

contextBridge.exposeInMainWorld("api", api);
