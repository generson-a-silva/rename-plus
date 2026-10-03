import type { SortKey, SortState } from "@lib";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import {
	type ColumnWidths,
	clampColumnWidth,
	type FileListColumn,
	type FileListColumnId,
	MAX_COLUMN_WIDTH,
	MIN_COLUMN_WIDTH,
} from "./fileListColumns";

interface FileListHeaderProps {
	columns: readonly FileListColumn[];
	widths: ColumnWidths;
	template: string;
	totalWidth: number;
	sort: SortState;
	/** Contêiner com rolagem horizontal sincronizada com a da lista. */
	viewportRef: RefObject<HTMLDivElement | null>;
	onSortChange: (sort: SortState) => void;
	onResize: (columnId: FileListColumnId, width: number) => void;
	/** Duplo clique na divisória: ajusta a coluna ao conteúdo. */
	onAutoFit: (columnId: FileListColumnId) => void;
}

/** Passo do teclado (setas) ao redimensionar; com Shift, passo maior. */
const KEYBOARD_STEP = 10;
const KEYBOARD_STEP_LARGE = 50;

/** Cabeçalho da lista: ordenação por clique e largura das colunas pelas divisórias. */
export function FileListHeader({
	columns,
	widths,
	template,
	totalWidth,
	sort,
	viewportRef,
	onSortChange,
	onResize,
	onAutoFit,
}: FileListHeaderProps) {
	const toggleSort = (key: SortKey) => {
		onSortChange({ key, desc: sort.key === key ? !sort.desc : false });
	};

	const startResize = (columnId: FileListColumnId, event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		const handle = event.currentTarget;
		const startX = event.clientX;
		const startWidth = widths[columnId];
		handle.setPointerCapture(event.pointerId);
		document.body.classList.add("resizing-x");

		const onMove = (move: globalThis.PointerEvent) => {
			onResize(columnId, clampColumnWidth(startWidth + move.clientX - startX));
		};
		const onUp = () => {
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", onUp);
			handle.removeEventListener("pointercancel", onUp);
			document.body.classList.remove("resizing-x");
		};
		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", onUp);
		handle.addEventListener("pointercancel", onUp);
	};

	const resizeWithKeyboard = (columnId: FileListColumnId, event: KeyboardEvent<HTMLDivElement>) => {
		const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
		const delta = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
		if (delta !== 0) {
			event.preventDefault();
			onResize(columnId, clampColumnWidth(widths[columnId] + delta));
		} else if (event.key === "Enter") {
			event.preventDefault();
			onAutoFit(columnId);
		}
	};

	return (
		<div ref={viewportRef} className="file-header-viewport">
			<div className="file-header" style={{ gridTemplateColumns: template, minWidth: totalWidth }}>
				{columns.map(({ id, sortKey, label, align, resizable }) => {
					const className = `header-cell${align === "right" ? " right" : ""}`;
					return (
						<div key={id} className="header-column">
							{sortKey === null ? (
								<span className={className}>{label}</span>
							) : (
								<button type="button" className={className} onClick={() => toggleSort(sortKey)}>
									{label}
									{sort.key === sortKey && <span className="sort">{sort.desc ? "▼" : "▲"}</span>}
								</button>
							)}
							{resizable !== false && (
								<>
									{/* biome-ignore lint/a11y/useSemanticElements: <hr> não aceita foco nem arrasto; o separator ARIA é o padrão para divisórias redimensionáveis. */}
									<div
										className="column-resizer"
										role="separator"
										aria-orientation="vertical"
										aria-label={`Largura da coluna ${label}`}
										aria-valuenow={widths[id]}
										aria-valuemin={MIN_COLUMN_WIDTH}
										aria-valuemax={MAX_COLUMN_WIDTH}
										tabIndex={0}
										title="Arraste para ajustar a largura · duplo clique para ajustar ao conteúdo"
										onPointerDown={(event) => startResize(id, event)}
										onDoubleClick={() => onAutoFit(id)}
										onKeyDown={(event) => resizeWithKeyboard(id, event)}
									/>
								</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
