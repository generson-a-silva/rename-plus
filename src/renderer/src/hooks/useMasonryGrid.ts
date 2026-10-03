import { type RefObject, useLayoutEffect } from "react";

interface MasonryGridOptions {
	/** Altura de cada linha do grid (`grid-auto-rows` no CSS), em px. */
	rowUnit: number;
	/** Espaço vertical desejado entre itens, em px (o CSS usa `row-gap: 0`). */
	gap: number;
}

/**
 * Layout "masonry" sobre CSS Grid: cada filho ocupa tantas linhas finas quanto a
 * sua altura pede, encaixando logo abaixo do item anterior da mesma coluna, sem os
 * vãos que o grid comum deixa quando os itens de uma linha têm alturas diferentes.
 *
 * O contêiner precisa de `grid-auto-rows: <rowUnit>px`, `row-gap: 0`,
 * `grid-auto-flow: row dense` e `align-items: start`. As alturas são recalculadas
 * quando qualquer item muda de tamanho (redimensionar a janela, quebra de linha etc.).
 */
export function useMasonryGrid(
	containerRef: RefObject<HTMLElement | null>,
	{ rowUnit, gap }: MasonryGridOptions,
): void {
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const place = (item: HTMLElement) => {
			const height = item.getBoundingClientRect().height;
			item.style.gridRowEnd = `span ${Math.max(1, Math.ceil((height + gap) / rowUnit))}`;
		};

		// As notificações chegam antes da pintura, então não há quadro com itens sobrepostos.
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) place(entry.target as HTMLElement);
		});
		const observeChildren = () => {
			for (const child of container.children) resizeObserver.observe(child);
		};
		observeChildren();

		const mutationObserver = new MutationObserver(observeChildren);
		mutationObserver.observe(container, { childList: true });

		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			for (const child of container.children) (child as HTMLElement).style.gridRowEnd = "";
		};
	}, [containerRef, rowUnit, gap]);
}
