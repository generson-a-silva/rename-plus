import { describe, expect, it } from "vitest";
import type { FileEntry } from "../ipc";
import { validateFileName } from "./fileNameValidation";
import { createRenamer, RenameConfigError } from "./renameEngine";
import { createDefaultOptions, type RenameOptions } from "./renameOptions";
import { buildPreview } from "./renamePreview";

type Patch = { [K in keyof RenameOptions]?: Partial<RenameOptions[K]> };

function options(patch: Patch = {}): RenameOptions {
	const result = createDefaultOptions();
	for (const key of Object.keys(patch) as (keyof RenameOptions)[]) {
		Object.assign(result[key], patch[key]);
	}
	return result;
}

function entry(name: string, extra: Partial<FileEntry> = {}): FileEntry {
	const dir = extra.dir ?? "/home/user/Fotos";
	return {
		path: `${dir}/${name}`,
		dir,
		name,
		isDir: false,
		size: 0,
		mtimeMs: new Date(2024, 0, 15, 10, 30, 45).getTime(),
		birthtimeMs: new Date(2023, 11, 31).getTime(),
		...extra,
	};
}

const now = new Date(2025, 5, 1, 8, 0, 0);
const ctx = { index: 0, folderIndex: 0, now };

function rename(name: string, patch: Patch, extra?: Partial<FileEntry>): string {
	return createRenamer(options(patch))(entry(name, extra), ctx);
}

describe("createRenamer", () => {
	it("mantém o nome com as opções padrão", () => {
		expect(rename("Foto 01.JPG", {})).toBe("Foto 01.JPG");
	});

	it("(1) aplica RegEx com grupos de captura", () => {
		expect(rename("IMG_1234.jpg", { regex: { match: "IMG_(\\d+)", replace: "Foto-$1" } })).toBe(
			"Foto-1234.jpg",
		);
	});

	it("(1) RegEx pode incluir a extensão", () => {
		expect(
			rename("a.jpeg", { regex: { match: "\\.jpeg$", replace: ".jpg", includeExt: true } }),
		).toBe("a.jpg");
	});

	it("(1) RegEx inválida gera RenameConfigError", () => {
		expect(() => createRenamer(options({ regex: { match: "(" } }))).toThrow(RenameConfigError);
	});

	it("(2) nome fixo e invertido", () => {
		expect(rename("abc.txt", { name: { mode: "fixed", fixed: "novo" } })).toBe("novo.txt");
		expect(rename("abc.txt", { name: { mode: "reverse" } })).toBe("cba.txt");
	});

	it("(3) substitui sem diferenciar maiúsculas por padrão", () => {
		expect(rename("Foo foo FOO.txt", { replace: { find: "foo", with: "bar" } })).toBe(
			"bar bar bar.txt",
		);
		expect(rename("Foo foo.txt", { replace: { find: "foo", with: "$&", matchCase: true } })).toBe(
			"Foo $&.txt",
		);
	});

	it("(4) caixa título com exceções", () => {
		expect(rename("o SENHOR dos anéis.mkv", { case: { mode: "title", exceptions: "dos" } })).toBe(
			"O Senhor dos Anéis.mkv",
		);
		expect(rename("OLÁ MUNDO.txt", { case: { mode: "sentence" } })).toBe("Olá mundo.txt");
	});

	it("(5) remove primeiros/últimos caracteres e intervalo", () => {
		expect(rename("123abc456.txt", { remove: { first: 3, last: 3 } })).toBe("abc.txt");
		expect(rename("abcdef.txt", { remove: { from: 2, to: 4 } })).toBe("aef.txt");
	});

	it("(5) remove dígitos, acentos, símbolos e espaços duplos", () => {
		expect(
			rename("  Ação  #1 (cópia) .txt", {
				remove: { digits: true, accents: true, symbols: true, doubleSpaces: true, trim: true },
			}),
		).toBe("Acao copia.txt");
	});

	it("(5) remove palavras inteiras e corta texto", () => {
		expect(rename("foto copia final.jpg", { remove: { words: "copia" } })).toBe("foto  final.jpg");
		expect(
			rename("lixo - Música.mp3", { remove: { cropMode: "before", cropText: "Música" } }),
		).toBe("Música.mp3");
		expect(rename("Música - lixo.mp3", { remove: { cropMode: "after", cropText: "Música" } })).toBe(
			"Música.mp3",
		);
	});

	it("(6) adiciona prefixo, sufixo, inserção e espaço entre palavras", () => {
		expect(
			rename("MinhaFoto.png", {
				add: { prefix: "[", suffix: "]", insert: "_", insertAt: -4, wordSpace: true },
			}),
		).toBe("[Minha _Foto].png");
	});

	it("(7) data automática de modificação e atual", () => {
		expect(rename("a.txt", { autoDate: { mode: "prefix", format: "YYYYMMDD-HHmmss" } })).toBe(
			"20240115-103045_a.txt",
		);
		expect(
			rename("a.txt", {
				autoDate: { mode: "suffix", type: "current", format: "DD.MM.YY", separator: " " },
			}),
		).toBe("a 01.06.25.txt");
	});

	it("(8) adiciona nome da pasta", () => {
		expect(rename("a.txt", { appendFolder: { mode: "prefix", levels: 2, separator: "-" } })).toBe(
			"user-Fotos-a.txt",
		);
	});

	it("(9) numeração com padding, estilos e reinício por pasta", () => {
		const renamer = createRenamer(
			options({ numbering: { mode: "suffix", start: 1, increment: 2, padding: 3 } }),
		);
		expect(renamer(entry("a.txt"), { index: 4, folderIndex: 0, now })).toBe("a_009.txt");

		const perFolder = createRenamer(
			options({ numbering: { mode: "prefix", style: "upper", resetPerFolder: true } }),
		);
		expect(perFolder(entry("a.txt"), { index: 30, folderIndex: 27, now })).toBe("AB_a.txt");

		const roman = createRenamer(
			options({ numbering: { mode: "insert", style: "roman", insertAt: 1 } }),
		);
		expect(roman(entry("ab.txt"), { index: 3, folderIndex: 0, now })).toBe("aIVb.txt");
	});

	it("(10) altera a extensão", () => {
		expect(rename("a.JPG", { extension: { mode: "lower" } })).toBe("a.jpg");
		expect(rename("a.txt", { extension: { mode: "fixed", value: ".md" } })).toBe("a.md");
		expect(rename("a.tar", { extension: { mode: "extra", value: "gz" } })).toBe("a.tar.gz");
		expect(rename("a.txt", { extension: { mode: "remove" } })).toBe("a");
	});

	it("não trata o ponto de pastas e arquivos ocultos como extensão", () => {
		expect(rename("v1.2", { case: { mode: "upper" } }, { isDir: true })).toBe("V1.2");
		expect(rename(".bashrc", { case: { mode: "upper" } })).toBe(".BASHRC");
	});
});

describe("buildPreview", () => {
	it("detecta nomes duplicados e colisões com itens existentes", () => {
		const a = entry("a.txt");
		const b = entry("b.txt");
		const c = entry("c.txt");
		const preview = buildPreview(
			[a, b],
			[a, b, c],
			options({ name: { mode: "fixed", fixed: "c" } }),
		);

		expect(preview.items.get(a.path)?.message).toBe("Nome duplicado no lote");
		expect(preview.errors).toBe(2);

		const single = buildPreview([a], [a, c], options({ name: { mode: "fixed", fixed: "c" } }));
		expect(single.items.get(a.path)?.message).toBe("Já existe um item com esse nome");
	});

	it("permite trocar nomes entre itens do mesmo lote", () => {
		const a = entry("a.txt");
		const b = entry("b.txt");
		const preview = buildPreview([a, b], [a, b], options({ name: { mode: "reverse" } }));
		expect(preview.errors).toBe(0);
		expect(preview.changed).toBe(0);
	});

	it("numera na ordem recebida e reinicia por pasta", () => {
		const items = [entry("x.txt", { dir: "/a" }), entry("y.txt", { dir: "/b" })];
		const preview = buildPreview(
			items,
			items,
			options({ numbering: { mode: "prefix", resetPerFolder: true } }),
		);
		expect([...preview.items.values()].map((item) => item.newName)).toEqual(["1_x.txt", "1_y.txt"]);
	});

	it("reporta erro de configuração sem lançar exceção", () => {
		const preview = buildPreview([entry("a")], [], options({ regex: { match: "[" } }));
		expect(preview.configError).toMatch(/RegEx inválida/);
	});
});

describe("validateFileName", () => {
	it("rejeita nomes inválidos no Linux", () => {
		expect(validateFileName("")).not.toBeNull();
		expect(validateFileName("..")).not.toBeNull();
		expect(validateFileName("a/b")).not.toBeNull();
		expect(validateFileName("x".repeat(256))).not.toBeNull();
		expect(validateFileName("válido.txt")).toBeNull();
	});
});
