/** Idiomas suportados pela interface. */
export type Locale = "pt-BR" | "en" | "es";

export const LOCALES: readonly Locale[] = ["pt-BR", "en", "es"];

/** Nome de cada idioma escrito no próprio idioma (como aparece no seletor). */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
	"pt-BR": "Português (Brasil)",
	en: "English",
	es: "Español",
};

/** Código curto exibido no botão do seletor. */
export const LOCALE_SHORT_NAMES: Record<Locale, string> = {
	"pt-BR": "PT",
	en: "EN",
	es: "ES",
};

export function isLocale(value: unknown): value is Locale {
	return LOCALES.includes(value as Locale);
}

/** Escolhe o idioma suportado mais próximo de uma tag do sistema ("pt-PT", "es-AR", "en-US"…). */
export function resolveLocale(tag: string | null | undefined): Locale {
	const language = (tag ?? "").toLowerCase().split(/[-_]/)[0];
	if (language === "pt") return "pt-BR";
	if (language === "es") return "es";
	return "en";
}
