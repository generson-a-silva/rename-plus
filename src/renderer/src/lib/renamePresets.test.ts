import { createDefaultOptions, type RenameOptions } from "@shared/rename";
import { describe, expect, it } from "vitest";
import { findMatchingPreset, sanitizePresets, upsertPreset } from "./renamePresets";

const withPrefix = (prefix: string): RenameOptions => {
	const options = createDefaultOptions();
	options.add.prefix = prefix;
	return options;
};

describe("upsertPreset", () => {
	it("adiciona em ordem alfabética", () => {
		let presets = upsertPreset([], "Fotos", withPrefix("F_"), "1");
		presets = upsertPreset(presets, "documentos", withPrefix("D_"), "2");
		expect(presets.map((preset) => preset.name)).toEqual(["documentos", "Fotos"]);
	});

	it("substitui o preset de mesmo nome, mantendo o id", () => {
		const first = upsertPreset([], "Fotos", withPrefix("F_"), "1");
		const presets = upsertPreset(first, " fotos ", withPrefix("IMG_"), "2");
		expect(presets).toHaveLength(1);
		expect(presets[0]).toMatchObject({ id: "1", name: "fotos" });
		expect(presets[0]?.options.add.prefix).toBe("IMG_");
	});

	it("guarda uma cópia das opções", () => {
		const options = withPrefix("F_");
		const [preset] = upsertPreset([], "Fotos", options, "1");
		options.add.prefix = "mudou";
		expect(preset?.options.add.prefix).toBe("F_");
	});
});

describe("findMatchingPreset", () => {
	it("acha o preset com exatamente as mesmas opções", () => {
		const presets = upsertPreset([], "Fotos", withPrefix("F_"), "1");
		expect(findMatchingPreset(presets, withPrefix("F_"))?.id).toBe("1");
		expect(findMatchingPreset(presets, withPrefix("G_"))).toBeUndefined();
	});
});

describe("sanitizePresets", () => {
	it("descarta inválidos e completa opções ausentes", () => {
		const presets = sanitizePresets([
			{ id: "1", name: "Fotos", options: { add: { prefix: "F_" } } },
			{ id: "1", name: "Repetido", options: {} },
			{ id: "2", name: "   ", options: {} },
			{ name: "Sem id" },
			null,
		]);
		expect(presets).toHaveLength(1);
		expect(presets[0]?.options).toEqual(withPrefix("F_"));
		expect(sanitizePresets("lixo")).toEqual([]);
	});
});
