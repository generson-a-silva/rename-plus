import { pluralize } from "@lib";

export interface StatusMessage {
	kind: "info" | "success" | "error";
	text: string;
}

interface RenameStatusBarProps {
	total: number;
	selected: number;
	changed: number;
	errors: number;
	truncated: boolean;
	message: StatusMessage | null;
}

/** Barra inferior: contagens da listagem/pré-visualização e a mensagem da última ação. */
export function RenameStatusBar({
	total,
	selected,
	changed,
	errors,
	truncated,
	message,
}: RenameStatusBarProps) {
	return (
		<footer className="status-bar">
			<span>{pluralize(total, "item", "itens")}</span>
			<span>{pluralize(selected, "selecionado", "selecionados")}</span>
			<span className={changed ? "status-changed" : undefined}>
				{pluralize(changed, "será renomeado", "serão renomeados")}
			</span>
			{errors > 0 && (
				<span className="status-error">{pluralize(errors, "conflito", "conflitos")}</span>
			)}
			{truncated && <span className="status-error">Listagem limitada a 50.000 itens</span>}
			{message && (
				<span className={`status-message ${message.kind}`} role="status">
					{message.text}
				</span>
			)}
		</footer>
	);
}
