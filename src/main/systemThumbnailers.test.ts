import { describe, expect, it } from "vitest";
import { parseMimeGlobs, parseThumbnailer } from "./systemThumbnailers";

describe("parseThumbnailer", () => {
	it("lê comando, programa e tipos", () => {
		const text = [
			"[Thumbnailer Entry]",
			"TryExec=/usr/bin/glycin-thumbnailer",
			"Exec=/usr/bin/glycin-thumbnailer --input %u --output %o --size %s",
			"MimeType=image/avif;image/heif;",
		].join("\n");
		expect(parseThumbnailer(text)).toEqual({
			tryExec: "/usr/bin/glycin-thumbnailer",
			exec: ["/usr/bin/glycin-thumbnailer", "--input", "%u", "--output", "%o", "--size", "%s"],
			mimeTypes: ["image/avif", "image/heif"],
		});
	});

	it("ignora outras seções e arquivos incompletos", () => {
		expect(parseThumbnailer("[Outra]\nExec=x %o\nMimeType=a/b;")).toBeNull();
		expect(parseThumbnailer("[Thumbnailer Entry]\nExec=x %o")).toBeNull();
	});
});

describe("parseMimeGlobs", () => {
	it("mapeia extensões simples, sem diferenciar maiúsculas, pelo maior peso", () => {
		const map = parseMimeGlobs(
			[
				"# comentário",
				"50:image/heif:*.heic",
				"50:image/heif:*.HEIF",
				"40:application/x-baixo:*.mkv",
				"60:video/x-matroska:*.mkv",
				"50:text/x-makefile:makefile",
				"50:application/x-backup:*~",
			].join("\n"),
		);
		expect(map.get("heic")?.mime).toBe("image/heif");
		expect(map.get("heif")?.mime).toBe("image/heif");
		expect(map.get("mkv")?.mime).toBe("video/x-matroska");
		expect(map.size).toBe(3);
	});
});
