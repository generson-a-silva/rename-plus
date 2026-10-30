import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readMetadata, readMetadataBatch, withTimeout } from "./metadataReader";

const fixtures = path.join(__dirname, "__fixtures__");
const fixture = (name: string) => path.join(fixtures, name);

let root: string;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-metadata-"));
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("readMetadata", () => {
	it("lê o EXIF de um JPEG, com a hora como a câmera mostra", async () => {
		const meta = await readMetadata(fixture("photo.jpg"));
		expect(meta).toMatchObject({
			cameraMake: "Canon",
			cameraModel: "Canon EOS 80D",
			lens: "EF-S18-135mm f/3.5-5.6 IS USM",
			iso: 400,
			aperture: 5.6,
			focalLength: 50,
			width: 6000,
			height: 4000,
			artist: null,
		});
		expect(meta?.takenAt).toBe(new Date(2024, 5, 12, 14, 32, 5).getTime());
	});

	it("lê as tags de um MP3 sem separar AC/DC", async () => {
		const meta = await readMetadata(fixture("song.mp3"));
		expect(meta).toMatchObject({
			artist: "AC/DC",
			albumArtist: "AC/DC",
			album: "The Razors Edge",
			title: "Thunderstruck",
			track: 1,
			disc: 1,
			year: 1990,
			genre: "Rock",
			takenAt: null,
		});
		expect(meta?.duration).toBeGreaterThan(0.5);
	});

	it("lê os comentários de um FLAC", async () => {
		expect(await readMetadata(fixture("song.flac"))).toMatchObject({
			artist: "Legião Urbana",
			album: "Dois",
			title: "Tempo Perdido",
			track: 3,
			disc: null,
			year: 1986,
			genre: null,
		});
	});

	it("lê largura e altura de um PNG", async () => {
		const png = fixture("pixel.png");
		expect(await readMetadata(png)).toMatchObject({ width: 3, height: 2 });
	});

	it("devolve null para fotos sem EXIF, tipos não lidos e arquivos corrompidos", async () => {
		const broken = path.join(root, "falso.mp3");
		fs.writeFileSync(broken, "isto não é um MP3");
		expect(await readMetadata(fixture("no-exif.jpg"))).toBeNull();
		expect(await readMetadata(path.join(root, "notas.txt"))).toBeNull();
		expect(await readMetadata(broken)).toBeNull();
		expect(await readMetadata(path.join(root, "sumiu.jpg"))).toBeNull();
	});

	it("lê de novo um arquivo que mudou", async () => {
		const target = path.join(root, "copia.mp3");
		fs.copyFileSync(fixture("song.mp3"), target);
		expect((await readMetadata(target))?.title).toBe("Thunderstruck");
		fs.writeFileSync(target, "tags removidas");
		fs.utimesSync(target, new Date(2020, 0, 1), new Date(2020, 0, 1));
		expect(await readMetadata(target)).toBeNull();
	});
});

describe("withTimeout", () => {
	it("desiste de uma leitura que não termina", async () => {
		expect(await withTimeout(new Promise<string>(() => {}), 10)).toBe("timeout");
		expect(await withTimeout(Promise.resolve("ok"), 1_000)).toBe("ok");
	});
});

describe("readMetadataBatch", () => {
	it("lê vários arquivos e informa os resultados parciais", async () => {
		const paths = [fixture("photo.jpg"), fixture("song.mp3"), path.join(root, "x.txt")];
		const partial: string[] = [];
		const results = await readMetadataBatch(paths, {
			onProgress: (batch) => partial.push(...batch.map(([file]) => file)),
			progressIntervalMs: 0,
		});
		expect(new Map(results).get(fixture("song.mp3"))?.artist).toBe("AC/DC");
		expect(new Map(results).get(path.join(root, "x.txt"))).toBeNull();
		expect(results).toHaveLength(3);
		expect(partial.length).toBeGreaterThan(0);
	});

	it("para quando cancelada", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			readMetadataBatch([fixture("photo.jpg")], { signal: controller.signal }),
		).rejects.toThrow();
	});
});
