import type { Locale } from "../locales";
import type { Message } from "../messageTypes";
import { en } from "./en";
import { es } from "./es";
import { ptBr } from "./ptBr";

/** Todas as chaves de mensagem (definidas pelo catálogo de referência, em português). */
export type MessageKey = keyof typeof ptBr;

/** Um catálogo completo: cada idioma precisa de todas as chaves. */
export type Messages = Record<MessageKey, Message>;

export const CATALOGS: Record<Locale, Messages> = { "pt-BR": ptBr, en, es };
