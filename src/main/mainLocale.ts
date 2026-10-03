import {
	createTranslator,
	isLocale,
	type Locale,
	type MessageKey,
	type MessageParams,
	type MessageRef,
} from "../shared/i18n";

/**
 * Idioma das mensagens geradas no processo principal (erros de arquivo, botões de
 * diálogos). Começa pelo idioma do sistema e segue a escolha feita na interface.
 */
let translator = createTranslator("pt-BR");

export function setMainLocale(locale: unknown): void {
	if (isLocale(locale)) translator = createTranslator(locale as Locale);
}

export function tMain(key: MessageKey, params?: MessageParams): string {
	return translator(key, params);
}

export function tMainRef(ref: MessageRef): string {
	return translator(ref.key, ref.params);
}
