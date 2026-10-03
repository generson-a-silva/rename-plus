import { CheckField, NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Remoção de caracteres, palavras e trechos. */
export function RemoveOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"remove">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("remove.title")} active={active} onReset={onReset}>
			<div className="grid-2">
				<NumberField
					label={t("remove.first")}
					min={0}
					value={value.first}
					onChange={(first) => onChange({ first })}
				/>
				<NumberField
					label={t("remove.last")}
					min={0}
					value={value.last}
					onChange={(last) => onChange({ last })}
				/>
				<NumberField
					label={t("remove.from")}
					min={0}
					title={t("remove.fromHint")}
					value={value.from}
					onChange={(from) => onChange({ from })}
				/>
				<NumberField
					label={t("remove.to")}
					min={0}
					title={t("remove.toHint")}
					value={value.to}
					onChange={(to) => onChange({ to })}
				/>
			</div>
			<div className="grid-2">
				<TextField
					label={t("remove.chars")}
					value={value.chars}
					title={t("remove.charsHint")}
					onChange={(chars) => onChange({ chars })}
				/>
				<TextField
					label={t("remove.words")}
					value={value.words}
					title={t("remove.wordsHint")}
					onChange={(words) => onChange({ words })}
				/>
				<SelectField
					label={t("remove.crop")}
					value={value.cropMode}
					options={[
						["none", t("remove.cropNone")],
						["before", t("remove.cropBefore")],
						["after", t("remove.cropAfter")],
					]}
					onChange={(cropMode) => onChange({ cropMode })}
				/>
				<TextField
					label={t("remove.cropText")}
					value={value.cropText}
					disabled={value.cropMode === "none"}
					onChange={(cropText) => onChange({ cropText })}
				/>
			</div>
			<div className="checks">
				<CheckField
					label={t("remove.digits")}
					checked={value.digits}
					onChange={(digits) => onChange({ digits })}
				/>
				<CheckField
					label={t("remove.accents")}
					checked={value.accents}
					onChange={(accents) => onChange({ accents })}
				/>
				<CheckField
					label={t("remove.symbols")}
					title={t("remove.symbolsHint")}
					checked={value.symbols}
					onChange={(symbols) => onChange({ symbols })}
				/>
				<CheckField
					label={t("remove.high")}
					checked={value.high}
					onChange={(high) => onChange({ high })}
				/>
				<CheckField
					label={t("remove.trim")}
					title={t("remove.trimHint")}
					checked={value.trim}
					onChange={(trim) => onChange({ trim })}
				/>
				<CheckField
					label={t("remove.doubleSpaces")}
					checked={value.doubleSpaces}
					onChange={(doubleSpaces) => onChange({ doubleSpaces })}
				/>
				<CheckField
					label={t("remove.leadDots")}
					checked={value.leadDots}
					onChange={(leadDots) => onChange({ leadDots })}
				/>
			</div>
		</OptionPanel>
	);
}
