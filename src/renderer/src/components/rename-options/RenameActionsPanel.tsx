import { AppIcon, LanguageMenuButton, PresetSelect } from "@components/common";
import { useI18n } from "@hooks";
import { findMatchingPreset, type RenamePreset } from "@lib";
import type { RenameOptions } from "@shared/rename";

export interface RenameActionsPanelProps {
	canRename: boolean;
	canUndo: boolean;
	busy: boolean;
	summary: string;
	onRename: () => void;
	onUndo: () => void;
	onResetAll: () => void;
	presets: readonly RenamePreset[];
	/** Opções aplicadas agora (o preset igual a elas aparece selecionado). */
	options: RenameOptions;
	onApplyPreset: (preset: RenamePreset) => void;
	onDeletePreset: (preset: RenamePreset) => void;
}

/**
 * Presets, botões Renomear/Desfazer/Redefinir e o resumo da pré-visualização. Fica fora
 * da sequência numerada de painéis, pois não é uma etapa da renomeação.
 */
export function RenameActionsPanel({
	canRename,
	canUndo,
	busy,
	summary,
	onRename,
	onUndo,
	onResetAll,
	presets,
	options,
	onApplyPreset,
	onDeletePreset,
}: RenameActionsPanelProps) {
	const { t } = useI18n();
	const currentPreset = findMatchingPreset(presets, options);
	return (
		<section className="actions-card" aria-label={t("actions.label")}>
			<p className="actions-summary">{summary}</p>
			<button
				type="button"
				className="button primary large"
				disabled={!canRename || busy}
				onClick={onRename}
			>
				<AppIcon name="rename" />
				{t("actions.rename")}
			</button>
			<div className="actions-row">
				<button type="button" className="button" disabled={!canUndo || busy} onClick={onUndo}>
					<AppIcon name="undo" />
					{t("actions.undo")}
				</button>
				<button
					type="button"
					className="button"
					title={t("actions.resetHint")}
					onClick={onResetAll}
				>
					<AppIcon name="reset" />
					{t("actions.reset")}
				</button>
			</div>
			{/* Rodapé: presets à esquerda e seletor de idioma no canto inferior direito. */}
			<div className="actions-footer">
				<div className="preset-row">
					<PresetSelect presets={presets} options={options} onSelect={onApplyPreset} />
					<button
						type="button"
						className="button icon-only danger"
						disabled={!currentPreset}
						title={t("presets.delete")}
						aria-label={t("presets.delete")}
						onClick={() => currentPreset && onDeletePreset(currentPreset)}
					>
						<AppIcon name="trash" size={14} />
					</button>
				</div>
				<LanguageMenuButton />
			</div>
		</section>
	);
}
