import type { ReleaseInfo, UpdateSettings, UpdateStatus } from "@shared/ipc";
import { useCallback, useEffect, useState } from "react";

export interface UpdateStatusState {
	/** `null` enquanto não carregou. */
	status: UpdateStatus | null;
	/** Nova versão a anunciar (disponível e não ignorada pelo usuário). */
	announced: ReleaseInfo | null;
	check: () => Promise<void>;
	changeSettings: (patch: Partial<UpdateSettings>) => Promise<void>;
}

/** Situação da verificação de atualizações, acompanhando os avisos do processo principal. */
export function useUpdateStatus(): UpdateStatusState {
	const [status, setStatus] = useState<UpdateStatus | null>(null);

	useEffect(() => {
		let active = true;
		const unsubscribe = window.api.onUpdateStatus(setStatus);
		void window.api.getUpdateStatus().then((loaded) => {
			if (active) setStatus(loaded);
		});
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	const check = useCallback(async () => setStatus(await window.api.checkForUpdates()), []);
	const changeSettings = useCallback(
		async (patch: Partial<UpdateSettings>) => setStatus(await window.api.setUpdateSettings(patch)),
		[],
	);

	const state = status?.state;
	const announced =
		state?.status === "available" && state.release.version !== status?.settings.skippedVersion
			? state.release
			: null;

	return { status, announced, check, changeSettings };
}
