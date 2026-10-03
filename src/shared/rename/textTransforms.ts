/** Utilitários de texto usados pelo motor de renomeação. */

export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Separa nome e extensão. Arquivos ocultos sem outro ponto (".bashrc") não têm extensão. */
export function splitName(fullName: string, isDir: boolean): { base: string; ext: string } {
	const dot = fullName.lastIndexOf(".");
	if (isDir || dot <= 0) return { base: fullName, ext: "" };
	return { base: fullName.slice(0, dot), ext: fullName.slice(dot + 1) };
}

export function joinName(base: string, ext: string): string {
	return ext ? `${base}.${ext}` : base;
}

/** Converte uma posição (negativa conta do fim) em índice válido dentro de `text`. */
export function resolvePosition(text: string, position: number): number {
	const length = [...text].length;
	const index = position < 0 ? length + position : position;
	return Math.min(Math.max(index, 0), length);
}

/** Insere `value` após `position` caracteres (code points) de `text`. */
export function insertAt(text: string, value: string, position: number): string {
	const chars = [...text];
	chars.splice(resolvePosition(text, position), 0, value);
	return chars.join("");
}

export function capitalize(word: string): string {
	const [first = "", ...rest] = word;
	return first.toLocaleUpperCase() + rest.join("");
}

export function titleCase(text: string): string {
	return text
		.toLocaleLowerCase()
		.replace(/(^|[\s_\-.([{])(\p{L})/gu, (_, sep: string, letter: string) => {
			return sep + letter.toLocaleUpperCase();
		});
}

export function sentenceCase(text: string): string {
	return text.toLocaleLowerCase().replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase());
}

export function removeAccents(text: string): string {
	return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

/** Regex que casa `word` como palavra inteira (sem letras/números colados). */
export function wholeWordRegExp(word: string, flags: string): RegExp {
	return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, `u${flags}`);
}

/** Formata uma data com os tokens YYYY, YY, MM, DD, HH, mm, ss. */
export function formatDate(date: Date, format: string): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	const tokens: Record<string, string> = {
		YYYY: String(date.getFullYear()),
		YY: String(date.getFullYear()).slice(-2),
		MM: pad(date.getMonth() + 1),
		DD: pad(date.getDate()),
		HH: pad(date.getHours()),
		mm: pad(date.getMinutes()),
		ss: pad(date.getSeconds()),
	};
	return format.replace(/YYYY|YY|MM|DD|HH|mm|ss/g, (token) => tokens[token] ?? token);
}

/** 1 → a, 26 → z, 27 → aa (base 26 bijetiva). */
export function toLetters(n: number): string {
	let result = "";
	let value = n;
	while (value > 0) {
		const rem = (value - 1) % 26;
		result = String.fromCharCode(97 + rem) + result;
		value = Math.floor((value - 1) / 26);
	}
	return result;
}

const ROMAN: [number, string][] = [
	[1000, "M"],
	[900, "CM"],
	[500, "D"],
	[400, "CD"],
	[100, "C"],
	[90, "XC"],
	[50, "L"],
	[40, "XL"],
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

export function toRoman(n: number): string {
	let result = "";
	let value = n;
	for (const [amount, symbol] of ROMAN) {
		while (value >= amount) {
			result += symbol;
			value -= amount;
		}
	}
	return result;
}
