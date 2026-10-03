import fs from "node:fs/promises";
import path from "node:path";
import type { FileOperationFailure, FileOperationResult } from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import { splitName, validateFileName } from "../shared/rename";
import { describeFileSystemError } from "./fileSystemErrors";
import { tMain, tMainRef } from "./mainLocale";

const platformPaths = getPlatformPaths(process.platform);

async function exists(target: string): Promise<boolean> {
	try {
		await fs.lstat(target);
		return true;
	} catch {
		return false;
	}
}

function result(created: string[], failed: FileOperationFailure[]): FileOperationResult {
	return { ok: failed.length === 0, created, failed };
}

/**
 * Primeiro caminho livre para `name` dentro de `dir`, no estilo dos gerenciadores de
 * arquivos: "foto.jpg" → "foto (2).jpg" → "foto (3).jpg"…
 */
export async function findAvailablePath(
	dir: string,
	name: string,
	isDir: boolean,
): Promise<string> {
	const first = path.join(dir, name);
	if (!(await exists(first))) return first;
	const { base, ext } = splitName(name, isDir);
	for (let n = 2; ; n++) {
		const candidate = path.join(dir, ext ? `${base} (${n}).${ext}` : `${base} (${n})`);
		if (!(await exists(candidate))) return candidate;
	}
}

export async function createFolder(parentDir: string, name: string): Promise<FileOperationResult> {
	const target = path.join(parentDir, name);
	const invalid = validateFileName(name, process.platform);
	if (invalid) return result([], [{ path: target, error: tMainRef(invalid) }]);
	try {
		// Sem `recursive`: falha com EEXIST se já houver um item com esse nome.
		await fs.mkdir(target);
		return result([target], []);
	} catch (error) {
		return result([], [{ path: target, error: describeFileSystemError(error) }]);
	}
}

type Transfer = (source: string, target: string) => Promise<void>;

const copy: Transfer = (source, target) =>
	fs.cp(source, target, {
		recursive: true,
		errorOnExist: true,
		force: false,
		preserveTimestamps: true,
		verbatimSymlinks: true,
	});

/** Move com `rename`; entre discos diferentes (EXDEV), copia e depois apaga a origem. */
const move: Transfer = async (source, target) => {
	try {
		await fs.rename(source, target);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
		await copy(source, target);
		await fs.rm(source, { recursive: true });
	}
};

async function transferItems(
	sources: readonly string[],
	targetDir: string,
	mode: "copy" | "move",
): Promise<FileOperationResult> {
	const created: string[] = [];
	const failed: FileOperationFailure[] = [];

	for (const source of sources) {
		try {
			const stats = await fs.lstat(source);
			const isDir = stats.isDirectory();
			if (mode === "move" && platformPaths.equals(path.dirname(source), targetDir)) continue;
			if (isDir && platformPaths.contains(source, targetDir)) {
				const error = tMain(
					mode === "copy" ? "transfer.copyIntoItself" : "transfer.moveIntoItself",
				);
				failed.push({ path: source, error });
				continue;
			}
			const target = await findAvailablePath(targetDir, path.basename(source), isDir);
			await (mode === "copy" ? copy : move)(source, target);
			created.push(target);
		} catch (error) {
			failed.push({ path: source, error: describeFileSystemError(error) });
		}
	}

	return result(created, failed);
}

/** Exclui permanentemente (arquivos e pastas com todo o conteúdo). */
export async function deleteItems(paths: readonly string[]): Promise<FileOperationResult> {
	const failed: FileOperationFailure[] = [];
	for (const target of paths) {
		try {
			await fs.rm(target, { recursive: true });
		} catch (error) {
			failed.push({ path: target, error: describeFileSystemError(error) });
		}
	}
	return result([], failed);
}

/** Copia cada item para `targetDir`; nomes já existentes ganham sufixo " (2)", " (3)"… */
export function copyItems(
	sources: readonly string[],
	targetDir: string,
): Promise<FileOperationResult> {
	return transferItems(sources, targetDir, "copy");
}

/** Move cada item para `targetDir`; itens que já estão lá são ignorados. */
export function moveItems(
	sources: readonly string[],
	targetDir: string,
): Promise<FileOperationResult> {
	return transferItems(sources, targetDir, "move");
}
