import type { Dirent, Stats } from "node:fs";
import fs from "node:fs/promises";
import type { EntryGroup, EntryTuple, ListOptions } from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import { createHiddenCheck, type HiddenCheck } from "./hiddenFileDetector";

/** Pastas lidas ao mesmo tempo (modo Subpastas). */
const DIR_CONCURRENCY = 8;
/** `lstat` simultâneos por pasta. A fila real é a do libuv; isto só evita esperar um por um. */
const STAT_CONCURRENCY = 32;

export interface WalkOptions extends ListOptions {
	/** Interrompe a leitura entre pastas e entre lotes de `lstat`. */
	signal?: AbortSignal;
	platform?: string;
}

/** Executa `task` para cada item com no máximo `limit` ao mesmo tempo, mantendo a ordem. */
async function mapLimit<T, R>(
	items: readonly T[],
	limit: number,
	task: (item: T) => Promise<R>,
	signal?: AbortSignal,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			signal?.throwIfAborted();
			const index = next++;
			results[index] = await task(items[index] as T);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

async function readDir(dir: string): Promise<Dirent[]> {
	try {
		return await fs.readdir(dir, { withFileTypes: true });
	} catch {
		// Sem permissão, removida durante a listagem etc.: trata como vazia.
		return [];
	}
}

async function lstatOrNull(target: string): Promise<Stats | null> {
	try {
		return await fs.lstat(target);
	} catch {
		return null;
	}
}

interface DirResult {
	group: EntryGroup;
	/** Subpastas a percorrer no modo Subpastas. */
	subdirs: string[];
}

/**
 * Percorre `root` (e, no modo Subpastas, as subpastas em largura) e entrega os itens
 * pasta por pasta, na mesma ordem de uma leitura sequencial. Várias pastas e vários
 * `lstat` rodam ao mesmo tempo; links simbólicos não são seguidos (evita ciclos) e
 * pastas ocultas não são percorridas quando os ocultos estão escondidos.
 */
export async function* walkEntries(root: string, options: WalkOptions): AsyncGenerator<EntryGroup> {
	const { signal } = options;
	const paths = getPlatformPaths(options.platform ?? process.platform);
	// Começa a verificar os ocultos junto com a leitura, sem esperar por ela.
	const hiddenCheck: Promise<HiddenCheck> = createHiddenCheck(
		root,
		options.recursive,
		options.platform,
	);

	const readGroup = async (dir: string): Promise<DirResult> => {
		const [dirents, isHidden] = await Promise.all([readDir(dir), hiddenCheck]);
		const candidates: Array<{ name: string; path: string; hidden: boolean }> = [];
		for (const dirent of dirents) {
			const fullPath = paths.join(dir, dirent.name);
			const hidden = isHidden(fullPath, dirent.name);
			if (hidden && !options.showHidden) continue;
			candidates.push({ name: dirent.name, path: fullPath, hidden });
		}
		const stats = await mapLimit(
			candidates,
			STAT_CONCURRENCY,
			(item) => lstatOrNull(item.path),
			signal,
		);
		const items: EntryTuple[] = [];
		const subdirs: string[] = [];
		candidates.forEach((item, index) => {
			const stat = stats[index];
			if (!stat) return;
			const isDir = stat.isDirectory();
			if (isDir && options.recursive) subdirs.push(item.path);
			if (isDir ? !options.includeFolders : !options.includeFiles) return;
			items.push([
				item.name,
				isDir ? 1 : 0,
				item.hidden ? 1 : 0,
				isDir ? 0 : stat.size,
				stat.mtimeMs,
				stat.birthtimeMs || stat.ctimeMs,
			]);
		});
		return { group: { dir, items }, subdirs };
	};

	let level = [root];
	while (level.length > 0) {
		const nextLevel: string[] = [];
		for (let start = 0; start < level.length; start += DIR_CONCURRENCY) {
			signal?.throwIfAborted();
			const wave = await Promise.all(level.slice(start, start + DIR_CONCURRENCY).map(readGroup));
			for (const { group, subdirs } of wave) {
				nextLevel.push(...subdirs);
				if (group.items.length > 0) yield group;
			}
		}
		level = nextLevel;
	}
}
