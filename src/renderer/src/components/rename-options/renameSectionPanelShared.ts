import type { Translator } from "@shared/i18n";
import type { Placement, RenameOptions, RenameSection } from "@shared/rename";

/** Props comuns aos painéis que editam uma seção de `RenameOptions`. */
export interface RenameSectionPanelProps<K extends RenameSection> {
	value: RenameOptions[K];
	onChange: (patch: Partial<RenameOptions[K]>) => void;
	/** A seção altera o nome (difere do padrão). */
	active: boolean;
	onReset: () => void;
}

/** Opções "Nenhum / Prefixo / Sufixo" usadas por Data automática e Nome da pasta. */
export function placementSelectOptions(t: Translator): readonly (readonly [Placement, string])[] {
	return [
		["none", t("option.none")],
		["prefix", t("option.prefix")],
		["suffix", t("option.suffix")],
	];
}
