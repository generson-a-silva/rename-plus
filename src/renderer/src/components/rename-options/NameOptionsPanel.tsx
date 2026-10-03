import { OptionPanel, SelectField, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Manter, remover, fixar ou inverter o nome original (2). */
export function NameOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"name">) {
	return (
		<OptionPanel number={2} title="Nome" active={active} onReset={onReset}>
			<SelectField
				label="Nome"
				value={value.mode}
				options={[
					["keep", "Manter"],
					["remove", "Remover"],
					["fixed", "Fixo"],
					["reverse", "Inverter"],
				]}
				onChange={(mode) => onChange({ mode })}
			/>
			<TextField
				label="Fixo"
				value={value.fixed}
				disabled={value.mode !== "fixed"}
				onChange={(fixed) => onChange({ fixed })}
			/>
		</OptionPanel>
	);
}
