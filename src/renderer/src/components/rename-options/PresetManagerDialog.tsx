import { AppIcon } from "@components/common";
import { useI18n } from "@hooks";
import type { RenamePreset } from "@lib";
import { useEffect, useId, useRef } from "react";

interface PresetManagerDialogProps {
	open: boolean;
	onClose: () => void;
	presets: readonly RenamePreset[];
	/** `id` do preset em uso na tela principal, destacado na lista. */
	activeId: string;
	/** Pede o novo nome e renomeia. */
	onRename: (preset: RenamePreset) => void;
	/** Confirma e exclui. */
	onDelete: (preset: RenamePreset) => void;
	/** Move na lista (-1 sobe, 1 desce). */
	onMove: (preset: RenamePreset, offset: number) => void;
}

/** Janela modal com a lista de presets: renomear, excluir e mudar a ordem. */
export function PresetManagerDialog({
	open,
	onClose,
	presets,
	activeId,
	onRename,
	onDelete,
	onMove,
}: PresetManagerDialogProps) {
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
			className="settings-dialog preset-dialog"
			aria-labelledby={titleId}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			{open && (
				<div className="settings-content">
					<header className="settings-header">
						<h2 id={titleId}>{t("presets.manageTitle")}</h2>
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
						{presets.length === 0 ? (
							<p className="preset-list-empty">{t("presets.manageEmpty")}</p>
						) : (
							<ul className="preset-list">
								{presets.map((preset, index) => (
									<li key={preset.id} className="preset-item">
										<span className="preset-item-name" title={preset.name}>
											{preset.name}
										</span>
										{preset.id === activeId && (
											<span className="integration-badge accent">{t("presets.inUse")}</span>
										)}
										<button
											type="button"
											className="button icon-only"
											disabled={index === 0}
											title={t("presets.moveUp")}
											aria-label={t("presets.moveUp")}
											onClick={() => onMove(preset, -1)}
										>
											<AppIcon name="up" size={14} />
										</button>
										<button
											type="button"
											className="button icon-only"
											disabled={index === presets.length - 1}
											title={t("presets.moveDown")}
											aria-label={t("presets.moveDown")}
											onClick={() => onMove(preset, 1)}
										>
											<AppIcon name="down" size={14} />
										</button>
										<button
											type="button"
											className="button icon-only"
											title={t("presets.rename")}
											aria-label={t("presets.rename")}
											onClick={() => onRename(preset)}
										>
											<AppIcon name="rename" size={14} />
										</button>
										<button
											type="button"
											className="button icon-only danger"
											title={t("presets.delete")}
											aria-label={t("presets.delete")}
											onClick={() => onDelete(preset)}
										>
											<AppIcon name="trash" size={14} />
										</button>
									</li>
								))}
							</ul>
						)}
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
