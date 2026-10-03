import { AppIcon, OptionPanel } from "@components/common";

export interface RenameActionsPanelProps {
	canRename: boolean;
	canUndo: boolean;
	busy: boolean;
	summary: string;
	onRename: () => void;
	onUndo: () => void;
	onResetAll: () => void;
}

/** Botões Renomear/Desfazer/Redefinir e o resumo da pré-visualização (12). */
export function RenameActionsPanel({
	canRename,
	canUndo,
	busy,
	summary,
	onRename,
	onUndo,
	onResetAll,
}: RenameActionsPanelProps) {
	return (
		<OptionPanel number={12} title="Renomear" active={false} className="actions-panel">
			<p className="actions-summary">{summary}</p>
			<button
				type="button"
				className="button primary large"
				disabled={!canRename || busy}
				onClick={onRename}
			>
				<AppIcon name="rename" />
				Renomear
			</button>
			<div className="actions-row">
				<button type="button" className="button" disabled={!canUndo || busy} onClick={onUndo}>
					<AppIcon name="undo" />
					Desfazer
				</button>
				<button
					type="button"
					className="button"
					title="Redefinir todas as seções"
					onClick={onResetAll}
				>
					<AppIcon name="reset" />
					Redefinir
				</button>
			</div>
		</OptionPanel>
	);
}
