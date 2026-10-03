import { CheckField, OptionPanel, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Expressão regular aplicada ao nome. */
export function RegexOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"regex">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("regex.title")} active={active} onReset={onReset}>
			<TextField
				label={t("field.find")}
				mono
				value={value.match}
				placeholder={t("regex.findPlaceholder")}
				onChange={(match) => onChange({ match })}
			/>
			<TextField
				label={t("regex.replace")}
				mono
				value={value.replace}
				placeholder={t("regex.replacePlaceholder")}
				title={t("regex.replaceHint")}
				onChange={(text) => onChange({ replace: text })}
			/>
			<div className="checks">
				<CheckField
					label={t("regex.includeExt")}
					checked={value.includeExt}
					onChange={(includeExt) => onChange({ includeExt })}
				/>
				<CheckField
					label={t("regex.global")}
					title={t("regex.globalHint")}
					checked={value.global}
					onChange={(global) => onChange({ global })}
				/>
				<CheckField
					label={t("regex.ignoreCase")}
					checked={value.ignoreCase}
					onChange={(ignoreCase) => onChange({ ignoreCase })}
				/>
			</div>
		</OptionPanel>
	);
}
