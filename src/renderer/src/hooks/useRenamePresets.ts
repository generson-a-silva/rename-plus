import { loadStored, type RenamePreset, sanitizePresets, saveStored, upsertPreset } from "@lib";
import type { RenameOptions } from "@shared/rename";
import { useCallback, useState } from "react";

const STORAGE_KEY = "presets";

export interface RenamePresetsState {
	presets: RenamePreset[];
	/** Salva com o nome dado, substituindo o preset de mesmo nome. */
	save: (name: string, options: RenameOptions) => void;
	remove: (id: string) => void;
}

/** Presets de renomeação, salvos no localStorage a cada alteração. */
export function useRenamePresets(): RenamePresetsState {
	const [presets, setPresets] = useState(() => sanitizePresets(loadStored(STORAGE_KEY)));

	const update = useCallback((change: (current: RenamePreset[]) => RenamePreset[]) => {
		setPresets((current) => {
			const next = change(current);
			saveStored(STORAGE_KEY, next);
			return next;
		});
	}, []);

	const save = useCallback(
		(name: string, options: RenameOptions) =>
			update((current) => upsertPreset(current, name, options, crypto.randomUUID())),
		[update],
	);

	const remove = useCallback(
		(id: string) => update((current) => current.filter((preset) => preset.id !== id)),
		[update],
	);

	return { presets, save, remove };
}
