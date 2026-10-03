import { contextBridge, ipcRenderer } from "electron";
import type { ElectronApi, IpcChannel } from "../shared/ipc";

// Preload roda em sandbox: só pode importar "electron" em runtime. Por isso os
// canais são repetidos aqui; o `satisfies` garante que batem com ../shared/ipc/ipcChannels.ts.
const C = {
	GetAppVersion: "app:get-version",
	SetTheme: "app:set-theme",
	GetHomeDir: "fs:get-home-dir",
	ListDirectories: "fs:list-directories",
	ListEntries: "fs:list-entries",
	PathExists: "fs:path-exists",
	Rename: "rename:execute",
	Undo: "rename:undo",
	CanUndo: "rename:can-undo",
	PickFolder: "dialog:pick-folder",
	Confirm: "dialog:confirm",
} as const satisfies typeof IpcChannel;

const api: ElectronApi = {
	platform: process.platform,
	getAppVersion: () => ipcRenderer.invoke(C.GetAppVersion),
	setTheme: (mode) => ipcRenderer.invoke(C.SetTheme, mode),
	getHomeDir: () => ipcRenderer.invoke(C.GetHomeDir),
	listDirectories: (dir, showHidden) => ipcRenderer.invoke(C.ListDirectories, dir, showHidden),
	listEntries: (dir, options) => ipcRenderer.invoke(C.ListEntries, dir, options),
	pathExists: (path) => ipcRenderer.invoke(C.PathExists, path),
	rename: (operations) => ipcRenderer.invoke(C.Rename, operations),
	undo: () => ipcRenderer.invoke(C.Undo),
	canUndo: () => ipcRenderer.invoke(C.CanUndo),
	pickFolder: (defaultPath) => ipcRenderer.invoke(C.PickFolder, defaultPath),
	confirm: (request) => ipcRenderer.invoke(C.Confirm, request),
};

contextBridge.exposeInMainWorld("api", api);
