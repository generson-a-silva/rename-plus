import { execFile } from "node:child_process";

/** Diz se um item deve ser tratado como oculto. */
export type HiddenCheck = (fullPath: string, name: string) => boolean;

/** Linux/macOS: oculto é o que começa com ponto. */
const isDotFile: HiddenCheck = (_fullPath, name) => name.startsWith(".");

/**
 * Lista os itens com o atributo "Oculto" do Windows. A pasta vai por variável de
 * ambiente (sem problemas de aspas) e a saída é forçada para UTF-8.
 */
const WINDOWS_HIDDEN_SCRIPT = [
	"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
	"Get-ChildItem -LiteralPath $env:RENAME_PLUS_DIR -Force -Attributes Hidden" +
		" -Recurse:($env:RENAME_PLUS_RECURSIVE -eq '1') -ErrorAction SilentlyContinue" +
		" | ForEach-Object { $_.FullName }",
].join("; ");

/** Converte a saída do PowerShell (um caminho por linha) em chaves minúsculas. */
export function parseHiddenPathList(stdout: string): Set<string> {
	return new Set(
		stdout
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => line.toLowerCase()),
	);
}

function listWindowsHiddenPaths(dir: string, recursive: boolean): Promise<Set<string>> {
	return new Promise((resolve) => {
		execFile(
			"powershell.exe",
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-Command",
				WINDOWS_HIDDEN_SCRIPT,
			],
			{
				env: { ...process.env, RENAME_PLUS_DIR: dir, RENAME_PLUS_RECURSIVE: recursive ? "1" : "0" },
				windowsHide: true,
				timeout: 30_000,
				maxBuffer: 64 * 1024 * 1024,
			},
			// Em caso de falha, segue sem ocultar nada em vez de bloquear a listagem.
			(_error, stdout) => resolve(parseHiddenPathList(stdout ?? "")),
		);
	});
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
	const hidden = await listWindowsHiddenPaths(dir, recursive);
	return (fullPath) => hidden.has(fullPath.toLowerCase());
}
