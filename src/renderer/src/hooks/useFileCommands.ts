import {
	buildEntriesMenu,
	buildFolderMenu,
	buildListBackgroundMenu,
	type FileCommand,
	matchFileShortcut,
} from "@lib";
import type { FileEntry } from "@shared/ipc";
import { useCallback, useEffect } from "react";
import type { useFileOperations } from "./useFileOperations";
import { useI18n } from "./useI18n";

/** Sobre o que um comando age. */
type CommandTarget =
	| { kind: "entries"; entries: readonly FileEntry[] }
	| { kind: "background" }
	| { kind: "folder"; path: string; isRoot: boolean };

interface FileCommandsOptions {
	currentDir: string;
	visibleEntries: readonly FileEntry[];
	selectedEntries: readonly FileEntry[];
	selection: ReadonlySet<string>;
	setSelection: (selection: Set<string>) => void;
	/** Raízes da árvore (pasta pessoal, "/", unidades): não podem ser renomeadas nem apagadas. */
	rootPaths: readonly string[];
	showHidden: boolean;
	toggleHidden: () => void;
	navigate: (path: string) => void;
	refresh: () => void;
	refreshFolder: (path: string) => void;
	operations: ReturnType<typeof useFileOperations>;
	/** Atalhos ficam desligados enquanto um diálogo do app estiver aberto. */
	shortcutsEnabled: boolean;
}

/** Elementos onde as teclas devem continuar com o comportamento normal de edição. */
function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
	);
}

/** Liga menus de contexto e atalhos de teclado às operações de arquivo. */
export function useFileCommands(options: FileCommandsOptions) {
	const {
		currentDir,
		visibleEntries,
		selectedEntries,
		selection,
		setSelection,
		rootPaths,
		showHidden,
		toggleHidden,
		navigate,
		refresh,
		refreshFolder,
		operations,
		shortcutsEnabled,
	} = options;
	const { t } = useI18n();

	const run = useCallback(
		async (command: FileCommand, target: CommandTarget) => {
			const paths =
				target.kind === "entries"
					? target.entries.map((entry) => entry.path)
					: target.kind === "folder"
						? [target.path]
						: [];
			const single = target.kind === "entries" ? target.entries[0] : undefined;
			const pasteDir = target.kind === "folder" ? target.path : currentDir;

			switch (command) {
				case "open":
					if (target.kind === "folder") navigate(target.path);
					else if (single?.isDir) navigate(single.path);
					else if (single) await operations.openFile(single.path);
					return;
				case "showInFolder":
					if (single) await operations.showInFolder(single.path);
					else await operations.openFile(target.kind === "folder" ? target.path : currentDir);
					return;
				case "rename":
					if (target.kind === "folder" && !target.isRoot)
						await operations.renameItem(target.path, true);
					else if (target.kind === "entries" && target.entries.length === 1 && single) {
						await operations.renameItem(single.path, single.isDir);
					}
					return;
				case "cut":
				case "copy":
					if (target.kind === "folder" && target.isRoot) return;
					operations.putInClipboard(command, paths);
					return;
				case "paste":
					await operations.paste(pasteDir);
					return;
				case "copyPath":
					await operations.copyPaths(paths.length > 0 ? paths : [currentDir]);
					return;
				case "trash":
					if (target.kind === "folder" && target.isRoot) return;
					await operations.trash(paths);
					return;
				case "newFolder":
					await operations.createFolder(pasteDir);
					return;
				case "selectAll":
					setSelection(new Set(visibleEntries.map((entry) => entry.path)));
					return;
				case "refresh":
					if (target.kind === "folder") refreshFolder(target.path);
					else refresh();
					return;
				case "toggleHidden":
					toggleHidden();
					return;
			}
		},
		[
			currentDir,
			navigate,
			operations,
			refresh,
			refreshFolder,
			setSelection,
			toggleHidden,
			visibleEntries,
		],
	);

	const canPaste = operations.clipboard !== null;

	/** Clique direito na lista: sobre uma linha (`index`) ou na área livre (`null`). */
	const openListMenu = useCallback(
		async (index: number | null) => {
			const entry = index === null ? undefined : visibleEntries[index];
			if (!entry) {
				const items = buildListBackgroundMenu(t, {
					canPaste,
					hasEntries: visibleEntries.length > 0,
					showHidden,
				});
				const command = (await window.api.showContextMenu(items)) as FileCommand | null;
				if (command) await run(command, { kind: "background" });
				return;
			}
			// Como nos gerenciadores de arquivos: clicar fora da seleção seleciona só o item clicado.
			const entries = selection.has(entry.path) ? selectedEntries : [entry];
			if (!selection.has(entry.path)) setSelection(new Set([entry.path]));
			const items = buildEntriesMenu(t, {
				count: entries.length,
				singleIsDir: entries.length === 1 && entry.isDir,
				canPaste,
				showHidden,
			});
			const command = (await window.api.showContextMenu(items)) as FileCommand | null;
			if (command) await run(command, { kind: "entries", entries });
		},
		[canPaste, run, selectedEntries, selection, setSelection, showHidden, t, visibleEntries],
	);

	const openFolderMenu = useCallback(
		async (path: string) => {
			const isRoot = rootPaths.includes(path);
			const command = (await window.api.showContextMenu(
				buildFolderMenu(t, { isRoot, canPaste, showHidden }),
			)) as FileCommand | null;
			if (command) await run(command, { kind: "folder", path, isRoot });
		},
		[canPaste, rootPaths, run, showHidden, t],
	);

	useEffect(() => {
		if (!shortcutsEnabled) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || isEditableTarget(event.target)) return;
			const command = matchFileShortcut(event);
			if (!command) return;
			event.preventDefault();
			const target: CommandTarget =
				selectedEntries.length > 0 && command !== "paste" && command !== "newFolder"
					? { kind: "entries", entries: selectedEntries }
					: { kind: "background" };
			// Sem seleção, comandos sobre itens não fazem nada (em vez de agir na pasta atual).
			if (target.kind === "background" && ["rename", "cut", "copy", "trash"].includes(command))
				return;
			void run(command, target);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [run, selectedEntries, shortcutsEnabled]);

	return { openListMenu, openFolderMenu };
}
