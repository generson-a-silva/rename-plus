/** Texto simples ou com formas de plural (escolhidas pelo parâmetro `count`). */
export type Message = string | { one: string; other: string };

export type MessageParams = Record<string, string | number>;
