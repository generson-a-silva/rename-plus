import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { SizeTotal } from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import { mapLimit } from "./directoryWalker";

/** `lstat`/`readdir` simultâneos: o disco trabalha em paralelo sem abrir milhares de pedidos. */
const CONCURRENCY = 32;
/** Intervalo mínimo entre os totais parciais enviados à interface. */
const PROGRESS_INTERVAL_MS = 150;

export interface SizeCalculationOptions {
	signal?: AbortSignal;
	onProgress?: (total: SizeTotal) => void;
	platform?: string;
}

/** Item a medir; `isDir` já conhecido pelo `readdir` dispensa o `lstat` das pastas. */
interface Pending {
	path: string;
	isDir?: boolean;
}

/**
 * Soma o tamanho dos arquivos de `targets`, entrando nas pastas (em largura, nível por
 * nível). Itens dentro de outra pasta pedida contam uma vez só; links simbólicos não são
 * seguidos (evita ciclos e contar o mesmo conteúdo duas vezes) e itens ilegíveis são pulados.
 */
export async function calculateTotalSize(
	targets: readonly string[],
	{ signal, onProgress, platform = process.platform }: SizeCalculationOptions = {},
): Promise<SizeTotal> {
	const total: SizeTotal = { bytes: 0, files: 0, folders: 0 };
	let lastProgress = Date.now();

	let level: Pending[] = withoutNested(targets, platform).map((target) => ({ path: target }));
	while (level.length > 0) {
		const next: Pending[] = [];
		await mapLimit(
			level,
			CONCURRENCY,
			async (item) => {
				if (!item.isDir) {
					const stats = await fs.lstat(item.path).catch(() => null);
					if (!stats?.isDirectory()) {
						if (stats) {
							total.bytes += stats.size;
							total.files++;
						}
						return;
					}
				}
				total.folders++;
				const dirents: Dirent[] = await fs
					.readdir(item.path, { withFileTypes: true })
					.catch(() => []);
				for (const dirent of dirents) {
					next.push({ path: path.join(item.path, dirent.name), isDir: dirent.isDirectory() });
				}
				const now = Date.now();
				if (onProgress && now - lastProgress >= PROGRESS_INTERVAL_MS) {
					lastProgress = now;
					onProgress({ ...total });
				}
			},
			signal,
		);
		level = next;
	}
	return total;
}

/** Tira os itens que já estão dentro de outra pasta pedida (e os repetidos). */
function withoutNested(targets: readonly string[], platform: string): string[] {
	const paths = getPlatformPaths(platform);
	const requested = new Set(targets.map(paths.key));
	const seen = new Set<string>();
	return targets.filter((target) => {
		const key = paths.key(target);
		if (seen.has(key)) return false;
		seen.add(key);
		// Sobe pelas pastas acima até a raiz (onde `dirname` devolve o próprio caminho).
		for (let child = target, dir = path.dirname(child); dir !== child; ) {
			if (requested.has(paths.key(dir))) return false;
			child = dir;
			dir = path.dirname(child);
		}
		return true;
	});
}
