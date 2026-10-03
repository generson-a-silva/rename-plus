/** Limite de bytes (UTF-8) de um nome de arquivo na maioria dos sistemas de arquivos Linux. */
export const MAX_NAME_BYTES = 255;
/** Limite de caracteres (UTF-16) de um nome de arquivo no NTFS. */
export const MAX_WINDOWS_NAME_LENGTH = 255;

const encoder = new TextEncoder();

/** Caracteres que o Windows não aceita em nomes (os de controle 0–31 são tratados à parte). */
const WINDOWS_FORBIDDEN_CHARS = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);

/** Nomes de dispositivo reservados, com ou sem extensão ("CON", "nul.txt", "COM1.log"). */
const WINDOWS_RESERVED_NAME = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

function validatePosixName(name: string): string | null {
	if (name.includes("/")) return 'Contém o caractere "/"';
	if (name.includes("\0")) return "Contém caractere nulo";
	if (encoder.encode(name).length > MAX_NAME_BYTES) return `Excede ${MAX_NAME_BYTES} bytes`;
	return null;
}

function validateWindowsName(name: string): string | null {
	for (const char of name) {
		if (WINDOWS_FORBIDDEN_CHARS.has(char)) return `Caractere não permitido no Windows: ${char}`;
		if ((char.codePointAt(0) ?? 0) < 32) return "Contém caractere de controle";
	}
	if (WINDOWS_RESERVED_NAME.test(name)) return "Nome reservado pelo Windows";
	if (name.endsWith(".") || name.endsWith(" ")) return "Não pode terminar com ponto ou espaço";
	if (name.length > MAX_WINDOWS_NAME_LENGTH) return `Excede ${MAX_WINDOWS_NAME_LENGTH} caracteres`;
	return null;
}

/**
 * Retorna uma mensagem de erro se `name` não puder ser usado como nome de arquivo
 * no sistema indicado (valor de `process.platform`).
 */
export function validateFileName(name: string, platform = "linux"): string | null {
	if (!name) return "Nome vazio";
	if (name === "." || name === "..") return "Nome reservado";
	return platform === "win32" ? validateWindowsName(name) : validatePosixName(name);
}
