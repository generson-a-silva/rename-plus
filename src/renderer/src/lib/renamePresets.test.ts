import { createDefaultOptions, type RenameOptions } from "@shared/rename";
import { describe, expect, it } from "vitest";
import {
	findMatchingPreset,
	isPresetModified,
	movePreset,
	renamePreset,
	sanitizePresets,
	updatePresetOptions,
	upsertPreset,
} from "./renamePresets";

const withPrefix = (prefix: string): RenameOptions => {
	const options = createDefaultOptions();
	options.add.prefix = prefix;
	return options;
};

/** Três presets, "A", "B" e "C", com ids "1", "2" e "3". */
function trio() {
	let presets = upsertPreset([], "A", withPrefix("a_"), "1");
	presets = upsertPreset(presets, "B", withPrefix("b_"), "2");
	return upsertPreset(presets, "C", withPrefix("c_"), "3");
}

const names = (presets: readonly { name: string }[]) =>
	presets.map((preset) => preset.name).join("");

describe("upsertPreset", () => {
	it("adiciona no fim da lista", () => {
		let presets = upsertPreset([], "Fotos", withPrefix("F_"), "1");
		presets = upsertPreset(presets, "documentos", withPrefix("D_"), "2");
		expect(presets.map((preset) => preset.name)).toEqual(["Fotos", "documentos"]);
	});

	it("substitui sem mudar a posição", () => {
		const presets = upsertPreset(trio(), "b", withPrefix("novo_"), "9");
		expect(presets.map((preset) => preset.id)).toEqual(["1", "2", "3"]);
		expect(presets[1]?.options.add.prefix).toBe("novo_");
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

describe("renamePreset", () => {
	it("troca só o nome, mantendo id, posição e regras", () => {
		const presets = renamePreset(trio(), "2", "  Beta ");
		expect(presets.map((preset) => preset.name)).toEqual(["A", "Beta", "C"]);
		expect(presets[1]).toMatchObject({ id: "2", options: withPrefix("b_") });
	});

	it("ignora nome vazio e id desconhecido", () => {
		expect(names(renamePreset(trio(), "2", "   "))).toBe("ABC");
		expect(names(renamePreset(trio(), "x", "Z"))).toBe("ABC");
	});
});

describe("updatePresetOptions", () => {
	it("guarda uma cópia das regras novas no mesmo preset", () => {
		const options = withPrefix("novo_");
		const presets = updatePresetOptions(trio(), "2", options);
		options.add.prefix = "mudou";
		expect(presets[1]).toMatchObject({ id: "2", name: "B" });
		expect(presets[1]?.options.add.prefix).toBe("novo_");
		expect(presets[0]?.options.add.prefix).toBe("a_");
	});
});

describe("movePreset", () => {
	it("sobe e desce uma posição", () => {
		expect(names(movePreset(trio(), "2", -1))).toBe("BAC");
		expect(names(movePreset(trio(), "2", 1))).toBe("ACB");
	});

	it("não passa das pontas nem mexe com id desconhecido", () => {
		expect(names(movePreset(trio(), "1", -1))).toBe("ABC");
		expect(names(movePreset(trio(), "3", 1))).toBe("ABC");
		expect(names(movePreset(trio(), "x", 1))).toBe("ABC");
	});
});

describe("isPresetModified", () => {
	it("compara as regras de agora com as guardadas", () => {
		const [preset] = trio();
		if (!preset) throw new Error("sem preset");
		expect(isPresetModified(preset, withPrefix("a_"))).toBe(false);
		expect(isPresetModified(preset, withPrefix("outro_"))).toBe(true);
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
