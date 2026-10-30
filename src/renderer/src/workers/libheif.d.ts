/** Só o que o decodificador de HEIC usa da libheif-js (o pacote não traz tipos dessa API). */
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
	interface HeifImage {
		get_width(): number;
		get_height(): number;
		display(
			target: { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number },
			callback: (result: { data: Uint8ClampedArray<ArrayBuffer> } | null) => void,
		): void;
		free(): void;
	}
	interface LibHeif {
		HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
	}
	const createLibHeif: () => LibHeif | Promise<LibHeif>;
	export default createLibHeif;
}
