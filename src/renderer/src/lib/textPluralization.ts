/** "1 item", "2 itens" — com separador de milhar em pt-BR. */
export function pluralize(count: number, singular: string, plural: string): string {
	return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}
