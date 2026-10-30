/// <reference lib="webworker" />
import createLibHeif from "libheif-js/libheif-wasm/libheif-bundle.mjs";

/**
 * Decodifica fotos HEIC fora da thread da interface (uma foto de 12 MP leva perto de 1 s
 * na libheif em WebAssembly) e devolve uma miniatura JPEG reduzida.
 */

export type HeicRequest =
	| { type: "decode"; id: number; url: string; maxSize: number }
	| { type: "cancel"; id: number };

export type HeicResponse =
	| { id: number; blob: Blob; width: number; height: number }
	| { id: number; error: string };

declare const self: DedicatedWorkerGlobalScope;

let libheif: ReturnType<typeof createLibHeif> | null = null;
const cancelled = new Set<number>();

self.onmessage = async ({ data }: MessageEvent<HeicRequest>) => {
	if (data.type === "cancel") {
		cancelled.add(data.id);
		return;
	}
	const { id, url, maxSize } = data;
	try {
		const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
		// Cancelado enquanto lia o arquivo: nem decodifica.
		if (cancelled.delete(id)) return;
		libheif ??= createLibHeif();
		const lib = await libheif;
		const [image] = new lib.HeifDecoder().decode(bytes);
		if (!image) throw new Error("HEIC sem imagem");
		const width = image.get_width();
		const height = image.get_height();
		const pixels = await new Promise<Uint8ClampedArray<ArrayBuffer>>((resolve, reject) =>
			image.display({ data: new Uint8ClampedArray(width * height * 4), width, height }, (result) =>
				result ? resolve(result.data) : reject(new Error("falha ao decodificar o HEIC")),
			),
		);
		image.free();

		// Reduz direto dos pixels: um canvas do tamanho da foto (48 MB numa de 12 MP) iria
		// para a GPU, que também desenha a janela, e travava um quadro da interface.
		const scale = Math.min(1, maxSize / Math.max(width, height));
		const bitmap = await createImageBitmap(new ImageData(pixels, width, height), {
			resizeWidth: Math.max(1, Math.round(width * scale)),
			resizeHeight: Math.max(1, Math.round(height * scale)),
			resizeQuality: "high",
		});
		const small = new OffscreenCanvas(bitmap.width, bitmap.height);
		small.getContext("2d")?.drawImage(bitmap, 0, 0);
		bitmap.close();
		const blob = await small.convertToBlob({ type: "image/jpeg", quality: 0.85 });
		self.postMessage({ id, blob, width, height } satisfies HeicResponse);
	} catch (error) {
		self.postMessage({ id, error: String(error) } satisfies HeicResponse);
	} finally {
		cancelled.delete(id);
	}
};
