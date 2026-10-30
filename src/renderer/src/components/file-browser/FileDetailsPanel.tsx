import { useI18n, useSelectionSize } from "@hooks";
import { fileExtensionLabel, fileKind } from "@lib";
import type { FileDetails, FileEntry, FileMetadata } from "@shared/ipc";
import { metadataKindOf } from "@shared/metadata";
import { cameraName, METADATA_TEMPLATE_FIELDS, type MetadataFieldName } from "@shared/rename";
import { type ReactNode, useEffect, useState } from "react";
import { FilePreview, type PreviewInfo } from "./FilePreview";

/** Espera a seleção parar (setas, arrasto) antes de pedir os detalhes ao processo principal. */
const LOAD_DELAY_MS = 120;
const ICON_SIZE = 96;

interface FileDetailsPanelProps {
	/** Itens selecionados: um mostra os detalhes dele; vários, a quantidade e o tamanho somado. */
	selected: readonly FileEntry[];
	/** Novo nome que o item selecionado vai receber (`null` se não muda ou se são vários). */
	newName: string | null;
	/** Põe o campo (ex.: "{artist}") no modelo do painel Metadados. */
	onInsertMetadataField: (token: string) => void;
}

/** Campos mostrados no painel (dimensões e duração já vêm da prévia). */
const DETAIL_FIELDS: readonly MetadataFieldName[] = [
	"date",
	"camera",
	"lens",
	"iso",
	"aperture",
	"focal",
	"artist",
	"albumartist",
	"album",
	"title",
	"track",
	"disc",
	"year",
	"genre",
];
const TOKENS = new Map(METADATA_TEMPLATE_FIELDS.map((field) => [field.name, field.token]));

/** Painel à direita da lista: miniatura e informações do item, como o painel de detalhes do Dolphin. */
export function FileDetailsPanel({
	selected,
	newName,
	onInsertMetadataField,
}: FileDetailsPanelProps) {
	const { t, formatDateTime, formatNumber, formatSize } = useI18n();
	const entry = selected.length === 1 ? (selected[0] ?? null) : null;
	const selectionSize = useSelectionSize(selected, selected.length > 1);
	// Os detalhes valem só para o caminho e a versão (data de modificação) pedidos.
	const [loaded, setLoaded] = useState<{ key: string; details: FileDetails | null } | null>(null);
	// O que a prévia descobriu (dimensões, duração, páginas), também por arquivo e versão.
	const [preview, setPreview] = useState<{ key: string; info: PreviewInfo } | null>(null);
	const [metadata, setMetadata] = useState<{ key: string; value: FileMetadata | null } | null>(
		null,
	);
	const key = entry ? `${entry.path}\n${entry.mtimeMs}` : "";
	const hasMetadata = entry !== null && !entry.isDir && metadataKindOf(entry.name) !== null;

	useEffect(() => {
		if (!entry) return;
		let current = true;
		const timer = window.setTimeout(async () => {
			const details = await window.api.getFileDetails(entry.path);
			if (current) setLoaded({ key, details });
		}, LOAD_DELAY_MS);
		return () => {
			current = false;
			window.clearTimeout(timer);
		};
	}, [entry, key]);

	useEffect(() => {
		if (!entry || !hasMetadata) return;
		let current = true;
		const timer = window.setTimeout(async () => {
			const value = await window.api.getFileMetadata(entry.path);
			if (current) setMetadata({ key, value });
		}, LOAD_DELAY_MS);
		return () => {
			current = false;
			window.clearTimeout(timer);
		};
	}, [entry, key, hasMetadata]);

	if (!entry) {
		return (
			<aside className="details-panel" aria-label={t("details.label")}>
				{selectionSize ? (
					<>
						<div className="details-preview">
							<MultipleItemsIcon count={formatNumber(selected.length)} />
						</div>
						<div className="details-name">{t("details.selected", { count: selected.length })}</div>
						<dl className="details-fields">
							<Field label={t("details.size")}>
								{formatSize(selectionSize.total.bytes)}
								{selectionSize.calculating && (
									<span className="details-calculating"> {t("details.calculating")}</span>
								)}
							</Field>
						</dl>
					</>
				) : (
					<div className="details-empty">{t("details.empty")}</div>
				)}
			</aside>
		);
	}

	const details = loaded?.key === key ? loaded.details : null;
	const kind = fileKind(entry);
	const ext = fileExtensionLabel(entry);
	const kindLabel = entry.isDir
		? t("fileType.folder")
		: t(`fileKind.${kind as Exclude<typeof kind, "folder">}`);
	const typeLabel = ext ? t("details.typeWithExt", { kind: kindLabel, ext }) : kindLabel;
	const { width, height, duration, pages } = preview?.key === key ? preview.info : {};
	const fileMetadata = hasMetadata && metadata?.key === key ? metadata.value : null;

	/** Valor de um campo como aparece no painel; `null` se o arquivo não o tem. */
	const metadataValue = (meta: FileMetadata, field: MetadataFieldName): string | null => {
		switch (field) {
			case "date":
				return meta.takenAt === null ? null : formatDateTime(meta.takenAt);
			case "camera":
				// O mesmo texto que o campo {camera} põe no nome.
				return cameraName(meta);
			case "aperture":
				return meta.aperture === null ? null : `f/${formatNumber(meta.aperture)}`;
			case "focal":
				return meta.focalLength === null ? null : `${formatNumber(meta.focalLength)} mm`;
			default: {
				const value = meta[METADATA_KEYS[field]];
				return value === null ? null : String(value);
			}
		}
	};

	return (
		<aside className="details-panel" aria-label={t("details.label")}>
			<FilePreview
				key={key}
				entry={entry}
				onInfo={(info) =>
					setPreview((prev) => ({
						key,
						info: { ...(prev?.key === key ? prev.info : {}), ...info },
					}))
				}
			/>
			<div className="details-name">{entry.name}</div>
			{newName && <div className="details-new-name">→ {newName}</div>}
			<dl className="details-fields">
				<Field label={t("details.type")}>{capitalize(typeLabel)}</Field>
				{entry.isDir ? (
					details && (
						<Field label={t("details.contents")}>
							{details.itemCount === null
								? t("details.unreadable")
								: t("status.items", { count: details.itemCount })}
						</Field>
					)
				) : (
					<Field label={t("details.size")}>{formatSize(entry.size)}</Field>
				)}
				<Field label={t("details.modified")}>{formatDateTime(entry.mtimeMs)}</Field>
				{details && <Field label={t("details.accessed")}>{formatDateTime(details.atimeMs)}</Field>}
				{entry.birthtimeMs > 0 && (
					<Field label={t("details.created")}>{formatDateTime(entry.birthtimeMs)}</Field>
				)}
				{details?.owner && <Field label={t("details.owner")}>{details.owner}</Field>}
				{width && height ? (
					<Field label={t("details.dimensions")}>
						{formatNumber(width)} × {formatNumber(height)}
					</Field>
				) : null}
				{duration !== undefined && (
					<Field label={t("details.duration")}>{formatDuration(duration)}</Field>
				)}
				{pages !== undefined && <Field label={t("details.pages")}>{formatNumber(pages)}</Field>}
			</dl>
			{fileMetadata && (
				<>
					<div className="details-section">{t("details.metadata")}</div>
					<dl className="details-fields">
						{DETAIL_FIELDS.map((field) => {
							const value = metadataValue(fileMetadata, field);
							const token = TOKENS.get(field) ?? "";
							return (
								value !== null && (
									<Field key={field} label={t(`metadataField.${field}`)}>
										<button
											type="button"
											className="details-metadata-value"
											title={t("details.insertField", { field: token })}
											onClick={() => onInsertMetadataField(token)}
										>
											{value}
										</button>
									</Field>
								)
							);
						})}
					</dl>
				</>
			)}
		</aside>
	);
}

/** Ícone genérico de vários itens: folhas empilhadas com a quantidade selecionada. */
function MultipleItemsIcon({ count }: { count: string }) {
	return (
		<div className="details-multiple">
			<svg
				className="icon"
				width={ICON_SIZE}
				height={ICON_SIZE}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.2}
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M9 2h7l4 4v11a1.5 1.5 0 0 1-1.5 1.5M16 2v4h4" />
				<path d="M12 5.5H5.5A1.5 1.5 0 0 0 4 7v13.5A1.5 1.5 0 0 0 5.5 22h9a1.5 1.5 0 0 0 1.5-1.5V9.5zM12 5.5v4h4" />
			</svg>
			<span className="details-count">{count}</span>
		</div>
	);
}

/** Propriedade de `FileMetadata` lida pelos campos sem formatação própria. */
const METADATA_KEYS = {
	make: "cameraMake",
	model: "cameraModel",
	lens: "lens",
	iso: "iso",
	width: "width",
	height: "height",
	artist: "artist",
	albumartist: "albumArtist",
	album: "album",
	title: "title",
	track: "track",
	disc: "disc",
	year: "year",
	genre: "genre",
	duration: "duration",
} as const satisfies Record<
	Exclude<MetadataFieldName, "date" | "camera" | "aperture" | "focal">,
	keyof FileMetadata
>;

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<>
			<dt>{label}:</dt>
			<dd>{children}</dd>
		</>
	);
}

/** "1:05:09" ou "4:07": horas só quando houver. */
function formatDuration(seconds: number): string {
	const total = Math.round(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = String(total % 60).padStart(2, "0");
	return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Só a primeira letra: em inglês a categoria sozinha vem em minúsculas ("file" → "File"). */
function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
