/**
 * Informações lidas de dentro de fotos (EXIF) e músicas (tags). Campos que o arquivo
 * não tem ficam `null`.
 */
export interface FileMetadata {
	/**
	 * Quando a foto foi tirada, em ms (EXIF `DateTimeOriginal`, senão `CreateDate`). O EXIF
	 * não guarda fuso: a hora é lida como local, para o nome sair igual ao que a câmera mostra.
	 */
	takenAt: number | null;
	cameraMake: string | null;
	cameraModel: string | null;
	lens: string | null;
	iso: number | null;
	/** Número f (ex.: 2.8). */
	aperture: number | null;
	/** Distância focal em mm. */
	focalLength: number | null;
	width: number | null;
	height: number | null;
	artist: string | null;
	albumArtist: string | null;
	album: string | null;
	title: string | null;
	track: number | null;
	disc: number | null;
	year: number | null;
	genre: string | null;
	/** Segundos. */
	duration: number | null;
}

/** Metadados de um item: `null` quando o tipo não é lido ou o arquivo não tem nada. */
export type MetadataResult = readonly [path: string, metadata: FileMetadata | null];

/** Resultados parciais de uma leitura em lote, identificada pelo `id` do pedido. */
export interface MetadataProgress {
	id: number;
	results: MetadataResult[];
}
