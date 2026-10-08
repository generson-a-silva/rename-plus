import { type Dirent, realpath } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { DirEntry, FileSystemRoot } from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import { createHiddenCheck } from "./hiddenFileDetector";

/** `realpath` nativo do sistema: no Windows devolve a grafia real das pastas. */
const realpathNative = promisify(realpath.native);

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
	const [dirents, isHidden] = await Promise.all([readDir(dir), createHiddenCheck(dir, false)]);
	const candidates = dirents.flatMap((dirent) => {
		const fullPath = path.join(dir, dirent.name);
		const hidden = isHidden(fullPath, dirent.name);
		return hidden && !showHidden ? [] : [{ dirent, fullPath, hidden }];
	});
	// Só os links simbólicos precisam de `stat`; todos ao mesmo tempo.
	const isDir = await Promise.all(
		candidates.map(({ dirent, fullPath }) => isDirectory(dirent, fullPath)),
	);
	return candidates
		.filter((_item, index) => isDir[index])
		.map(({ dirent, fullPath, hidden }) => ({ name: dirent.name, path: fullPath, hidden }))
		.sort((a, b) => collator.compare(a.name, b.name));
}

/** Pasta pessoal mais "/" (Linux) ou as unidades disponíveis (Windows). */
export async function listRoots(): Promise<FileSystemRoot[]> {
	const home: FileSystemRoot = { kind: "home", path: os.homedir() };
	if (process.platform !== "win32") return [home, { kind: "filesystem", path: "/" }];

	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	const drives = await Promise.all(
		letters.map(async (letter) => {
			const drive = `${letter}:\\`;
			return (await isAccessible(drive)) ? drive : null;
		}),
	);
	return [
		home,
		...drives.flatMap((drive): FileSystemRoot[] => (drive ? [{ kind: "drive", path: drive }] : [])),
	];
}

/** Unidades de rede desconectadas ou leitores vazios podem demorar: desiste após o limite. */
function isAccessible(target: string, timeoutMs = 1500): Promise<boolean> {
	return new Promise((resolve) => {
		const timer = setTimeout(() => resolve(false), timeoutMs);
		timer.unref();
		fs.access(target).then(
			() => resolve(true),
			() => resolve(false),
		);
	});
}

/**
 * Converte um caminho digitado em caminho absoluto canônico de uma pasta existente,
 * ou `null`. No Windows corrige a grafia ("c:/users" → "C:\Users") para que a
 * árvore e a lista usem sempre o mesmo texto para a mesma pasta.
 */
export async function resolveDirectory(input: string): Promise<string | null> {
	let target = input.trim();
	if (process.platform === "win32" && /^[A-Za-z]:$/.test(target)) target += "\\";
	if (!target || !path.isAbsolute(target)) return null;

	let resolved = path.resolve(target);
	try {
		if (process.platform === "win32") {
			const real = await realpathNative(resolved);
			// Unidades mapeadas viram caminhos de rede ("\\servidor\pasta"); nesse caso
			// mantém a letra da unidade, que é a raiz exibida na árvore.
			const paths = getPlatformPaths("win32");
			if (paths.root(real) === paths.root(resolved)) resolved = real;
		}
		return (await fs.stat(resolved)).isDirectory() ? resolved : null;
	} catch {
		return null;
	}
}
