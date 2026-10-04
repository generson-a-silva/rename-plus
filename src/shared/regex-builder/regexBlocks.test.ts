import { describe, expect, it } from "vitest";
import type { FileEntry } from "../ipc";
import { createDefaultOptions, createRenamer } from "../rename";
import {
	brokenGroupRefs,
	compilePattern,
	compileRegexBuilder,
	compileReplacement,
	PATTERN_BLOCK_TYPES,
	createPatternBlock as p,
	type RegexBuilderModel,
	createReplacementBlock as r,
	sanitizeRegexBuilder,
} from "./regexBlocks";
import { createRegexPreset, REGEX_PRESET_IDS } from "./regexPresets";

function idGenerator() {
	let next = 0;
	return () => `b${++next}`;
}

/** Aplica o modelo como o motor faria (flag `u`, sem extensão). */
function apply(model: RegexBuilderModel, name: string, global = false): string {
	const { match, replace } = compileRegexBuilder(model);
	const options = createDefaultOptions();
	options.regex = { match, replace, global, ignoreCase: false, includeExt: false };
	const entry: FileEntry = {
		path: `/tmp/${name}`,
		dir: "/tmp",
		name,
		isDir: false,
		hidden: false,
		size: 0,
		mtimeMs: 0,
		birthtimeMs: 0,
	};
	return createRenamer(options)(entry, { index: 0, folderIndex: 0, now: new Date() });
}

describe("compilePattern", () => {
	it("escapa texto literal e agrupa antes de repetir", () => {
		expect(compilePattern([p("text", "a", { value: "a.b(c)" })])).toBe("a\\.b\\(c\\)");
		expect(
			compilePattern([p("text", "a", { value: "ab", quantifier: { kind: "oneOrMore" } })]),
		).toBe("(?:ab)+");
		expect(compilePattern([p("text", "a", { value: "x", quantifier: { kind: "optional" } })])).toBe(
			"x?",
		);
	});

	it("traduz as repetições", () => {
		const digit = (kind: "exactly" | "between", min: number, max: number, lazy = false) =>
			compilePattern([p("digit", "d", { quantifier: { kind, min, max, lazy } })]);
		expect(digit("exactly", 4, 0)).toBe("\\d{4}");
		expect(digit("exactly", 1, 0)).toBe("\\d");
		expect(digit("between", 2, 5)).toBe("\\d{2,5}");
		expect(digit("between", 5, 2)).toBe("\\d{5,5}");
		expect(compilePattern([p("anyChar", "a", { quantifier: { lazy: true } })])).toBe(".+?");
	});

	it("monta classes e alternativas", () => {
		expect(compilePattern([p("oneOf", "a", { value: "-]^a" })])).toBe("[\\-\\]\\^a]");
		expect(compilePattern([p("noneOf", "a", { value: ")" })])).toBe("[^)]");
		expect(compilePattern([p("alternatives", "a", { value: "jpg; png ;jpg" })])).toBe(
			"(?:jpg|png)",
		);
	});

	it("ignora blocos sem conteúdo e não captura âncoras", () => {
		expect(
			compilePattern([p("text", "a"), p("oneOf", "b"), p("start", "c", { capture: true })]),
		).toBe("^");
	});

	it("gera expressões válidas no modo unicode para todos os tipos", () => {
		for (const type of PATTERN_BLOCK_TYPES) {
			const source = compilePattern([p(type, "x", { value: "a-]\\[^$.*+?(){}|/", capture: true })]);
			expect(() => new RegExp(source, "u"), type).not.toThrow();
		}
	});
});

describe("compileReplacement", () => {
	it("usa grupos nomeados e protege o $ literal", () => {
		const pattern = [p("digit", "d1", { capture: true }), p("letter", "l1", { capture: true })];
		const replacement = [
			r("group", "x", { ref: "l1" }),
			r("text", "y", { value: "1$" }),
			r("group", "z", { ref: "d1" }),
			r("match", "w"),
		];
		expect(compileReplacement(replacement, pattern)).toBe("$<g2>1$$$<g1>$&");
	});

	it("aponta referências a trechos não capturados", () => {
		const model: RegexBuilderModel = {
			pattern: [p("digit", "d1")],
			replacement: [r("group", "x", { ref: "d1" }), r("group", "y", { ref: "sumiu" })],
		};
		expect(compileReplacement(model.replacement, model.pattern)).toBe("");
		expect(brokenGroupRefs(model)).toEqual(new Set(["x", "y"]));
	});
});

describe("modelos aplicados pelo motor", () => {
	it("reordena trechos capturados", () => {
		const model: RegexBuilderModel = {
			pattern: [
				p("letter", "a", { capture: true }),
				p("space", "s"),
				p("digit", "b", { capture: true }),
			],
			replacement: [
				r("group", "1", { ref: "b" }),
				r("text", "2", { value: " " }),
				r("group", "3", { ref: "a" }),
			],
		};
		expect(apply(model, "Foto 123.jpg")).toBe("123 Foto.jpg");
	});

	it("acompanha a captura mesmo depois de reordenar os blocos do padrão", () => {
		const a = p("letter", "a", { capture: true });
		const b = p("digit", "b", { capture: true });
		const model: RegexBuilderModel = {
			pattern: [b, a],
			replacement: [r("group", "1", { ref: "a" })],
		};
		expect(apply(model, "12abc.txt")).toBe("abc.txt");
	});
});

describe("exemplos prontos", () => {
	const cases: Record<(typeof REGEX_PRESET_IDS)[number], [string, string]> = {
		spacesToUnderscore: ["minha foto  nova.jpg", "minha_foto_nova.jpg"],
		prefixToText: ["IMG_1234.jpg", "Foto 1234.jpg"],
		removeLeadingNumbers: ["01 - Música.mp3", "Música.mp3"],
		swapDate: ["2024-06-10 viagem.jpg", "10-06-2024 viagem.jpg"],
		removeParentheses: ["relatório (1) (cópia).pdf", "relatório.pdf"],
	};

	for (const id of REGEX_PRESET_IDS) {
		it(id, () => {
			const preset = createRegexPreset(id, idGenerator());
			const [input, output] = cases[id];
			expect(apply(preset.model, input, preset.global)).toBe(output);
		});
	}
});

describe("sanitizeRegexBuilder", () => {
	it("descarta blocos inválidos e completa os campos", () => {
		const model = sanitizeRegexBuilder({
			pattern: [
				{ id: "a", type: "digit", quantifier: { kind: "exactly", min: 4 } },
				{ id: "b", type: "inventado" },
				{ type: "text" },
			],
			replacement: [
				{ id: "c", type: "group", ref: "a" },
				{ id: "d", type: "x" },
			],
		});
		expect(model.pattern).toEqual([p("digit", "a", { quantifier: { kind: "exactly", min: 4 } })]);
		expect(model.replacement).toEqual([r("group", "c", { ref: "a" })]);
		expect(sanitizeRegexBuilder("lixo")).toEqual({ pattern: [], replacement: [] });
	});
});
