import fs from "node:fs/promises";
import { promisify } from "node:util";
import { inflateRaw } from "node:zlib";

const inflate = promisify(inflateRaw);

/** Fim do diretório central: 22 bytes + comentário de até 64 KB. */
const MAX_TAIL = 22 + 0xffff;
/** Entradas maiores não são lidas: aqui só interessam miniaturas. */
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;

/**
 * Lê do zip a primeira entrada de `names` que existir (sem descompactar o resto). Só o
 * necessário para as miniaturas embutidas em documentos do Office e do LibreOffice:
 * sem ZIP64, sem criptografia; métodos "guardado" e "deflate". `null` se não achar.
 */
export async function readZipEntry(file: string, names: readonly string[]): Promise<Buffer | null> {
	const handle = await fs.open(file, "r");
	try {
		const { size } = await handle.stat();
		const read = async (position: number, length: number) => {
			const buffer = Buffer.alloc(length);
			const { bytesRead } = await handle.read(buffer, 0, length, position);
			return buffer.subarray(0, bytesRead);
		};

		const tailLength = Math.min(size, MAX_TAIL);
		const tail = await read(size - tailLength, tailLength);
		const end = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
		if (end < 0 || end + 22 > tail.length) return null;
		const directorySize = tail.readUInt32LE(end + 12);
		const directoryOffset = tail.readUInt32LE(end + 16);
		if (directoryOffset + directorySize > size) return null;
		const directory = await read(directoryOffset, directorySize);

		const found = new Map<string, { method: number; compressed: number; offset: number }>();
		for (let at = 0; at + 46 <= directory.length && directory.readUInt32LE(at) === 0x02014b50; ) {
			const nameLength = directory.readUInt16LE(at + 28);
			const name = directory.toString("utf8", at + 46, at + 46 + nameLength);
			if (names.includes(name)) {
				found.set(name, {
					method: directory.readUInt16LE(at + 10),
					compressed: directory.readUInt32LE(at + 20),
					offset: directory.readUInt32LE(at + 42),
				});
			}
			at += 46 + nameLength + directory.readUInt16LE(at + 30) + directory.readUInt16LE(at + 32);
		}

		const entry = names.map((name) => found.get(name)).find(Boolean);
		if (!entry || entry.compressed > MAX_ENTRY_BYTES) return null;
		const local = await read(entry.offset, 30);
		if (local.length < 30 || local.readUInt32LE(0) !== 0x04034b50) return null;
		const dataStart = entry.offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
		const data = await read(dataStart, entry.compressed);
		if (entry.method === 0) return data;
		if (entry.method === 8) return await inflate(data);
		return null;
	} finally {
		await handle.close();
	}
}
