import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createLatestOnlyQueue, findExecutable, runTool, withTempDir } from "./externalTools";

const TIMEOUT_MS = 15_000;

/** Gerador de miniaturas registrado no sistema (arquivo `.thumbnailer` do freedesktop). */
export interface Thumbnailer {
	tryExec: string | null;
	/** Comando com `%i` (caminho), `%u` (URI), `%o` (saída PNG) e `%s` (tamanho). */
	exec: string[];
	mimeTypes: string[];
}

/** Lê um `.thumbnailer` (seção `[Thumbnailer Entry]`); `null` se faltar `Exec` ou `MimeType`. */
export function parseThumbnailer(text: string): Thumbnailer | null {
	const values = new Map<string, string>();
	let inEntry = false;
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (line.startsWith("[")) inEntry = line === "[Thumbnailer Entry]";
		else if (inEntry && line.includes("=") && !line.startsWith("#")) {
			const index = line.indexOf("=");
			values.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
		}
	}
	const exec = values.get("Exec")?.split(/\s+/).filter(Boolean) ?? [];
	const mimeTypes = values.get("MimeType")?.split(";").filter(Boolean) ?? [];
	if (exec.length === 0 || mimeTypes.length === 0) return null;
	return { tryExec: values.get("TryExec") ?? null, exec, mimeTypes };
}

/**
 * Extensão → tipo MIME pelo `globs2` do shared-mime-info ("peso:tipo:*.ext"). Só os
 * padrões simples de extensão; com mais de um tipo, fica o de maior peso.
 */
export function parseMimeGlobs(
	text: string,
	into = new Map<string, { mime: string; weight: number }>(),
) {
	for (const line of text.split("\n")) {
		if (!line || line.startsWith("#")) continue;
		const [weight, mime, glob] = line.split(":");
		const match = glob && /^\*\.([^*?[\]]+)$/.exec(glob);
		if (!mime || !match?.[1]) continue;
		const ext = match[1].toLowerCase();
		const current = into.get(ext);
		if (!current || Number(weight) > current.weight)
			into.set(ext, { mime, weight: Number(weight) });
	}
	return into;
}

/** Pastas de dados do freedesktop: a do usuário primeiro, depois as do sistema. */
function dataDirs(): string[] {
	const home = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
	const system = (process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":");
	return [home, ...system].filter(Boolean);
}

interface Registry {
	mimeByExt: Map<string, { mime: string; weight: number }>;
	byMime: Map<string, Thumbnailer>;
}

let registry: Promise<Registry> | null = null;

/** Tipos MIME e geradores instalados, lidos uma vez (mudam só ao instalar programas). */
function loadRegistry(): Promise<Registry> {
	registry ??= (async () => {
		const mimeByExt = new Map<string, { mime: string; weight: number }>();
		const byMime = new Map<string, Thumbnailer>();
		// Do sistema para o usuário: as definições do usuário sobrescrevem.
		for (const dir of dataDirs().reverse()) {
			const globs = await fs.readFile(path.join(dir, "mime", "globs2"), "utf8").catch(() => "");
			parseMimeGlobs(globs, mimeByExt);
			const thumbnailersDir = path.join(dir, "thumbnailers");
			const files = await fs.readdir(thumbnailersDir).catch(() => []);
			for (const file of files.filter((name) => name.endsWith(".thumbnailer"))) {
				const text = await fs.readFile(path.join(thumbnailersDir, file), "utf8").catch(() => "");
				const thumbnailer = parseThumbnailer(text);
				for (const mime of thumbnailer?.mimeTypes ?? []) {
					if (thumbnailer) byMime.set(mime, thumbnailer);
				}
			}
		}
		return { mimeByExt, byMime };
	})();
	return registry;
}

/** Um gerador por vez, só o pedido mais recente. */
const queue = createLatestOnlyQueue();

/**
 * Miniatura PNG gerada pelos programas que o KDE/GNOME usam (Linux): HEIC, AVIF, JPEG XL,
 * vídeos (com ffmpegthumbnailer), o que estiver instalado. `null` sem gerador para o tipo.
 */
export async function renderWithSystemThumbnailer(
	file: string,
	size: number,
): Promise<Buffer | null> {
	if (process.platform !== "linux") return null;
	const { mimeByExt, byMime } = await loadRegistry();
	const mime = mimeByExt.get(path.extname(file).slice(1).toLowerCase())?.mime;
	const thumbnailer = mime ? byMime.get(mime) : undefined;
	if (!thumbnailer) return null;
	const [program, ...args] = thumbnailer.exec;
	if (!program) return null;
	const executable = path.isAbsolute(program) ? program : await findExecutable([program]);
	if (!executable || (thumbnailer.tryExec && !(await findExecutable([], [thumbnailer.tryExec])))) {
		return null;
	}
	return queue(() =>
		withTempDir(async (dir) => {
			const output = path.join(dir, "thumbnail.png");
			const fields: Record<string, string> = {
				"%i": file,
				"%u": pathToFileURL(file).href,
				"%o": output,
				"%s": String(size),
				"%%": "%",
			};
			await runTool(
				executable,
				args.map((arg) => arg.replace(/%[iuos%]/g, (field) => fields[field] ?? field)),
				TIMEOUT_MS,
			);
			return await fs.readFile(output);
		}),
	).catch(() => null);
}
