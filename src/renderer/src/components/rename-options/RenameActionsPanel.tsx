import { AppIcon, LanguageMenuButton } from "@components/common";
import { useI18n } from "@hooks";

export interface RenameActionsPanelProps {
	canRename: boolean;
	canUndo: boolean;
	busy: boolean;
	summary: string;
	onRename: () => void;
	onUndo: () => void;
	onResetAll: () => void;
}

/**
 * Botões Renomear/Desfazer/Redefinir e o resumo da pré-visualização. Fica fora da
 * sequência numerada de painéis, pois não é uma etapa da renomeação.
 */
export function RenameActionsPanel({
	canRename,
	canUndo,
	busy,
	summary,
	onRename,
	onUndo,
	onResetAll,
}: RenameActionsPanelProps) {
	const { t } = useI18n();
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
			{/* Rodapé: seletor de idioma no canto inferior direito. */}
			<div className="actions-footer">
				<LanguageMenuButton />
			</div>
		</section>
	);
}
