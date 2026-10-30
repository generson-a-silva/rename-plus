import { describe, expect, it } from "vitest";
import type { FileMetadata } from "../ipc";
import { sanitizeNamePart } from "./fileNameValidation";
import {
	appendTemplateField,
	compileMetadataTemplate,
	emptyMetadata,
	type MetadataTemplate,
} from "./metadataTemplate";
import { RenameConfigError, RenameItemError } from "./renameErrors";

const song: FileMetadata = {
	...emptyMetadata(),
	artist: "Legião Urbana",
	albumArtist: "Legião Urbana",
	album: "Dois",
	title: "Tempo Perdido",
	track: 3,
	disc: 1,
	year: 1986,
	genre: "Rock",
	duration: 205,
};

const photo: FileMetadata = {
	...emptyMetadata(),
	takenAt: new Date(2024, 5, 12, 14, 32, 5).getTime(),
	cameraMake: "Canon",
	cameraModel: "Canon EOS 80D",
	lens: "EF-S18-135mm f/3.5-5.6 IS USM",
	iso: 400,
	aperture: 5.6,
	focalLength: 4.25,
	width: 6000,
	height: 4000,
};

const strict = { missing: "error", fallback: "" } as const;

function render(
	template: string,
	metadata: FileMetadata | null,
	missing: Parameters<MetadataTemplate>[1] = strict,
): string {
	return compileMetadataTemplate(template)(metadata, missing);
}

describe("compileMetadataTemplate", () => {
	it("monta faixa, artista e título", () => {
		expect(render("{track:2} - {artist} - {title}", song)).toBe(
			"03 - Legião Urbana - Tempo Perdido",
		);
	});

	it("aceita todos os campos de áudio", () => {
		expect(render("{albumartist} {album} {disc} {year} {genre} {track}", song)).toBe(
			"Legião Urbana Dois 1 1986 Rock 3",
		);
	});

	it("formata a duração sem dois-pontos", () => {
		expect(render("{duration}", song)).toBe("3m25s");
		expect(render("{duration}", { ...song, duration: 3723.4 })).toBe("1h02m03s");
	});

	it("usa YYYY-MM-DD como formato padrão da data e aceita outro formato", () => {
		expect(render("{date}", photo)).toBe("2024-06-12");
		expect(render("{date:YYYY-MM-DD HH.mm.ss}", photo)).toBe("2024-06-12 14.32.05");
	});

	it("junta marca e modelo sem repetir a marca", () => {
		expect(render("{camera}", photo)).toBe("Canon EOS 80D");
		expect(render("{camera}", { ...photo, cameraModel: "EOS R6" })).toBe("Canon EOS R6");
		expect(render("{make}_{model}", photo)).toBe("Canon_Canon EOS 80D");
	});

	it("formata os números da foto", () => {
		expect(render("{iso} {aperture} {focal} {width}x{height}", photo)).toBe(
			"400 5.6 4.25 6000x4000",
		);
		expect(render("{lens}", photo)).toBe("EF-S18-135mm f-3.5-5.6 IS USM");
	});

	it("ignora maiúsculas no nome do campo", () => {
		expect(render("{Artist} {TITLE}", song)).toBe("Legião Urbana Tempo Perdido");
	});

	it("mantém chaves que não formam um campo como texto", () => {
		expect(render("{ artist } {", song)).toBe("{ artist } {");
	});

	it("rejeita campos desconhecidos e argumentos inválidos", () => {
		expect(() => compileMetadataTemplate("{artista}")).toThrow(RenameConfigError);
		expect(() => compileMetadataTemplate("{track:x}")).toThrow(RenameConfigError);
		expect(() => compileMetadataTemplate("{artist:2}")).toThrow(RenameConfigError);
	});

	it("troca caracteres proibidos dos valores por hífen", () => {
		const meta = { ...song, artist: "AC/DC", title: 'Parte 1: "Início"?' };
		expect(render("{artist} - {title}", meta)).toBe("AC-DC - Parte 1- -Início--");
	});

	it("campo vazio vira erro no modo error", () => {
		const error = (() => {
			try {
				render("{artist} - {title}", { ...song, artist: null });
			} catch (caught) {
				return caught;
			}
		})();
		expect(error).toBeInstanceOf(RenameItemError);
		expect((error as RenameItemError).ref).toEqual({
			key: "engine.missingMetadata",
			params: { field: "{artist}" },
		});
	});

	it("valor só com espaços conta como vazio", () => {
		expect(() => render("{album}", { ...song, album: "  " })).toThrow(RenameItemError);
	});

	it("valor desconhecido em missing (configuração antiga ou editada) conta como erro", () => {
		const unknown = {
			missing: "outro",
			fallback: "x",
		} as unknown as Parameters<MetadataTemplate>[1];
		expect(() => render("{album}", { ...song, album: null }, unknown)).toThrow(RenameItemError);
	});

	it("usa o texto alternativo no modo fallback", () => {
		const fallback = { missing: "fallback", fallback: "Desconhecido" } as const;
		expect(render("{artist} - {title}", { ...song, artist: null }, fallback)).toBe(
			"Desconhecido - Tempo Perdido",
		);
		expect(render("{date}", null, fallback)).toBe("Desconhecido");
	});
});

describe("appendTemplateField", () => {
	it("separa o campo novo por espaço, sem dobrar espaços", () => {
		expect(appendTemplateField("{artist}", "{title}")).toBe("{artist} {title}");
		expect(appendTemplateField("{artist} ", "{title}")).toBe("{artist} {title}");
		expect(appendTemplateField("", "{title}")).toBe("{title}");
	});
});

describe("sanitizeNamePart", () => {
	it("troca separadores, caracteres do Windows e de controle", () => {
		expect(sanitizeNamePart('a/b\\c:d*e?f"g<h>i|j\u0007k')).toBe("a-b-c-d-e-f-g-h-i-j-k");
	});
});
