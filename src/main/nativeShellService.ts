import fs from "node:fs/promises";
import {
	type BrowserWindow,
	clipboard,
	Menu,
	type MenuItemConstructorOptions,
	shell,
} from "electron";
import type { ContextMenuItem, FileOperationFailure, FileOperationResult } from "../shared/ipc";
import { describeFileSystemError } from "./fileSystemErrors";
import { tMain } from "./mainLocale";

/** Tempo para aguardar um clique depois que o menu fecha (a ordem dos eventos varia por sistema). */
const MENU_CLOSE_GRACE_MS = 100;

/** Exibe um menu de contexto nativo e resolve com o `id` do item clicado, ou `null`. */
export function showContextMenu(
	window: BrowserWindow | null,
	items: readonly ContextMenuItem[],
): Promise<string | null> {
	return new Promise((resolve) => {
		let settled = false;
		const settle = (id: string | null) => {
			if (settled) return;
			settled = true;
			resolve(id);
		};

		const template: MenuItemConstructorOptions[] = items.map((item) =>
			item.type === "separator"
				? { type: "separator" }
				: {
						type: item.type ?? "normal",
						label: item.label,
						enabled: item.enabled ?? true,
						checked: item.checked ?? false,
						// Só exibe o atalho; quem trata a tecla é o renderer.
						...(item.accelerator
							? { accelerator: item.accelerator, registerAccelerator: false }
							: {}),
						click: () => settle(item.id),
					},
		);

		Menu.buildFromTemplate(template).popup({
			...(window ? { window } : {}),
			callback: () => setTimeout(() => settle(null), MENU_CLOSE_GRACE_MS),
		});
	});
}

export async function openPath(target: string): Promise<string | null> {
	const error = await shell.openPath(target);
	return error || null;
}

export function showInFolder(target: string): void {
	shell.showItemInFolder(target);
}

export function copyText(text: string): void {
	clipboard.writeText(text);
}

/** Move para a lixeira do sistema (recuperável), item a item. */
export async function trashItems(paths: readonly string[]): Promise<FileOperationResult> {
	const failed: FileOperationFailure[] = [];
	for (const target of paths) {
		try {
			await shell.trashItem(target);
		} catch (error) {
			// O Electron não informa o motivo; se o item ainda existe, o disco não tem lixeira utilizável.
			if (await exists(target)) {
				failed.push({
					path: target,
					error: tMain("trash.unavailable"),
					trashUnavailable: true,
				});
			} else {
				failed.push({ path: target, error: describeFileSystemError(error) });
			}
		}
	}
	return { ok: failed.length === 0, created: [], failed };
}

async function exists(target: string): Promise<boolean> {
	try {
		await fs.lstat(target);
		return true;
	} catch {
		return false;
	}
}
