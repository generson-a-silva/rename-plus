import { execFile } from "node:child_process";
import { getPlatformPaths } from "../shared/paths";

/** Diz se um item deve ser tratado como oculto. */
export type HiddenCheck = (fullPath: string, name: string) => boolean;

/** Linux/macOS: oculto é o que começa com ponto. */
const isDotFile: HiddenCheck = (_fullPath, name) => name.startsWith(".");

/** A árvore abre as mesmas pastas várias vezes seguidas: reaproveita a consulta por um tempo. */
const CACHE_MS = 5_000;
const cache = new Map<string, { time: number; hidden: Promise<Set<string>> }>();

/**
 * Converte a saída do `dir` (um item por linha) em chaves minúsculas. Com `dir` sem
 * `/s`, cada linha é só o nome; `baseDir` monta o caminho completo.
 */
export function parseHiddenPathList(stdout: string, baseDir?: string): Set<string> {
	const paths = getPlatformPaths("win32");
	return new Set(
		stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => (baseDir ? paths.join(baseDir, line) : line).toLowerCase()),
	);
}

/**
 * Lista os itens com o atributo "Oculto" do Windows pelo `dir` do cmd, que abre muito
 * mais rápido que o PowerShell. A pasta vai por variável de ambiente (o conteúdo não é
 * interpretado de novo pelo cmd) e `/u` faz a saída sair em UTF-16, sem perder acentos.
 * Sem itens ocultos, o `dir` termina com erro e saída vazia: o resultado é um conjunto vazio.
 */
function listWindowsHiddenPaths(dir: string, recursive: boolean): Promise<Set<string>> {
	const command = `dir /a:h /b "%RENAME_PLUS_DIR%"${recursive ? " /s" : ""}`;
	return new Promise((resolve) => {
		execFile(
			"cmd.exe",
			["/d", "/u", "/c", command],
			{
				env: { ...process.env, RENAME_PLUS_DIR: dir },
				encoding: "buffer",
				windowsHide: true,
				windowsVerbatimArguments: true,
				timeout: 30_000,
				maxBuffer: 64 * 1024 * 1024,
			},
			// Em caso de falha, segue sem ocultar nada em vez de bloquear a listagem.
			(_error, stdout) =>
				resolve(
					parseHiddenPathList(
						Buffer.isBuffer(stdout) ? stdout.toString("utf16le") : "",
						recursive ? undefined : dir,
					),
				),
		);
	});
}

function cachedHiddenPaths(dir: string, recursive: boolean): Promise<Set<string>> {
	// O modo Subpastas consulta a árvore inteira: não guarda, para não reter conjuntos grandes.
	if (recursive) return listWindowsHiddenPaths(dir, true);
	const key = dir.toLowerCase();
	const now = Date.now();
	const hit = cache.get(key);
	if (hit && now - hit.time < CACHE_MS) return hit.hidden;
	const hidden = listWindowsHiddenPaths(dir, false);
	cache.set(key, { time: now, hidden });
	for (const [other, entry] of cache) if (now - entry.time >= CACHE_MS) cache.delete(other);
	return hidden;
}

/**
 * Prepara a verificação de ocultos para uma listagem de `dir`. No Windows consulta
 * os atributos uma única vez (incluindo subpastas se `recursive`).
 */
export async function createHiddenCheck(
	dir: string,
	recursive: boolean,
	platform: string = process.platform,
): Promise<HiddenCheck> {
	if (platform !== "win32") return isDotFile;
	const hidden = await cachedHiddenPaths(dir, recursive);
	return (fullPath) => hidden.has(fullPath.toLowerCase());
}
