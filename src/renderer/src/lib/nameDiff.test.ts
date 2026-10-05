import { describe, expect, it } from "vitest";
import { diffNames, type NameDiffSegment } from "./nameDiff";

/** Representa os trechos alterados entre colchetes: "IMG_[1234]". */
const show = (segments: NameDiffSegment[]) =>
	segments.map((segment) => (segment.changed ? `[${segment.text}]` : segment.text)).join("");

const diff = (before: string, after: string) => {
	const result = diffNames(before, after);
	return [show(result.before), show(result.after)];
};

describe("diffNames", () => {
	it("marca só o que foi trocado, mantendo prefixo e sufixo iguais", () => {
		expect(diff("IMG_1234.jpg", "Foto 1234.jpg")).toEqual(["[IMG_]1234.jpg", "[Foto ]1234.jpg"]);
	});

	it("marca inserções só no novo nome e remoções só no atual", () => {
		expect(diff("relatorio.pdf", "2026_relatorio.pdf")).toEqual([
			"relatorio.pdf",
			"[2026_]relatorio.pdf",
		]);
		expect(diff("copia de foto.png", "foto.png")).toEqual(["[copia de ]foto.png", "foto.png"]);
	});

	it("marca cada letra que mudou de caixa", () => {
		expect(diff("foto de ferias.txt", "Foto De Ferias.txt")).toEqual([
			"[f]oto [d]e [f]erias.txt",
			"[F]oto [D]e [F]erias.txt",
		]);
	});

	it("não parte acentos nem emojis ao meio", () => {
		expect(diff("ação 😀.txt", "acao 😀.txt")).toEqual(["a[çã]o 😀.txt", "a[ca]o 😀.txt"]);
		expect(diff("a😀b", "a😃b")).toEqual(["a[😀]b", "a[😃]b"]);
	});

	it("nomes iguais ou vazios não têm trechos marcados", () => {
		expect(diff("igual.txt", "igual.txt")).toEqual(["igual.txt", "igual.txt"]);
		expect(diffNames("", "novo").after).toEqual([{ text: "novo", changed: true }]);
		expect(diffNames("", "novo").before).toEqual([]);
	});
});
