import { OptionPanel, SelectField, TextField } from "@components/common";
import { PLACEMENT_SELECT_OPTIONS, type RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Data de modificação/criação/atual no nome (7). */
export function AutoDateOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"autoDate">) {
	return (
		<OptionPanel number={7} title="Data automática" active={active} onReset={onReset}>
			<div className="grid-2">
				<SelectField
					label="Modo"
					value={value.mode}
					options={PLACEMENT_SELECT_OPTIONS}
					onChange={(mode) => onChange({ mode })}
				/>
				<SelectField
					label="Tipo"
					value={value.type}
					options={[
						["modified", "Modificação"],
						["created", "Criação"],
						["current", "Atual"],
					]}
					onChange={(type) => onChange({ type })}
				/>
			</div>
			<div className="grid-2">
				<TextField
					label="Formato"
					mono
					value={value.format}
					title="Tokens: YYYY, YY, MM, DD, HH, mm, ss"
					onChange={(format) => onChange({ format })}
				/>
				<TextField
					label="Separador"
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
			</div>
		</OptionPanel>
	);
}
