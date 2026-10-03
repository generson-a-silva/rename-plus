import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { RenameFailure, RenameOperation, RenameResult } from "../shared/ipc";
import { validateFileName } from "../shared/rename";

interface PlannedOperation extends RenameOperation {
	isDir: boolean;
}

const depth = (p: string) => p.split("/").length;

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
	const ops = operations.filter((op) => op.from !== op.to);
	const sources = new Set<string>();
	const targets = new Set<string>();
	const planned: PlannedOperation[] = [];

	for (const op of ops) {
		if (!path.isAbsolute(op.from) || !path.isAbsolute(op.to)) {
			return { error: failure(op, "Caminho não absoluto") };
		}
		if (path.dirname(op.from) !== path.dirname(op.to)) {
			return { error: failure(op, "O destino deve ficar na mesma pasta") };
		}
		const invalid = validateFileName(path.basename(op.to));
		if (invalid) return { error: failure(op, invalid) };
		if (sources.has(op.from)) return { error: failure(op, "Item repetido no lote") };
		if (targets.has(op.to)) return { error: failure(op, "Nome duplicado no lote") };
		sources.add(op.from);
		targets.add(op.to);
	}

	for (const op of ops) {
		let source: Stats;
		try {
			source = await fs.lstat(op.from);
		} catch {
			return { error: failure(op, "O item original não existe mais") };
		}
		if (!sources.has(op.to) && (await occupiedByOther(op.to, source))) {
			return { error: failure(op, "Já existe um item com esse nome") };
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
				// fs.rename sobrescreve destinos existentes no Linux; verifica antes.
				if (await exists(op.to)) throw new Error("Já existe um item com esse nome");
				await move(temps[i] as string, op.to);
			}
		}
	} catch (error) {
		const rollbackErrors: string[] = [];
		for (const [from, to] of journal.reverse()) {
			try {
				await fs.rename(to, from);
			} catch (rollbackError) {
				rollbackErrors.push(`${to}: ${(rollbackError as Error).message}`);
			}
		}
		const message = (error as NodeJS.ErrnoException).message;
		const failed: RenameFailure[] = [
			{
				from: current?.from ?? "",
				to: current?.to ?? "",
				error: rollbackErrors.length
					? `${message}. Falha ao desfazer: ${rollbackErrors.join("; ")}`
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
		if (result.startsWith(`${folder.from}/`)) {
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
