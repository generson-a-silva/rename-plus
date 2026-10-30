/**
 * Pré-visualização de vídeos, PDFs e fotos HEIC no painel de detalhes: a interface os
 * abre por um protocolo próprio do app (o `file://` não serve: a página roda em sandbox
 * e, em desenvolvimento, nem é servida de `file://`). Só essas extensões são entregues.
 */
export const LOCAL_FILE_SCHEME = "rename-plus-file";

/** Vídeos que o Chromium do Electron decodifica (H.264, VP8/VP9, AV1; HEVC e AVI não). */
export const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
	"mp4",
	"m4v",
	"mov",
	"mkv",
	"webm",
	"ogv",
]);

export const PDF_EXTENSIONS: ReadonlySet<string> = new Set(["pdf"]);

const words = (list: string): ReadonlySet<string> => new Set(list.split(" "));

/** Imagens que o `nativeImage` decodifica em todos os sistemas: reduzidas antes de enviar. */
export const RESIZABLE_IMAGE_EXTENSIONS = words("png jpg jpeg jfif");
/** Imagens enviadas inteiras: o `nativeImage` não as decodifica, mas o Chromium sim. */
export const INLINE_IMAGE_EXTENSIONS = words("gif webp avif bmp svg ico");
/** Documentos do Office (OOXML) e do LibreOffice (ODF): zips que podem trazer uma miniatura. */
export const EMBEDDED_THUMBNAIL_EXTENSIONS = words(
	"docx docm dotx xlsx xlsm xltx pptx pptm ppsx potx odt ott ods ots odp otp odg",
);
/**
 * Documentos, planilhas e apresentações que o LibreOffice (se instalado) converte na
 * prévia da primeira página quando não há miniatura embutida: os binários antigos (DOC,
 * XLS, PPT) nunca têm, e Word/Excel só a gravam com "Salvar miniatura" ligado.
 */
export const LIBREOFFICE_EXTENSIONS = words(
	"doc dot docx docm dotx odt ott xls xlt xlsx xlsm xltx ods ots ppt pps pot pptx pptm ppsx potx odp otp",
);

/** Fotos HEIC/HEIF: decodificadas na interface pela libheif (WebAssembly). */
export const HEIC_EXTENSIONS = words("heic heif");

/**
 * O que o FFmpeg instalado no sistema ainda consegue abrir quando o Chromium não abre:
 * vídeos em HEVC, AVI, WMV etc., e HEIC (segunda tentativa, se a libheif falhar).
 */
export const FFMPEG_EXTENSIONS = words(
	"mp4 m4v mov mkv webm ogv avi wmv asf flv f4v mpg mpeg m2v vob ts mts m2ts 3gp 3g2 divx xvid heic heif",
);

/**
 * Extensões para as quais vale esperar uma prévia (a interface mostra "carregando").
 * No Windows/macOS o sistema ainda pode gerar miniaturas de outros tipos; esses aparecem
 * direto com o ícone e trocam pela miniatura se ela vier.
 */
export function hasPreview(ext: string): boolean {
	return [
		VIDEO_EXTENSIONS,
		FFMPEG_EXTENSIONS,
		HEIC_EXTENSIONS,
		PDF_EXTENSIONS,
		RESIZABLE_IMAGE_EXTENSIONS,
		INLINE_IMAGE_EXTENSIONS,
		EMBEDDED_THUMBNAIL_EXTENSIONS,
		LIBREOFFICE_EXTENSIONS,
	].some((set) => set.has(ext));
}

/** Endereço de um arquivo local no protocolo do app (o caminho vai inteiro, codificado). */
export function localFileUrl(path: string): string {
	return `${LOCAL_FILE_SCHEME}://file/${encodeURIComponent(path)}`;
}

/** Caminho de volta a partir do endereço; `null` se não for um endereço do protocolo. */
export function localFilePath(url: string): string | null {
	const prefix = `${LOCAL_FILE_SCHEME}://file/`;
	if (!url.startsWith(prefix)) return null;
	try {
		return decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0] ?? "");
	} catch {
		return null;
	}
}
