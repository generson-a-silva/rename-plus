import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { type NativeImage, nativeImage } from "electron";
import type { FileDetails, FileThumbnail } from "../shared/ipc";
import {
	EMBEDDED_THUMBNAIL_EXTENSIONS,
	FFMPEG_EXTENSIONS,
	LIBREOFFICE_EXTENSIONS,
	RESIZABLE_IMAGE_EXTENSIONS,
} from "../shared/preview";
import { renderWithFfmpeg } from "./ffmpegRenderer";
import { renderWithLibreOffice } from "./libreOfficeRenderer";
import { renderWithSystemThumbnailer } from "./systemThumbnailers";
import { readZipEntry } from "./zipEntryReader";

/** Lado maior da miniatura: folga para o painel largo em telas de alta densidade. */
const THUMBNAIL_SIZE = 512;
/** Acima disso a imagem não é lida: demoraria e pesaria na IPC só para uma miniatura. */
const MAX_IMAGE_BYTES = 64 * 1024 * 1024;
/** Imagens enviadas inteiras (`INLINE_IMAGE_EXTENSIONS`): limite de tamanho e tipo MIME. */
const MAX_INLINE_BYTES = 16 * 1024 * 1024;
const INLINE_TYPES: Record<string, string> = {
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	bmp: "image/bmp",
	svg: "image/svg+xml",
	ico: "image/x-icon",
};
const EMBEDDED_THUMBNAIL_ENTRIES = [
	"docProps/thumbnail.jpeg",
	"docProps/thumbnail.png",
	"Thumbnails/thumbnail.png",
];

export async function getFileDetails(target: string): Promise<FileDetails | null> {
	let stats: Awaited<ReturnType<typeof fs.stat>>;
	try {
		stats = await fs.stat(target);
	} catch {
		return null;
	}
	const [owner, itemCount] = await Promise.all([
		ownerName(stats.uid),
		stats.isDirectory() ? countItems(target) : null,
	]);
	return { atimeMs: stats.atimeMs, owner, itemCount };
}

/**
 * Miniatura de um arquivo, à parte dos detalhes porque pode demorar (LibreOffice).
 * `null` para pastas, formatos sem miniatura ou falha ao gerar.
 */
export async function getFileThumbnail(target: string): Promise<FileThumbnail | null> {
	const stats = await fs.stat(target).catch(() => null);
	if (!stats?.isFile()) return null;
	return createThumbnail(target, stats).catch(() => null);
}

async function countItems(dir: string): Promise<number | null> {
	try {
		return (await fs.readdir(dir)).length;
	} catch {
		return null;
	}
}

let usersById: Promise<Map<number, string>> | null = null;

/** Nome do usuário pelo `uid` (o número, se não constar em /etc/passwd). No Windows não há `uid`. */
async function ownerName(uid: number): Promise<string | null> {
	if (process.platform === "win32") return null;
	const current = os.userInfo();
	if (current.uid === uid) return current.username;
	usersById ??= fs.readFile("/etc/passwd", "utf8").then(
		(text) =>
			new Map(
				text.split("\n").flatMap((line) => {
					const [name, , id] = line.split(":");
					return name && id ? [[Number(id), name] as const] : [];
				}),
			),
		() => new Map(),
	);
	return (await usersById).get(uid) ?? String(uid);
}

async function createThumbnail(file: string, stats: Stats): Promise<FileThumbnail | null> {
	const ext = path.extname(file).slice(1).toLowerCase();
	const inlineType = INLINE_TYPES[ext];
	if (inlineType) {
		if (stats.size > MAX_INLINE_BYTES) return null;
		const data = await fs.readFile(file);
		return {
			url: `data:${inlineType};base64,${data.toString("base64")}`,
			width: null,
			height: null,
			duration: null,
			isOriginal: true,
		};
	}
	if (RESIZABLE_IMAGE_EXTENSIONS.has(ext)) {
		if (stats.size > MAX_IMAGE_BYTES) return null;
		const image = nativeImage.createFromBuffer(await fs.readFile(file));
		// Dimensões da imagem original; a miniatura sai reduzida.
		return scaledThumbnail(image, ext === "png" ? "png" : "jpeg", image.getSize());
	}
	if (EMBEDDED_THUMBNAIL_EXTENSIONS.has(ext)) {
		const embedded = await readZipEntry(file, EMBEDDED_THUMBNAIL_ENTRIES).catch(() => null);
		const thumbnail = embedded && scaledThumbnail(nativeImage.createFromBuffer(embedded), "png");
		if (thumbnail) return thumbnail;
	}
	// Windows e macOS geram miniaturas de vídeos, PDFs, Office etc. pelo próprio sistema.
	if (process.platform === "win32" || process.platform === "darwin") {
		const image = await nativeImage
			.createThumbnailFromPath(file, { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE })
			.catch(() => null);
		if (image && !image.isEmpty()) return scaledThumbnail(image, "png");
	}
	// Linux: os geradores que o KDE/GNOME usam (HEIC, AVIF, vídeos…), se instalados.
	const system = await renderWithSystemThumbnailer(file, THUMBNAIL_SIZE);
	const fromSystem = system && scaledThumbnail(nativeImage.createFromBuffer(system), "png");
	if (fromSystem) return fromSystem;
	if (FFMPEG_EXTENSIONS.has(ext)) {
		const frame = await renderWithFfmpeg(file, THUMBNAIL_SIZE);
		const thumbnail =
			frame && scaledThumbnail(nativeImage.createFromBuffer(frame.png), "png", frame);
		if (thumbnail) return thumbnail;
	}
	if (LIBREOFFICE_EXTENSIONS.has(ext)) return renderWithLibreOfficeCached(file, stats);
	return null;
}

/** Reduz para o tamanho do painel; `original` traz as dimensões/duração do arquivo, se conhecidas. */
function scaledThumbnail(
	image: NativeImage,
	format: "png" | "jpeg",
	original: { width?: number | null; height?: number | null; duration?: number | null } = {},
): FileThumbnail | null {
	if (image.isEmpty()) return null;
	const { width, height } = image.getSize();
	const scaled =
		Math.max(width, height) > THUMBNAIL_SIZE
			? image.resize(width >= height ? { width: THUMBNAIL_SIZE } : { height: THUMBNAIL_SIZE })
			: image;
	// PNG mantém a transparência; JPEG fica bem menor para fotos.
	const url =
		format === "png"
			? scaled.toDataURL()
			: `data:image/jpeg;base64,${scaled.toJPEG(85).toString("base64")}`;
	return {
		url,
		width: original.width ?? null,
		height: original.height ?? null,
		duration: original.duration ?? null,
		isOriginal: false,
	};
}

/** Conversões do LibreOffice já feitas (cada uma leva 1–2 s), pelo arquivo e sua versão. */
const libreOfficeRenders = new Map<string, FileThumbnail | null>();
const MAX_RENDERED = 64;

async function renderWithLibreOfficeCached(
	file: string,
	stats: Stats,
): Promise<FileThumbnail | null> {
	const key = `${file}\n${stats.mtimeMs}\n${stats.size}`;
	const cached = libreOfficeRenders.get(key);
	if (cached !== undefined) return cached;
	const png = await renderWithLibreOffice(file);
	const thumbnail = png && scaledThumbnail(nativeImage.createFromBuffer(png), "png");
	// Não guarda a falta de resultado: pode ter sido só a vez de outro pedido.
	if (png) {
		if (libreOfficeRenders.size >= MAX_RENDERED) {
			const oldest = libreOfficeRenders.keys().next().value;
			if (oldest !== undefined) libreOfficeRenders.delete(oldest);
		}
		libreOfficeRenders.set(key, thumbnail);
	}
	return thumbnail;
}
