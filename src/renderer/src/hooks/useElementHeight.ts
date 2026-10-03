import { type RefObject, useLayoutEffect, useState } from "react";

/**
 * Altura atual de um elemento, atualizada quando ele muda de tamanho. Medida antes
 * da pintura, para que valores derivados (ex.: limites de redimensionamento) já
 * estejam corretos no primeiro quadro.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
	const [height, setHeight] = useState(0);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		setHeight(element.clientHeight);
		const observer = new ResizeObserver(() => setHeight(element.clientHeight));
		observer.observe(element);
		return () => observer.disconnect();
	}, [ref]);

	return height;
}
