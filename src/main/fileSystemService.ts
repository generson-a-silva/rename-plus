import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { DirEntry, FileEntry, ListOptions, ListResult } from "../shared/ipc";

/** Limite de itens por listagem, para não travar a interface em pastas gigantes. */
const MAX_ENTRIES = 50_000;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

async function readDir(dir: string): Promise<Dirent[]> {
	try {
		return await fs.readdir(dir, { withFileTypes: true });
	} catch {
		// Sem permissão, removida durante a listagem etc.: trata como vazia.
		return [];
	}
}

/** Considera links simbólicos que apontam para pastas. */
async function isDirectory(dirent: Dirent, fullPath: string): Promise<boolean> {
	if (dirent.isDirectory()) return true;
	if (!dirent.isSymbolicLink()) return false;
	try {
		return (await fs.stat(fullPath)).isDirectory();
	} catch {
		return false;
	}
}

export async function listDirectories(dir: string, showHidden: boolean): Promise<DirEntry[]> {
	const dirents = await readDir(dir);
	const result: DirEntry[] = [];
	for (const dirent of dirents) {
		if (!showHidden && dirent.name.startsWith(".")) continue;
		const fullPath = path.join(dir, dirent.name);
		if (await isDirectory(dirent, fullPath)) result.push({ name: dirent.name, path: fullPath });
	}
	return result.sort((a, b) => collator.compare(a.name, b.name));
}

export async function listEntries(root: string, options: ListOptions): Promise<ListResult> {
	const entries: FileEntry[] = [];
	const queue = [root];

	while (queue.length > 0) {
		const dir = queue.shift() as string;
		const dirents = await readDir(dir);

		for (const dirent of dirents) {
			if (!options.showHidden && dirent.name.startsWith(".")) continue;
			const fullPath = path.join(dir, dirent.name);

			let stats: Awaited<ReturnType<typeof fs.lstat>>;
			try {
				stats = await fs.lstat(fullPath);
			} catch {
				continue;
			}

			const isDir = stats.isDirectory();
			// Links simbólicos não são seguidos na recursão, evitando ciclos.
			if (isDir && options.recursive) queue.push(fullPath);
			if (isDir ? !options.includeFolders : !options.includeFiles) continue;

			entries.push({
				path: fullPath,
				dir,
				name: dirent.name,
				isDir,
				size: isDir ? 0 : stats.size,
				mtimeMs: stats.mtimeMs,
				birthtimeMs: stats.birthtimeMs || stats.ctimeMs,
			});
			if (entries.length >= MAX_ENTRIES) return { entries, truncated: true };
		}
	}

	return { entries, truncated: false };
}

export async function pathExists(target: string): Promise<boolean> {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}
