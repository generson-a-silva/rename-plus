import type { MessageRef } from "../i18n";

/** Limite de bytes (UTF-8) de um nome de arquivo na maioria dos sistemas de arquivos Linux. */
export const MAX_NAME_BYTES = 255;
/** Limite de caracteres (UTF-16) de um nome de arquivo no NTFS. */
export const MAX_WINDOWS_NAME_LENGTH = 255;

const encoder = new TextEncoder();

/** Caracteres que o Windows não aceita em nomes (os de controle 0–31 são tratados à parte). */
const WINDOWS_FORBIDDEN_CHARS = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

/** Nomes de dispositivo reservados, com ou sem extensão ("CON", "nul.txt", "COM1.log"). */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

function validatePosixName(name: string): MessageRef | null {
	if (name.includes("/")) return { key: "validation.slash" };
	if (name.includes("\0")) return { key: "validation.nul" };
	if (encoder.encode(name).length > MAX_NAME_BYTES) {
		return { key: "validation.tooManyBytes", params: { max: MAX_NAME_BYTES } };
	}
	return null;
}

function validateWindowsName(name: string): MessageRef | null {
	for (const char of name) {
		if (WINDOWS_FORBIDDEN_CHARS.has(char))
			return { key: "validation.windowsChar", params: { char } };
		if ((char.codePointAt(0) ?? 0) < 32) return { key: "validation.control" };
	}
	if (WINDOWS_RESERVED_NAME.test(name)) return { key: "validation.windowsReserved" };
	if (name.endsWith(".") || name.endsWith(" ")) return { key: "validation.trailingDotSpace" };
	if (name.length > MAX_WINDOWS_NAME_LENGTH) {
		return { key: "validation.tooManyChars", params: { max: MAX_WINDOWS_NAME_LENGTH } };
	}
	return null;
}

/**
 * Descreve por que `name` não pode ser usado como nome de arquivo no sistema
 * indicado (valor de `process.platform`), ou `null` se for válido. O texto é
 * traduzido por quem exibe (`MessageRef`).
 */
export function validateFileName(name: string, platform = "linux"): MessageRef | null {
	if (!name) return { key: "validation.empty" };
	if (name === "." || name === "..") return { key: "validation.reserved" };
	return platform === "win32" ? validateWindowsName(name) : validatePosixName(name);
}
