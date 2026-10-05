import { useI18n } from "@hooks";
import { findMatchingPreset, type RenamePreset } from "@lib";
import type { RenameOptions } from "@shared/rename";

interface PresetSelectProps {
	presets: readonly RenamePreset[];
	/** Opções aplicadas agora: o preset igual a elas aparece selecionado. */
	options: RenameOptions;
	onSelect: (preset: RenamePreset) => void;
	id?: string;
}

/**
 * Lista de presets de renomeação. Escolher um aplica as opções dele; sem preset igual
 * às opções atuais (editadas depois ou nunca salvas), mostra o marcador "Escolher preset".
 */
export function PresetSelect({ presets, options, onSelect, id }: PresetSelectProps) {
	const { t } = useI18n();
	const current = findMatchingPreset(presets, options);
	return (
		<select
			id={id}
			className="preset-select"
			value={current?.id ?? ""}
			disabled={presets.length === 0}
			title={presets.length === 0 ? t("presets.emptyHint") : (current?.name ?? t("presets.label"))}
			aria-label={t("presets.label")}
			onChange={(event) => {
				const preset = presets.find((item) => item.id === event.target.value);
				if (preset) onSelect(preset);
			}}
		>
			<option value="" disabled hidden>
				{presets.length === 0 ? t("presets.empty") : t("presets.choose")}
			</option>
			{presets.map((preset) => (
				<option key={preset.id} value={preset.id}>
					{preset.name}
				</option>
			))}
		</select>
	);
}
