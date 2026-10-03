import { CheckField, NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Remoção de caracteres, palavras e trechos. */
export function RemoveOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"remove">) {
	return (
		<OptionPanel title="Remover" active={active} onReset={onReset}>
			<div className="grid-2">
				<NumberField
					label="Primeiros"
					min={0}
					value={value.first}
					onChange={(first) => onChange({ first })}
				/>
				<NumberField
					label="Últimos"
					min={0}
					value={value.last}
					onChange={(last) => onChange({ last })}
				/>
				<NumberField
					label="De"
					min={0}
					title="Posição inicial (a partir de 1) do trecho a remover."
					value={value.from}
					onChange={(from) => onChange({ from })}
				/>
				<NumberField
					label="Até"
					min={0}
					title="Posição final (inclusive) do trecho a remover."
					value={value.to}
					onChange={(to) => onChange({ to })}
				/>
			</div>
			<div className="grid-2">
				<TextField
					label="Caracteres"
					value={value.chars}
					title="Remove cada um destes caracteres."
					onChange={(chars) => onChange({ chars })}
				/>
				<TextField
					label="Palavras"
					value={value.words}
					title="Palavras inteiras separadas por espaço."
					onChange={(words) => onChange({ words })}
				/>
				<SelectField
					label="Cortar"
					value={value.cropMode}
					options={[
						["none", "Não"],
						["before", "Antes de"],
						["after", "Depois de"],
					]}
					onChange={(cropMode) => onChange({ cropMode })}
				/>
				<TextField
					label="Texto"
					value={value.cropText}
					disabled={value.cropMode === "none"}
					onChange={(cropText) => onChange({ cropText })}
				/>
			</div>
			<div className="checks">
				<CheckField
					label="Dígitos"
					checked={value.digits}
					onChange={(digits) => onChange({ digits })}
				/>
				<CheckField
					label="Acentos"
					checked={value.accents}
					onChange={(accents) => onChange({ accents })}
				/>
				<CheckField
					label="Símbolos"
					title="Tudo que não é letra, número ou espaço."
					checked={value.symbols}
					onChange={(symbols) => onChange({ symbols })}
				/>
				<CheckField
					label="Não-ASCII"
					checked={value.high}
					onChange={(high) => onChange({ high })}
				/>
				<CheckField
					label="Aparar"
					title="Remove espaços no início e no fim."
					checked={value.trim}
					onChange={(trim) => onChange({ trim })}
				/>
				<CheckField
					label="Espaços duplos"
					checked={value.doubleSpaces}
					onChange={(doubleSpaces) => onChange({ doubleSpaces })}
				/>
				<CheckField
					label="Pontos iniciais"
					checked={value.leadDots}
					onChange={(leadDots) => onChange({ leadDots })}
				/>
			</div>
		</OptionPanel>
	);
}
