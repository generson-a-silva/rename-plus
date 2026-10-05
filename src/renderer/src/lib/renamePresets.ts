import { createDefaultOptions, type RenameOptions } from "@shared/rename";
import { mergeDefaults } from "@shared/settings";

/** Conjunto de regras de renomeação salvo com um nome, para reaplicar depois. */
export interface RenamePreset {
	id: string;
	name: string;
	options: RenameOptions;
}

/**
 * Confere presets vindos do armazenamento: descarta itens inválidos ou sem nome,
 * ids repetidos, e completa as opções com os padrões (dados de versões antigas).
 */
export function sanitizePresets(value: unknown): RenamePreset[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	const presets: RenamePreset[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const { id, name, options } = item as Partial<Record<keyof RenamePreset, unknown>>;
		if (typeof id !== "string" || !id || seen.has(id)) continue;
		if (typeof name !== "string" || !name.trim()) continue;
		seen.add(id);
		presets.push({
			id,
			name: name.trim(),
			options: mergeDefaults(createDefaultOptions(), options),
		});
	}
	return presets;
}

const sameName = (a: string, b: string) =>
	a.trim().localeCompare(b.trim(), undefined, { sensitivity: "accent" }) === 0;

export function findPresetByName(
	presets: readonly RenamePreset[],
	name: string,
): RenamePreset | undefined {
	return presets.find((preset) => sameName(preset.name, name));
}

/** Preset cujas opções são exatamente `options` (o que está aplicado agora), se houver. */
export function findMatchingPreset(
	presets: readonly RenamePreset[],
	options: RenameOptions,
): RenamePreset | undefined {
	const target = JSON.stringify(options);
	return presets.find((preset) => JSON.stringify(preset.options) === target);
}

/**
 * Salva `options` com o nome dado: substitui o preset de mesmo nome (sem diferenciar
 * maiúsculas) ou adiciona um novo com `newId`. A lista fica em ordem alfabética.
 */
export function upsertPreset(
	presets: readonly RenamePreset[],
	name: string,
	options: RenameOptions,
	newId: string,
): RenamePreset[] {
	const existing = findPresetByName(presets, name);
	const saved: RenamePreset = {
		id: existing?.id ?? newId,
		name: name.trim(),
		options: structuredClone(options),
	};
	return [...presets.filter((preset) => preset !== existing), saved].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }),
	);
}
