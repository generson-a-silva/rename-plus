import { pluralize } from "@lib";
import type { AppInfo } from "@shared/ipc";

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
	/** Nome, versão e autor do app (`null` enquanto não carregou). */
	appInfo: AppInfo | null;
}

/** Dica exibida ao passar o mouse sobre a versão. */
function versionTooltip({ productName, version, author }: AppInfo): string {
	const title = `${productName} ${version}`;
	return author ? `${title}\nDesenvolvido por ${author}` : title;
}

/**
 * Barra inferior: contagens da listagem/pré-visualização, a mensagem da última ação
 * e, sempre no canto direito, a versão do app.
 */
export function RenameStatusBar({
	total,
	selected,
	changed,
	errors,
	truncated,
	message,
	appInfo,
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
			{appInfo && (
				<span className="status-version" title={versionTooltip(appInfo)}>
					v{appInfo.version}
				</span>
			)}
		</footer>
	);
}
