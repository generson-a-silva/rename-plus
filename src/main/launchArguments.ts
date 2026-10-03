import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LaunchMode, LaunchRequest } from "../shared/ipc";

/** Opções aceitas na linha de comando: `rename-plus [--open | --select] [--] caminhos…`. */
export const LAUNCH_FLAGS = { open: "--open", select: "--select" } as const;

/** Regras de caminho: as do sistema atual; os testes escolhem uma explicitamente. */
export type PathPlatform = "posix" | "win32";

const CURRENT_PLATFORM: PathPlatform = process.platform === "win32" ? "win32" : "posix";

/** `file:///home/x/a%20b` → `/home/x/a b` (Nautilus/Caja informam a pasta atual assim). */
function toPath(arg: string, cwd: string, platform: PathPlatform): string | null {
	if (/^file:\/\//i.test(arg)) {
		try {
			return fileURLToPath(arg, { windows: platform === "win32" });
		} catch {
			return null;
		}
	}
	// Outros esquemas (smb://, sftp://…) não são caminhos locais.
	if (/^[a-z][a-z0-9+.-]+:\/\//i.test(arg)) return null;
	return path[platform].resolve(cwd, arg);
}

/**
 * Interpreta os argumentos (sem o executável e, em desenvolvimento, sem o caminho do
 * app). Opções desconhecidas, como as do Chromium (`--no-sandbox`), são ignoradas;
 * depois de `--` tudo é caminho. Sem caminhos, devolve `null`.
 *
 * Sem `--select`, um único caminho é aberto (`open`); vários viram seleção.
 */
export function parseLaunchArguments(
	args: readonly string[],
	cwd: string,
	platform: PathPlatform = CURRENT_PLATFORM,
): LaunchRequest | null {
	let mode: LaunchMode = "open";
	const paths: string[] = [];
	let onlyPaths = false;
	for (const arg of args) {
		if (!onlyPaths && arg.startsWith("-")) {
			if (arg === "--") onlyPaths = true;
			else if (arg === LAUNCH_FLAGS.select) mode = "select";
			else if (arg === LAUNCH_FLAGS.open) mode = "open";
			continue;
		}
		const resolved = arg ? toPath(arg, cwd, platform) : null;
		if (resolved && !paths.includes(resolved)) paths.push(resolved);
	}
	if (paths.length === 0) return null;
	return { mode: paths.length > 1 ? "select" : mode, paths };
}

/** Junta pedidos que chegaram quase juntos (o Explorador abre um processo por item selecionado). */
export function mergeLaunchRequests(requests: readonly LaunchRequest[]): LaunchRequest[] {
	const merged: LaunchRequest[] = [];
	for (const request of requests) {
		const last = merged.at(-1);
		if (last && last.mode === "select" && request.mode === "select") {
			for (const item of request.paths) if (!last.paths.includes(item)) last.paths.push(item);
		} else {
			merged.push({ mode: request.mode, paths: [...request.paths] });
		}
	}
	return merged;
}
