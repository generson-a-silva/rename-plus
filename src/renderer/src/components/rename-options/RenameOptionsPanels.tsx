import { useMasonryGrid } from "@hooks";
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
}

/**
 * Área inferior: painéis numerados (na ordem em que o motor aplica cada seção) à
 * esquerda e, à direita, a coluna fixa com Renomear/Desfazer/Redefinir.
 */
export function RenameOptionsPanels({
	options,
	onChange,
	onReset,
	filters,
	onFiltersChange,
	actions,
}: RenameOptionsPanelsProps) {
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
			<div ref={panelsRef} className="panels">
				<RegexOptionsPanel {...sectionProps("regex")} />
				<NameOptionsPanel {...sectionProps("name")} />
				<ReplaceOptionsPanel {...sectionProps("replace")} />
				<CaseOptionsPanel {...sectionProps("case")} />
				<RemoveOptionsPanel {...sectionProps("remove")} />
				<AddOptionsPanel {...sectionProps("add")} />
				<AutoDateOptionsPanel {...sectionProps("autoDate")} />
				<AppendFolderOptionsPanel {...sectionProps("appendFolder")} />
				<NumberingOptionsPanel {...sectionProps("numbering")} />
				<ExtensionOptionsPanel {...sectionProps("extension")} />
				<ListFiltersPanel value={filters} onChange={onFiltersChange} />
			</div>
			<aside className="rename-actions" aria-label="Ações de renomeação">
				<RenameActionsPanel {...actions} />
			</aside>
		</div>
	);
}
