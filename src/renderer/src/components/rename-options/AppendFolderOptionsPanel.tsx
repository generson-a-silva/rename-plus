import { NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import { PLACEMENT_SELECT_OPTIONS, type RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Nome da(s) pasta(s) no nome do arquivo (8). */
export function AppendFolderOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"appendFolder">) {
	return (
		<OptionPanel number={8} title="Nome da pasta" active={active} onReset={onReset}>
			<SelectField
				label="Modo"
				value={value.mode}
				options={PLACEMENT_SELECT_OPTIONS}
				onChange={(mode) => onChange({ mode })}
			/>
			<div className="grid-2">
				<TextField
					label="Separador"
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
				<NumberField
					label="Níveis"
					min={1}
					max={20}
					value={value.levels}
					onChange={(levels) => onChange({ levels })}
				/>
			</div>
		</OptionPanel>
	);
}
