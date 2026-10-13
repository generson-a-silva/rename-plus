import {
	findPresetByName,
	loadStored,
	movePreset,
	type RenamePreset,
	renamePreset,
	sanitizePresets,
	saveStored,
	updatePresetOptions,
	upsertPreset,
} from "@lib";
import type { RenameOptions } from "@shared/rename";
import { useCallback, useState } from "react";

const STORAGE_KEY = "presets";

export interface RenamePresetsState {
	presets: RenamePreset[];
	/** Salva com o nome dado, substituindo o preset de mesmo nome; devolve o `id` dele. */
	save: (name: string, options: RenameOptions) => string;
	rename: (id: string, name: string) => void;
	/** Troca as regras guardadas no preset pelas dadas. */
	updateOptions: (id: string, options: RenameOptions) => void;
	/** Move o preset na lista (-1 sobe, 1 desce). */
	move: (id: string, offset: number) => void;
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
		(name: string, options: RenameOptions) => {
			const id = findPresetByName(presets, name)?.id ?? crypto.randomUUID();
			update((current) => upsertPreset(current, name, options, id));
			return id;
		},
		[presets, update],
	);

	const rename = useCallback(
		(id: string, name: string) => update((current) => renamePreset(current, id, name)),
		[update],
	);

	const updateOptions = useCallback(
		(id: string, options: RenameOptions) =>
			update((current) => updatePresetOptions(current, id, options)),
		[update],
	);

	const move = useCallback(
		(id: string, offset: number) => update((current) => movePreset(current, id, offset)),
		[update],
	);

	const remove = useCallback(
		(id: string) => update((current) => current.filter((preset) => preset.id !== id)),
		[update],
	);

	return { presets, save, rename, updateOptions, move, remove };
}
