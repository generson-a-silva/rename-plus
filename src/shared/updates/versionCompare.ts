/** Repositório no GitHub onde as versões do app são publicadas (releases). */
export const GITHUB_REPOSITORY = "generson-a-silva/rename-plus";

/** Página de todas as versões, usada quando não há link de uma versão específica. */
export const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPOSITORY}/releases`;

interface ParsedVersion {
	core: [number, number, number];
	/** Identificadores de pré-lançamento ("beta.2" → ["beta", "2"]); vazio numa versão final. */
	prerelease: string[];
}

/** Interpreta "1.2.3", "v1.2.3" ou "1.2.3-beta.1". `null` se não for uma versão. */
export function parseVersion(text: string): ParsedVersion | null {
	const match =
		/^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?\s*$/.exec(text);
	if (!match) return null;
	return {
		core: [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)],
		prerelease: match[4] ? match[4].split(".") : [],
	};
}

function compareIdentifiers(a: string, b: string): number {
	const numericA = /^\d+$/.test(a);
	const numericB = /^\d+$/.test(b);
	if (numericA && numericB) return Number(a) - Number(b);
	// Pela especificação semver, identificadores numéricos vêm antes dos textuais.
	if (numericA) return -1;
	if (numericB) return 1;
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Compara duas versões semver: negativo se `a` é anterior, positivo se é posterior,
 * 0 se iguais. Versões inválidas são consideradas anteriores a qualquer válida.
 */
export function compareVersions(a: string, b: string): number {
	const left = parseVersion(a);
	const right = parseVersion(b);
	if (!left || !right) return left ? 1 : right ? -1 : 0;

	for (let i = 0; i < 3; i++) {
		const diff = (left.core[i] ?? 0) - (right.core[i] ?? 0);
		if (diff !== 0) return Math.sign(diff);
	}
	// "1.0.0-beta" < "1.0.0": a versão final vem depois dos pré-lançamentos.
	const finalLeft = left.prerelease.length === 0;
	const finalRight = right.prerelease.length === 0;
	if (finalLeft || finalRight) return finalLeft === finalRight ? 0 : finalLeft ? 1 : -1;
	const length = Math.max(left.prerelease.length, right.prerelease.length);
	for (let i = 0; i < length; i++) {
		const x = left.prerelease[i];
		const y = right.prerelease[i];
		if (x === undefined) return -1;
		if (y === undefined) return 1;
		const diff = compareIdentifiers(x, y);
		if (diff !== 0) return Math.sign(diff);
	}
	return 0;
}

/** "v1.4.0" → "1.4.0" (sem o "v" das tags), para exibição. */
export function normalizeVersion(text: string): string {
	return text.trim().replace(/^v/i, "");
}
