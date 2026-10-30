// Fotos e músicas de demonstração com metadados de verdade (EXIF e ID3), para os prints e
// as animações mostrarem a regra Metadados. Só o cabeçalho é real: o resto do arquivo é
// preenchido com zeros até o tamanho pedido (a lista mostra tamanhos plausíveis).
import fs from "node:fs";
import path from "node:path";

const u16 = (n) => Buffer.from([(n >> 8) & 0xff, n & 0xff]);
const u32 = (n) => {
	const b = Buffer.alloc(4);
	b.writeUInt32BE(n);
	return b;
};

/** Grava `header` em `file` e completa com zeros até `size`, com a data de modificação. */
function writePadded(file, header, size, date) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, header);
	if (size > header.length) fs.truncateSync(file, size);
	if (date) fs.utimesSync(file, date, date);
}

// --- EXIF (JPEG) ----------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, "0");
const exifDate = (d) =>
	`${d.getFullYear()}:${pad2(d.getMonth() + 1)}:${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const TYPE_SIZE = { 2: 1, 3: 2, 4: 4, 5: 8 };
const ascii = (s) => Buffer.from(`${s}\0`, "latin1");
const rational = (value) => Buffer.concat([u32(Math.round(value * 10)), u32(10)]);

/** Uma IFD do TIFF (big-endian) em `start`, com os valores longos logo depois da tabela. */
function ifd(entries, start) {
	const sorted = [...entries].sort((a, b) => a[0] - b[0]);
	const head = 2 + sorted.length * 12 + 4;
	const table = Buffer.alloc(head);
	const data = [];
	let offset = start + head;
	table.writeUInt16BE(sorted.length, 0);
	sorted.forEach(([tag, type, value], i) => {
		const at = 2 + i * 12;
		table.writeUInt16BE(tag, at);
		table.writeUInt16BE(type, at + 2);
		table.writeUInt32BE(value.length / TYPE_SIZE[type], at + 4);
		if (value.length <= 4) value.copy(table, at + 8);
		else {
			table.writeUInt32BE(offset, at + 8);
			data.push(value);
			offset += value.length;
		}
	});
	return Buffer.concat([table, ...data]);
}

/**
 * JPEG com EXIF: `taken` (data da foto), câmera, lente, ISO, abertura, distância focal e
 * dimensões. Não é uma imagem decodificável (o app mostra o ícone, como nos outros prints).
 */
export function writeExifJpeg(file, { size, date, taken, make, model, lens, iso, fNumber, focal }) {
	const ifd0 = [
		[0x010f, 2, ascii(make)],
		[0x0110, 2, ascii(model)],
	];
	const exif = [
		[0x829d, 5, rational(fNumber)],
		[0x8827, 3, u16(iso)],
		[0x9003, 2, ascii(exifDate(taken))],
		[0x920a, 5, rational(focal)],
		[0xa002, 4, u32(4000)],
		[0xa003, 4, u32(3000)],
		[0xa434, 2, ascii(lens)],
	];
	// A IFD0 aponta para a IFD do EXIF (0x8769), que vem logo depois dela.
	const pointer = (at) => [0x8769, 4, u32(at)];
	const first = ifd([...ifd0, pointer(0)], 8);
	const exifStart = 8 + first.length;
	const tiff = Buffer.concat([
		Buffer.from("MM\0\x2a", "latin1"),
		u32(8),
		ifd([...ifd0, pointer(exifStart)], 8),
		ifd(exif, exifStart),
	]);
	const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
	const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), u16(payload.length + 2), payload]);
	writePadded(file, Buffer.concat([Buffer.from([0xff, 0xd8]), app1]), size, date);
}

// --- ID3 (MP3) ------------------------------------------------------------------

/** Quadro de texto do ID3v2.3 em UTF-16 com BOM (aceita acentos). */
function textFrame(id, text) {
	const body = Buffer.concat([Buffer.from([1, 0xff, 0xfe]), Buffer.from(text, "utf16le")]);
	return Buffer.concat([Buffer.from(id, "latin1"), u32(body.length), Buffer.alloc(2), body]);
}

/** Tamanho "syncsafe" do cabeçalho ID3 (7 bits por byte). */
function syncsafe(n) {
	return Buffer.from([(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f]);
}

/** Um quadro MPEG-1 Layer III de 128 kbps / 44,1 kHz em silêncio (417 bytes). */
const MPEG_FRAME = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(413)]);

/** MP3 com tags ID3v2.3: artista, álbum, título, faixa, disco, ano e gênero. */
export function writeId3Mp3(file, { size, date, artist, album, title, track, disc, year, genre }) {
	const frames = Buffer.concat([
		textFrame("TPE1", artist),
		textFrame("TPE2", artist),
		textFrame("TALB", album),
		textFrame("TIT2", title),
		textFrame("TRCK", String(track)),
		textFrame("TPOS", String(disc)),
		textFrame("TYER", String(year)),
		textFrame("TCON", genre),
	]);
	const header = Buffer.concat([Buffer.from("ID3\x03\0\0", "latin1"), syncsafe(frames.length)]);
	writePadded(file, Buffer.concat([header, frames, MPEG_FRAME, MPEG_FRAME]), size, date);
}
