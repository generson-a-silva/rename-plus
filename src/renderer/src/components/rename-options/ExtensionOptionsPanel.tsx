import { OptionPanel, SelectField, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Tratamento da extensão. */
export function ExtensionOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"extension">) {
	return (
		<OptionPanel title="Extensão" active={active} onReset={onReset}>
			<SelectField
				label="Extensão"
				value={value.mode}
				options={[
					["same", "Manter"],
					["lower", "minúsculas"],
					["upper", "MAIÚSCULAS"],
					["title", "Título"],
					["remove", "Remover"],
					["fixed", "Fixa"],
					["extra", "Adicional"],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label="Valor"
				value={value.value}
				disabled={value.mode !== "fixed" && value.mode !== "extra"}
				placeholder="ex.: jpg"
				onChange={(text) => onChange({ value: text })}
			/>
		</OptionPanel>
	);
}
