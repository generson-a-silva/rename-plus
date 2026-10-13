import { AppIcon, PresetSelect } from "@components/common";
import { useI18n } from "@hooks";
import type { RenamePreset } from "@lib";

export interface RenameActionsPanelProps {
	canRename: boolean;
	canUndo: boolean;
	busy: boolean;
	summary: string;
	onRename: () => void;
	onUndo: () => void;
	onResetAll: () => void;
	presets: readonly RenamePreset[];
	/** Preset em uso (escolhido na lista ou recém-salvo), se houver. */
	activePreset: RenamePreset | null;
	/** As regras de agora diferem das guardadas no preset em uso. */
	presetModified: boolean;
	onApplyPreset: (preset: RenamePreset) => void;
	/** Sai do preset e volta às regras de antes de escolher um. */
	onSelectNoPreset: () => void;
	/** Guarda as regras de agora no preset em uso. */
	onUpdatePreset: () => void;
	/** Salva as opções atuais como preset (pede o nome). */
	onSavePreset: () => void;
	/** Abre a lista para renomear, excluir e reordenar os presets. */
	onManagePresets: () => void;
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
	activePreset,
	presetModified,
	onApplyPreset,
	onSelectNoPreset,
	onUpdatePreset,
	onSavePreset,
	onManagePresets,
}: RenameActionsPanelProps) {
	const { t } = useI18n();
	const updateLabel = activePreset
		? t(presetModified ? "presets.update" : "presets.updateUnchanged", { name: activePreset.name })
		: t("presets.updateHint");
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
			{/* Rodapé: presets (lista, atualizar, salvar, editar) à esquerda e idioma no canto inferior direito. */}
			<div className="actions-footer">
				<div className="preset-row">
					<PresetSelect
						presets={presets}
						selectedId={activePreset?.id ?? ""}
						onSelect={onApplyPreset}
						onSelectNone={onSelectNoPreset}
					/>
					<button
						type="button"
						className="button icon-only preset-update"
						disabled={!activePreset || !presetModified}
						title={updateLabel}
						aria-label={updateLabel}
						onClick={onUpdatePreset}
					>
						<AppIcon name="refresh" size={14} />
					</button>
					<button
						type="button"
						className="button icon-only preset-save"
						title={t("presets.save")}
						aria-label={t("presets.save")}
						onClick={onSavePreset}
					>
						<AppIcon name="save" size={14} />
					</button>
					<button
						type="button"
						className="button icon-only preset-manage"
						disabled={presets.length === 0}
						title={t("presets.manage")}
						aria-label={t("presets.manage")}
						onClick={onManagePresets}
					>
						<AppIcon name="edit" size={14} />
					</button>
				</div>
			</div>
		</section>
	);
}
