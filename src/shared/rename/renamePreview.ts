import type { FileEntry } from "../ipc";
import { validateFileName } from "./fileNameValidation";
import { createRenamer, RenameConfigError } from "./renameEngine";
import type { RenameOptions } from "./renameOptions";

export type PreviewStatus = "unchanged" | "ok" | "error";

export interface PreviewItem {
	newName: string;
	status: PreviewStatus;
	message: string | null;
}

export interface Preview {
	/** Indexado pelo caminho original do item. */
	items: Map<string, PreviewItem>;
	/** Erro de configuração que impede calcular os nomes (ex.: RegEx inválida). */
	configError: string | null;
	changed: number;
	errors: number;
}

function joinPath(dir: string, name: string): string {
	return dir === "/" ? `/${name}` : `${dir}/${name}`;
}

/**
 * Calcula os novos nomes de `selected` (na ordem recebida) e detecta conflitos:
 * nomes inválidos, nomes duplicados no lote e colisões com itens existentes
 * em `all` que não fazem parte do lote.
 */
export function buildPreview(
	selected: readonly FileEntry[],
	all: readonly FileEntry[],
	options: RenameOptions,
	now: Date = new Date(),
): Preview {
	const items = new Map<string, PreviewItem>();
	let renamer: ReturnType<typeof createRenamer>;
	try {
		renamer = createRenamer(options);
	} catch (error) {
		if (error instanceof RenameConfigError) {
			return { items, configError: error.message, changed: 0, errors: 0 };
		}
		throw error;
	}

	const folderCounters = new Map<string, number>();
	const targets = new Map<string, number>();
	const batch = new Set(selected.map((entry) => entry.path));

	selected.forEach((entry, index) => {
		const folderIndex = folderCounters.get(entry.dir) ?? 0;
		folderCounters.set(entry.dir, folderIndex + 1);

		const newName = renamer(entry, { index, folderIndex, now });
		const status: PreviewStatus = newName === entry.name ? "unchanged" : "ok";
		items.set(entry.path, { newName, status, message: null });

		const target = joinPath(entry.dir, newName);
		targets.set(target, (targets.get(target) ?? 0) + 1);
	});

	const existing = new Set(all.filter((entry) => !batch.has(entry.path)).map((e) => e.path));
	let changed = 0;
	let errors = 0;

	for (const entry of selected) {
		const item = items.get(entry.path);
		if (!item) continue;
		const target = joinPath(entry.dir, item.newName);
		const invalid = validateFileName(item.newName);

		if (invalid) {
			item.message = invalid;
		} else if ((targets.get(target) ?? 0) > 1) {
			item.message = "Nome duplicado no lote";
		} else if (item.status === "ok" && existing.has(target)) {
			item.message = "Já existe um item com esse nome";
		}

		if (item.message) {
			item.status = "error";
			errors++;
		} else if (item.status === "ok") {
			changed++;
		}
	}

	return { items, configError: null, changed, errors };
}
