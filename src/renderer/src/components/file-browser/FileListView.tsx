import { AppIcon } from "@components/common";
import { useI18n, useMarqueeSelection, usePersistentState } from "@hooks";
import { diffNames, type NameDiffSegment, type SortState } from "@lib";
import type { FileEntry } from "@shared/ipc";
import type { Preview } from "@shared/rename";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FileListHeader } from "./FileListHeader";
import {
	type ColumnWidths,
	cellText,
	columnWidth,
	DEFAULT_COLUMN_WIDTHS,
	type FileListColumnId,
	measureColumnFit,
	ROW_HORIZONTAL_PADDING,
	visibleColumns,
} from "./fileListColumns";

const ROW_HEIGHT = 24;
const OVERSCAN = 8;

interface FileListViewProps {
	entries: FileEntry[];
	selection: ReadonlySet<string>;
	preview: Preview;
	rootDir: string;
	showDirColumn: boolean;
	sort: SortState;
	loading: boolean;
	error: string | null;
	onSortChange: (sort: SortState) => void;
	onSelectionChange: (selection: Set<string>) => void;
	onOpen: (entry: FileEntry) => void;
	/** Clique direito sobre uma linha (`index`) ou sobre a área livre (`null`). */
	onContextMenu: (index: number | null) => void;
}

/** Lista virtualizada de arquivos (painel direito) com pré-visualização dos novos nomes. */
export function FileListView(props: FileListViewProps) {
	const { entries, selection, preview, rootDir, showDirColumn, sort } = props;
	const i18n = useI18n();
	const columns = visibleColumns(showDirColumn);
	const [widths, setWidths] = usePersistentState<ColumnWidths>(
		"columnWidths",
		DEFAULT_COLUMN_WIDTHS,
	);
	// Larguras fixas por coluna + uma trilha final que ocupa a sobra quando há espaço.
	const template = `${columns.map((column) => `${columnWidth(column, widths)}px`).join(" ")} minmax(0, 1fr)`;
	const totalWidth =
		columns.reduce((sum, column) => sum + columnWidth(column, widths), 0) + ROW_HORIZONTAL_PADDING;
	const headerViewportRef = useRef<HTMLDivElement>(null);

	const scrollRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewport, setViewport] = useState(400);
	const anchorRef = useRef<number | null>(null);
	const focusRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		const element = scrollRef.current;
		if (!element) return;
		const observer = new ResizeObserver(() => setViewport(element.clientHeight));
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	// Nova listagem: volta ao topo e esquece a âncora da seleção.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reage apenas à troca de pasta.
	useEffect(() => {
		scrollRef.current?.scrollTo({ top: 0 });
		anchorRef.current = null;
		focusRef.current = null;
	}, [rootDir]);

	const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
	const last = Math.min(entries.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);

	const scrollToIndex = (index: number) => {
		const element = scrollRef.current;
		if (!element) return;
		const top = index * ROW_HEIGHT;
		if (top < element.scrollTop) element.scrollTop = top;
		else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight) {
			element.scrollTop = top + ROW_HEIGHT - element.clientHeight;
		}
	};

	const range = (from: number, to: number) => {
		const [start, end] = from <= to ? [from, to] : [to, from];
		return entries.slice(start, end + 1).map((entry) => entry.path);
	};

	const select = (index: number, extend: boolean, toggle: boolean) => {
		const entry = entries[index];
		if (!entry) return;
		if (extend && anchorRef.current !== null) {
			const base = toggle ? new Set(selection) : new Set<string>();
			for (const path of range(anchorRef.current, index)) base.add(path);
			props.onSelectionChange(base);
		} else if (toggle) {
			const next = new Set(selection);
			if (next.has(entry.path)) next.delete(entry.path);
			else next.add(entry.path);
			props.onSelectionChange(next);
			anchorRef.current = index;
		} else {
			props.onSelectionChange(new Set([entry.path]));
			anchorRef.current = index;
		}
		focusRef.current = index;
	};

	// Seleção anterior ao clique, usada como base quando o arrasto soma (Shift) ou alterna (Ctrl).
	const dragBaseRef = useRef<ReadonlySet<string>>(new Set());

	const marquee = useMarqueeSelection({
		scrollRef,
		rowHeight: ROW_HEIGHT,
		rowCount: entries.length,
		onPress: (index, { shift, toggle }) => {
			dragBaseRef.current = selection;
			if (index !== null) select(index, shift, toggle);
			// Clique na área livre desmarca tudo (com Ctrl/Shift, mantém a seleção).
			else if (!shift && !toggle) props.onSelectionChange(new Set());
		},
		onDrag: (dragRange, mode) => {
			const covered = dragRange ? range(dragRange[0], dragRange[1]) : [];
			const next = mode === "replace" ? new Set<string>() : new Set(dragBaseRef.current);
			for (const path of covered) {
				if (mode === "toggle" && dragBaseRef.current.has(path)) next.delete(path);
				else next.add(path);
			}
			props.onSelectionChange(next);
			if (dragRange) {
				anchorRef.current = dragRange[0];
				focusRef.current = dragRange[1];
			}
		},
	});

	const onKeyDown = (event: KeyboardEvent) => {
		const ctrl = event.ctrlKey || event.metaKey;
		if (ctrl && event.key.toLowerCase() === "a") {
			event.preventDefault();
			props.onSelectionChange(new Set(entries.map((entry) => entry.path)));
			return;
		}
		if (event.key === "Escape") {
			props.onSelectionChange(new Set());
			return;
		}
		const step: Record<string, number> = {
			ArrowDown: 1,
			ArrowUp: -1,
			PageDown: Math.floor(viewport / ROW_HEIGHT),
			PageUp: -Math.floor(viewport / ROW_HEIGHT),
		};
		let target: number | null = null;
		if (event.key in step) target = (focusRef.current ?? -1) + (step[event.key] ?? 0);
		if (event.key === "Home") target = 0;
		if (event.key === "End") target = entries.length - 1;
		if (target === null || entries.length === 0) {
			if (event.key === "Enter" && focusRef.current !== null) {
				const entry = entries[focusRef.current];
				if (entry) props.onOpen(entry);
			}
			return;
		}
		event.preventDefault();
		const index = Math.min(entries.length - 1, Math.max(0, target));
		select(index, event.shiftKey, false);
		scrollToIndex(index);
	};

	/** Novo nome exibido na coluna "Novo nome" ("" se o item não está selecionado ou não muda). */
	const visibleNewName = (entry: FileEntry): string => {
		if (!selection.has(entry.path)) return "";
		const item = preview.items.get(entry.path);
		return item && item.status !== "unchanged" ? item.newName : "";
	};

	const resizeColumn = (columnId: FileListColumnId, width: number) => {
		setWidths((current) => ({ ...current, [columnId]: width }));
	};

	const autoFitColumn = (columnId: FileListColumnId) => {
		const column = columns.find((candidate) => candidate.id === columnId);
		const list = scrollRef.current;
		if (!column || column.resizable === false || !list) return;
		resizeColumn(columnId, measureColumnFit(column, entries, visibleNewName, rootDir, list, i18n));
	};

	const rows = [];
	for (let index = first; index < last; index++) {
		const entry = entries[index];
		if (!entry) continue;
		const isSelected = selection.has(entry.path);
		const item = isSelected ? preview.items.get(entry.path) : undefined;
		const status = item?.status ?? "";
		const newName = visibleNewName(entry);
		// Com novo nome visível, destaca o que muda nos dois nomes.
		const nameDiff = newName ? diffNames(entry.name, newName) : null;
		rows.push(
			<div
				key={entry.path}
				className={`file-row ${isSelected ? "selected" : ""} ${status}${entry.hidden ? " hidden-item" : ""}`}
				style={{ top: index * ROW_HEIGHT, gridTemplateColumns: template }}
				role="option"
				tabIndex={-1}
				aria-selected={isSelected}
				title={item?.message ? i18n.tr(item.message) : undefined}
			>
				{columns.map((column) => {
					const text = cellText(column.id, entry, newName, rootDir, i18n);
					if (column.id === "name") {
						return (
							<span key={column.id} className="cell name">
								<AppIcon name={entry.isDir ? "folder" : "file"} size={14} />
								<span className="cell-text">
									{nameDiff ? <DiffText segments={nameDiff.before} kind="removed" /> : text}
								</span>
							</span>
						);
					}
					const className =
						column.id === "newName" ? "new-name" : column.align === "right" ? "right" : "";
					return (
						<span key={column.id} className={`cell ${className}`}>
							<span className="cell-text">
								{column.id === "newName" && nameDiff ? (
									<DiffText segments={nameDiff.after} kind="added" />
								) : (
									text
								)}
							</span>
						</span>
					);
				})}
			</div>,
		);
	}

	return (
		<section className="file-list">
			<FileListHeader
				columns={columns}
				widths={widths}
				template={template}
				totalWidth={totalWidth}
				sort={sort}
				viewportRef={headerViewportRef}
				onSortChange={props.onSortChange}
				onResize={resizeColumn}
				onAutoFit={autoFitColumn}
			/>
			<div
				ref={scrollRef}
				className="file-scroll"
				role="listbox"
				aria-multiselectable="true"
				aria-label={i18n.t("list.label")}
				tabIndex={0}
				onScroll={(event) => {
					setScrollTop(event.currentTarget.scrollTop);
					// O cabeçalho acompanha a rolagem horizontal da lista.
					if (headerViewportRef.current) {
						headerViewportRef.current.scrollLeft = event.currentTarget.scrollLeft;
					}
				}}
				onKeyDown={onKeyDown}
				onPointerDown={marquee.onPointerDown}
				onContextMenu={(event) => {
					event.preventDefault();
					props.onContextMenu(marquee.hitTest(event.clientX, event.clientY));
				}}
				onDoubleClick={(event) => {
					const index = marquee.hitTest(event.clientX, event.clientY);
					const entry = index === null ? undefined : entries[index];
					if (entry) props.onOpen(entry);
				}}
			>
				<div
					className="file-rows"
					style={{ height: entries.length * ROW_HEIGHT, minWidth: totalWidth }}
				>
					{rows}
				</div>
				{marquee.rect && (
					<div
						className="marquee"
						style={{
							left: marquee.rect.left,
							top: marquee.rect.top,
							width: marquee.rect.width,
							height: marquee.rect.height,
						}}
					/>
				)}
				{entries.length === 0 && (
					<div className="file-empty">
						{props.loading ? i18n.t("list.loading") : (props.error ?? i18n.t("list.empty"))}
					</div>
				)}
			</div>
		</section>
	);
}

/** Texto de um nome com os trechos alterados realçados (vermelho no atual, verde no novo). */
function DiffText({
	segments,
	kind,
}: {
	segments: readonly NameDiffSegment[];
	kind: "removed" | "added";
}) {
	return segments.map((segment, index) =>
		segment.changed ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: os trechos não têm outra identidade e só mudam juntos.
			<mark key={index} className={`diff-${kind}`}>
				{segment.text}
			</mark>
		) : (
			segment.text
		),
	);
}
