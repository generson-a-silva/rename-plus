import { useCallback, useRef, useState } from "react";

export interface TextPromptRequest {
	title: string;
	label: string;
	initialValue: string;
	confirmLabel: string;
	/** Seleciona só o nome, sem a extensão (como nos gerenciadores de arquivos). */
	selectBaseName?: boolean;
	/** Exige um valor diferente do inicial (ex.: renomear); sem isso, aceitar a sugestão é permitido. */
	requireChange?: boolean;
	/** Mensagem de erro para o valor digitado, ou `null` se for válido. */
	validate?: (value: string) => string | null;
}

/**
 * Diálogo de texto baseado em Promise: `ask()` abre o diálogo e resolve com o
 * texto confirmado ou `null` se o usuário cancelar.
 */
export function useTextPrompt() {
	const [request, setRequest] = useState<TextPromptRequest | null>(null);
	const resolveRef = useRef<((value: string | null) => void) | null>(null);

	const ask = useCallback((next: TextPromptRequest) => {
		resolveRef.current?.(null);
		setRequest(next);
		return new Promise<string | null>((resolve) => {
			resolveRef.current = resolve;
		});
	}, []);

	const close = useCallback((value: string | null) => {
		resolveRef.current?.(value);
		resolveRef.current = null;
		setRequest(null);
	}, []);

	return { request, ask, close };
}
