import { execFile } from "node:child_process";
import path from "node:path";
import { getPlatformPaths } from "../shared/paths";

/** Diz se um item deve ser tratado como oculto. */
export type HiddenCheck = (fullPath: string, name: string) => boolean;

/** Linux/macOS: oculto é o que começa com ponto. */
const isDotFile: HiddenCheck = (_fullPath, name) => name.startsWith(".");

/** A árvore abre as mesmas pastas várias vezes seguidas: reaproveita a consulta por um tempo. */
const CACHE_MS = 5_000;
const cache = new Map<string, { time: number; hidden: Promise<Set<string>> }>();

/** Prefixo que deixa o `dir` passar de 260 caracteres sem depender do LongPathsEnabled. */
const LONG_PATH_PREFIX = "\\\\?\\";
/** Mesmo prefixo para caminhos de rede, que só o PowerShell aceita. */
const LONG_UNC_PREFIX = "\\\\?\\UNC\\";
/** Maior pasta de rede que o `dir` lista: 260 menos o "\*" e o terminador. */
const MAX_UNC_DIR_LENGTH = 257;

const isUncPath = (dir: string) => dir.startsWith("\\\\") || dir.startsWith("//");

/**
 * Pasta de rede comprida demais para o `dir`. No modo Subpastas, o `dir /s` pula essas
 * pastas sem avisar: quem percorre a árvore pede uma consulta própria para elas.
 */
export function needsOwnHiddenCheck(dir: string, platform: string = process.platform): boolean {
	return (
		platform === "win32" && isUncPath(dir) && path.win32.resolve(dir).length > MAX_UNC_DIR_LENGTH
	);
}

/**
 * Pasta a consultar no `dir`. Em unidades (locais ou mapeadas) recebe o prefixo `\\?\`,
 * que desliga a normalização do Windows: por isso o `resolve` antes. O cmd não aceita a
 * forma `\\?\UNC\`, então caminhos de rede (`\\servidor\pasta`) seguem sem prefixo.
 */
export function toDirQueryPath(dir: string): string {
	const full = path.win32.resolve(dir);
	return isUncPath(full) ? full : LONG_PATH_PREFIX + full;
}

/** Caminho de rede no formato longo do PowerShell: `\\servidor\pasta` → `\\?\UNC\servidor\pasta`. */
export function toLongUncPath(dir: string): string {
	return LONG_UNC_PREFIX + path.win32.resolve(dir).slice(2);
}

/** Volta o caminho com prefixo longo à forma usada pelo app. */
function withoutLongPrefix(line: string): string {
	if (line.startsWith(LONG_UNC_PREFIX)) return `\\\\${line.slice(LONG_UNC_PREFIX.length)}`;
	if (line.startsWith(LONG_PATH_PREFIX)) return line.slice(LONG_PATH_PREFIX.length);
	return line;
}

/**
 * Converte a saída do `dir` ou do PowerShell (um item por linha) em chaves minúsculas.
 * Sem `/s`, cada linha é só o nome; `baseDir` monta o caminho completo. Com `/s`, as
 * linhas vêm com o prefixo longo da consulta, que é retirado. Sem `trim`: no Windows um
 * nome pode começar com espaço.
 */
export function parseHiddenPathList(stdout: string, baseDir?: string): Set<string> {
	const paths = getPlatformPaths("win32");
	return new Set(
		stdout
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => (baseDir ? paths.join(baseDir, line) : withoutLongPrefix(line)).toLowerCase()),
	);
}

/** Roda o comando e lê a saída; em caso de falha, segue sem ocultar nada em vez de bloquear a listagem. */
function runHiddenQuery(
	file: string,
	args: string[],
	env: NodeJS.ProcessEnv,
	encoding: "utf16le" | "utf8",
	baseDir: string | undefined,
): Promise<Set<string>> {
	return new Promise((resolve) => {
		execFile(
			file,
			args,
			{
				env: { ...process.env, ...env },
				encoding: "buffer",
				windowsHide: true,
				windowsVerbatimArguments: file === "cmd.exe",
				timeout: 30_000,
				maxBuffer: 64 * 1024 * 1024,
			},
			(_error, stdout) =>
				resolve(
					parseHiddenPathList(Buffer.isBuffer(stdout) ? stdout.toString(encoding) : "", baseDir),
				),
		);
	});
}

/**
 * Lista os itens com o atributo "Oculto" do Windows pelo `dir` do cmd, que abre muito
 * mais rápido que o PowerShell. A pasta vai por variável de ambiente (o conteúdo não é
 * interpretado de novo pelo cmd) e `/u` faz a saída sair em UTF-16, sem perder acentos.
 * Sem itens ocultos, o `dir` termina com erro e saída vazia: o resultado é um conjunto vazio.
 */
function listWithDir(dir: string, recursive: boolean): Promise<Set<string>> {
	return runHiddenQuery(
		"cmd.exe",
		["/d", "/u", "/c", `dir /a:h /b "%RENAME_PLUS_DIR%"${recursive ? " /s" : ""}`],
		{ RENAME_PLUS_DIR: toDirQueryPath(dir) },
		"utf16le",
		recursive ? undefined : dir,
	);
}

/** Pastas de rede longas: o PowerShell aceita `\\?\UNC\`, o cmd não. Mais lento, por isso só aqui. */
const POWERSHELL_HIDDEN_SCRIPT = [
	"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
	"Get-ChildItem -LiteralPath $env:RENAME_PLUS_DIR -Force -Attributes Hidden" +
		" -Recurse:($env:RENAME_PLUS_RECURSIVE -eq '1') -ErrorAction SilentlyContinue" +
		" | ForEach-Object { if ($env:RENAME_PLUS_RECURSIVE -eq '1') { $_.FullName } else { $_.Name } }",
].join("; ");

function listWithPowerShell(dir: string, recursive: boolean): Promise<Set<string>> {
	return runHiddenQuery(
		"powershell.exe",
		[
			"-NoProfile",
			"-NonInteractive",
			"-ExecutionPolicy",
			"Bypass",
			"-Command",
			POWERSHELL_HIDDEN_SCRIPT,
		],
		{ RENAME_PLUS_DIR: toLongUncPath(dir), RENAME_PLUS_RECURSIVE: recursive ? "1" : "0" },
		"utf8",
		recursive ? undefined : dir,
	);
}

function listWindowsHiddenPaths(dir: string, recursive: boolean): Promise<Set<string>> {
	return needsOwnHiddenCheck(dir, "win32")
		? listWithPowerShell(dir, recursive)
		: listWithDir(dir, recursive);
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
