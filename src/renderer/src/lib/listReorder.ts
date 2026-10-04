/**
 * Move o item `id` para a posição `index` contada na lista original (como o marcador
 * de soltura): soltar logo antes ou depois dele mesmo não muda nada.
 */
export function moveItem<T extends { id: string }>(
	items: readonly T[],
	id: string,
	index: number,
): T[] {
	const from = items.findIndex((item) => item.id === id);
	if (from === -1) return [...items];
	const target = Math.max(0, Math.min(index > from ? index - 1 : index, items.length - 1));
	if (target === from) return [...items];
	const next = items.filter((item) => item.id !== id);
	next.splice(target, 0, items[from] as T);
	return next;
}

/** Insere `item` na posição `index` (limitada ao tamanho da lista). */
export function insertItem<T>(items: readonly T[], item: T, index: number): T[] {
	const next = [...items];
	next.splice(Math.max(0, Math.min(index, items.length)), 0, item);
	return next;
}
