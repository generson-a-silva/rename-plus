import type { FileEntry, SizeTotal } from "@shared/ipc";
import { useEffect, useMemo, useState } from "react";

/** Espera a seleção parar (arrasto, Shift+setas) antes de começar a soma. */
const START_DELAY_MS = 150;

export interface SelectionSize {
	total: SizeTotal;
	/** Ainda percorrendo pastas: `total` é parcial. */
	calculating: boolean;
}

let nextId = 1;

/**
 * Soma o tamanho dos itens selecionados. Só com arquivos, os tamanhos já vêm da listagem
 * e a soma é feita aqui mesmo (rápida até para centenas de milhares). Com pastas, o
 * processo principal percorre o conteúdo com leituras assíncronas, sem travar a
 * interface; a soma é cancelada quando a seleção muda. `null` quando `enabled` é falso.
 */
export function useSelectionSize(
	entries: readonly FileEntry[],
	enabled: boolean,
): SelectionSize | null {
	const [state, setState] = useState<{ entries: readonly FileEntry[]; size: SelectionSize } | null>(
		null,
	);
	const hasFolders = useMemo(
		() => enabled && entries.some((entry) => entry.isDir),
		[entries, enabled],
	);
	const filesOnly = useMemo((): SizeTotal | null => {
		if (!enabled || hasFolders) return null;
		let bytes = 0;
		for (const entry of entries) bytes += entry.size;
		return { bytes, files: entries.length, folders: 0 };
	}, [entries, enabled, hasFolders]);

	useEffect(() => {
		if (!hasFolders) return;
		const id = nextId++;
		let current = true;
		const unsubscribe = window.api.onSizeProgress((progress) => {
			if (current && progress.id === id) {
				setState({ entries, size: { total: progress.total, calculating: true } });
			}
		});
		const timer = window.setTimeout(async () => {
			const total = await window.api.calculateSize(
				id,
				entries.map((entry) => entry.path),
			);
			if (current && total) setState({ entries, size: { total, calculating: false } });
		}, START_DELAY_MS);
		return () => {
			current = false;
			window.clearTimeout(timer);
			unsubscribe();
			window.api.cancelSizeCalculation(id);
		};
	}, [entries, hasFolders]);

	if (!enabled) return null;
	if (filesOnly) return { total: filesOnly, calculating: false };
	// Resultado de outra seleção ainda não serve: mostra "calculando" do zero.
	if (state?.entries !== entries) {
		return { total: { bytes: 0, files: 0, folders: 0 }, calculating: true };
	}
	return state.size;
}
