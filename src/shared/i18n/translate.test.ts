import { describe, expect, it } from "vitest";
import { CATALOGS } from "./catalogs";
import { LOCALES, resolveLocale } from "./locales";
import { createTranslator } from "./translate";

describe("createTranslator", () => {
	it("interpola parâmetros e formata números no idioma", () => {
		expect(createTranslator("pt-BR")("ops.trashConfirmMany", { count: 50000 })).toBe(
			"Mover 50.000 itens para a lixeira?",
		);
		expect(createTranslator("en")("ops.trashConfirmMany", { count: 50000 })).toBe(
			"Move 50,000 items to the trash?",
		);
	});

	it("escolhe singular ou plural pelo count", () => {
		const t = createTranslator("es");
		expect(t("status.items", { count: 1 })).toBe("1 elemento");
		expect(t("status.items", { count: 0 })).toBe("0 elementos");
		expect(t("status.items", { count: 3 })).toBe("3 elementos");
	});

	it("mantém marcadores sem parâmetro", () => {
		expect(createTranslator("en")("ops.openFailed", { name: "a.txt" })).toBe(
			"Could not open a.txt: {error}",
		);
	});
});

describe("catálogos", () => {
	it("todos os idiomas têm as mesmas chaves e os mesmos marcadores", () => {
		const reference = CATALOGS["pt-BR"];
		const placeholders = (message: unknown) =>
			JSON.stringify(message)
				.match(/\{\w+\}/g)
				?.sort()
				.filter((value, index, all) => all.indexOf(value) === index) ?? [];
		for (const locale of LOCALES) {
			const catalog = CATALOGS[locale];
			expect(Object.keys(catalog).sort()).toEqual(Object.keys(reference).sort());
			for (const key of Object.keys(reference) as (keyof typeof reference)[]) {
				expect({ locale, key, placeholders: placeholders(catalog[key]) }).toEqual({
					locale,
					key,
					placeholders: placeholders(reference[key]),
				});
				expect(typeof catalog[key]).toBe(typeof reference[key]);
			}
		}
	});
});

describe("resolveLocale", () => {
	it("mapeia a tag do sistema para um idioma suportado", () => {
		expect(resolveLocale("pt-PT")).toBe("pt-BR");
		expect(resolveLocale("es-AR")).toBe("es");
		expect(resolveLocale("en_US")).toBe("en");
		expect(resolveLocale("de-DE")).toBe("en");
		expect(resolveLocale(undefined)).toBe("en");
	});
});
