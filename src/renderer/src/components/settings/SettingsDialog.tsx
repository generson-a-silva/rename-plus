import { AppIcon } from "@components/common";
import { type UpdateStatusState, useI18n } from "@hooks";
import type { ThemeMode } from "@shared/ipc";
import { useEffect, useId, useRef } from "react";
import { AppearanceSection } from "./AppearanceSection";
import { ContextMenuIntegrationSection } from "./ContextMenuIntegrationSection";
import { UpdatesSection } from "./UpdatesSection";

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
	theme: ThemeMode;
	onThemeChange: (mode: ThemeMode) => void;
	updates: UpdateStatusState;
}

/**
 * Janela modal de configurações, organizada em seções (aparência, atualizações, menu de
 * contexto do sistema).
 */
export function SettingsDialog({
	open,
	onClose,
	theme,
	onThemeChange,
	updates,
}: SettingsDialogProps) {
	const { t } = useI18n();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleId = useId();

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			className="settings-dialog"
			aria-labelledby={titleId}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			{open && (
				<div className="settings-content">
					<header className="settings-header">
						<h2 id={titleId}>{t("settings.title")}</h2>
						<button
							type="button"
							className="settings-close"
							aria-label={t("settings.close")}
							title={t("settings.close")}
							onClick={onClose}
						>
							<AppIcon name="close" />
						</button>
					</header>
					<div className="settings-body">
						<AppearanceSection theme={theme} onThemeChange={onThemeChange} />
						<UpdatesSection updates={updates} />
						<ContextMenuIntegrationSection />
					</div>
					<footer className="settings-footer">
						<button type="button" className="button" onClick={onClose}>
							{t("settings.close")}
						</button>
					</footer>
				</div>
			)}
		</dialog>
	);
}
