import { NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import { placementSelectOptions, type RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Nome da(s) pasta(s) no nome do arquivo. */
export function AppendFolderOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"appendFolder">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("appendFolder.title")} active={active} onReset={onReset}>
			<SelectField
				label={t("field.mode")}
				value={value.mode}
				options={placementSelectOptions(t)}
				onChange={(mode) => onChange({ mode })}
			/>
			<div className="grid-2">
				<TextField
					label={t("field.separator")}
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
				<NumberField
					label={t("appendFolder.levels")}
					min={1}
					max={20}
					value={value.levels}
					onChange={(levels) => onChange({ levels })}
				/>
			</div>
		</OptionPanel>
	);
}
