import type { MessageKey, Messages } from "./catalogs";
import { CATALOGS } from "./catalogs";
import type { Locale } from "./locales";
import type { MessageParams } from "./messageTypes";

/** Referência a uma mensagem: permite que `shared`/`main` descrevam problemas sem fixar o idioma. */
export interface MessageRef {
	key: MessageKey;
	params?: MessageParams;
}

export type Translator = (key: MessageKey, params?: MessageParams) => string;

/**
 * Cria a função de tradução de um idioma:
 * - `{nome}` é substituído pelo parâmetro de mesmo nome (números são formatados no idioma);
 * - mensagens com plural escolhem a forma pelo parâmetro `count` (1 → "one"; demais → "other").
 */
export function createTranslator(locale: Locale): Translator {
	const catalog: Messages = CATALOGS[locale];
	const numberFormat = new Intl.NumberFormat(locale);
	return (key, params = {}) => {
		const message = catalog[key];
		const template =
			typeof message === "string"
				? message
				: Math.abs(Number(params.count)) === 1
					? message.one
					: message.other;
		return template.replace(/\{(\w+)\}/g, (match, name: string) => {
			const value = params[name];
			if (value === undefined) return match;
			return typeof value === "number" ? numberFormat.format(value) : value;
		});
	};
}

/** Traduz uma `MessageRef` (atalho para `t(ref.key, ref.params)`). */
export function translateRef(t: Translator, ref: MessageRef): string {
	return t(ref.key, ref.params);
}
