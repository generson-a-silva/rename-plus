import { describe, expect, it } from "vitest";
import { fileKind } from "./fileKinds";

const file = (name: string) => fileKind({ name, isDir: false });

describe("fileKind", () => {
	it("reconhece a categoria pela extensão, sem diferenciar maiúsculas", () => {
		expect(file("IMG_2041.JPG")).toBe("image");
		expect(file("filme.mkv")).toBe("video");
		expect(file("musica.Mp3")).toBe("audio");
		expect(file("backup.tar.gz")).toBe("archive");
		expect(file("contrato.pdf")).toBe("pdf");
		expect(file("planilha.xlsx")).toBe("spreadsheet");
		expect(file("script.sh")).toBe("code");
		expect(file("leia-me.txt")).toBe("text");
	});

	it("pastas são sempre pastas, mesmo com ponto no nome", () => {
		expect(fileKind({ name: "fotos.jpg", isDir: true })).toBe("folder");
	});

	it("sem extensão, extensão desconhecida ou arquivo oculto sem extensão: genérico", () => {
		expect(file("Makefile")).toBe("file");
		expect(file("dados.xyz")).toBe("file");
		expect(file(".bashrc")).toBe("file");
	});
});
