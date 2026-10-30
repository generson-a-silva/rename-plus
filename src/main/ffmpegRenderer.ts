import path from "node:path";
import { createLatestOnlyQueue, findExecutable, runTool } from "./externalTools";

const TIMEOUT_MS = 20_000;

export interface FfmpegFrame {
	png: Buffer;
	/** Dimensões e duração (segundos) do original, quando o `ffprobe` as informa. */
	width: number | null;
	height: number | null;
	duration: number | null;
}

/** Uma extração por vez, só a mais recente (vídeos grandes podem demorar a abrir). */
const queue = createLatestOnlyQueue();

/**
 * Frame do meio de um vídeo (ou a imagem de um HEIC), reduzido para caber em `size` px,
 * pelo FFmpeg instalado no sistema. Cobre o que o Chromium não decodifica (HEVC, AVI,
 * WMV…). `null` sem FFmpeg, em falha ou se um pedido mais recente tomar a vez.
 */
export function renderWithFfmpeg(file: string, size: number): Promise<FfmpegFrame | null> {
	return queue(() => extract(file, size)).catch(() => null);
}

async function extract(file: string, size: number): Promise<FfmpegFrame | null> {
	const ffmpeg = await findExecutable(["ffmpeg"]);
	if (!ffmpeg) return null;
	const info = await probe(ffmpeg, file);
	const middle = info.duration && info.duration > 0 ? info.duration / 2 : 0;
	const png = await runTool(
		ffmpeg,
		[
			"-v",
			"error",
			// Antes do `-i`: pula direto para perto do ponto, sem decodificar o começo.
			"-ss",
			middle.toFixed(3),
			"-i",
			file,
			"-frames:v",
			"1",
			"-vf",
			`scale=${size}:${size}:force_original_aspect_ratio=decrease`,
			"-f",
			"image2pipe",
			"-c:v",
			"png",
			"-",
		],
		TIMEOUT_MS,
	);
	return png.length > 0 ? { png, ...info } : null;
}

/** Duração e dimensões pelo `ffprobe` (vem com o FFmpeg); sem ele, tudo `null`. */
async function probe(ffmpeg: string, file: string) {
	const unknown = { width: null, height: null, duration: null };
	const name = path.basename(ffmpeg).replace(/^ffmpeg/, "ffprobe");
	const ffprobe = await findExecutable(["ffprobe"], [path.join(path.dirname(ffmpeg), name)]);
	if (!ffprobe) return unknown;
	try {
		const output = await runTool(
			ffprobe,
			[
				"-v",
				"error",
				"-select_streams",
				"v:0",
				"-show_entries",
				"stream=width,height:format=duration",
				"-of",
				"json",
				file,
			],
			TIMEOUT_MS,
		);
		const json = JSON.parse(output.toString("utf8")) as {
			streams?: Array<{ width?: number; height?: number }>;
			format?: { duration?: string };
		};
		const stream = json.streams?.[0];
		const duration = Number(json.format?.duration);
		return {
			width: stream?.width ?? null,
			height: stream?.height ?? null,
			duration: Number.isFinite(duration) ? duration : null,
		};
	} catch {
		return unknown;
	}
}
