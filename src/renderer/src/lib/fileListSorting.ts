import type { FileEntry } from "@shared/ipc";
import { fileType } from "./fileFormatting";

export type SortKey = "name" | "size" | "type" | "mtime" | "dir";

export interface SortState {
	key: SortKey;
	desc: boolean;
}

export const DEFAULT_SORT: SortState = { key: "name", desc: false };

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

const COMPARATORS: Record<SortKey, (a: FileEntry, b: FileEntry) => number> = {
	name: (a, b) => collator.compare(a.name, b.name),
	size: (a, b) => a.size - b.size,
	type: (a, b) => collator.compare(fileType(a), fileType(b)),
	mtime: (a, b) => a.mtimeMs - b.mtimeMs,
	dir: (a, b) => collator.compare(a.dir, b.dir),
};

/** Ordena com pastas primeiro; empates são desfeitos pelo nome. */
export function sortEntries(entries: readonly FileEntry[], sort: SortState): FileEntry[] {
	const compare = COMPARATORS[sort.key] ?? COMPARATORS.name;
	const direction = sort.desc ? -1 : 1;
	return [...entries].sort((a, b) => {
		if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
		return compare(a, b) * direction || collator.compare(a.name, b.name);
	});
}
