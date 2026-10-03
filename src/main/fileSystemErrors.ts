import type { MessageKey } from "../shared/i18n";
import { tMain } from "./mainLocale";

/** Códigos de erro do Node com mensagem própria (chaves `fs.<código>` nos catálogos). */
const KNOWN_CODES = new Set([
	"EBUSY",
	"EPERM",
	"EACCES",
	"ENOSPC",
	"ENOENT",
	"ENAMETOOLONG",
	"EEXIST",
	"ENOTEMPTY",
	"EROFS",
]);

/** Traduz um erro do Node (`EBUSY`, `EPERM`…) para uma mensagem no idioma atual. */
export function describeFileSystemError(error: unknown): string {
	const { code, message } = error as NodeJS.ErrnoException;
	return code && KNOWN_CODES.has(code) ? tMain(`fs.${code}` as MessageKey) : message;
}
