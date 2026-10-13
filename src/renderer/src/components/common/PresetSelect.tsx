import { useI18n } from "@hooks";
import type { RenamePreset } from "@lib";

interface PresetSelectProps {
	presets: readonly RenamePreset[];
	/** `id` do preset escolhido, ou "" se nenhum. */
	selectedId: string;
	onSelect: (preset: RenamePreset) => void;
	/**
	 * Com esta função, a lista ganha a opção "Nenhum", que pode ser escolhida para sair
	 * do preset. Sem ela, "" é só o marcador "Escolher preset".
	 */
	onSelectNone?: () => void;
	id?: string;
}

/** Lista de presets de renomeação. Escolher um aplica as opções dele. */
export function PresetSelect({
	presets,
	selectedId,
	onSelect,
	onSelectNone,
	id,
}: PresetSelectProps) {
	const { t } = useI18n();
	const current = presets.find((preset) => preset.id === selectedId);
	const empty = presets.length === 0;
	return (
		<select
			id={id}
			className="preset-select"
			value={current?.id ?? ""}
			disabled={empty}
			title={empty ? t("presets.emptyHint") : (current?.name ?? t("presets.label"))}
			aria-label={t("presets.label")}
			onChange={(event) => {
				const preset = presets.find((item) => item.id === event.target.value);
				if (preset) onSelect(preset);
				else onSelectNone?.();
			}}
		>
			{onSelectNone && !empty ? (
				<option value="">{t("presets.none")}</option>
			) : (
				<option value="" disabled hidden>
					{empty ? t("presets.empty") : t("presets.choose")}
				</option>
			)}
			{presets.map((preset) => (
				<option key={preset.id} value={preset.id}>
					{preset.name}
				</option>
			))}
		</select>
	);
}
