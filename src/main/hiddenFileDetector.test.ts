import { describe, expect, it } from "vitest";
import { createHiddenCheck, parseHiddenPathList } from "./hiddenFileDetector";

describe("parseHiddenPathList", () => {
	it("lê um caminho por linha, ignorando linhas vazias e CRLF", () => {
		const hidden = parseHiddenPathList(
			"C:\\Users\\Ana\\desktop.ini\r\n\r\nC:\\Users\\Ana\\AppData\r\n",
		);
		expect([...hidden]).toEqual(["c:\\users\\ana\\desktop.ini", "c:\\users\\ana\\appdata"]);
	});

	it("com a pasta-base, monta o caminho a partir dos nomes (dir sem /s)", () => {
		const hidden = parseHiddenPathList("desktop.ini\r\nAção.txt\r\n", "C:\\Users\\Ana");
		expect([...hidden]).toEqual(["c:\\users\\ana\\desktop.ini", "c:\\users\\ana\\ação.txt"]);
	});

	it("lê a saída UTF-16 do cmd /u sem perder acentos", () => {
		const output = Buffer.from("C:\\Fotos\\Família\r\n", "utf16le").toString("utf16le");
		expect([...parseHiddenPathList(output)]).toEqual(["c:\\fotos\\família"]);
	});
});

describe("createHiddenCheck", () => {
	it("fora do Windows, oculto é o que começa com ponto", async () => {
		const isHidden = await createHiddenCheck("/home/ana", false, "linux");
		expect(isHidden("/home/ana/.config", ".config")).toBe(true);
		expect(isHidden("/home/ana/Fotos", "Fotos")).toBe(false);
	});
});
