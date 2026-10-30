import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const found = new Map<string, Promise<string | null>>();

async function isExecutable(file: string): Promise<boolean> {
	return fs.access(file, fs.constants.X_OK).then(
		() => true,
		() => false,
	);
}

/**
 * Primeiro programa encontrado: os caminhos fixos de `locations` e, depois, cada nome de
 * `names` nas pastas do PATH (no Windows, com ".exe"). Resultado guardado por consulta.
 */
export function findExecutable(names: readonly string[], locations: readonly string[] = []) {
	const key = [...names, "|", ...locations].join("\n");
	let result = found.get(key);
	if (!result) {
		result = (async () => {
			const suffix = process.platform === "win32" ? ".exe" : "";
			const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
			const candidates = [
				...locations,
				...dirs.flatMap((dir) => names.map((name) => path.join(dir, name + suffix))),
			];
			for (const candidate of candidates) {
				if (await isExecutable(candidate)) return candidate;
			}
			return null;
		})();
		found.set(key, result);
	}
	return result;
}

/** Roda um programa e devolve a saída padrão em bytes; rejeita em erro ou tempo esgotado. */
export function runTool(file: string, args: readonly string[], timeoutMs: number): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		execFile(
			file,
			args,
			{ timeout: timeoutMs, windowsHide: true, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
			(error, stdout) => (error ? reject(error) : resolve(stdout)),
		);
	});
}

/**
 * Fila em que só o pedido mais recente roda: uma tarefa por vez, e quem estava esperando
 * quando chegou outro pedido desiste (`null`). Passar por vários arquivos com as setas
 * não enfileira conversões lentas que ninguém vai ver.
 */
export function createLatestOnlyQueue() {
	let running: Promise<unknown> = Promise.resolve();
	let latestTicket = 0;
	return async <T>(task: () => Promise<T>): Promise<T | null> => {
		const ticket = ++latestTicket;
		await running.catch(() => undefined);
		if (ticket !== latestTicket) return null;
		const job = task();
		running = job;
		return job;
	};
}

/** Pasta temporária própria para a saída de um programa, apagada ao fim de `task`. */
export async function withTempDir<T>(task: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-preview-"));
	try {
		return await task(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}
