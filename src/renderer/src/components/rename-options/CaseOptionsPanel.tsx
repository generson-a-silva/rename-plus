import { OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Maiúsculas/minúsculas com exceções. */
export function CaseOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"case">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("case.title")} active={active} onReset={onReset}>
			<SelectField
				label={t("case.field")}
				value={value.mode}
				options={[
					["same", t("option.keep")],
					["lower", t("option.lowercase")],
					["upper", t("option.uppercase")],
					["title", t("option.titleCase")],
					["sentence", t("case.sentence")],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label={t("case.exceptions")}
				value={value.exceptions}
				placeholder={t("case.exceptionsPlaceholder")}
				title={t("case.exceptionsHint")}
				onChange={(exceptions) => onChange({ exceptions })}
			/>
		</OptionPanel>
	);
}
