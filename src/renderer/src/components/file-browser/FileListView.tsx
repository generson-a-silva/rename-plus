import { AppIcon } from "@components/common";
import { useMarqueeSelection } from "@hooks";
import {
	fileType,
	formatDateTime,
	formatSize,
	relativePath,
	type SortKey,
	type SortState,
} from "@lib";
import type { FileEntry } from "@shared/ipc";
import type { Preview } from "@shared/rename";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";

const ROW_HEIGHT = 24;
const OVERSCAN = 8;

interface Column {
	/** `null` = coluna sem ordenação (o novo nome depende da ordem, por causa da numeração). */
	key: SortKey | null;
	label: string;
	width: string;
	align?: "right";
}

const BASE_COLUMNS: Column[] = [
	{ key: "name", label: "Nome", width: "minmax(160px, 2fr)" },
	{ key: null, label: "Novo nome", width: "minmax(160px, 2fr)" },
	{ key: "size", label: "Tamanho", width: "90px", align: "right" },
	{ key: "type", label: "Tipo", width: "90px" },
	{ key: "mtime", label: "Modificado", width: "130px" },
];
const DIR_COLUMN: Column = { key: "dir", label: "Pasta", width: "minmax(120px, 1.2fr)" };

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
	const columns = showDirColumn ? [...BASE_COLUMNS, DIR_COLUMN] : BASE_COLUMNS;
	const template = columns.map((column) => column.width).join(" ");

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

	const toggleSort = (key: SortKey) => {
		props.onSortChange({ key, desc: sort.key === key ? !sort.desc : false });
	};

	const rows = [];
	for (let index = first; index < last; index++) {
		const entry = entries[index];
		if (!entry) continue;
		const isSelected = selection.has(entry.path);
		const item = isSelected ? preview.items.get(entry.path) : undefined;
		const status = item?.status ?? "";
		rows.push(
			<div
				key={entry.path}
				className={`file-row ${isSelected ? "selected" : ""} ${status}${entry.hidden ? " hidden-item" : ""}`}
				style={{ top: index * ROW_HEIGHT, gridTemplateColumns: template }}
				role="option"
				tabIndex={-1}
				aria-selected={isSelected}
				title={item?.message ?? undefined}
			>
				<span className="cell name">
					<AppIcon name={entry.isDir ? "folder" : "file"} size={14} />
					<span className="cell-text">{entry.name}</span>
				</span>
				<span className="cell new-name">
					<span className="cell-text">
						{item && item.status !== "unchanged" ? item.newName : ""}
					</span>
				</span>
				<span className="cell right">{entry.isDir ? "" : formatSize(entry.size)}</span>
				<span className="cell">{fileType(entry)}</span>
				<span className="cell">{formatDateTime(entry.mtimeMs)}</span>
				{showDirColumn && (
					<span className="cell">
						<span className="cell-text">{relativePath(rootDir, entry.dir)}</span>
					</span>
				)}
			</div>,
		);
	}

	return (
		<section className="file-list">
			<div className="file-header" style={{ gridTemplateColumns: template }}>
				{columns.map(({ key, label, align }) => {
					const className = `header-cell${align === "right" ? " right" : ""}`;
					if (key === null) {
						return (
							<span key={label} className={className}>
								{label}
							</span>
						);
					}
					return (
						<button key={key} type="button" className={className} onClick={() => toggleSort(key)}>
							{label}
							{sort.key === key && <span className="sort">{sort.desc ? "▼" : "▲"}</span>}
						</button>
					);
				})}
			</div>
			<div
				ref={scrollRef}
				className="file-scroll"
				role="listbox"
				aria-multiselectable="true"
				aria-label="Arquivos"
				tabIndex={0}
				onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
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
				<div className="file-rows" style={{ height: entries.length * ROW_HEIGHT }}>
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
						{props.loading ? "Carregando…" : (props.error ?? "Nenhum item nesta pasta.")}
					</div>
				)}
			</div>
		</section>
	);
}
