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

/** As regras de agora diferem das guardadas no preset (ele pode ser atualizado). */
export function isPresetModified(preset: RenamePreset, options: RenameOptions): boolean {
	return JSON.stringify(preset.options) !== JSON.stringify(options);
}

/**
 * Salva `options` com o nome dado: substitui, no mesmo lugar, o preset de mesmo nome
 * (sem diferenciar maiúsculas) ou adiciona um novo com `newId` no fim da lista.
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
	return existing
		? presets.map((preset) => (preset === existing ? saved : preset))
		: [...presets, saved];
}

/** Troca o nome do preset; nomes vazios são ignorados. */
export function renamePreset(
	presets: readonly RenamePreset[],
	id: string,
	name: string,
): RenamePreset[] {
	const trimmed = name.trim();
	if (!trimmed) return [...presets];
	return presets.map((preset) => (preset.id === id ? { ...preset, name: trimmed } : preset));
}

/** Guarda uma cópia de `options` no preset, mantendo nome e posição. */
export function updatePresetOptions(
	presets: readonly RenamePreset[],
	id: string,
	options: RenameOptions,
): RenamePreset[] {
	return presets.map((preset) =>
		preset.id === id ? { ...preset, options: structuredClone(options) } : preset,
	);
}

/** Move o preset `offset` posições na lista (-1 sobe, 1 desce), sem passar das pontas. */
export function movePreset(
	presets: readonly RenamePreset[],
	id: string,
	offset: number,
): RenamePreset[] {
	const from = presets.findIndex((preset) => preset.id === id);
	const preset = presets[from];
	if (!preset) return [...presets];
	const to = Math.max(0, Math.min(presets.length - 1, from + offset));
	const rest = presets.filter((item) => item !== preset);
	return [...rest.slice(0, to), preset, ...rest.slice(to)];
}
