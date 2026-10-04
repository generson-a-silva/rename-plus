import type { WatchFoldersInfo } from "@shared/ipc";
import type { WatchRule } from "@shared/watch";
import { useCallback, useEffect, useRef, useState } from "react";

/** Espera após a última alteração antes de salvar (digitação em campos de texto). */
const SAVE_DELAY_MS = 500;

export interface WatchFoldersState {
	/** Regras como editadas na tela (podem estar à frente do que foi salvo). */
	rules: WatchRule[] | null;
	info: WatchFoldersInfo | null;
	/** Altera as regras; o salvamento é adiado até o usuário parar de digitar. */
	changeRules: (update: (rules: WatchRule[]) => WatchRule[]) => void;
	clearActivity: () => void;
}

/**
 * Regras das pastas monitoradas. As alterações aparecem na hora e são salvas no
 * processo principal logo depois; situação e atividade chegam dele por evento.
 */
export function useWatchFolders(): WatchFoldersState {
	const [info, setInfo] = useState<WatchFoldersInfo | null>(null);
	const [rules, setRules] = useState<WatchRule[] | null>(null);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const pendingRules = useRef<WatchRule[] | null>(null);

	const receive = useCallback((next: WatchFoldersInfo) => {
		setInfo(next);
		// Com uma edição ainda não salva, mantém o que o usuário digitou.
		if (!pendingRules.current) setRules(next.rules);
	}, []);

	const flush = useCallback(async () => {
		clearTimeout(saveTimer.current);
		const toSave = pendingRules.current;
		if (!toSave) return;
		const saved = await window.api.setWatchRules(toSave);
		if (pendingRules.current === toSave) pendingRules.current = null;
		receive(saved);
	}, [receive]);

	useEffect(() => {
		let active = true;
		const unsubscribe = window.api.onWatchFoldersChanged(receive);
		void window.api.getWatchFolders().then((loaded) => {
			if (active) receive(loaded);
		});
		return () => {
			active = false;
			unsubscribe();
			// Fechou as configurações no meio de uma edição: salva já.
			void flush();
		};
	}, [receive, flush]);

	const changeRules = useCallback(
		(update: (rules: WatchRule[]) => WatchRule[]) => {
			setRules((current) => {
				const next = update(current ?? []);
				pendingRules.current = next;
				return next;
			});
			clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
		},
		[flush],
	);

	const clearActivity = useCallback(() => {
		void window.api.clearWatchActivity().then(receive);
	}, [receive]);

	return { rules, info, changeRules, clearActivity };
}
