import type { MessageRef } from "../i18n";
import type { FileEntry } from "../ipc";
import { getPlatformPaths } from "../paths";
import { validateFileName } from "./fileNameValidation";
import { createRenamer, RenameConfigError } from "./renameEngine";
import type { RenameOptions } from "./renameOptions";

export type PreviewStatus = "unchanged" | "ok" | "error";

export interface PreviewItem {
	newName: string;
	status: PreviewStatus;
	/** Motivo do erro, traduzido por quem exibe. */
	message: MessageRef | null;
}

export interface Preview {
	/** Indexado pelo caminho original do item. */
	items: Map<string, PreviewItem>;
	/** Erro de configuração que impede calcular os nomes (ex.: RegEx inválida). */
	configError: MessageRef | null;
	changed: number;
	errors: number;
}

export interface PreviewContext {
	/** Valor de `process.platform`: define as regras de nome e se maiúsculas importam. */
	platform?: string;
	now?: Date;
}

/**
 * Calcula os novos nomes de `selected` (na ordem recebida) e detecta conflitos:
 * nomes inválidos, nomes duplicados no lote e colisões com itens existentes
 * em `all` que não fazem parte do lote. No Windows, nomes que diferem só em
 * maiúsculas/minúsculas contam como o mesmo arquivo.
 */
export function buildPreview(
	selected: readonly FileEntry[],
	all: readonly FileEntry[],
	options: RenameOptions,
	{ platform = "linux", now = new Date() }: PreviewContext = {},
): Preview {
	const paths = getPlatformPaths(platform);
	const items = new Map<string, PreviewItem>();
	let renamer: ReturnType<typeof createRenamer>;
	try {
		renamer = createRenamer(options, platform);
	} catch (error) {
		if (error instanceof RenameConfigError) {
			return { items, configError: error.ref, changed: 0, errors: 0 };
		}
		throw error;
	}

	const folderCounters = new Map<string, number>();
	const targets = new Map<string, number>();
	const targetKey = (entry: FileEntry, name: string) => paths.key(paths.join(entry.dir, name));
	const batch = new Set(selected.map((entry) => paths.key(entry.path)));

	selected.forEach((entry, index) => {
		const folderIndex = folderCounters.get(entry.dir) ?? 0;
		folderCounters.set(entry.dir, folderIndex + 1);

		const newName = renamer(entry, { index, folderIndex, now });
		const status: PreviewStatus = newName === entry.name ? "unchanged" : "ok";
		items.set(entry.path, { newName, status, message: null });

		const target = targetKey(entry, newName);
		targets.set(target, (targets.get(target) ?? 0) + 1);
	});

	const existing = new Set(
		all.map((entry) => paths.key(entry.path)).filter((key) => !batch.has(key)),
	);
	let changed = 0;
	let errors = 0;

	for (const entry of selected) {
		const item = items.get(entry.path);
		if (!item) continue;
		const target = targetKey(entry, item.newName);
		const invalid = validateFileName(item.newName, platform);

		if (invalid) {
			item.message = invalid;
		} else if ((targets.get(target) ?? 0) > 1) {
			item.message = { key: "preview.duplicate" };
		} else if (item.status === "ok" && existing.has(target)) {
			item.message = { key: "preview.exists" };
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
