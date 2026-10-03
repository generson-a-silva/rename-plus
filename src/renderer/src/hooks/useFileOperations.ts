import { baseName, joinPath, parentPath } from "@lib";
import type { Translator } from "@shared/i18n";
import type { FileOperationResult, RenameOperation } from "@shared/ipc";
import { validateFileName } from "@shared/rename";
import { useCallback, useState } from "react";
import { useI18n } from "./useI18n";
import type { TextPromptRequest } from "./useTextPrompt";

export interface FileOperationNotice {
	kind: "info" | "success" | "error";
	text: string;
}

/** O que mudou no disco depois de uma operação, para a interface se atualizar. */
export interface FileChange {
	/** Pastas cujo conteúdo mudou (lista e árvore são recarregadas). */
	dirs: string[];
	/** Itens a selecionar na lista após recarregar (criados ou renomeados). */
	select?: string[];
	/** Itens renomeados: se a pasta atual estiver entre eles, o caminho é corrigido. */
	renamed?: RenameOperation[];
	/** Itens que saíram do lugar (lixeira, recortar/colar): a pasta atual pode deixar de existir. */
	removed?: string[];
}

export interface FileClipboard {
	mode: "copy" | "cut";
	paths: string[];
}

interface FileOperationsOptions {
	ask: (request: TextPromptRequest) => Promise<string | null>;
	notify: (notice: FileOperationNotice) => void;
	onChanged: (change: FileChange) => Promise<void>;
}

const platform = window.api.platform;

function describeFailure(result: FileOperationResult, t: Translator): string {
	const first = result.failed[0];
	if (!first) return "";
	const others = result.failed.length - 1;
	const suffix = others > 0 ? t("ops.moreErrors", { count: others }) : "";
	return `${baseName(first.path)}: ${first.error}${suffix}`;
}

const uniqueParents = (paths: readonly string[]) => [...new Set(paths.map(parentPath))];

/**
 * Operações de arquivo dos menus de contexto e atalhos: abrir, renomear, recortar,
 * copiar, colar, nova pasta e lixeira. Mantém a "área de transferência" interna.
 */
export function useFileOperations({ ask, notify, onChanged }: FileOperationsOptions) {
	const { t, tr } = useI18n();
	const [clipboard, setClipboard] = useState<FileClipboard | null>(null);

	/** Validação do nome digitado nos diálogos, já traduzida. */
	const validateName = useCallback(
		(value: string) => {
			const issue = validateFileName(value, platform);
			return issue ? tr(issue) : null;
		},
		[tr],
	);

	const openFile = useCallback(
		async (path: string) => {
			const error = await window.api.openPath(path);
			if (error)
				notify({ kind: "error", text: t("ops.openFailed", { name: baseName(path), error }) });
		},
		[notify, t],
	);

	const showInFolder = useCallback((path: string) => window.api.showInFolder(path), []);

	const copyPaths = useCallback(
		async (paths: readonly string[]) => {
			await window.api.copyText(paths.join("\n"));
			notify({ kind: "info", text: t("ops.pathCopied", { count: paths.length }) });
		},
		[notify, t],
	);

	const putInClipboard = useCallback(
		(mode: FileClipboard["mode"], paths: readonly string[]) => {
			if (paths.length === 0) return;
			setClipboard({ mode, paths: [...paths] });
			const key = mode === "cut" ? "ops.cutToClipboard" : "ops.copiedToClipboard";
			notify({ kind: "info", text: t(key, { count: paths.length }) });
		},
		[notify, t],
	);

	const paste = useCallback(
		async (targetDir: string) => {
			if (!clipboard) return;
			const { mode, paths } = clipboard;
			const result =
				mode === "cut"
					? await window.api.moveItems(paths, targetDir)
					: await window.api.copyItems(paths, targetDir);
			// Recortar é consumido ao colar; copiar pode ser colado de novo.
			if (mode === "cut") setClipboard(null);

			const moved =
				mode === "cut" ? paths.filter((p) => !result.failed.some((f) => f.path === p)) : [];
			await onChanged({
				dirs: [targetDir, ...uniqueParents(moved)],
				select: result.created,
				removed: moved,
			});
			if (result.ok) {
				const count = result.created.length;
				notify({
					kind: "success",
					text:
						count === 0
							? t("ops.pasteNothing")
							: t(mode === "cut" ? "ops.moved" : "ops.pasted", { count }),
				});
			} else {
				notify({
					kind: "error",
					text: t("ops.pasteFailed", { detail: describeFailure(result, t) }),
				});
			}
		},
		[clipboard, notify, onChanged, t],
	);

	const trash = useCallback(
		async (paths: readonly string[]) => {
			if (paths.length === 0) return;
			const confirmed = await window.api.confirm({
				message:
					paths.length === 1
						? t("ops.trashConfirmOne", { name: baseName(paths[0] ?? "") })
						: t("ops.trashConfirmMany", { count: paths.length }),
				detail: t("ops.trashDetail"),
				confirmLabel: t("ops.trashButton"),
			});
			if (!confirmed) return;

			const trashed = await window.api.trashItems([...paths]);
			let failed = trashed.failed;

			// Discos sem lixeira (tmpfs, alguns pendrives/unidades de rede): oferece excluir de vez.
			const noTrash = failed.filter((failure) => failure.trashUnavailable).map((f) => f.path);
			if (noTrash.length > 0) {
				const deleteConfirmed = await window.api.confirm({
					severity: "warning",
					message:
						noTrash.length === 1
							? t("ops.noTrashOne", { name: baseName(noTrash[0] ?? "") })
							: t("ops.noTrashMany", { count: noTrash.length }),
					detail: t("ops.noTrashDetail"),
					confirmLabel: t("ops.deleteButton"),
				});
				const deleted = deleteConfirmed
					? await window.api.deleteItems(noTrash)
					: {
							ok: false,
							created: [],
							failed: noTrash.map((path) => ({ path, error: t("ops.deleteCancelled") })),
						};
				failed = [...failed.filter((failure) => !failure.trashUnavailable), ...deleted.failed];
			}

			const removed = paths.filter((p) => !failed.some((f) => f.path === p));
			setClipboard((current) =>
				current
					? { ...current, paths: current.paths.filter((p) => !removed.includes(p)) }
					: current,
			);
			if (removed.length > 0) await onChanged({ dirs: uniqueParents(removed), removed });
			const result: FileOperationResult = { ok: failed.length === 0, created: [], failed };
			notify(
				result.ok
					? { kind: "success", text: t("ops.removed", { count: removed.length }) }
					: { kind: "error", text: t("ops.removeFailed", { detail: describeFailure(result, t) }) },
			);
		},
		[notify, onChanged, t],
	);

	const createFolder = useCallback(
		async (parentDir: string) => {
			const name = await ask({
				title: t("ops.newFolderTitle"),
				label: t("ops.newFolderLabel", { folder: baseName(parentDir) || parentDir }),
				initialValue: t("ops.newFolderDefault"),
				confirmLabel: t("ops.create"),
				validate: validateName,
			});
			if (name === null) return;
			const result = await window.api.createFolder(parentDir, name);
			if (!result.ok) {
				notify({
					kind: "error",
					text: t("ops.createFailed", { detail: describeFailure(result, t) }),
				});
				return;
			}
			await onChanged({ dirs: [parentDir], select: result.created });
			notify({ kind: "success", text: t("ops.created", { name }) });
		},
		[ask, notify, onChanged, t, validateName],
	);

	const renameItem = useCallback(
		async (path: string, isDir: boolean) => {
			const current = baseName(path);
			const name = await ask({
				title: t(isDir ? "ops.renameFolderTitle" : "ops.renameFileTitle"),
				label: t("ops.newName"),
				initialValue: current,
				confirmLabel: t("actions.rename"),
				selectBaseName: !isDir,
				requireChange: true,
				validate: validateName,
			});
			if (name === null || name === current) return;
			// Usa o mesmo executor do lote: valida conflitos e permite Desfazer.
			const operation = { from: path, to: joinPath(parentPath(path), name) };
			const result = await window.api.rename([operation]);
			if (!result.ok) {
				const error = result.failed[0]?.error ?? t("ops.unknownError");
				notify({ kind: "error", text: t("ops.renameFailed", { name: current, error }) });
				return;
			}
			await onChanged({ dirs: [parentPath(path)], select: [operation.to], renamed: [operation] });
			notify({ kind: "success", text: t("ops.renamed", { from: current, to: name }) });
		},
		[ask, notify, onChanged, t, validateName],
	);

	return {
		clipboard,
		openFile,
		showInFolder,
		copyPaths,
		putInClipboard,
		paste,
		trash,
		createFolder,
		renameItem,
	};
}
