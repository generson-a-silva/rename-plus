import os from "node:os";
import { app, BrowserWindow, dialog, ipcMain, type WebContents } from "electron";
import type {
	ConfirmRequest,
	ContextMenuItem,
	ListingEvent,
	ListOptions,
	MemoryReport,
	RenameOperation,
} from "../shared/ipc";
import { IpcChannel } from "../shared/ipc";
import { getAppInfo } from "./appInfo";
import { getBackgroundInfo, setBackground } from "./backgroundService";
import { canUndo, renameBatch, undoLastBatch } from "./batchRenamer";
import { listDirectories, listRoots, resolveDirectory } from "./fileSystemService";
import { copyItems, createFolder, deleteItems, moveItems } from "./fileTransferService";
import { takeLaunchRequests } from "./launchRequestQueue";
import { ListingJobs } from "./listingJobs";
import { saveLocale } from "./localePreference";
import { setMainLocale, tMain } from "./mainLocale";
import {
	copyText,
	openPath,
	showContextMenu,
	showInFolder,
	trashItems,
} from "./nativeShellService";
import {
	getShellIntegrationInfo,
	refreshContextMenuIntegrations,
	setContextMenuIntegration,
} from "./shell-integration";
import { setTheme } from "./themeSettings";
import { checkForUpdates, getUpdateStatus, setUpdateSettings } from "./updateChecker";
import { clearWatchActivity, getWatchFoldersInfo, setWatchRules } from "./watchFolderService";

/** Listagens em andamento de cada janela (as de uma janela fechada são canceladas). */
const listingsBySender = new Map<number, ListingJobs>();

function listingsOf(sender: WebContents): ListingJobs {
	let jobs = listingsBySender.get(sender.id);
	if (!jobs) {
		const created = new ListingJobs();
		listingsBySender.set(sender.id, created);
		sender.once("destroyed", () => {
			created.cancelAll();
			listingsBySender.delete(sender.id);
		});
		jobs = created;
	}
	return jobs;
}

export function registerIpcHandlers(): void {
	ipcMain.handle(IpcChannel.GetAppInfo, () => getAppInfo());
	ipcMain.handle(IpcChannel.SetTheme, (_event, mode: unknown) => setTheme(mode));
	ipcMain.handle(IpcChannel.SetLocale, (_event, locale: unknown) => {
		setMainLocale(locale);
		saveLocale(locale);
		// As entradas do menu de contexto do sistema seguem o idioma da interface.
		void refreshContextMenuIntegrations();
	});
	ipcMain.handle(IpcChannel.GetHomeDir, () => os.homedir());

	ipcMain.handle(IpcChannel.ListDirectories, (_event, dir: string, showHidden: boolean) =>
		listDirectories(dir, showHidden),
	);
	ipcMain.on(
		IpcChannel.StartListing,
		(event, id: number, dir: string, options: ListOptions, memory: MemoryReport | null) => {
			const { sender } = event;
			listingsOf(sender).start({
				id,
				dir,
				options,
				memory,
				send: (listing: ListingEvent) => {
					if (!sender.isDestroyed()) sender.send(IpcChannel.ListingEvent, listing);
				},
				// Em desenvolvimento, o tempo de cada listagem aparece no terminal.
				onFinish: app.isPackaged
					? undefined
					: ({ dir, count, ms, outcome }) =>
							console.debug(`[listagem] ${dir}: ${count} itens em ${ms} ms (${outcome})`),
			});
		},
	);
	ipcMain.on(IpcChannel.ContinueListing, (event, id: number, memory: MemoryReport | null) =>
		listingsOf(event.sender).continue(id, memory),
	);
	ipcMain.on(IpcChannel.CancelListing, (event, id: number) => listingsOf(event.sender).cancel(id));
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
	ipcMain.handle(IpcChannel.GetShellIntegration, () => getShellIntegrationInfo());
	ipcMain.handle(IpcChannel.SetShellIntegration, (_event, targetId: string, enabled: boolean) =>
		setContextMenuIntegration(targetId, enabled === true),
	);
	ipcMain.handle(IpcChannel.TakeLaunchRequests, (event) => takeLaunchRequests(event.sender));

	ipcMain.handle(IpcChannel.MoveItems, (_event, paths: string[], targetDir: string) =>
		moveItems(paths, targetDir),
	);

	ipcMain.handle(IpcChannel.GetUpdateStatus, () => getUpdateStatus());
	ipcMain.handle(IpcChannel.CheckForUpdates, () => checkForUpdates(true));
	ipcMain.handle(IpcChannel.SetUpdateSettings, (_event, patch: unknown) =>
		setUpdateSettings(patch),
	);

	ipcMain.handle(IpcChannel.GetWatchFolders, () => getWatchFoldersInfo());
	ipcMain.handle(IpcChannel.SetWatchRules, (_event, rules: unknown) => setWatchRules(rules));
	ipcMain.handle(IpcChannel.ClearWatchActivity, () => clearWatchActivity());
	ipcMain.handle(IpcChannel.GetBackground, () => getBackgroundInfo());
	ipcMain.handle(IpcChannel.SetBackground, (_event, enabled: unknown) => setBackground(enabled));
}
