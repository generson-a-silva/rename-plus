import type { MessageRef } from "../i18n";
import type { FileEntry } from "../ipc";
import { getPlatformPaths, type PlatformPaths } from "../paths";
import type {
	AddOptions,
	AutoDateOptions,
	CaseOptions,
	ExtensionOptions,
	NumberingOptions,
	RemoveOptions,
	RenameOptions,
} from "./renameOptions";
import {
	capitalize,
	escapeRegExp,
	formatDate,
	insertAt,
	joinName,
	removeAccents,
	sentenceCase,
	splitName,
	titleCase,
	toLetters,
	toRoman,
	wholeWordRegExp,
} from "./textTransforms";

export interface RenameContext {
	/** Posição do item no lote (0-based). */
	index: number;
	/** Posição do item dentro da própria pasta (0-based). */
	folderIndex: number;
	now: Date;
}

export type Renamer = (entry: FileEntry, context: RenameContext) => string;

/** Opções que impedem calcular os nomes (ex.: RegEx malformada); `ref` descreve o motivo. */
export class RenameConfigError extends Error {
	constructor(readonly ref: MessageRef) {
		super(ref.key);
	}
}

function compileRegex(options: RenameOptions["regex"]): RegExp | null {
	if (!options.match) return null;
	const flags = `${options.global ? "g" : ""}${options.ignoreCase ? "i" : ""}u`;
	try {
		return new RegExp(options.match, flags);
	} catch (error) {
		throw new RenameConfigError({
			key: "engine.invalidRegex",
			params: { detail: (error as Error).message },
		});
	}
}

function applyCase(text: string, options: CaseOptions): string {
	let result = text;
	switch (options.mode) {
		case "lower":
			result = text.toLocaleLowerCase();
			break;
		case "upper":
			result = text.toLocaleUpperCase();
			break;
		case "title":
			result = titleCase(text);
			break;
		case "sentence":
			result = sentenceCase(text);
			break;
		case "same":
			break;
	}
	for (const exception of options.exceptions.split(";")) {
		const word = exception.trim();
		if (word) result = result.replace(wholeWordRegExp(word, "gi"), word);
	}
	return result;
}

function applyRemove(text: string, options: RemoveOptions): string {
	let chars = [...text];
	if (options.first > 0) chars = chars.slice(options.first);
	if (options.last > 0) chars = chars.slice(0, Math.max(chars.length - options.last, 0));
	if (options.from > 0 && options.to >= options.from) {
		chars.splice(options.from - 1, options.to - options.from + 1);
	}
	let result = chars.join("");

	if (options.chars) {
		const set = new Set(options.chars);
		result = [...result].filter((char) => !set.has(char)).join("");
	}
	for (const word of options.words.split(/\s+/)) {
		if (word) result = result.replace(wholeWordRegExp(word, "gi"), "");
	}
	if (options.cropMode !== "none" && options.cropText) {
		const at = result.indexOf(options.cropText);
		if (at >= 0) {
			result =
				options.cropMode === "before"
					? result.slice(at)
					: result.slice(0, at + options.cropText.length);
		}
	}
	if (options.digits) result = result.replace(/\p{N}/gu, "");
	if (options.high) result = result.replace(/[\u{80}-\u{10FFFF}]/gu, "");
	if (options.accents) result = removeAccents(result);
	if (options.symbols) result = result.replace(/[^\p{L}\p{M}\p{N}\s]/gu, "");
	if (options.doubleSpaces) result = result.replace(/ {2,}/g, " ");
	if (options.trim) result = result.trim();
	if (options.leadDots) result = result.replace(/^\.+/, "");
	return result;
}

function applyAdd(text: string, options: AddOptions): string {
	let result = text;
	if (options.wordSpace) result = result.replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1 $2");
	if (options.insert) result = insertAt(result, options.insert, options.insertAt);
	return options.prefix + result + options.suffix;
}

function place(text: string, value: string, mode: "prefix" | "suffix", separator: string): string {
	return mode === "prefix" ? value + separator + text : text + separator + value;
}

function applyAutoDate(
	text: string,
	entry: FileEntry,
	options: AutoDateOptions,
	now: Date,
): string {
	if (options.mode === "none") return text;
	const date =
		options.type === "current"
			? now
			: new Date(options.type === "created" ? entry.birthtimeMs : entry.mtimeMs);
	return place(text, formatDate(date, options.format), options.mode, options.separator);
}

function applyAppendFolder(
	text: string,
	entry: FileEntry,
	options: RenameOptions["appendFolder"],
	paths: PlatformPaths,
): string {
	if (options.mode === "none") return text;
	const parts = paths.segments(entry.dir);
	const folder = parts.slice(-Math.max(options.levels, 1)).join(options.separator);
	if (!folder) return text;
	return place(text, folder, options.mode, options.separator);
}

export function formatNumber(value: number, options: NumberingOptions): string {
	if (value >= 1 && options.style === "lower") return toLetters(value);
	if (value >= 1 && options.style === "upper") return toLetters(value).toUpperCase();
	if (value >= 1 && value < 4000 && options.style === "roman") return toRoman(value);
	const digits = String(Math.abs(value)).padStart(Math.max(options.padding, 0), "0");
	return value < 0 ? `-${digits}` : digits;
}

function applyNumbering(text: string, options: NumberingOptions, context: RenameContext): string {
	if (options.mode === "none") return text;
	const position = options.resetPerFolder ? context.folderIndex : context.index;
	const number = formatNumber(options.start + position * options.increment, options);
	switch (options.mode) {
		case "prefix":
			return number + options.separator + text;
		case "suffix":
			return text + options.separator + number;
		case "both":
			return number + options.separator + text + options.separator + number;
		case "insert":
			return insertAt(text, number, options.insertAt);
	}
}

function applyExtension(ext: string, options: ExtensionOptions): string {
	switch (options.mode) {
		case "same":
			return ext;
		case "lower":
			return ext.toLocaleLowerCase();
		case "upper":
			return ext.toLocaleUpperCase();
		case "title":
			return capitalize(ext.toLocaleLowerCase());
		case "remove":
			return "";
		case "fixed":
			return options.value.replace(/^\.+/, "");
		case "extra": {
			const extra = options.value.replace(/^\.+/, "");
			return ext && extra ? `${ext}.${extra}` : ext || extra;
		}
	}
}

/**
 * Cria a função que calcula o novo nome de um item, aplicando as seções na
 * mesma ordem do Bulk Rename Utility. Lança `RenameConfigError` se as opções
 * forem inválidas (ex.: RegEx malformada).
 */
export function createRenamer(options: RenameOptions, platform = "linux"): Renamer {
	const paths = getPlatformPaths(platform);
	const regex = compileRegex(options.regex);
	const replaceRegex = options.replace.find
		? new RegExp(escapeRegExp(options.replace.find), options.replace.matchCase ? "g" : "gi")
		: null;

	return (entry, context) => {
		let { base, ext } = splitName(entry.name, entry.isDir);

		// (1) RegEx
		if (regex) {
			regex.lastIndex = 0;
			if (options.regex.includeExt) {
				const replaced = joinName(base, ext).replace(regex, options.regex.replace);
				({ base, ext } = splitName(replaced, entry.isDir));
			} else {
				base = base.replace(regex, options.regex.replace);
			}
		}

		// (2) Nome
		switch (options.name.mode) {
			case "remove":
				base = "";
				break;
			case "fixed":
				base = options.name.fixed;
				break;
			case "reverse":
				base = [...base].reverse().join("");
				break;
			case "keep":
				break;
		}

		// (3) Substituir — a string de substituição é literal (sem padrões `$`).
		if (replaceRegex) base = base.replace(replaceRegex, () => options.replace.with);

		base = applyCase(base, options.case); // (4)
		base = applyRemove(base, options.remove); // (5)
		base = applyAdd(base, options.add); // (6)
		base = applyAutoDate(base, entry, options.autoDate, context.now); // (7)
		base = applyAppendFolder(base, entry, options.appendFolder, paths); // (8)
		base = applyNumbering(base, options.numbering, context); // (9)
		if (!entry.isDir) ext = applyExtension(ext, options.extension); // (10)

		return joinName(base, ext);
	};
}
