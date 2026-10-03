import { CheckField, NumberField, OptionPanel, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Prefixo, sufixo e inserção de texto. */
export function AddOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"add">) {
	return (
		<OptionPanel title="Adicionar" active={active} onReset={onReset}>
			<TextField label="Prefixo" value={value.prefix} onChange={(prefix) => onChange({ prefix })} />
			<div className="grid-2">
				<TextField
					label="Inserir"
					value={value.insert}
					onChange={(insert) => onChange({ insert })}
				/>
				<NumberField
					label="Na posição"
					title="Quantidade de caracteres antes do texto; negativo conta do fim."
					value={value.insertAt}
					onChange={(insertAt) => onChange({ insertAt })}
				/>
			</div>
			<TextField label="Sufixo" value={value.suffix} onChange={(suffix) => onChange({ suffix })} />
			<CheckField
				label="Espaço entre palavras"
				title='Separa palavras coladas: "MinhaFoto" → "Minha Foto".'
				checked={value.wordSpace}
				onChange={(wordSpace) => onChange({ wordSpace })}
			/>
		</OptionPanel>
	);
}
