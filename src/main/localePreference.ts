import { isLocale, type Locale } from "../shared/i18n";
import { readSettingsFile, writeSettingsFile } from "./settingsFile";

/**
 * Idioma escolhido na interface, salvo para o processo principal: em segundo plano não
 * há janela para informá-lo, e notificações e bandeja precisam dele.
 */
const LOCALE_FILE = "locale.json";

export function loadSavedLocale(): Locale | null {
	const stored = readSettingsFile(LOCALE_FILE) as { locale?: unknown } | null;
	return isLocale(stored?.locale) ? (stored.locale as Locale) : null;
}

export function saveLocale(locale: unknown): void {
	if (isLocale(locale) && locale !== loadSavedLocale()) writeSettingsFile(LOCALE_FILE, { locale });
}
