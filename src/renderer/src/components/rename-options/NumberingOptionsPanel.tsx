import { CheckField, NumberField, OptionPanel, SelectField, TextField } from "@components/common";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

/** Numeração sequencial (9). */
export function NumberingOptionsPanel({
	value,
	onChange,
	active,
	onReset,
}: RenameSectionPanelProps<"numbering">) {
	return (
		<OptionPanel number={9} title="Numeração" className="wide" active={active} onReset={onReset}>
			<div className="grid-4">
				<SelectField
					label="Modo"
					value={value.mode}
					options={[
						["none", "Nenhum"],
						["prefix", "Prefixo"],
						["suffix", "Sufixo"],
						["both", "Pref. + Suf."],
						["insert", "Inserir"],
					]}
					onChange={(mode) => onChange({ mode })}
				/>
				<NumberField
					label="Na posição"
					value={value.insertAt}
					disabled={value.mode !== "insert"}
					onChange={(insertAt) => onChange({ insertAt })}
				/>
				<NumberField label="Início" value={value.start} onChange={(start) => onChange({ start })} />
				<NumberField
					label="Incremento"
					value={value.increment}
					onChange={(increment) => onChange({ increment })}
				/>
				<NumberField
					label="Dígitos"
					title="Completa com zeros à esquerda (0 = sem preenchimento)."
					min={0}
					max={20}
					value={value.padding}
					onChange={(padding) => onChange({ padding })}
				/>
				<TextField
					label="Separador"
					value={value.separator}
					onChange={(separator) => onChange({ separator })}
				/>
				<SelectField
					label="Estilo"
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
				label="Reiniciar em cada pasta"
				checked={value.resetPerFolder}
				onChange={(resetPerFolder) => onChange({ resetPerFolder })}
			/>
		</OptionPanel>
	);
}
