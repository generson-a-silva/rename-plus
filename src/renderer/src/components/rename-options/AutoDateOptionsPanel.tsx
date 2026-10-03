import { OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import { placementSelectOptions, type RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Data de modificação/criação/atual no nome. */
export function AutoDateOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"autoDate">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("autoDate.title")} active={active} onReset={onReset}>
			<div className="grid-2">
				<SelectField
					label={t("field.mode")}
					value={value.mode}
					options={placementSelectOptions(t)}
					onChange={(mode) => onChange({ mode })}
				/>
				<SelectField
					label={t("autoDate.type")}
					value={value.type}
					options={[
						["modified", t("autoDate.modified")],
						["created", t("autoDate.created")],
						["current", t("autoDate.current")],
					]}
					onChange={(type) => onChange({ type })}
				/>
			</div>
			<div className="grid-2">
				<TextField
					label={t("autoDate.format")}
					mono
					value={value.format}
					title={t("autoDate.formatHint")}
					onChange={(format) => onChange({ format })}
				/>
				<TextField
					label={t("field.separator")}
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
			</div>
		</OptionPanel>
	);
}
