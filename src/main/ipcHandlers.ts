import os from "node:os";
import { BrowserWindow, dialog, ipcMain } from "electron";
import type { ConfirmRequest, ContextMenuItem, ListOptions, RenameOperation } from "../shared/ipc";
import { IpcChannel } from "../shared/ipc";
import { getAppInfo } from "./appInfo";
import { canUndo, renameBatch, undoLastBatch } from "./batchRenamer";
import { listDirectories, listEntries, listRoots, resolveDirectory } from "./fileSystemService";
import { copyItems, createFolder, deleteItems, moveItems } from "./fileTransferService";
import { setMainLocale, tMain } from "./mainLocale";
import {
	copyText,
	openPath,
	showContextMenu,
	showInFolder,
	trashItems,
} from "./nativeShellService";
import { setTheme } from "./themeSettings";

export function registerIpcHandlers(): void {
	ipcMain.handle(IpcChannel.GetAppInfo, () => getAppInfo());
	ipcMain.handle(IpcChannel.SetTheme, (_event, mode: unknown) => setTheme(mode));
	ipcMain.handle(IpcChannel.SetLocale, (_event, locale: unknown) => setMainLocale(locale));
	ipcMain.handle(IpcChannel.GetHomeDir, () => os.homedir());

	ipcMain.handle(IpcChannel.ListDirectories, (_event, dir: string, showHidden: boolean) =>
		listDirectories(dir, showHidden),
	);
	ipcMain.handle(IpcChannel.ListEntries, (_event, dir: string, options: ListOptions) =>
		listEntries(dir, options),
	);
	ipcMain.handle(IpcChannel.ListRoots, () => listRoots());
	ipcMain.handle(IpcChannel.ResolveDirectory, (_event, target: string) => resolveDirectory(target));

	ipcMain.handle(IpcChannel.Rename, (_event, operations: RenameOperation[]) =>
		renameBatch(operations),
	);
	ipcMain.handle(IpcChannel.Undo, () => undoLastBatch());
	ipcMain.handle(IpcChannel.CanUndo, () => canUndo());

	ipcMain.handle(IpcChannel.PickFolder, async (event, defaultPath: string) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		const options: Electron.OpenDialogOptions = { defaultPath, properties: ["openDirectory"] };
		const result = win
			? await dialog.showOpenDialog(win, options)
			: await dialog.showOpenDialog(options);
		return result.canceled ? null : (result.filePaths[0] ?? null);
	});

	ipcMain.handle(IpcChannel.Confirm, async (event, request: ConfirmRequest) => {
		const win = BrowserWindow.fromWebContents(event.sender);
		const options: Electron.MessageBoxOptions = {
			type: request.severity ?? "question",
			buttons: [tMain("common.cancel"), request.confirmLabel ?? tMain("common.confirm")],
			defaultId: 1,
			cancelId: 0,
			message: request.message,
			...(request.detail ? { detail: request.detail } : {}),
		};
		const { response } = win
			? await dialog.showMessageBox(win, options)
			: await dialog.showMessageBox(options);
		return response === 1;
	});

	ipcMain.handle(IpcChannel.ShowContextMenu, (event, items: ContextMenuItem[]) =>
		showContextMenu(BrowserWindow.fromWebContents(event.sender), items),
	);
	ipcMain.handle(IpcChannel.OpenPath, (_event, target: string) => openPath(target));
	ipcMain.handle(IpcChannel.ShowInFolder, (_event, target: string) => showInFolder(target));
	ipcMain.handle(IpcChannel.CopyText, (_event, text: string) => copyText(text));
	ipcMain.handle(IpcChannel.TrashItems, (_event, paths: string[]) => trashItems(paths));
	ipcMain.handle(IpcChannel.DeleteItems, (_event, paths: string[]) => deleteItems(paths));
	ipcMain.handle(IpcChannel.CreateFolder, (_event, parentDir: string, name: string) =>
		createFolder(parentDir, name),
	);
	ipcMain.handle(IpcChannel.CopyItems, (_event, paths: string[], targetDir: string) =>
		copyItems(paths, targetDir),
	);
	ipcMain.handle(IpcChannel.MoveItems, (_event, paths: string[], targetDir: string) =>
		moveItems(paths, targetDir),
	);
}
