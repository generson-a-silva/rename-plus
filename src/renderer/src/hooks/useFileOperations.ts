import { baseName, joinPath, parentPath, pluralize } from "@lib";
import type { FileOperationResult, RenameOperation } from "@shared/ipc";
import { validateFileName } from "@shared/rename";
import { useCallback, useState } from "react";
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
const validateName = (value: string) => validateFileName(value, platform);

function describeFailure(result: FileOperationResult): string {
	const first = result.failed[0];
	if (!first) return "";
	const others = result.failed.length - 1;
	const suffix = others > 0 ? ` (e mais ${pluralize(others, "erro", "erros")})` : "";
	return `${baseName(first.path)}: ${first.error}${suffix}`;
}

const uniqueParents = (paths: readonly string[]) => [...new Set(paths.map(parentPath))];

/**
 * Operações de arquivo dos menus de contexto e atalhos: abrir, renomear, recortar,
 * copiar, colar, nova pasta e lixeira. Mantém a "área de transferência" interna.
 */
export function useFileOperations({ ask, notify, onChanged }: FileOperationsOptions) {
	const [clipboard, setClipboard] = useState<FileClipboard | null>(null);

	const openFile = useCallback(
		async (path: string) => {
			const error = await window.api.openPath(path);
			if (error)
				notify({ kind: "error", text: `Não foi possível abrir ${baseName(path)}: ${error}` });
		},
		[notify],
	);

	const showInFolder = useCallback((path: string) => window.api.showInFolder(path), []);

	const copyPaths = useCallback(
		async (paths: readonly string[]) => {
			await window.api.copyText(paths.join("\n"));
			notify({
				kind: "info",
				text:
					paths.length === 1
						? "Caminho copiado."
						: `${pluralize(paths.length, "caminho copiado", "caminhos copiados")}.`,
			});
		},
		[notify],
	);

	const putInClipboard = useCallback(
		(mode: FileClipboard["mode"], paths: readonly string[]) => {
			if (paths.length === 0) return;
			setClipboard({ mode, paths: [...paths] });
			const what = pluralize(paths.length, "item", "itens");
			const verb = mode === "cut" ? "recortado" : "copiado";
			notify({
				kind: "info",
				text: `${what} ${verb}${paths.length === 1 ? "" : "s"} — use Colar na pasta de destino.`,
			});
		},
		[notify],
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
				const verb = mode === "cut" ? "movido" : "colado";
				const n = result.created.length;
				notify({
					kind: "success",
					text:
						n === 0
							? "Nada a colar: os itens já estão nesta pasta."
							: `${pluralize(n, `item ${verb}`, `itens ${verb}s`)}.`,
				});
			} else {
				notify({ kind: "error", text: `Falha ao colar — ${describeFailure(result)}` });
			}
		},
		[clipboard, notify, onChanged],
	);

	const trash = useCallback(
		async (paths: readonly string[]) => {
			if (paths.length === 0) return;
			const confirmed = await window.api.confirm({
				message:
					paths.length === 1
						? `Mover "${baseName(paths[0] ?? "")}" para a lixeira?`
						: `Mover ${pluralize(paths.length, "item", "itens")} para a lixeira?`,
				detail: "Os itens podem ser restaurados pela lixeira do sistema.",
				confirmLabel: "Mover para a lixeira",
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
							? `"${baseName(noTrash[0] ?? "")}" não pode ir para a lixeira. Excluir permanentemente?`
							: `${pluralize(noTrash.length, "item não pode", "itens não podem")} ir para a lixeira. Excluir permanentemente?`,
					detail: "Este disco não tem lixeira. A exclusão não poderá ser desfeita.",
					confirmLabel: "Excluir permanentemente",
				});
				const deleted = deleteConfirmed
					? await window.api.deleteItems(noTrash)
					: {
							ok: false,
							created: [],
							failed: noTrash.map((path) => ({ path, error: "Exclusão cancelada" })),
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
					? {
							kind: "success",
							text: `${pluralize(removed.length, "item removido", "itens removidos")}.`,
						}
					: { kind: "error", text: `Falha ao remover — ${describeFailure(result)}` },
			);
		},
		[notify, onChanged],
	);

	const createFolder = useCallback(
		async (parentDir: string) => {
			const name = await ask({
				title: "Nova pasta",
				label: `Nome da pasta em ${baseName(parentDir) || parentDir}`,
				initialValue: "Nova pasta",
				confirmLabel: "Criar",
				validate: validateName,
			});
			if (name === null) return;
			const result = await window.api.createFolder(parentDir, name);
			if (!result.ok) {
				notify({
					kind: "error",
					text: `Não foi possível criar a pasta — ${describeFailure(result)}`,
				});
				return;
			}
			await onChanged({ dirs: [parentDir], select: result.created });
			notify({ kind: "success", text: `Pasta "${name}" criada.` });
		},
		[ask, notify, onChanged],
	);

	const renameItem = useCallback(
		async (path: string, isDir: boolean) => {
			const current = baseName(path);
			const name = await ask({
				title: isDir ? "Renomear pasta" : "Renomear arquivo",
				label: "Novo nome",
				initialValue: current,
				confirmLabel: "Renomear",
				selectBaseName: !isDir,
				requireChange: true,
				validate: validateName,
			});
			if (name === null || name === current) return;
			// Usa o mesmo executor do lote: valida conflitos e permite Desfazer.
			const operation = { from: path, to: joinPath(parentPath(path), name) };
			const result = await window.api.rename([operation]);
			if (!result.ok) {
				const error = result.failed[0]?.error ?? "erro desconhecido";
				notify({ kind: "error", text: `Não foi possível renomear ${current}: ${error}` });
				return;
			}
			await onChanged({ dirs: [parentPath(path)], select: [operation.to], renamed: [operation] });
			notify({ kind: "success", text: `"${current}" renomeado para "${name}".` });
		},
		[ask, notify, onChanged],
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
