import { CheckField, OptionPanel, TextField } from "@components/common";
import { useI18n } from "@hooks";
import { DEFAULT_FILTERS, type ListFilters } from "@lib";

interface ListFiltersPanelProps {
	value: ListFilters;
	onChange: (patch: Partial<ListFilters>) => void;
}

/** Filtros da listagem: máscara de nomes, arquivos/pastas, ocultos e subpastas. */
export function ListFiltersPanel({ value, onChange }: ListFiltersPanelProps) {
	const { t } = useI18n();
	return (
		<OptionPanel
			title={t("filters.title")}
			active={JSON.stringify(value) !== JSON.stringify(DEFAULT_FILTERS)}
			onReset={() => onChange(DEFAULT_FILTERS)}
		>
			<TextField
				label={t("filters.mask")}
				mono
				value={value.mask}
				placeholder="*.jpg; *.png"
				title={t("filters.maskHint")}
				onChange={(mask) => onChange({ mask })}
			/>
			<div className="checks">
				<CheckField
					label={t("filters.files")}
					checked={value.files}
					onChange={(files) => onChange({ files })}
				/>
				<CheckField
					label={t("filters.folders")}
					checked={value.folders}
					onChange={(folders) => onChange({ folders })}
				/>
				<CheckField
					label={t("filters.hidden")}
					checked={value.hidden}
					onChange={(hidden) => onChange({ hidden })}
				/>
				<CheckField
					label={t("filters.subfolders")}
					title={t("filters.subfoldersHint")}
					checked={value.subfolders}
					onChange={(subfolders) => onChange({ subfolders })}
				/>
			</div>
		</OptionPanel>
	);
}
