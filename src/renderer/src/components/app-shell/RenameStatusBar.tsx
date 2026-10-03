import { type I18n, useI18n } from "@hooks";
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
function versionTooltip({ productName, version, author }: AppInfo, t: I18n["t"]): string {
	const title = `${productName} ${version}`;
	return author ? `${title}\n${t("status.developedBy", { author })}` : title;
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
	const { t } = useI18n();
	return (
		<footer className="status-bar">
			<span>{t("status.items", { count: total })}</span>
			<span>{t("status.selected", { count: selected })}</span>
			<span className={changed ? "status-changed" : undefined}>
				{t("status.willRename", { count: changed })}
			</span>
			{errors > 0 && (
				<span className="status-error">{t("status.conflicts", { count: errors })}</span>
			)}
			{truncated && (
				<span className="status-error">{t("status.truncated", { count: 50_000 })}</span>
			)}
			{message && (
				<span className={`status-message ${message.kind}`} role="status">
					{message.text}
				</span>
			)}
			{appInfo && (
				<span className="status-version" title={versionTooltip(appInfo, t)}>
					v{appInfo.version}
				</span>
			)}
		</footer>
	);
}
