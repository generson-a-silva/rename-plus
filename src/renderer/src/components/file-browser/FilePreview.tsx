import { useI18n } from "@hooks";
import { fileKind, renderHeicPreview, renderPdfPreview } from "@lib";
import type { FileEntry, FileThumbnail } from "@shared/ipc";
import {
	HEIC_EXTENSIONS,
	hasPreview,
	localFileUrl,
	PDF_EXTENSIONS,
	VIDEO_EXTENSIONS,
} from "@shared/preview";
import { splitName } from "@shared/rename";
import { type ReactNode, useEffect, useState } from "react";
import { FileTypeIcon } from "./FileTypeIcon";

/** Espera a seleção parar (setas, arrasto) antes de abrir o arquivo. */
const LOAD_DELAY_MS = 120;
const ICON_SIZE = 96;
/** Lado maior do PDF/HEIC desenhado: folga para o painel largo em telas de alta densidade. */
const PREVIEW_SIZE = 512;

/** O que a prévia descobriu do arquivo, para as propriedades do painel. */
export interface PreviewInfo {
	width?: number | undefined;
	height?: number | undefined;
	/** Segundos (vídeos). */
	duration?: number | undefined;
	pages?: number | undefined;
}

interface FilePreviewProps {
	entry: FileEntry;
	onInfo: (info: PreviewInfo) => void;
}

/**
 * Miniatura do painel de detalhes. Vídeos (frame do meio), PDFs (primeira página) e fotos
 * HEIC são gerados aqui, pelo Chromium, pelo pdf.js e pela libheif; o resto (imagens,
 * documentos do Office, LibreOffice, FFmpeg, miniaturas do sistema) vem do processo
 * principal, que também é a segunda tentativa quando a interface não consegue abrir o
 * arquivo. Sem miniatura, mostra o ícone. Use `key` por arquivo para recomeçar do zero.
 */
export function FilePreview({ entry, onInfo }: FilePreviewProps) {
	const ext = entry.isDir ? "" : splitName(entry.name, false).ext.toLowerCase();
	const media = VIDEO_EXTENSIONS.has(ext)
		? "video"
		: PDF_EXTENSIONS.has(ext)
			? "pdf"
			: HEIC_EXTENSIONS.has(ext)
				? "heic"
				: null;
	const [mediaFailed, setMediaFailed] = useState(false);
	// `undefined`: ainda não respondeu; `null`: sem miniatura.
	const [thumbnail, setThumbnail] = useState<FileThumbnail | null | undefined>(undefined);
	const icon = <FileTypeIcon kind={fileKind(entry)} size={ICON_SIZE} />;
	const useThumbnail = !entry.isDir && (!media || mediaFailed);
	// "Carregando" só para formatos que de fato podem ter prévia; os demais vão direto ao ícone.
	const loading = <LoadingDots />;

	useEffect(() => {
		if (!useThumbnail) return;
		let current = true;
		const timer = window.setTimeout(async () => {
			const result = await window.api.getFileThumbnail(entry.path);
			if (current) setThumbnail(result);
		}, LOAD_DELAY_MS);
		return () => {
			current = false;
			window.clearTimeout(timer);
		};
	}, [entry.path, useThumbnail]);

	const fail = () => setMediaFailed(true);
	let content: ReactNode = icon;
	if (media === "video" && !mediaFailed) {
		content = <VideoFrame path={entry.path} placeholder={loading} onInfo={onInfo} onError={fail} />;
	} else if (media === "pdf" && !mediaFailed) {
		content = <PdfPage path={entry.path} placeholder={loading} onInfo={onInfo} onError={fail} />;
	} else if (media === "heic" && !mediaFailed) {
		content = <HeicPhoto path={entry.path} placeholder={loading} onInfo={onInfo} onError={fail} />;
	} else if (useThumbnail && thumbnail === undefined && hasPreview(ext)) {
		content = loading;
	} else if (thumbnail) {
		content = (
			<img
				src={thumbnail.url}
				alt=""
				onLoad={(event) => {
					// Miniatura reduzida: as dimensões originais vêm do processo principal.
					const { naturalWidth, naturalHeight } = event.currentTarget;
					onInfo(
						thumbnail.isOriginal
							? { width: naturalWidth, height: naturalHeight }
							: {
									width: thumbnail.width ?? undefined,
									height: thumbnail.height ?? undefined,
									duration: thumbnail.duration ?? undefined,
								},
					);
				}}
			/>
		);
	}
	return <div className="details-preview">{content}</div>;
}

/** Três pontos que acendem e apagam em sequência (enquanto a prévia é gerada). */
function LoadingDots() {
	const { t } = useI18n();
	return (
		<span className="loading-dots" role="status" aria-label={t("list.loading")}>
			<span />
			<span />
			<span />
		</span>
	);
}

interface MediaProps {
	path: string;
	/** Exibido enquanto o frame/página não fica pronto. */
	placeholder: ReactNode;
	onInfo: (info: PreviewInfo) => void;
	/** Formato que o Chromium/pdf.js não abre (ex.: HEVC, PDF corrompido). */
	onError: () => void;
}

/** Frame do meio do vídeo: o próprio `<video>`, pausado, sem som e sem controles. */
function VideoFrame({ path, placeholder, onInfo, onError }: MediaProps) {
	const [ready, setReady] = useState(false);
	const [src, setSrc] = useState<string | null>(null);

	useEffect(() => {
		const timer = window.setTimeout(() => setSrc(localFileUrl(path)), LOAD_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [path]);

	return (
		<>
			{!ready && placeholder}
			{src && (
				<video
					src={src}
					muted
					preload="metadata"
					style={ready ? undefined : { display: "none" }}
					onLoadedMetadata={(event) => {
						const video = event.currentTarget;
						// Só áudio (ex.: .webm de música): sem frame para mostrar.
						if (video.videoWidth === 0) {
							onError();
							return;
						}
						onInfo({
							width: video.videoWidth,
							height: video.videoHeight,
							duration: Number.isFinite(video.duration) ? video.duration : undefined,
						});
						if (Number.isFinite(video.duration) && video.duration > 0) {
							video.currentTime = video.duration / 2;
						} else {
							setReady(true);
						}
					}}
					onSeeked={() => setReady(true)}
					onError={onError}
				/>
			)}
		</>
	);
}

/** Primeira página do PDF, desenhada pelo pdf.js. */
function PdfPage({ path, placeholder, onInfo, onError }: MediaProps) {
	const [url, setUrl] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refaz só ao trocar de arquivo.
	useEffect(() => {
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			try {
				const preview = await renderPdfPreview(localFileUrl(path), PREVIEW_SIZE, controller.signal);
				if (controller.signal.aborted) return;
				setUrl(preview.url);
				onInfo({ pages: preview.pages });
			} catch {
				if (!controller.signal.aborted) onError();
			}
		}, LOAD_DELAY_MS);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [path]);

	return url ? <img className="details-page" src={url} alt="" /> : placeholder;
}

/** Foto HEIC decodificada pela libheif num worker (o Chromium não abre HEIC). */
function HeicPhoto({ path, placeholder, onInfo, onError }: MediaProps) {
	const [url, setUrl] = useState<string | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refaz só ao trocar de arquivo.
	useEffect(() => {
		const controller = new AbortController();
		let blobUrl: string | null = null;
		const timer = window.setTimeout(async () => {
			try {
				const preview = await renderHeicPreview(
					localFileUrl(path),
					PREVIEW_SIZE,
					controller.signal,
				);
				blobUrl = preview.url;
				setUrl(preview.url);
				onInfo({ width: preview.width, height: preview.height });
			} catch {
				if (!controller.signal.aborted) onError();
			}
		}, LOAD_DELAY_MS);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [path]);

	return url ? <img src={url} alt="" /> : placeholder;
}
