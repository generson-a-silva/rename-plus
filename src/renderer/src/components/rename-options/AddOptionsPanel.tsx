import { CheckField, NumberField, OptionPanel, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Prefixo, sufixo e inserção de texto. */
export function AddOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"add">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("add.title")} active={active} onReset={onReset}>
			<TextField
				label={t("option.prefix")}
				value={value.prefix}
				onChange={(prefix) => onChange({ prefix })}
			/>
			<div className="grid-2">
				<TextField
					label={t("add.insert")}
					value={value.insert}
					onChange={(insert) => onChange({ insert })}
				/>
				<NumberField
					label={t("field.insertAt")}
					title={t("add.insertAtHint")}
					value={value.insertAt}
					onChange={(insertAt) => onChange({ insertAt })}
				/>
			</div>
			<TextField
				label={t("option.suffix")}
				value={value.suffix}
				onChange={(suffix) => onChange({ suffix })}
			/>
			<CheckField
				label={t("add.wordSpace")}
				title={t("add.wordSpaceHint")}
				checked={value.wordSpace}
				onChange={(wordSpace) => onChange({ wordSpace })}
			/>
		</OptionPanel>
	);
}
