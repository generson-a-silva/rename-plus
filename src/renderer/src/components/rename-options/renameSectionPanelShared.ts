import type { Placement, RenameOptions, RenameSection } from "@shared/rename";

/** Props comuns aos painéis que editam uma seção de `RenameOptions`. */
export interface RenameSectionPanelProps<K extends RenameSection> {
	value: RenameOptions[K];
	onChange: (patch: Partial<RenameOptions[K]>) => void;
	/** A seção altera o nome (difere do padrão). */
	active: boolean;
	onReset: () => void;
}

export const PLACEMENT_SELECT_OPTIONS: readonly (readonly [Placement, string])[] = [
	["none", "Nenhum"],
	["prefix", "Prefixo"],
	["suffix", "Sufixo"],
];
