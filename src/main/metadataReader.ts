import fs from "node:fs/promises";
import path from "node:path";
import exifr from "exifr";
import type { FileMetadata, MetadataResult } from "../shared/ipc";
import { metadataKindOf } from "../shared/metadata";
import { emptyMetadata } from "../shared/rename";
import { mapLimit } from "./directoryWalker";

/** Leituras simultâneas: cada uma abre o arquivo e lê só o começo (ou as tags no fim). */
const CONCURRENCY = 16;
/** Intervalo mínimo entre os resultados parciais enviados à interface. */
const PROGRESS_INTERVAL_MS = 150;
/**
 * Prazo de cada leitura. Um disco de rede que caiu ou um arquivo que trave o parser não
 * seguram a fila das pastas monitoradas nem deixam a prévia "lendo" para sempre.
 */
const READ_TIMEOUT_MS = 10_000;
/** Arquivos lidos guardados em memória (os metadados de cada um ocupam poucas centenas de bytes). */
const MAX_CACHED = 5_000;
/**
 * Tags lidas de cada bloco: com `pick`, o `exifr` ignora o resto do cabeçalho. O IHDR (só
 * no PNG, onde ficam largura e altura) vem inteiro: um `pick` geral o esconderia.
 */
const EXIF_OPTIONS = {
	tiff: { pick: ["Make", "Model", "ImageWidth", "ImageHeight"] },
	exif: {
		pick: [
			"DateTimeOriginal",
			"CreateDate",
			"LensModel",
			"ISO",
			"FNumber",
			"FocalLength",
			"ExifImageWidth",
			"ExifImageHeight",
		],
	},
	ihdr: true,
	gps: false,
	interop: false,
	xmp: false,
	icc: false,
	iptc: false,
	jfif: false,
};

/** Metadados já lidos, pelo arquivo e sua versão (mudou o arquivo, muda a chave). */
const cache = new Map<string, FileMetadata | null>();

function remember(key: string, value: FileMetadata | null): void {
	if (cache.size >= MAX_CACHED) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, value);
}

// Valores vêm de dentro de arquivos quaisquer: só passam os do tipo esperado.
function text(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed || null;
}

function number(value: unknown): number | null {
	// Algumas câmeras gravam o ISO como lista (ISOSpeedRatings): vale o primeiro.
	const first = Array.isArray(value) ? value[0] : value;
	return typeof first === "number" && Number.isFinite(first) && first >= 0 ? first : null;
}

function timestamp(value: unknown): number | null {
	return value instanceof Date && !Number.isNaN(value.getTime()) ? value.getTime() : null;
}

/** Nada além do vazio: trata como "sem metadados". */
function orNull(meta: FileMetadata): FileMetadata | null {
	return Object.values(meta).some((value) => value !== null) ? meta : null;
}

async function readPhoto(file: string): Promise<FileMetadata | null> {
	// O `exifr` lê a data como hora local (o EXIF não tem fuso): é a hora que a câmera mostrava.
	const tags: Record<string, unknown> | undefined = await exifr.parse(file, EXIF_OPTIONS);
	if (!tags) return null;
	return orNull({
		...emptyMetadata(),
		takenAt: timestamp(tags.DateTimeOriginal) ?? timestamp(tags.CreateDate),
		cameraMake: text(tags.Make),
		cameraModel: text(tags.Model),
		lens: text(tags.LensModel),
		iso: number(tags.ISO),
		aperture: number(tags.FNumber),
		focalLength: number(tags.FocalLength),
		width: number(tags.ExifImageWidth) ?? number(tags.ImageWidth),
		height: number(tags.ExifImageHeight) ?? number(tags.ImageHeight),
	});
}

// O `music-metadata` é só ESM: carregado uma vez, sob demanda, com `import()`.
let musicMetadata: Promise<typeof import("music-metadata")> | null = null;

/**
 * Artistas como estão no arquivo. No ID3v2.3 a "/" separa vários artistas e o parser
 * divide "AC/DC" em dois; juntar de volta preserva o texto original.
 */
function artistsOf(list: unknown, single: unknown): string | null {
	if (Array.isArray(list)) {
		const names = list.map(text).filter((name): name is string => name !== null);
		if (names.length > 0) return names.join("/");
	}
	return text(single);
}

async function readAudio(file: string): Promise<FileMetadata | null> {
	musicMetadata ??= import("music-metadata");
	const { parseFile } = await musicMetadata;
	// Sem `duration: true`, a duração vem do cabeçalho, sem percorrer o arquivo todo.
	const { common, format } = await parseFile(file, { skipCovers: true });
	return orNull({
		...emptyMetadata(),
		artist: artistsOf(common.artists, common.artist),
		albumArtist: artistsOf(common.albumartists, common.albumartist),
		album: text(common.album),
		title: text(common.title),
		track: number(common.track.no),
		disc: number(common.disk.no),
		year: number(common.year),
		genre: text(common.genre?.[0]),
		duration: number(format.duration),
	});
}

/** O resultado de `promise` ou, se ela demorar mais que `ms`, `"timeout"`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<"timeout">((resolve) => {
		timer = setTimeout(() => resolve("timeout"), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Erro do sistema (arquivo em uso, sem permissão, disco fora): pode passar, não vai para o cache. */
function isSystemError(error: unknown): boolean {
	return typeof (error as NodeJS.ErrnoException | null)?.code === "string";
}

async function readUncached(file: string, kind: "photo" | "audio"): Promise<FileMetadata | null> {
	const stats = await fs.stat(file).catch(() => null);
	if (!stats?.isFile()) return null;

	const key = `${file}\n${stats.mtimeMs}\n${stats.size}`;
	const cached = cache.get(key);
	if (cached !== undefined) return cached;
	try {
		const result = kind === "photo" ? await readPhoto(file) : await readAudio(file);
		remember(key, result);
		return result;
	} catch (error) {
		// Formato não reconhecido ou arquivo truncado: fica como "sem metadados" até mudar.
		if (!isSystemError(error)) remember(key, null);
		return null;
	}
}

/**
 * Metadados de uma foto (EXIF) ou música (tags), escolhendo a biblioteca pela extensão.
 * `null` para outros tipos, arquivos sem metadados, ilegíveis, corrompidos ou que demoram
 * demais. Guarda o resultado em memória enquanto o arquivo não mudar (caminho, data e tamanho).
 */
export async function readMetadata(file: string): Promise<FileMetadata | null> {
	const kind = metadataKindOf(path.basename(file));
	if (!kind) return null;
	const result = await withTimeout(readUncached(file, kind), READ_TIMEOUT_MS);
	return result === "timeout" ? null : result;
}

export interface MetadataBatchOptions {
	signal?: AbortSignal;
	/** Resultados lidos desde o aviso anterior. */
	onProgress?: (results: MetadataResult[]) => void;
	progressIntervalMs?: number;
}

/** Lê os metadados de vários arquivos em paralelo, avisando os resultados aos poucos. */
export async function readMetadataBatch(
	files: readonly string[],
	{ signal, onProgress, progressIntervalMs = PROGRESS_INTERVAL_MS }: MetadataBatchOptions = {},
): Promise<MetadataResult[]> {
	signal?.throwIfAborted();
	let unsent: MetadataResult[] = [];
	let lastProgress = Date.now();
	const results = await mapLimit(
		files,
		CONCURRENCY,
		async (file): Promise<MetadataResult> => {
			const result: MetadataResult = [file, await readMetadata(file)];
			if (onProgress) {
				unsent.push(result);
				const now = Date.now();
				if (now - lastProgress >= progressIntervalMs) {
					lastProgress = now;
					onProgress(unsent);
					unsent = [];
				}
			}
			return result;
		},
		signal,
	);
	return results;
}
