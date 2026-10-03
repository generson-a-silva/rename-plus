import os from "node:os";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type { ConfirmRequest, ListOptions, RenameOperation } from "../shared/ipc";
import { IpcChannel } from "../shared/ipc";
import { canUndo, renameBatch, undoLastBatch } from "./batchRenamer";
import { listDirectories, listEntries, pathExists } from "./fileSystemService";
import { setTheme } from "./themeSettings";

export function registerIpcHandlers(): void {
	ipcMain.handle(IpcChannel.GetAppVersion, () => app.getVersion());
	ipcMain.handle(IpcChannel.SetTheme, (_event, mode: unknown) => setTheme(mode));
	ipcMain.handle(IpcChannel.GetHomeDir, () => os.homedir());

	ipcMain.handle(IpcChannel.ListDirectories, (_event, dir: string, showHidden: boolean) =>
		listDirectories(dir, showHidden),
	);
	ipcMain.handle(IpcChannel.ListEntries, (_event, dir: string, options: ListOptions) =>
		listEntries(dir, options),
	);
	ipcMain.handle(IpcChannel.PathExists, (_event, target: string) => pathExists(target));

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
			type: "question",
			buttons: ["Cancelar", request.confirmLabel ?? "Confirmar"],
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
}
