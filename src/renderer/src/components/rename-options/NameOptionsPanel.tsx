import { OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Manter, remover, fixar ou inverter o nome original. */
export function NameOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"name">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("name.title")} active={active} onReset={onReset}>
			<SelectField
				label={t("name.field")}
				value={value.mode}
				options={[
					["keep", t("option.keep")],
					["remove", t("option.remove")],
					["fixed", t("name.fixed")],
					["reverse", t("name.reverse")],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label={t("name.fixed")}
				value={value.fixed}
				disabled={value.mode !== "fixed"}
				onChange={(fixed) => onChange({ fixed })}
			/>
		</OptionPanel>
	);
}
