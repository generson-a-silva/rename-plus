type PdfJs = typeof import("pdfjs-dist");

let pdfjs: Promise<PdfJs> | null = null;

/** O pdf.js (e o worker dele) só é baixado na primeira vez que um PDF aparece no painel. */
function loadPdfJs(): Promise<PdfJs> {
	pdfjs ??= Promise.all([
		import("pdfjs-dist"),
		import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
	]).then(([lib, worker]) => {
		lib.GlobalWorkerOptions.workerSrc = worker.default;
		return lib;
	});
	return pdfjs;
}

export interface PdfPreview {
	/** Primeira página como PNG (`data:` URL). */
	url: string;
	pages: number;
}

/**
 * Desenha a primeira página de um PDF com o lado maior em `maxSize` px. Lê só as partes
 * necessárias do arquivo (o protocolo do app atende pedidos por faixa de bytes).
 */
export async function renderPdfPreview(
	url: string,
	maxSize: number,
	signal: AbortSignal,
): Promise<PdfPreview> {
	const lib = await loadPdfJs();
	signal.throwIfAborted();
	const task = lib.getDocument({ url, disableAutoFetch: true });
	const abort = () => void task.destroy();
	signal.addEventListener("abort", abort, { once: true });
	try {
		const document = await task.promise;
		const page = await document.getPage(1);
		const base = page.getViewport({ scale: 1 });
		const viewport = page.getViewport({ scale: maxSize / Math.max(base.width, base.height) });
		const canvas = window.document.createElement("canvas");
		canvas.width = Math.ceil(viewport.width);
		canvas.height = Math.ceil(viewport.height);
		await page.render({ canvas, viewport }).promise;
		return { url: canvas.toDataURL("image/png"), pages: document.numPages };
	} finally {
		signal.removeEventListener("abort", abort);
		void task.destroy();
	}
}
