import type { Locale, Translator } from "@shared/i18n";
import type { FileEntry } from "@shared/ipc";
import { splitName } from "@shared/rename";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatSize(bytes: number, locale: Locale): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	const digits = unit === 0 || value >= 100 ? 0 : 1;
	return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${UNITS[unit]}`;
}

const dateFormatters = new Map<Locale, Intl.DateTimeFormat>();

export function formatDateTime(ms: number, locale: Locale): string {
	let formatter = dateFormatters.get(locale);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });
		dateFormatters.set(locale, formatter);
	}
	return formatter.format(ms);
}

/** Extensão em maiúsculas ("JPG"), ou "" para pastas e arquivos sem extensão. Independe de idioma. */
export function fileExtensionLabel(entry: FileEntry): string {
	return entry.isDir ? "" : splitName(entry.name, false).ext.toUpperCase();
}

/** Texto da coluna "Tipo": a extensão, ou "Pasta"/"Arquivo" no idioma atual. */
export function fileType(entry: FileEntry, t: Translator): string {
	if (entry.isDir) return t("fileType.folder");
	return fileExtensionLabel(entry) || t("fileType.file");
}
