import { CheckField, OptionPanel, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Substituição de texto literal. */
export function ReplaceOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"replace">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("replace.title")} active={active} onReset={onReset}>
			<TextField
				label={t("field.find")}
				value={value.find}
				onChange={(find) => onChange({ find })}
			/>
			<TextField
				label={t("replace.with")}
				value={value.with}
				onChange={(text) => onChange({ with: text })}
			/>
			<CheckField
				label={t("replace.matchCase")}
				checked={value.matchCase}
				onChange={(matchCase) => onChange({ matchCase })}
			/>
		</OptionPanel>
	);
}
