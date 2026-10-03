import { OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Tratamento da extensão. */
export function ExtensionOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"extension">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("extension.title")} active={active} onReset={onReset}>
			<SelectField
				label={t("extension.field")}
				value={value.mode}
				options={[
					["same", t("option.keep")],
					["lower", t("option.lowercase")],
					["upper", t("option.uppercase")],
					["title", t("option.titleCase")],
					["remove", t("option.remove")],
					["fixed", t("extension.fixed")],
					["extra", t("extension.extra")],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label={t("extension.value")}
				value={value.value}
				disabled={value.mode !== "fixed" && value.mode !== "extra"}
				placeholder={t("extension.valuePlaceholder")}
				onChange={(text) => onChange({ value: text })}
			/>
		</OptionPanel>
	);
}
