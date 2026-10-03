import { OptionPanel, SelectField, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Maiúsculas/minúsculas com exceções (4). */
export function CaseOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"case">) {
	return (
		<OptionPanel number={4} title="Maiúsc./Minúsc." active={active} onReset={onReset}>
			<SelectField
				label="Caixa"
				value={value.mode}
				options={[
					["same", "Manter"],
					["lower", "minúsculas"],
					["upper", "MAIÚSCULAS"],
					["title", "Título"],
					["sentence", "Frase"],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label="Exceções"
				value={value.exceptions}
				placeholder="de;da;do;e"
				title="Palavras separadas por ; que ficam exatamente como escritas."
				onChange={(exceptions) => onChange({ exceptions })}
			/>
		</OptionPanel>
	);
}
