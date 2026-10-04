import { escapeRegExp } from "../rename";

/**
 * Construtor visual de RegEx: o usuário monta o padrão com blocos ("Início do nome",
 * "Texto", "Números"…) e a substituição com blocos ("Texto", "Trecho capturado"…),
 * sem digitar a expressão. Este módulo traduz os blocos para `match`/`replace`.
 */

export const PATTERN_BLOCK_TYPES = [
	"start",
	"end",
	"text",
	"digit",
	"letter",
	"letterOrDigit",
	"space",
	"separator",
	"anyChar",
	"oneOf",
	"noneOf",
	"alternatives",
] as const;

export type PatternBlockType = (typeof PATTERN_BLOCK_TYPES)[number];

export const QUANTIFIER_KINDS = [
	"one",
	"optional",
	"oneOrMore",
	"zeroOrMore",
	"exactly",
	"between",
] as const;

export type QuantifierKind = (typeof QUANTIFIER_KINDS)[number];

/** Quantas vezes o bloco se repete. */
export interface Quantifier {
	kind: QuantifierKind;
	/** "exactly": a quantidade; "between": o mínimo. */
	min: number;
	/** "between": o máximo. */
	max: number;
	/** Nas repetições, pega o mínimo possível em vez do máximo. */
	lazy: boolean;
}

export interface PatternBlock {
	id: string;
	type: PatternBlockType;
	/** Texto exato, caracteres aceitos/recusados ou alternativas separadas por `;`. */
	value: string;
	quantifier: Quantifier;
	/** Guarda o trecho encontrado para usá-lo na substituição. */
	capture: boolean;
}

export const REPLACEMENT_BLOCK_TYPES = ["text", "group", "match"] as const;

export type ReplacementBlockType = (typeof REPLACEMENT_BLOCK_TYPES)[number];

export interface ReplacementBlock {
	id: string;
	type: ReplacementBlockType;
	/** "text": o texto inserido. */
	value: string;
	/** "group": `id` do bloco do padrão capturado (sobrevive a reordenações). */
	ref: string;
}

export interface RegexBuilderModel {
	pattern: PatternBlock[];
	replacement: ReplacementBlock[];
}

interface PatternBlockInfo {
	/** Usa `value`. */
	hasValue: boolean;
	/** Aceita repetição e captura (âncoras não). */
	quantifiable: boolean;
	/** Expressão de um único elemento (não precisa de grupo para repetir). */
	atom?: string;
}

export const PATTERN_BLOCK_INFO: Record<PatternBlockType, PatternBlockInfo> = {
	start: { hasValue: false, quantifiable: false, atom: "^" },
	end: { hasValue: false, quantifiable: false, atom: "$" },
	text: { hasValue: true, quantifiable: true },
	digit: { hasValue: false, quantifiable: true, atom: "\\d" },
	letter: { hasValue: false, quantifiable: true, atom: "\\p{L}" },
	letterOrDigit: { hasValue: false, quantifiable: true, atom: "[\\p{L}\\p{N}]" },
	space: { hasValue: false, quantifiable: true, atom: "\\s" },
	separator: { hasValue: false, quantifiable: true, atom: "[\\s._-]" },
	anyChar: { hasValue: false, quantifiable: true, atom: "." },
	oneOf: { hasValue: true, quantifiable: true },
	noneOf: { hasValue: true, quantifiable: true },
	alternatives: { hasValue: true, quantifiable: true },
};

/** Repetição padrão de cada tipo ao ser criado: classes de caracteres costumam vir em sequência. */
const DEFAULT_QUANTIFIER: Partial<Record<PatternBlockType, QuantifierKind>> = {
	digit: "oneOrMore",
	letter: "oneOrMore",
	letterOrDigit: "oneOrMore",
	space: "oneOrMore",
	anyChar: "oneOrMore",
};

export function createPatternBlock(
	type: PatternBlockType,
	id: string,
	patch: Partial<Omit<PatternBlock, "id" | "type" | "quantifier">> & {
		quantifier?: Partial<Quantifier>;
	} = {},
): PatternBlock {
	return {
		id,
		type,
		value: patch.value ?? "",
		capture: patch.capture ?? false,
		quantifier: {
			kind: DEFAULT_QUANTIFIER[type] ?? "one",
			min: 1,
			max: 3,
			lazy: false,
			...patch.quantifier,
		},
	};
}

export function createReplacementBlock(
	type: ReplacementBlockType,
	id: string,
	patch: Partial<Pick<ReplacementBlock, "value" | "ref">> = {},
): ReplacementBlock {
	return { id, type, value: patch.value ?? "", ref: patch.ref ?? "" };
}

/** Escapa caracteres com significado especial dentro de `[...]` (modo `u`). */
function escapeClass(text: string): string {
	return text.replace(/[\\\]^[-]/g, "\\$&");
}

/** Expressão do bloco sem repetição/captura, ou `null` se ele ainda não tem conteúdo. */
function blockAtom(block: PatternBlock): { source: string; single: boolean } | null {
	const fixed = PATTERN_BLOCK_INFO[block.type].atom;
	if (fixed) return { source: fixed, single: true };
	switch (block.type) {
		case "text": {
			if (!block.value) return null;
			return { source: escapeRegExp(block.value), single: [...block.value].length === 1 };
		}
		case "oneOf":
		case "noneOf": {
			const chars = [...new Set(block.value)].join("");
			if (!chars) return null;
			return {
				source: `[${block.type === "noneOf" ? "^" : ""}${escapeClass(chars)}]`,
				single: true,
			};
		}
		case "alternatives": {
			const options = splitAlternatives(block.value);
			if (options.length === 0) return null;
			if (options.length === 1) {
				const [only = ""] = options;
				return { source: escapeRegExp(only), single: [...only].length === 1 };
			}
			return { source: `(?:${options.map(escapeRegExp).join("|")})`, single: true };
		}
		default:
			return null;
	}
}

/** "jpg; jpeg ;png" → ["jpg", "jpeg", "png"] (sem vazios nem repetidos). */
export function splitAlternatives(value: string): string[] {
	return [
		...new Set(
			value
				.split(";")
				.map((part) => part.trim())
				.filter(Boolean),
		),
	];
}

function quantifierSuffix({ kind, min, max, lazy }: Quantifier): string {
	const low = Math.max(0, Math.trunc(min));
	const high = Math.max(low, Math.trunc(max));
	let suffix: string;
	switch (kind) {
		case "one":
			return "";
		case "exactly":
			return low === 1 ? "" : `{${low}}`;
		case "optional":
			suffix = "?";
			break;
		case "oneOrMore":
			suffix = "+";
			break;
		case "zeroOrMore":
			suffix = "*";
			break;
		case "between":
			suffix = `{${low},${high}}`;
			break;
	}
	return lazy ? `${suffix}?` : suffix;
}

/** Nome do grupo de captura de número `n` na expressão gerada. */
const groupName = (n: number) => `g${n}`;

/** Blocos do padrão que viram grupos de captura, na ordem (o primeiro é o grupo 1). */
export function capturedBlocks(pattern: readonly PatternBlock[]): PatternBlock[] {
	return pattern.filter(
		(block) => block.capture && PATTERN_BLOCK_INFO[block.type].quantifiable && blockAtom(block),
	);
}

/** Expressão regular equivalente aos blocos do padrão ("" se não houver nenhum com conteúdo). */
export function compilePattern(pattern: readonly PatternBlock[]): string {
	let group = 0;
	return pattern
		.map((block) => {
			const atom = blockAtom(block);
			if (!atom) return "";
			if (!PATTERN_BLOCK_INFO[block.type].quantifiable) return atom.source;
			const suffix = quantifierSuffix(block.quantifier);
			const body = suffix && !atom.single ? `(?:${atom.source})${suffix}` : atom.source + suffix;
			// Grupos nomeados: "$<g1>" não se confunde com um dígito escrito logo depois.
			return block.capture ? `(?<${groupName(++group)}>${body})` : body;
		})
		.join("");
}

/** Texto de substituição equivalente aos blocos (`$` literal vira `$$`). */
export function compileReplacement(
	replacement: readonly ReplacementBlock[],
	pattern: readonly PatternBlock[],
): string {
	const groups = new Map(capturedBlocks(pattern).map((block, index) => [block.id, index + 1]));
	return replacement
		.map((block) => {
			if (block.type === "text") return block.value.replace(/\$/g, "$$$$");
			if (block.type === "match") return "$&";
			const number = groups.get(block.ref);
			return number ? `$<${groupName(number)}>` : "";
		})
		.join("");
}

export function compileRegexBuilder(model: RegexBuilderModel): { match: string; replace: string } {
	return {
		match: compilePattern(model.pattern),
		replace: compileReplacement(model.replacement, model.pattern),
	};
}

/** Blocos de substituição que apontam para um trecho que não é mais capturado. */
export function brokenGroupRefs(model: RegexBuilderModel): Set<string> {
	const groups = new Set(capturedBlocks(model.pattern).map((block) => block.id));
	return new Set(
		model.replacement
			.filter((block) => block.type === "group" && !groups.has(block.ref))
			.map((block) => block.id),
	);
}

export function createEmptyRegexBuilder(): RegexBuilderModel {
	return { pattern: [], replacement: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Confere um modelo salvo (versões antigas, JSON alterado à mão). */
export function sanitizeRegexBuilder(value: unknown): RegexBuilderModel {
	if (!isRecord(value)) return createEmptyRegexBuilder();
	const pattern = Array.isArray(value.pattern)
		? value.pattern.flatMap((item): PatternBlock[] => {
				if (!isRecord(item) || typeof item.id !== "string") return [];
				if (!PATTERN_BLOCK_TYPES.includes(item.type as PatternBlockType)) return [];
				const q = isRecord(item.quantifier) ? item.quantifier : {};
				return [
					createPatternBlock(item.type as PatternBlockType, item.id, {
						value: typeof item.value === "string" ? item.value : "",
						capture: item.capture === true,
						quantifier: {
							...(QUANTIFIER_KINDS.includes(q.kind as QuantifierKind)
								? { kind: q.kind as QuantifierKind }
								: {}),
							...(typeof q.min === "number" ? { min: q.min } : {}),
							...(typeof q.max === "number" ? { max: q.max } : {}),
							lazy: q.lazy === true,
						},
					}),
				];
			})
		: [];
	const replacement = Array.isArray(value.replacement)
		? value.replacement.flatMap((item): ReplacementBlock[] => {
				if (!isRecord(item) || typeof item.id !== "string") return [];
				if (!REPLACEMENT_BLOCK_TYPES.includes(item.type as ReplacementBlockType)) return [];
				return [
					createReplacementBlock(item.type as ReplacementBlockType, item.id, {
						value: typeof item.value === "string" ? item.value : "",
						ref: typeof item.ref === "string" ? item.ref : "",
					}),
				];
			})
		: [];
	return { pattern, replacement };
}
