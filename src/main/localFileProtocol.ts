import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { protocol } from "electron";
import {
	LOCAL_FILE_SCHEME,
	localFilePath,
	PDF_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "../shared/preview";
import { parseRange } from "./httpRange";

const CONTENT_TYPES: Record<string, string> = {
	mp4: "video/mp4",
	m4v: "video/mp4",
	mov: "video/quicktime",
	mkv: "video/x-matroska",
	webm: "video/webm",
	ogv: "video/ogg",
	pdf: "application/pdf",
};

/** Precisa rodar antes de `app.whenReady()`. */
export function registerLocalFileScheme(): void {
	protocol.registerSchemesAsPrivileged([
		{
			scheme: LOCAL_FILE_SCHEME,
			// `corsEnabled`: o pdf.js lê o arquivo com `fetch`; `stream`: vídeo sem carregar tudo.
			privileges: {
				standard: true,
				secure: true,
				supportFetchAPI: true,
				corsEnabled: true,
				stream: true,
			},
		},
	]);
}

/**
 * Entrega vídeos e PDFs à interface, com suporte a `Range`: sem ele o vídeo não pula para
 * o meio (o `net.fetch` de `file://` responde sempre o arquivo inteiro, sem tamanho).
 */
export function handleLocalFileProtocol(): void {
	protocol.handle(LOCAL_FILE_SCHEME, async (request) => {
		const file = localFilePath(request.url);
		const ext = file ? path.extname(file).slice(1).toLowerCase() : "";
		if (
			request.method !== "GET" ||
			!file ||
			!path.isAbsolute(file) ||
			!(VIDEO_EXTENSIONS.has(ext) || PDF_EXTENSIONS.has(ext))
		) {
			return new Response(null, { status: 403 });
		}
		const stats = await fs.stat(file).catch(() => null);
		if (!stats?.isFile()) return new Response(null, { status: 404 });

		const headers: Record<string, string> = {
			"Accept-Ranges": "bytes",
			"Access-Control-Allow-Origin": "*",
			"Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
		};
		const range = parseRange(request.headers.get("range"), stats.size);
		if (range === "invalid") {
			return new Response(null, {
				status: 416,
				headers: { ...headers, "Content-Range": `bytes */${stats.size}` },
			});
		}
		const { start, end } = range ?? { start: 0, end: stats.size - 1 };
		headers["Content-Length"] = String(Math.max(0, end - start + 1));
		if (range) headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`;
		const body =
			stats.size === 0
				? null
				: (Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream);
		return new Response(body, { status: range ? 206 : 200, headers });
	});
}
