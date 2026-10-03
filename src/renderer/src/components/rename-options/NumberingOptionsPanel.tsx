import { CheckField, NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import { useI18n } from "@hooks";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Numeração sequencial. */
export function NumberingOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"numbering">) {
	const { t } = useI18n();
	return (
		<OptionPanel title={t("numbering.title")} className="wide" active={active} onReset={onReset}>
			<div className="grid-4">
				<SelectField
					label={t("field.mode")}
					value={value.mode}
					options={[
						["none", t("option.none")],
						["prefix", t("option.prefix")],
						["suffix", t("option.suffix")],
						["both", t("numbering.both")],
						["insert", t("numbering.insert")],
					]}
					onChange={(mode) => onChange({ mode })}
				/>
				<NumberField
					label={t("field.insertAt")}
					value={value.insertAt}
					disabled={value.mode !== "insert"}
					onChange={(insertAt) => onChange({ insertAt })}
				/>
				<NumberField
					label={t("numbering.start")}
					value={value.start}
					onChange={(start) => onChange({ start })}
				/>
				<NumberField
					label={t("numbering.increment")}
					value={value.increment}
					onChange={(increment) => onChange({ increment })}
				/>
				<NumberField
					label={t("numbering.padding")}
					title={t("numbering.paddingHint")}
					min={0}
					max={20}
					value={value.padding}
					onChange={(padding) => onChange({ padding })}
				/>
				<TextField
					label={t("field.separator")}
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
				<SelectField
					label={t("numbering.style")}
					value={value.style}
					options={[
						["decimal", "1, 2, 3"],
						["lower", "a, b, c"],
						["upper", "A, B, C"],
						["roman", "I, II, III"],
					]}
					onChange={(style) => onChange({ style })}
				/>
			</div>
			<CheckField
				label={t("numbering.resetPerFolder")}
				checked={value.resetPerFolder}
				onChange={(resetPerFolder) => onChange({ resetPerFolder })}
			/>
		</OptionPanel>
	);
}
