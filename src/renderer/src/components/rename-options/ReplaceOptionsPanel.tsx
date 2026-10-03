import { CheckField, OptionPanel, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Substituição de texto literal (3). */
export function ReplaceOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"replace">) {
	return (
		<OptionPanel number={3} title="Substituir" active={active} onReset={onReset}>
			<TextField label="Buscar" value={value.find} onChange={(find) => onChange({ find })} />
			<TextField label="Por" value={value.with} onChange={(text) => onChange({ with: text })} />
			<CheckField
				label="Diferenciar maiúsculas"
				checked={value.matchCase}
				onChange={(matchCase) => onChange({ matchCase })}
			/>
		</OptionPanel>
	);
}
