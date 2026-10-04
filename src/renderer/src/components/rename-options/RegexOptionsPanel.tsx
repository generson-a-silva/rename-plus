import { AppIcon, CheckField, OptionPanel, TextField } from "@components/common";
import { RegexBuilderDialog } from "@components/regex-builder";
import { useI18n } from "@hooks";
import { useState } from "react";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

interface RegexOptionsPanelProps extends RenameSectionPanelProps<"regex"> {
	/** Nomes para testar a expressão no construtor visual. */
	sampleNames: readonly string[];
}

/** Expressão regular aplicada ao nome, digitada ou montada no construtor visual. */
export function RegexOptionsPanel({
	value,
	onChange,
	active,
	onReset,
	sampleNames,
}: RegexOptionsPanelProps) {
	const { t } = useI18n();
	const [builderOpen, setBuilderOpen] = useState(false);
	return (
		<OptionPanel title={t("regex.title")} active={active} onReset={onReset}>
			<button
				type="button"
				className="button regex-builder-button"
				title={t("rxb.openHint")}
				onClick={() => setBuilderOpen(true)}
			>
				<AppIcon name="blocks" size={14} />
				{t("rxb.open")}
			</button>
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
			<RegexBuilderDialog
				open={builderOpen}
				value={value}
				sampleNames={sampleNames}
				onApply={onChange}
				onClose={() => setBuilderOpen(false)}
			/>
		</OptionPanel>
	);
}
