import type { FileEntry } from "@shared/ipc";
import { splitName } from "@shared/rename";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatSize(bytes: number): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	const digits = unit === 0 || value >= 100 ? 0 : 1;
	return `${value.toLocaleString("pt-BR", { maximumFractionDigits: digits })} ${UNITS[unit]}`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function formatDateTime(ms: number): string {
	return dateFormatter.format(ms);
}

export function fileType(entry: FileEntry): string {
	if (entry.isDir) return "Pasta";
	const { ext } = splitName(entry.name, false);
	return ext ? ext.toUpperCase() : "Arquivo";
}
