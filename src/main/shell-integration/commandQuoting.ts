/** Caracteres que exigem aspas num argumento de `Exec=` (especificação Desktop Entry). */
const DESKTOP_RESERVED = /[\s"'\\><~|&;$*?#()`]/;

/**
 * Um argumento da chave `Exec=` de um arquivo .desktop: entre aspas duplas quando
 * preciso (escapando `"`, `` ` ``, `$` e `\`) e com `%` dobrado, para não virar código
 * de campo (%f, %F…).
 */
export function quoteDesktopExecArg(arg: string): string {
	const quoted =
		DESKTOP_RESERVED.test(arg) || arg === "" ? `"${arg.replace(/["`$\\]/g, "\\$&")}"` : arg;
	return quoted.replaceAll("%", "%%");
}

/** Valor de uma chave de arquivo .desktop/keyfile: barra invertida e quebras de linha escapadas. */
export function escapeKeyFileValue(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

/** Argumento para shell POSIX (scripts, Thunar, Nemo): aspas simples quando preciso. */
export function quotePosixArg(arg: string): string {
	if (/^[\w/.:+=@,-]+$/.test(arg)) return arg;
	return `'${arg.replaceAll("'", `'\\''`)}'`;
}

/** Argumento para a linha de comando do Windows (caminhos não podem conter `"`). */
export function quoteWindowsArg(arg: string): string {
	return `"${arg}"`;
}

export function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Texto de um arquivo .reg: aspas e barras invertidas escapadas. */
export function escapeRegString(text: string): string {
	return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
