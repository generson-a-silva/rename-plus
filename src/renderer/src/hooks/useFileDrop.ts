import { useEffect, useRef, useState } from "react";

interface FileDropOptions {
	/** Recebe os caminhos no disco dos itens soltos na janela. */
	onDrop: (paths: string[]) => void;
	/** Com `false` (ex.: um diálogo aberto), solturas são ignoradas, mas sem navegar a janela. */
	enabled: boolean;
}

/**
 * Enquanto há arrasto sobre a janela, o navegador dispara `dragover` continuamente
 * (a cada ~50 ms). Sem ele por esse tempo, o arrasto acabou (Esc, cancelado pelo
 * sistema) mesmo sem um `dragleave`, e a sobreposição é escondida.
 */
const DRAG_IDLE_TIMEOUT_MS = 400;

/** O arrasto traz arquivos/pastas do sistema (e não, por exemplo, texto selecionado). */
function carriesFiles(event: DragEvent): boolean {
	return event.dataTransfer?.types.includes("Files") ?? false;
}

/** Com um diálogo modal aberto, a janela por trás não recebe itens soltos. */
const modalOpen = () => document.querySelector("dialog[open]") !== null;

/**
 * Arrastar e soltar arquivos/pastas do sistema sobre a janela. Devolve `true`
 * enquanto um arrasto válido está sobre ela (para exibir a sobreposição).
 *
 * Sempre cancela o comportamento padrão do navegador para arquivos, que seria
 * abrir o arquivo no lugar do app.
 */
export function useFileDrop({ onDrop, enabled }: FileDropOptions): boolean {
	const [dragging, setDragging] = useState(false);
	const onDropRef = useRef(onDrop);
	onDropRef.current = onDrop;
	const enabledRef = useRef(enabled);
	enabledRef.current = enabled;

	useEffect(() => {
		// dragenter/dragleave disparam a cada elemento filho; o contador indica se o
		// arrasto ainda está dentro da janela.
		let depth = 0;
		let idleTimer: ReturnType<typeof setTimeout> | undefined;

		const reset = () => {
			clearTimeout(idleTimer);
			depth = 0;
			setDragging(false);
		};
		const keepAlive = () => {
			clearTimeout(idleTimer);
			idleTimer = setTimeout(reset, DRAG_IDLE_TIMEOUT_MS);
		};

		const onDragEnter = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			depth++;
			setDragging(enabledRef.current && !modalOpen());
			keepAlive();
		};
		const onDragOver = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			if (event.dataTransfer)
				event.dataTransfer.dropEffect = enabledRef.current && !modalOpen() ? "copy" : "none";
			keepAlive();
		};
		const onDragLeave = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			depth = Math.max(0, depth - 1);
			if (depth === 0) reset();
		};
		const onDropEvent = (event: DragEvent) => {
			if (!carriesFiles(event)) return;
			event.preventDefault();
			reset();
			if (!enabledRef.current || modalOpen()) return;
			const paths = [...(event.dataTransfer?.files ?? [])]
				.map((file) => window.api.getPathForFile(file))
				.filter(Boolean);
			if (paths.length > 0) onDropRef.current(paths);
		};

		window.addEventListener("dragenter", onDragEnter);
		window.addEventListener("dragover", onDragOver);
		window.addEventListener("dragleave", onDragLeave);
		window.addEventListener("drop", onDropEvent);
		window.addEventListener("blur", reset);
		return () => {
			clearTimeout(idleTimer);
			window.removeEventListener("blur", reset);
			window.removeEventListener("dragenter", onDragEnter);
			window.removeEventListener("dragover", onDragOver);
			window.removeEventListener("dragleave", onDragLeave);
			window.removeEventListener("drop", onDropEvent);
		};
	}, []);

	return dragging;
}
