import { CheckField, OptionPanel, TextField } from "@components/common";
import { DEFAULT_FILTERS, type ListFilters } from "@lib";

interface ListFiltersPanelProps {
	value: ListFilters;
	onChange: (patch: Partial<ListFilters>) => void;
}

/** Filtros da listagem: máscara de nomes, arquivos/pastas, ocultos e subpastas. */
export function ListFiltersPanel({ value, onChange }: ListFiltersPanelProps) {
	return (
		<OptionPanel
			title="Filtros"
			active={JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTERS)}
			onReset={() => onChange(DEFAULT_FILTERS)}
		>
			<TextField
				label="Máscara"
				mono
				value={value.mask}
				placeholder="*.jpg; *.png"
				title="Curingas * e ?; várias máscaras separadas por ;"
				onChange={(mask) => onChange({ mask })}
			/>
			<div className="checks">
				<CheckField
					label="Arquivos"
					checked={value.files}
					onChange={(files) => onChange({ files })}
				/>
				<CheckField
					label="Pastas"
					checked={value.folders}
					onChange={(folders) => onChange({ folders })}
				/>
				<CheckField
					label="Ocultos"
					checked={value.hidden}
					onChange={(hidden) => onChange({ hidden })}
				/>
				<CheckField
					label="Subpastas"
					title="Lista também o conteúdo das subpastas (recursivo)."
					checked={value.subfolders}
					onChange={(subfolders) => onChange({ subfolders })}
				/>
			</div>
		</OptionPanel>
	);
}
