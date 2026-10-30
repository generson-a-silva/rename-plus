import type { HeicRequest, HeicResponse } from "../workers/heicDecoder.worker";

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (response: HeicResponse) => void>();

/** O worker (e a libheif, ~1,4 MB) só é criado na primeira foto HEIC. */
function heicWorker(): Worker {
	if (!worker) {
		worker = new Worker(new URL("../workers/heicDecoder.worker.ts", import.meta.url), {
			type: "module",
		});
		worker.onmessage = ({ data }: MessageEvent<HeicResponse>) => {
			pending.get(data.id)?.(data);
			pending.delete(data.id);
		};
	}
	return worker;
}

export interface HeicPreview {
	/** Miniatura JPEG (`blob:` URL): chame `URL.revokeObjectURL` ao descartar. */
	url: string;
	width: number;
	height: number;
}

/** Decodifica a foto em segundo plano e devolve a miniatura com o lado maior em `maxSize` px. */
export function renderHeicPreview(
	url: string,
	maxSize: number,
	signal: AbortSignal,
): Promise<HeicPreview> {
	const target = heicWorker();
	const id = nextId++;
	return new Promise((resolve, reject) => {
		signal.addEventListener(
			"abort",
			() => {
				pending.delete(id);
				target.postMessage({ type: "cancel", id } satisfies HeicRequest);
				reject(signal.reason);
			},
			{ once: true },
		);
		pending.set(id, (response) => {
			if ("error" in response) reject(new Error(response.error));
			else {
				resolve({
					url: URL.createObjectURL(response.blob),
					width: response.width,
					height: response.height,
				});
			}
		});
		target.postMessage({ type: "decode", id, url, maxSize } satisfies HeicRequest);
	});
}
