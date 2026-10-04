import { escapeRegExp } from "./textTransforms";

/**
 * Converte uma máscara com curingas (ex.: "*.jpg; *.png; foto??.*") em um
 * filtro. Sem diferenciar maiúsculas. Máscara vazia aceita tudo.
 */
export function createMaskFilter(mask: string): (name: string) => boolean {
	const patterns = mask
		.split(/[;,]/)
		.map((part) => part.trim())
		.filter((part) => part && part !== "*" && part !== "*.*");
	if (patterns.length === 0) return () => true;

	const regexes = patterns.map((pattern) => {
		const source = escapeRegExp(pattern).replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
		return new RegExp(`^${source}$`, "i");
	});
	return (name) => regexes.some((regex) => regex.test(name));
}
