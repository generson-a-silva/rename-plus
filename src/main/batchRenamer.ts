import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { RenameFailure, RenameOperation, RenameResult } from "../shared/ipc";
import { getPlatformPaths } from "../shared/paths";
import { validateFileName } from "../shared/rename";
import { describeFileSystemError } from "./fileSystemErrors";
import { tMain, tMainRef } from "./mainLocale";

interface PlannedOperation extends RenameOperation {
	isDir: boolean;
}

/** Regras de caminho do sistema atual (no Windows, comparação sem diferenciar maiúsculas). */
const platformPaths = getPlatformPaths(process.platform);
const depth = (p: string) => p.split(path.sep).length;

async function exists(target: string): Promise<boolean> {
	try {
		await fs.lstat(target);
		return true;
	} catch {
		return false;
	}
}

/**
 * Indica se `target` existe e é outro item que não `source`. Em sistemas de arquivos
 * que ignoram maiúsculas (vfat, NTFS), "A.txt" → "a.txt" aponta para o mesmo inode.
 */
async function occupiedByOther(target: string, source: Stats): Promise<boolean> {
	try {
		const stats = await fs.lstat(target);
		return stats.ino !== source.ino || stats.dev !== source.dev;
	} catch {
		return false;
	}
}

function failure(op: RenameOperation, error: string): RenameResult {
	return { ok: false, renamed: [], failed: [{ ...op, error }] };
}

/** Verifica todo o lote antes de tocar no disco. */
async function plan(
	operations: readonly RenameOperation[],
): Promise<{ planned: PlannedOperation[] } | { error: RenameResult }> {
	const { key } = platformPaths;
	const sources = new Set<string>();
	const targets = new Set<string>();
	const ops: RenameOperation[] = [];
	const planned: PlannedOperation[] = [];

	for (const original of operations) {
		if (!path.isAbsolute(original.from) || !path.isAbsolute(original.to)) {
			return { error: failure(original, tMain("batch.notAbsolute")) };
		}
		// Normaliza separadores e barras repetidas ("C:/a//b" → "C:\a\b" no Windows).
		const op = { from: path.resolve(original.from), to: path.resolve(original.to) };
		// Mudar só maiúsculas/minúsculas ("a.txt" → "A.txt") é uma operação válida.
		if (op.from === op.to) continue;
		if (!platformPaths.equals(path.dirname(op.from), path.dirname(op.to))) {
			return { error: failure(op, tMain("batch.otherFolder")) };
		}
		const invalid = validateFileName(path.basename(op.to), process.platform);
		if (invalid) return { error: failure(op, tMainRef(invalid)) };
		if (sources.has(key(op.from))) return { error: failure(op, tMain("batch.repeated")) };
		if (targets.has(key(op.to))) return { error: failure(op, tMain("preview.duplicate")) };
		sources.add(key(op.from));
		targets.add(key(op.to));
		ops.push(op);
	}

	for (const op of ops) {
		let source: Stats;
		try {
			source = await fs.lstat(op.from);
		} catch {
			return { error: failure(op, tMain("batch.sourceMissing")) };
		}
		const sameItem = key(op.to) === key(op.from);
		if (!sameItem && !sources.has(key(op.to)) && (await occupiedByOther(op.to, source))) {
			return { error: failure(op, tMain("preview.exists")) };
		}
		planned.push({ ...op, isDir: source.isDirectory() });
	}

	return { planned };
}

/**
 * Renomeia o lote de forma atômica ("tudo ou nada"):
 * - itens mais profundos primeiro, para que renomear uma pasta não invalide os caminhos dos filhos;
 * - em duas fases (origem → temporário → destino), permitindo trocas como a ↔ b;
 * - se algo falhar, desfaz o que já foi feito.
 */
async function execute(planned: readonly PlannedOperation[]): Promise<RenameResult> {
	const journal: [string, string][] = [];
	const move = async (from: string, to: string) => {
		await fs.rename(from, to);
		journal.push([from, to]);
	};

	const groups = new Map<number, PlannedOperation[]>();
	for (const op of planned) {
		const level = depth(op.from);
		groups.set(level, [...(groups.get(level) ?? []), op]);
	}
	const levels = [...groups.keys()].sort((a, b) => b - a);
	const token = `${process.pid}-${Date.now().toString(36)}`;

	let current: PlannedOperation | null = null;
	try {
		for (const level of levels) {
			const ops = groups.get(level) ?? [];
			const temps = ops.map((op, i) =>
				path.join(path.dirname(op.from), `.rename-plus-${token}-${i}`),
			);

			for (const [i, op] of ops.entries()) {
				current = op;
				await move(op.from, temps[i] as string);
			}
			for (const [i, op] of ops.entries()) {
				current = op;
				// fs.rename pode sobrescrever destinos existentes; verifica antes.
				if (await exists(op.to)) throw new Error(tMain("preview.exists"));
				await move(temps[i] as string, op.to);
			}
		}
	} catch (error) {
		const rollbackErrors: string[] = [];
		for (const [from, to] of journal.reverse()) {
			try {
				await fs.rename(to, from);
			} catch (rollbackError) {
				rollbackErrors.push(`${to}: ${describeFileSystemError(rollbackError)}`);
			}
		}
		const message = describeFileSystemError(error);
		const failed: RenameFailure[] = [
			{
				from: current?.from ?? "",
				to: current?.to ?? "",
				error: rollbackErrors.length
					? tMain("batch.rollbackFailed", { error: message, details: rollbackErrors.join("; ") })
					: message,
			},
		];
		return { ok: false, renamed: [], failed };
	}

	return { ok: true, renamed: planned.map(({ from, to }) => ({ from, to })), failed: [] };
}

/** Caminho final de `target` depois que as pastas ancestrais renomeadas no lote mudaram de nome. */
function resolveFinalPath(target: string, folders: readonly PlannedOperation[]): string {
	let result = target;
	for (const folder of folders) {
		if (result.startsWith(`${folder.from}${path.sep}`)) {
			result = folder.to + result.slice(folder.from.length);
		}
	}
	return result;
}

function buildUndo(planned: readonly PlannedOperation[]): RenameOperation[] {
	// Mais profundas primeiro: cada prefixo é trocado antes do de sua pasta-mãe.
	const folders = planned.filter((op) => op.isDir).sort((a, b) => depth(b.from) - depth(a.from));
	return planned.map((op) => {
		const current = resolveFinalPath(op.to, folders);
		return { from: current, to: path.join(path.dirname(current), path.basename(op.from)) };
	});
}

let undoStack: RenameOperation[] | null = null;

export async function renameBatch(operations: readonly RenameOperation[]): Promise<RenameResult> {
	const result = await plan(operations);
	if ("error" in result) return result.error;
	if (result.planned.length === 0) return { ok: true, renamed: [], failed: [] };

	const outcome = await execute(result.planned);
	if (outcome.ok) undoStack = buildUndo(result.planned);
	return outcome;
}

export async function undoLastBatch(): Promise<RenameResult> {
	if (!undoStack) return { ok: false, renamed: [], failed: [] };
	const result = await plan(undoStack);
	if ("error" in result) return result.error;

	const outcome = await execute(result.planned);
	if (outcome.ok) undoStack = null;
	return outcome;
}

export function canUndo(): boolean {
	return undoStack !== null;
}
