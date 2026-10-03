import { formatDateTime, formatSize } from "@lib";
import {
	createTranslator,
	isLocale,
	type Locale,
	type MessageRef,
	resolveLocale,
	type Translator,
} from "@shared/i18n";
import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { usePersistentState } from "./usePersistentState";

export interface I18n {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	/** Traduz uma chave no idioma atual (com `{parâmetros}` e plural por `count`). */
	t: Translator;
	/** Traduz um problema descrito pelo shared/main (`{ key, params }`). */
	tr: (ref: MessageRef) => string;
	formatNumber: (value: number) => string;
	formatDateTime: (ms: number) => string;
	formatSize: (bytes: number) => string;
}

export const I18nContext = createContext<I18n | null>(null);

/** Acesso ao idioma e às traduções. Precisa estar dentro de `<I18nProvider>`. */
export function useI18n(): I18n {
	const i18n = useContext(I18nContext);
	if (!i18n) throw new Error("useI18n() fora de <I18nProvider>");
	return i18n;
}

/**
 * Estado do idioma (usado pelo `I18nProvider`): escolha salva entre sessões; na
 * primeira execução, o idioma do sistema. Mantém o `lang` do documento e o idioma
 * do processo principal sincronizados.
 */
export function useI18nState(): I18n {
	const [stored, setLocale] = usePersistentState<Locale>(
		"locale",
		resolveLocale(navigator.language),
	);
	const locale = isLocale(stored) ? stored : resolveLocale(navigator.language);

	useLayoutEffect(() => {
		document.documentElement.lang = locale;
		void window.api.setLocale(locale);
	}, [locale]);

	return useMemo(() => {
		const t = createTranslator(locale);
		const numberFormat = new Intl.NumberFormat(locale);
		return {
			locale,
			setLocale,
			t,
			tr: (ref) => t(ref.key, ref.params),
			formatNumber: (value) => numberFormat.format(value),
			formatDateTime: (ms) => formatDateTime(ms, locale),
			formatSize: (bytes) => formatSize(bytes, locale),
		};
	}, [locale, setLocale]);
}
