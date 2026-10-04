import { createPatternBlock, createReplacementBlock, type RegexBuilderModel } from "./regexBlocks";

export const REGEX_PRESET_IDS = [
	"spacesToUnderscore",
	"prefixToText",
	"removeLeadingNumbers",
	"swapDate",
	"removeParentheses",
] as const;

export type RegexPresetId = (typeof REGEX_PRESET_IDS)[number];

export interface RegexPreset {
	model: RegexBuilderModel;
	/** Substitui todas as ocorrências (não só a primeira). */
	global: boolean;
}

/** Exemplos prontos do construtor visual; `newId` gera os ids dos blocos. */
export function createRegexPreset(id: RegexPresetId, newId: () => string): RegexPreset {
	const p = createPatternBlock;
	const r = createReplacementBlock;
	switch (id) {
		// "minha foto nova.jpg" → "minha_foto_nova.jpg"
		case "spacesToUnderscore":
			return {
				global: true,
				model: {
					pattern: [p("space", newId())],
					replacement: [r("text", newId(), { value: "_" })],
				},
			};
		// "IMG_1234.jpg" → "Foto 1234.jpg"
		case "prefixToText": {
			const digits = p("digit", newId(), { capture: true });
			return {
				global: false,
				model: {
					pattern: [p("start", newId()), p("text", newId(), { value: "IMG_" }), digits],
					replacement: [
						r("text", newId(), { value: "Foto " }),
						r("group", newId(), { ref: digits.id }),
					],
				},
			};
		}
		// "01 - Música.mp3" → "Música.mp3"
		case "removeLeadingNumbers":
			return {
				global: false,
				model: {
					pattern: [
						p("start", newId()),
						p("digit", newId()),
						p("separator", newId(), { quantifier: { kind: "zeroOrMore" } }),
					],
					replacement: [],
				},
			};
		// "2024-06-10 viagem.jpg" → "10-06-2024 viagem.jpg"
		case "swapDate": {
			const year = p("digit", newId(), { capture: true, quantifier: { kind: "exactly", min: 4 } });
			const month = p("digit", newId(), { capture: true, quantifier: { kind: "exactly", min: 2 } });
			const day = p("digit", newId(), { capture: true, quantifier: { kind: "exactly", min: 2 } });
			const dash = () => p("text", newId(), { value: "-" });
			const sep = () => r("text", newId(), { value: "-" });
			return {
				global: false,
				model: {
					pattern: [year, dash(), month, dash(), day],
					replacement: [
						r("group", newId(), { ref: day.id }),
						sep(),
						r("group", newId(), { ref: month.id }),
						sep(),
						r("group", newId(), { ref: year.id }),
					],
				},
			};
		}
		// "relatório (1) (cópia).pdf" → "relatório.pdf"
		case "removeParentheses":
			return {
				global: true,
				model: {
					pattern: [
						p("space", newId(), { quantifier: { kind: "zeroOrMore" } }),
						p("text", newId(), { value: "(" }),
						p("noneOf", newId(), { value: ")", quantifier: { kind: "zeroOrMore" } }),
						p("text", newId(), { value: ")" }),
					],
					replacement: [],
				},
			};
	}
}
