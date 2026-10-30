import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { crc32, deflateRawSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readZipEntry } from "./zipEntryReader";

/** Monta um zip mínimo (sem bibliotecas): `deflate` = método 8, senão guardado (0). */
function buildZip(entries: Array<{ name: string; data: Buffer; deflate?: boolean }>): Buffer {
	const locals: Buffer[] = [];
	const centrals: Buffer[] = [];
	let offset = 0;
	for (const { name, data, deflate } of entries) {
		const nameBytes = Buffer.from(name);
		const body = deflate ? deflateRawSync(data) : data;
		const local = Buffer.alloc(30);
		local.writeUInt32LE(0x04034b50, 0);
		local.writeUInt16LE(deflate ? 8 : 0, 8);
		local.writeUInt32LE(crc32(data), 14);
		local.writeUInt32LE(body.length, 18);
		local.writeUInt32LE(data.length, 22);
		local.writeUInt16LE(nameBytes.length, 26);
		const central = Buffer.alloc(46);
		central.writeUInt32LE(0x02014b50, 0);
		central.writeUInt16LE(deflate ? 8 : 0, 10);
		central.writeUInt32LE(crc32(data), 16);
		central.writeUInt32LE(body.length, 20);
		central.writeUInt32LE(data.length, 24);
		central.writeUInt16LE(nameBytes.length, 28);
		central.writeUInt32LE(offset, 42);
		locals.push(local, nameBytes, body);
		centrals.push(central, nameBytes);
		offset += 30 + nameBytes.length + body.length;
	}
	const directory = Buffer.concat(centrals);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(entries.length, 8);
	end.writeUInt16LE(entries.length, 10);
	end.writeUInt32LE(directory.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...locals, directory, end]);
}

let root: string;
const thumbnail = Buffer.from("imagem da miniatura ".repeat(50));

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-zip-"));
	fs.writeFileSync(
		path.join(root, "doc.pptx"),
		buildZip([
			{ name: "[Content_Types].xml", data: Buffer.from("<Types/>"), deflate: true },
			{ name: "docProps/thumbnail.jpeg", data: thumbnail, deflate: true },
		]),
	);
	fs.writeFileSync(
		path.join(root, "doc.odp"),
		buildZip([{ name: "Thumbnails/thumbnail.png", data: thumbnail }]),
	);
	fs.writeFileSync(path.join(root, "falso.pptx"), "não é um zip");
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("readZipEntry", () => {
	it("descompacta uma entrada com deflate", async () => {
		const data = await readZipEntry(path.join(root, "doc.pptx"), ["docProps/thumbnail.jpeg"]);
		expect(data?.equals(thumbnail)).toBe(true);
	});

	it("lê uma entrada guardada, na ordem de preferência dos nomes", async () => {
		const data = await readZipEntry(path.join(root, "doc.odp"), [
			"docProps/thumbnail.jpeg",
			"Thumbnails/thumbnail.png",
		]);
		expect(data?.equals(thumbnail)).toBe(true);
	});

	it("devolve null sem a entrada ou sem ser zip", async () => {
		expect(await readZipEntry(path.join(root, "doc.odp"), ["outra.png"])).toBeNull();
		expect(
			await readZipEntry(path.join(root, "falso.pptx"), ["docProps/thumbnail.jpeg"]),
		).toBeNull();
	});
});
