import {
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

export interface MarqueeRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

/** Como o retângulo combina com a seleção anterior: substitui, soma (Shift) ou alterna (Ctrl). */
export type MarqueeMode = "replace" | "add" | "toggle";

interface MarqueeOptions {
	scrollRef: RefObject<HTMLDivElement | null>;
	rowHeight: number;
	rowCount: number;
	/** Botão pressionado sobre uma linha (`index`) ou sobre a área livre (`null`). */
	onPress: (index: number | null, modifiers: { shift: boolean; toggle: boolean }) => void;
	/** Durante o arrasto: intervalo de linhas tocadas pelo retângulo (`null` = nenhuma). */
	onDrag: (range: [number, number] | null, mode: MarqueeMode) => void;
}

/** Distância mínima (px) para um clique virar arrasto. */
const DRAG_THRESHOLD = 4;
/** Faixa (px) junto às bordas que dispara rolagem automática. */
const EDGE = 28;

/**
 * Seleção por retângulo ("marquee") numa lista virtualizada de linhas de altura fixa,
 * com rolagem automática ao arrastar para perto das bordas.
 */
export function useMarqueeSelection(options: MarqueeOptions) {
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const [rect, setRect] = useState<MarqueeRect | null>(null);
	const cleanupRef = useRef<(() => void) | null>(null);

	useEffect(() => () => cleanupRef.current?.(), []);

	/** Índice da linha sob o ponto, ou `null` se for área livre/barra de rolagem. */
	const hitTest = useCallback((clientX: number, clientY: number): number | null => {
		const element = optionsRef.current.scrollRef.current;
		if (!element) return null;
		const bounds = element.getBoundingClientRect();
		const x = clientX - bounds.left;
		const y = clientY - bounds.top;
		if (x < 0 || y < 0 || x >= element.clientWidth || y >= element.clientHeight) return null;
		const index = Math.floor((y + element.scrollTop) / optionsRef.current.rowHeight);
		return index < optionsRef.current.rowCount ? index : null;
	}, []);

	const onPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const element = optionsRef.current.scrollRef.current;
			if (!element || event.button !== 0) return;
			const bounds = element.getBoundingClientRect();
			const localX = event.clientX - bounds.left;
			const localY = event.clientY - bounds.top;
			// Clique na barra de rolagem: deixa o navegador tratar.
			if (localX >= element.clientWidth || localY >= element.clientHeight) return;

			event.preventDefault();
			element.focus({ preventScroll: true });
			cleanupRef.current?.();

			const toggle = event.ctrlKey || event.metaKey;
			const shift = event.shiftKey;
			const mode: MarqueeMode = toggle ? "toggle" : shift ? "add" : "replace";
			optionsRef.current.onPress(hitTest(event.clientX, event.clientY), { shift, toggle });

			const startX = localX + element.scrollLeft;
			const startY = localY + element.scrollTop;
			const origin = { x: event.clientX, y: event.clientY };
			const pointerId = event.pointerId;
			let pointer = origin;
			let dragging = false;
			let frame = 0;
			let lastRange = "";

			const update = () => {
				const box = element.getBoundingClientRect();
				const x =
					Math.min(Math.max(pointer.x - box.left, 0), element.clientWidth) + element.scrollLeft;
				const y =
					Math.min(Math.max(pointer.y - box.top, 0), element.clientHeight) + element.scrollTop;
				const top = Math.min(startY, y);
				const bottom = Math.max(startY, y);
				setRect({
					left: Math.min(startX, x),
					top,
					width: Math.abs(x - startX),
					height: bottom - top,
				});

				const { rowHeight, rowCount } = optionsRef.current;
				const range: [number, number] | null =
					rowCount > 0 && top < rowCount * rowHeight
						? [Math.floor(top / rowHeight), Math.min(rowCount - 1, Math.floor(bottom / rowHeight))]
						: null;
				const key = range ? range.join(":") : "";
				if (key !== lastRange) {
					lastRange = key;
					optionsRef.current.onDrag(range, mode);
				}
			};

			const autoScroll = () => {
				const box = element.getBoundingClientRect();
				const top = box.top + EDGE;
				const bottom = box.top + element.clientHeight - EDGE;
				let delta = 0;
				if (pointer.y < top) delta = -Math.ceil((top - pointer.y) / 3);
				else if (pointer.y > bottom) delta = Math.ceil((pointer.y - bottom) / 3);
				if (delta) {
					element.scrollTop += delta;
					update();
				}
				frame = requestAnimationFrame(autoScroll);
			};

			const onMove = (move: PointerEvent) => {
				if (move.pointerId !== pointerId) return;
				pointer = { x: move.clientX, y: move.clientY };
				if (!dragging) {
					if (Math.hypot(pointer.x - origin.x, pointer.y - origin.y) < DRAG_THRESHOLD) return;
					dragging = true;
					// Captura só ao começar o arrasto, para não afetar clique/duplo clique.
					element.setPointerCapture(pointerId);
					frame = requestAnimationFrame(autoScroll);
				}
				update();
			};

			const onScroll = () => {
				if (dragging) update();
			};

			const finish = () => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", finish);
				window.removeEventListener("pointercancel", finish);
				element.removeEventListener("scroll", onScroll);
				cancelAnimationFrame(frame);
				if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
				setRect(null);
				cleanupRef.current = null;
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", finish);
			window.addEventListener("pointercancel", finish);
			element.addEventListener("scroll", onScroll);
			cleanupRef.current = finish;
		},
		[hitTest],
	);

	return { rect, onPointerDown, hitTest };
}
