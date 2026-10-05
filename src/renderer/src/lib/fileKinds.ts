import type { FileEntry } from "@shared/ipc";
import { splitName } from "@shared/rename";

/** Categoria de um item da lista, usada para escolher o ícone. "file" = tipo não reconhecido. */
export type FileKind =
	| "folder"
	| "image"
	| "video"
	| "audio"
	| "archive"
	| "pdf"
	| "document"
	| "spreadsheet"
	| "presentation"
	| "text"
	| "code"
	| "executable"
	| "font"
	| "file";

const EXTENSIONS: Record<Exclude<FileKind, "folder" | "file">, string> = {
	image:
		"jpg jpeg jfif png gif webp bmp svg tif tiff heic heif avif ico raw cr2 cr3 nef arw dng orf rw2 psd xcf kra",
	video: "mp4 m4v mkv avi mov wmv webm flv mpg mpeg 3gp ogv mts m2ts vob",
	audio: "mp3 wav flac ogg oga m4a aac wma opus aiff aif mid midi amr",
	archive: "zip rar 7z tar gz tgz bz2 tbz2 xz txz zst lz lzma iso img dmg deb rpm cab jar",
	pdf: "pdf",
	document: "doc docx odt rtf pages epub mobi djvu",
	spreadsheet: "xls xlsx xlsm ods csv tsv numbers",
	presentation: "ppt pptx odp key",
	text: "txt md markdown log nfo srt ass vtt",
	code: "js mjs cjs jsx ts mts cts tsx json jsonc html htm css scss sass less py java kt kts c h cc cpp hpp cs go rs rb php sh bash zsh fish ps1 psm1 bat cmd sql xml yml yaml toml ini cfg conf env lua swift vue svelte dart r pl",
	executable: "exe msi appimage apk run bin com",
	font: "ttf otf woff woff2 eot",
};

const KIND_BY_EXTENSION = new Map<string, FileKind>(
	Object.entries(EXTENSIONS).flatMap(([kind, list]) =>
		list.split(" ").map((ext) => [ext, kind as FileKind] as const),
	),
);

/** Categoria pelo nome (extensão, sem diferenciar maiúsculas) ou "folder" para pastas. */
export function fileKind(entry: Pick<FileEntry, "name" | "isDir">): FileKind {
	if (entry.isDir) return "folder";
	const { ext } = splitName(entry.name, false);
	return KIND_BY_EXTENSION.get(ext.toLowerCase()) ?? "file";
}
