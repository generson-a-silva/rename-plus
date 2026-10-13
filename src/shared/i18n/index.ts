export type { MessageKey, Messages } from "./catalogs";
export {
	isLocale,
	LOCALE_NATIVE_NAMES,
	LOCALES,
	type Locale,
	resolveLocale,
} from "./locales";
export type { Message, MessageParams } from "./messageTypes";
export { createTranslator, type MessageRef, type Translator, translateRef } from "./translate";
