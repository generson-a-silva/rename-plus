import { CheckField, OptionPanel, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Expressão regular aplicada ao nome (1). */
export function RegexOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"regex">) {
	return (
		<OptionPanel number={1} title="RegEx" active={active} onReset={onReset}>
			<TextField
				label="Buscar"
				mono
				value={value.match}
				placeholder="ex.: IMG_(\d+)"
				onChange={(match) => onChange({ match })}
			/>
			<TextField
				label="Substituir"
				mono
				value={value.replace}
				placeholder="ex.: Foto $1"
				title="Use $1, $2… para grupos de captura e $& para o trecho encontrado."
				onChange={(text) => onChange({ replace: text })}
			/>
			<div className="checks">
				<CheckField
					label="Incl. ext."
					checked={value.includeExt}
					onChange={(includeExt) => onChange({ includeExt })}
				/>
				<CheckField
					label="Global"
					title="Substitui todas as ocorrências, não só a primeira."
					checked={value.global}
					onChange={(global) => onChange({ global })}
				/>
				<CheckField
					label="Ignorar maiúsc."
					checked={value.ignoreCase}
					onChange={(ignoreCase) => onChange({ ignoreCase })}
				/>
			</div>
		</OptionPanel>
	);
}
