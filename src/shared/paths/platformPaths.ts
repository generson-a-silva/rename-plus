/**
 * Operações de caminho que funcionam no renderer (sem `node:path`) e respeitam as
 * regras de cada sistema: separador, raízes (`/`, `C:\`, `\\servidor\pasta\`) e se
 * a comparação diferencia maiúsculas.
 */
export interface PlatformPaths {
	readonly sep: string;
	/** `true` no Windows: "Foto.jpg" e "foto.jpg" são o mesmo arquivo. */
	readonly caseInsensitive: boolean;
	/** Raiz normalizada ("/", "C:\", "\\servidor\pasta\") ou "" se o caminho for relativo. */
	root(path: string): string;
	isAbsolute(path: string): boolean;
	join(dir: string, name: string): string;
	/** Pasta-mãe; a raiz é a mãe de si mesma. */
	dirname(path: string): string;
	basename(path: string): string;
	/** Nomes das pastas após a raiz: "C:\a\b" → ["a", "b"]. */
	segments(path: string): string[];
	/** Chave para comparar/indexar caminhos (no Windows: minúsculas e separador "\"). */
	key(path: string): string;
	equals(a: string, b: string): boolean;
	/** `child` é igual a `parent` ou está dentro dele. */
	contains(parent: string, child: string): boolean;
	/** Caminho de `target` relativo a `base`; "." se forem iguais. */
	relative(base: string, target: string): string;
}

const POSIX_ROOT = /^\//;
const WINDOWS_DRIVE_ROOT = /^([A-Za-z]:)(?:[\\/]|$)/;
const WINDOWS_UNC_ROOT = /^[\\/]{2}([^\\/]+)[\\/]([^\\/]+)(?:[\\/]|$)/;

function createPlatformPaths(windows: boolean): PlatformPaths {
	const sep = windows ? "\\" : "/";
	const isSep = (char: string) => char === "/" || (windows && char === "\\");

	/** Raiz como aparece no texto original e sua forma normalizada. */
	const parseRoot = (path: string): { length: number; normalized: string } => {
		if (!windows)
			return POSIX_ROOT.test(path) ? { length: 1, normalized: "/" } : { length: 0, normalized: "" };
		const drive = WINDOWS_DRIVE_ROOT.exec(path);
		if (drive?.[1]) return { length: drive[0].length, normalized: `${drive[1].toUpperCase()}\\` };
		const unc = WINDOWS_UNC_ROOT.exec(path);
		if (unc) return { length: unc[0].length, normalized: `\\\\${unc[1]}\\${unc[2]}\\` };
		return { length: 0, normalized: "" };
	};

	/** Parte após a raiz, sem separadores no fim. */
	const restOf = (path: string, rootLength: number) => {
		let end = path.length;
		while (end > rootLength && isSep(path.charAt(end - 1))) end--;
		return path.slice(rootLength, end);
	};

	const lastSepIndex = (text: string) => {
		for (let i = text.length - 1; i >= 0; i--) if (isSep(text.charAt(i))) return i;
		return -1;
	};

	const key = (path: string): string => {
		const root = parseRoot(path);
		const rest = restOf(path, root.length);
		if (!windows) return root.normalized + rest;
		return (root.normalized + rest.replace(/\//g, "\\")).toLowerCase();
	};

	const contains = (parent: string, child: string): boolean => {
		const parentKey = key(parent);
		const childKey = key(child);
		if (parentKey === childKey) return true;
		return childKey.startsWith(parentKey.endsWith(sep) ? parentKey : parentKey + sep);
	};

	return {
		sep,
		caseInsensitive: windows,
		root: (path) => parseRoot(path).normalized,
		isAbsolute: (path) => parseRoot(path).length > 0,
		join: (dir, name) =>
			dir === "" || isSep(dir.charAt(dir.length - 1)) ? dir + name : dir + sep + name,
		dirname: (path) => {
			const root = parseRoot(path);
			const rest = restOf(path, root.length);
			const index = lastSepIndex(rest);
			if (index < 0) return root.length > 0 ? path.slice(0, root.length) : ".";
			return path.slice(0, root.length + index);
		},
		basename: (path) => {
			const rest = restOf(path, parseRoot(path).length);
			return rest.slice(lastSepIndex(rest) + 1);
		},
		segments: (path) =>
			restOf(path, parseRoot(path).length)
				.split(windows ? /[\\/]/ : "/")
				.filter(Boolean),
		key,
		equals: (a, b) => key(a) === key(b),
		contains,
		relative: (base, target) => {
			if (key(base) === key(target)) return ".";
			if (!contains(base, target)) return target;
			const root = parseRoot(base);
			const baseEnd = root.length + restOf(base, root.length).length;
			// Na raiz ("/", "C:\") o separador já faz parte de `base`; nas demais pastas, pula um.
			return target.slice(baseEnd === root.length ? root.length : baseEnd + 1);
		},
	};
}

const POSIX_PATHS = createPlatformPaths(false);
const WINDOWS_PATHS = createPlatformPaths(true);

/** Operações de caminho para um valor de `process.platform`. */
export function getPlatformPaths(platform: string): PlatformPaths {
	return platform === "win32" ? WINDOWS_PATHS : POSIX_PATHS;
}
