import { getPlatformPaths } from "@shared/paths";

/** Regras de caminho do sistema em que o app está rodando ("/" no Linux, "\" no Windows). */
export const platformPaths = getPlatformPaths(window.api.platform);

/** Caminho de `target` relativo a `base`, ou "." quando forem iguais. */
export function relativePath(base: string, target: string): string {
	return platformPaths.relative(base, target);
}

/** Pasta-mãe; a raiz ("/", "C:\") é a mãe de si mesma. */
export function parentPath(path: string): string {
	return platformPaths.dirname(path);
}

export function joinPath(dir: string, name: string): string {
	return platformPaths.join(dir, name);
}

export function baseName(path: string): string {
	return platformPaths.basename(path);
}

export function isRootPath(path: string): boolean {
	return platformPaths.dirname(path) === path;
}

/**
 * Expande "~" para a pasta pessoal em um caminho digitado. O restante da
 * normalização (barras, maiúsculas no Windows) é feito pelo processo principal.
 */
export function expandHomeShortcut(input: string, home: string | null): string {
	const path = input.trim();
	if (!home || !path.startsWith("~")) return path;
	const rest = path.slice(1);
	if (rest === "") return home;
	return /^[\\/]/.test(rest) ? joinPath(home, rest.replace(/^[\\/]+/, "")) : path;
}

/**
 * Raiz da árvore onde `path` deve aparecer: a mais específica que o contém
 * (a pasta pessoal tem prioridade sobre "/" ou "C:\"), ou `null`.
 */
export function treeRootFor(path: string, roots: readonly string[]): string | null {
	let best: string | null = null;
	for (const root of roots) {
		if (platformPaths.contains(root, path) && (!best || root.length > best.length)) best = root;
	}
	return best;
}
