import { AppIcon } from "@components/common";
import { useI18n, useMasonryGrid } from "@hooks";
import type { ListFilters } from "@lib";
import { createDefaultOptions, type RenameOptions, type RenameSection } from "@shared/rename";
import { useMemo, useRef } from "react";
import { AddOptionsPanel } from "./AddOptionsPanel";
import { AppendFolderOptionsPanel } from "./AppendFolderOptionsPanel";
import { AutoDateOptionsPanel } from "./AutoDateOptionsPanel";
import { CaseOptionsPanel } from "./CaseOptionsPanel";
import { ExtensionOptionsPanel } from "./ExtensionOptionsPanel";
import { ListFiltersPanel } from "./ListFiltersPanel";
import { NameOptionsPanel } from "./NameOptionsPanel";
import { NumberingOptionsPanel } from "./NumberingOptionsPanel";
import { RegexOptionsPanel } from "./RegexOptionsPanel";
import { RemoveOptionsPanel } from "./RemoveOptionsPanel";
import { RenameActionsPanel, type RenameActionsPanelProps } from "./RenameActionsPanel";
import { ReplaceOptionsPanel } from "./ReplaceOptionsPanel";
import type { RenameSectionPanelProps } from "./renameSectionPanelShared";

interface RenameOptionsPanelsProps {
	options: RenameOptions;
	onChange: <K extends RenameSection>(section: K, patch: Partial<RenameOptions[K]>) => void;
	onReset: (section: RenameSection) => void;
	filters: ListFilters;
	onFiltersChange: (patch: Partial<ListFilters>) => void;
	actions: RenameActionsPanelProps;
	/** Salva as opções atuais como preset (pede o nome). */
	onSavePreset: () => void;
	/** Nomes de exemplo para o construtor visual de RegEx. */
	sampleNames: readonly string[];
}

/**
 * Área inferior: painéis numerados (na ordem em que o motor aplica cada seção) à
 * esquerda e, à direita, a coluna fixa com os filtros da listagem e
 * Renomear/Desfazer/Redefinir.
 */
export function RenameOptionsPanels({
	options,
	onChange,
	onReset,
	filters,
	onFiltersChange,
	actions,
	onSavePreset,
	sampleNames,
}: RenameOptionsPanelsProps) {
	const { t } = useI18n();
	const defaults = useMemo(createDefaultOptions, []);
	const panelsRef = useRef<HTMLDivElement>(null);
	// Encaixa os painéis sem vãos entre as linhas (valores iguais aos de .panels no CSS).
	useMasonryGrid(panelsRef, { rowUnit: 2, gap: 8 });

	const sectionProps = <K extends RenameSection>(section: K): RenameSectionPanelProps<K> => ({
		value: options[section],
		onChange: (patch) => onChange(section, patch),
		active: JSON.stringify(options[section]) !== JSON.stringify(defaults[section]),
		onReset: () => onReset(section),
	});

	return (
		<div className="rename-options">
			{/* Opções roláveis; as ações ficam numa coluna fixa à direita, sempre visíveis. */}
			<div className="panels-area">
				<div ref={panelsRef} className="panels">
					<RegexOptionsPanel {...sectionProps("regex")} sampleNames={sampleNames} />
					<NameOptionsPanel {...sectionProps("name")} />
					<ReplaceOptionsPanel {...sectionProps("replace")} />
					<CaseOptionsPanel {...sectionProps("case")} />
					<RemoveOptionsPanel {...sectionProps("remove")} />
					<AddOptionsPanel {...sectionProps("add")} />
					<AutoDateOptionsPanel {...sectionProps("autoDate")} />
					<AppendFolderOptionsPanel {...sectionProps("appendFolder")} />
					<NumberingOptionsPanel {...sectionProps("numbering")} />
					<ExtensionOptionsPanel {...sectionProps("extension")} />
				</div>
				{/* Fora da área rolável: fica sempre no canto superior direito, junto das ações. */}
				<button
					type="button"
					className="preset-save"
					title={t("presets.save")}
					aria-label={t("presets.save")}
					onClick={onSavePreset}
				>
					<AppIcon name="save" size={14} />
				</button>
			</div>
			<aside className="rename-actions" aria-label={t("actions.label")}>
				{/* Filtros mudam a listagem, não o nome: ficam junto das ações, sempre à vista. */}
				<ListFiltersPanel value={filters} onChange={onFiltersChange} />
				<RenameActionsPanel {...actions} />
			</aside>
		</div>
	);
}
