import { AppIcon } from "@components/common";
import { useI18n } from "@hooks";
import { type DragEvent, type ReactNode, useRef, useState } from "react";

/** Conteúdo arrastado: um bloco novo (da paleta) ou um existente (reordenação). */
type DragPayload = { kind: "new"; type: string } | { kind: "move"; id: string };

function readPayload(event: DragEvent, mime: string): DragPayload | null {
	try {
		const payload = JSON.parse(event.dataTransfer.getData(mime)) as DragPayload;
		return payload.kind === "new" || payload.kind === "move" ? payload : null;
	} catch {
		return null;
	}
}

/** Inicia o arrasto de um bloco novo, a partir de um item da paleta. */
export function startPaletteDrag(event: DragEvent, mime: string, type: string): void {
	event.dataTransfer.setData(mime, JSON.stringify({ kind: "new", type } satisfies DragPayload));
	event.dataTransfer.effectAllowed = "copy";
}

export interface PaletteItem {
	type: string;
	label: string;
	hint: string;
}

interface BlockPaletteProps {
	label: string;
	items: readonly PaletteItem[];
	/** Tipo de dado do arrasto: separa os blocos da busca dos da substituição. */
	mime: string;
	/** Clique (ou Enter) acrescenta o bloco no fim. */
	onAdd: (type: string) => void;
}

/** Blocos disponíveis: arraste para a faixa ou clique para acrescentar no fim. */
export function BlockPalette({ label, items, mime, onAdd }: BlockPaletteProps) {
	return (
		<div className="rx-palette">
			<span className="rx-palette-label">{label}</span>
			{items.map((item) => (
				<button
					key={item.type}
					type="button"
					className="rx-chip"
					draggable
					title={item.hint}
					onDragStart={(event) => startPaletteDrag(event, mime, item.type)}
					onClick={() => onAdd(item.type)}
				>
					<AppIcon name="plus" size={12} />
					{item.label}
				</button>
			))}
		</div>
	);
}

interface BlockStripProps<T extends { id: string }> {
	label: string;
	items: readonly T[];
	mime: string;
	emptyText: string;
	onInsert: (type: string, index: number) => void;
	onMove: (id: string, index: number) => void;
	onRemove: (id: string) => void;
	/** Título do cartão (tipo do bloco). */
	renderTitle: (item: T, index: number) => ReactNode;
	/** Campos de configuração do bloco. */
	renderBody: (item: T, index: number) => ReactNode;
	/** Destaque de erro no cartão (ex.: trecho que não existe mais). */
	isInvalid?: (item: T) => boolean;
}

/**
 * Faixa de blocos em sequência, lida da esquerda para a direita. Aceita blocos novos
 * arrastados da paleta e reordenação arrastando pelo cabeçalho do cartão (ou pelos
 * botões ◀ ▶, para quem usa o teclado).
 */
export function BlockStrip<T extends { id: string }>({
	label,
	items,
	mime,
	emptyText,
	onInsert,
	onMove,
	onRemove,
	renderTitle,
	renderBody,
	isInvalid,
}: BlockStripProps<T>) {
	const { t } = useI18n();
	const stripRef = useRef<HTMLUListElement>(null);
	/** Posição onde o bloco arrastado entraria (marcador visual), ou `null` fora de um arrasto. */
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	const accepts = (event: DragEvent) => event.dataTransfer.types.includes(mime);

	/** Primeiro cartão depois do ponteiro, considerando as linhas da faixa (quebra de linha). */
	const indexAt = (x: number, y: number): number => {
		const cards = stripRef.current?.querySelectorAll<HTMLElement>("[data-block-index]") ?? [];
		for (const card of cards) {
			const rect = card.getBoundingClientRect();
			const index = Number(card.dataset.blockIndex);
			if (y < rect.top) return index;
			if (y <= rect.bottom && x < rect.left + rect.width / 2) return index;
		}
		return items.length;
	};

	const onDragOver = (event: DragEvent) => {
		if (!accepts(event)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = event.dataTransfer.effectAllowed === "move" ? "move" : "copy";
		const index = indexAt(event.clientX, event.clientY);
		if (index !== dropIndex) setDropIndex(index);
	};

	const onDrop = (event: DragEvent) => {
		if (!accepts(event)) return;
		event.preventDefault();
		const payload = readPayload(event, mime);
		const index = dropIndex ?? items.length;
		setDropIndex(null);
		if (payload?.kind === "new") onInsert(payload.type, index);
		else if (payload?.kind === "move") onMove(payload.id, index);
	};

	return (
		<ul
			ref={stripRef}
			className={`rx-strip${dropIndex !== null ? " dragging" : ""}${dropIndex === items.length ? " drop-end" : ""}`}
			aria-label={label}
			onDragOver={onDragOver}
			onDragLeave={(event) => {
				// Só ao sair da faixa inteira (não ao passar de um cartão para outro).
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropIndex(null);
			}}
			onDrop={onDrop}
		>
			{items.length === 0 && <li className="rx-strip-empty">{emptyText}</li>}
			{items.map((item, index) => (
				<li
					key={item.id}
					data-block-index={index}
					className={`rx-block${dropIndex === index ? " drop-before" : ""}${isInvalid?.(item) ? " invalid" : ""}`}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: alça de arrasto; pelo teclado, os botões ◀ ▶ fazem o mesmo. */}
					<div
						className="rx-block-head"
						draggable
						title={t("rxb.dragHint")}
						onDragStart={(event) => {
							event.dataTransfer.setData(
								mime,
								JSON.stringify({ kind: "move", id: item.id } satisfies DragPayload),
							);
							event.dataTransfer.effectAllowed = "move";
							const card = event.currentTarget.parentElement;
							if (card) event.dataTransfer.setDragImage(card, 12, 12);
						}}
						onDragEnd={() => setDropIndex(null)}
					>
						<AppIcon name="grip" size={14} />
						<span className="rx-block-title">{renderTitle(item, index)}</span>
						<span className="rx-block-tools">
							<button
								type="button"
								title={t("rxb.moveLeft")}
								aria-label={t("rxb.moveLeft")}
								disabled={index === 0}
								onClick={() => onMove(item.id, index - 1)}
							>
								<AppIcon name="chevronLeft" size={12} />
							</button>
							<button
								type="button"
								title={t("rxb.moveRight")}
								aria-label={t("rxb.moveRight")}
								disabled={index === items.length - 1}
								// onMove recebe a posição antes da remoção: +2 cai logo depois do vizinho.
								onClick={() => onMove(item.id, index + 2)}
							>
								<AppIcon name="chevron" size={12} />
							</button>
							<button
								type="button"
								title={t("rxb.removeBlock")}
								aria-label={t("rxb.removeBlock")}
								onClick={() => onRemove(item.id)}
							>
								<AppIcon name="close" size={12} />
							</button>
						</span>
					</div>
					<div className="rx-block-body">{renderBody(item, index)}</div>
				</li>
			))}
		</ul>
	);
}
