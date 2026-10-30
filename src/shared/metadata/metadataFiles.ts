const words = (list: string): ReadonlySet<string> => new Set(list.split(" "));

/**
 * Fotos cujo EXIF o `exifr` lê: JPEG, HEIC/AVIF, PNG, TIFF e os RAW que são TIFF por dentro.
 * WebP e RAF (Fujifilm) ficam de fora: o `exifr` não os reconhece.
 */
export const PHOTO_METADATA_EXTENSIONS = words(
	"jpg jpeg jfif heic heif avif png tif tiff dng nef nrw arw sr2 pef cr2 srw",
);

/** Músicas cujas tags o `music-metadata` lê. */
export const AUDIO_METADATA_EXTENSIONS = words(
	"mp3 flac ogg oga opus m4a m4b aac wav wma aif aiff aifc ape wv mpc dsf",
);

export type MetadataKind = "photo" | "audio";

/** Que tipo de metadados vale ler de `name`, pela extensão; `null` se nenhum. */
export function metadataKindOf(name: string): MetadataKind | null {
	const dot = name.lastIndexOf(".");
	if (dot <= 0) return null;
	const ext = name.slice(dot + 1).toLowerCase();
	if (PHOTO_METADATA_EXTENSIONS.has(ext)) return "photo";
	if (AUDIO_METADATA_EXTENSIONS.has(ext)) return "audio";
	return null;
}
