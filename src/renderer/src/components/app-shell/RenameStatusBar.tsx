import { AppIcon } from "@components/common";
import { type I18n, type ListingStatus, useI18n } from "@hooks";
import type { AppInfo, ReleaseInfo } from "@shared/ipc";

export interface StatusMessage {
	kind: "info" | "success" | "error";
	text: string;
}

interface RenameStatusBarProps {
	total: number;
	selected: number;
	changed: number;
	errors: number;
	/** Situação da listagem (carregando, pausada por muitos itens ou pela memória…). */
	listing: ListingStatus;
	onCancelListing: () => void;
	/** Continua a listagem pausada. */
	onLoadMore: () => void;
	/** Abre o convite para apoiar o projeto. */
	onSupport: () => void;
	message: StatusMessage | null;
	/** Nome, versão e autor do app (`null` enquanto não carregou). */
	appInfo: AppInfo | null;
	/** Nova versão disponível no GitHub, ou `null`. */
	update: ReleaseInfo | null;
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
	listing,
	onCancelListing,
	onLoadMore,
	onSupport,
	message,
	appInfo,
	update,
}: RenameStatusBarProps) {
	const { t } = useI18n();
	return (
		<footer className="status-bar">
			<span>{t("status.items", { count: total })}</span>
			<span className={selected ? "status-selected" : undefined}>
				{t("status.selected", { count: selected })}
			</span>
			<span className={changed ? "status-changed" : undefined}>
				{t("status.willRename", { count: changed })}
			</span>
			{errors > 0 && (
				<span className="status-error">{t("status.conflicts", { count: errors })}</span>
			)}
			{listing === "loading" && (
				<span className="status-listing" role="status">
					{t("status.loading")}
					<button type="button" className="status-link" onClick={onCancelListing}>
						{t("status.cancel")}
					</button>
				</span>
			)}
			{listing === "paused-many" && (
				<span className="status-listing">
					<button
						type="button"
						className="status-link strong"
						title={t("status.tooManyHint")}
						onClick={onLoadMore}
					>
						{t("status.tooMany")}
					</button>
					<button type="button" className="status-link subtle" onClick={onSupport}>
						{t("status.support")}
					</button>
				</span>
			)}
			{listing === "paused-memory" && (
				<button
					type="button"
					className="status-link strong"
					title={t("status.memoryPausedHint")}
					onClick={onLoadMore}
				>
					{t("status.memoryPaused")}
				</button>
			)}
			{listing === "memory-exhausted" && (
				<span className="status-error">{t("status.memoryExhausted")}</span>
			)}
			{listing === "cancelled" && <span className="status-muted">{t("status.cancelled")}</span>}
			{message && (
				<span className={`status-message ${message.kind}`} role="status">
					{message.text}
				</span>
			)}
			{update && (
				<a
					className="status-update"
					href={update.url}
					target="_blank"
					rel="noreferrer"
					title={t("updates.statusBarHint")}
				>
					<AppIcon name="download" size={13} />
					{t("updates.statusBar", { version: update.version })}
				</a>
			)}
			{appInfo && (
				<span className="status-version" title={versionTooltip(appInfo, t)}>
					v{appInfo.version}
				</span>
			)}
		</footer>
	);
}
