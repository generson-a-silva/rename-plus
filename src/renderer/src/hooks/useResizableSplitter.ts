import { type PointerEvent, useCallback } from "react";

interface ResizableSplitterOptions {
	axis: "x" | "y";
	value: number;
	min: number;
	max: number;
	/** `-1` quando arrastar para a direita/baixo deve diminuir o tamanho. */
	direction?: 1 | -1;
	onChange: (value: number) => void;
}

/** Retorna o handler de `onPointerDown` de uma barra de redimensionamento. */
export function useResizableSplitter({
	axis,
	value,
	min,
	max,
	direction = 1,
	onChange,
}: ResizableSplitterOptions) {
	return useCallback(
		(event: PointerEvent<HTMLElement>) => {
			event.preventDefault();
			const handle = event.currentTarget;
			const start = axis === "x" ? event.clientX : event.clientY;
			handle.setPointerCapture(event.pointerId);
			document.body.classList.add(axis === "x" ? "resizing-x" : "resizing-y");

			const onMove = (move: globalThis.PointerEvent) => {
				const delta = (axis === "x" ? move.clientX : move.clientY) - start;
				onChange(Math.min(max, Math.max(min, value + delta * direction)));
			};
			const onUp = () => {
				handle.removeEventListener("pointermove", onMove);
				handle.removeEventListener("pointerup", onUp);
				document.body.classList.remove("resizing-x", "resizing-y");
			};
			handle.addEventListener("pointermove", onMove);
			handle.addEventListener("pointerup", onUp);
		},
		[axis, value, min, max, direction, onChange],
	);
}
