/** Caminho de `target` relativo a `base`, ou "." quando forem iguais. */
export function relativePath(base: string, target: string): string {
	if (target === base) return ".";
	const prefix = base.endsWith("/") ? base : `${base}/`;
	return target.startsWith(prefix) ? target.slice(prefix.length) : target;
}

export function parentPath(path: string): string {
	if (path === "/") return "/";
	const index = path.replace(/\/+$/, "").lastIndexOf("/");
	return index <= 0 ? "/" : path.slice(0, index);
}

export function joinPath(dir: string, name: string): string {
	return dir === "/" ? `/${name}` : `${dir}/${name}`;
}

export function baseName(path: string): string {
	return path.split("/").pop() ?? path;
}

/** Normaliza um caminho digitado: expande `~`, remove barras duplicadas e a barra final. */
export function normalizeTypedPath(input: string, home: string | null): string {
	let path = input.trim();
	if (home && (path === "~" || path.startsWith("~/"))) path = home + path.slice(1);
	path = path.replace(/\/+/g, "/");
	return path.length > 1 ? path.replace(/\/$/, "") : path;
}

/** Pasta-raiz da árvore onde `path` deve aparecer: a pasta pessoal ou "/". */
export function treeRootFor(path: string, home: string): string {
	return path === home || path.startsWith(`${home}/`) ? home : "/";
}
