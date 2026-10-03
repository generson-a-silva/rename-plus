import { AppIcon } from "@components/common";
import { useI18n } from "@hooks";
import type { MessageKey } from "@shared/i18n";
import type { ContextMenuStatus, ContextMenuTarget, ShellIntegrationInfo } from "@shared/ipc";
import { useEffect, useState } from "react";
import { SettingsSection, SettingsSubsection } from "./SettingsSection";

const STATUS_KEYS: Record<ContextMenuStatus, MessageKey> = {
	installed: "integration.statusInstalled",
	outdated: "integration.statusOutdated",
	absent: "integration.statusAbsent",
};

interface Notice {
	kind: "success" | "error";
	text: string;
}

interface TargetRowProps {
	target: ContextMenuTarget;
	busy: boolean;
	disabled: boolean;
	/**
	 * Lista principal: indica "Não encontrado" e destaca o botão Adicionar. Na subseção
	 * dos não encontrados, os dois seriam redundantes.
	 */
	showDetection: boolean;
	onChange: (target: ContextMenuTarget, enabled: boolean) => void;
}

/** Um gerenciador de arquivos: situação das entradas e botões para adicionar/remover. */
function IntegrationTargetRow({ target, busy, disabled, showDetection, onChange }: TargetRowProps) {
	const { t, tr } = useI18n();
	// Windows: só as entradas do instalador (todos os usuários), que o app não altera.
	const onlyBySystem = target.installedBySystem && target.status === "absent";
	const statusClass = onlyBySystem ? "installed" : target.status;
	return (
		<li className="integration-target" aria-busy={busy}>
			<div className="integration-target-info">
				<div className="integration-target-name">
					<strong>{target.name}</strong>
					{target.recommended && (
						<span className="integration-badge accent">{t("integration.recommended")}</span>
					)}
					{showDetection && !target.detected && (
						<span className="integration-badge">{t("integration.notDetected")}</span>
					)}
				</div>
				<div className="integration-target-meta">
					<span>{target.desktops}</span>
					<span className={`integration-status ${statusClass}`}>
						{onlyBySystem ? t("integration.statusSystem") : t(STATUS_KEYS[target.status])}
					</span>
				</div>
				{target.note && <p className="integration-note">{tr(target.note)}</p>}
				{target.installedBySystem && (
					<p className="integration-note">{t("integration.systemHint")}</p>
				)}
				{target.status !== "absent" && (
					<p className="integration-locations">
						<span>{t("integration.locations")}:</span>
						{target.locations.map((location) => (
							<code key={location}>{location}</code>
						))}
					</p>
				)}
			</div>
			<div className="integration-target-actions">
				{target.status === "outdated" && (
					<button
						type="button"
						className="button"
						disabled={disabled}
						onClick={() => onChange(target, true)}
					>
						{t("integration.update")}
					</button>
				)}
				{target.status === "absent" ? (
					!onlyBySystem && (
						<button
							type="button"
							className={showDetection ? "button primary" : "button"}
							disabled={disabled}
							onClick={() => onChange(target, true)}
						>
							{t("integration.add")}
						</button>
					)
				) : (
					<button
						type="button"
						className="button"
						disabled={disabled}
						onClick={() => onChange(target, false)}
					>
						{t("integration.remove")}
					</button>
				)}
			</div>
		</li>
	);
}

/**
 * Entradas "Abrir no Rename Plus" e "Abrir selecionados no Rename Plus" no menu de
 * contexto dos gerenciadores de arquivos (Linux: conforme o ambiente; Windows: Explorador).
 */
export function ContextMenuIntegrationSection() {
	const { t, tr, locale } = useI18n();
	const [info, setInfo] = useState<ShellIntegrationInfo | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [notice, setNotice] = useState<Notice | null>(null);

	// Recarrega ao trocar de idioma: os nomes das entradas acompanham a interface.
	useEffect(() => {
		let active = true;
		void (async () => {
			const loaded = await window.api.getShellIntegration();
			if (active && locale) setInfo(loaded);
		})();
		return () => {
			active = false;
		};
	}, [locale]);

	const change = async (target: ContextMenuTarget, enabled: boolean) => {
		setBusyId(target.id);
		setNotice(null);
		try {
			const update = await window.api.setShellIntegration(target.id, enabled);
			setInfo(update.info);
			setNotice(
				update.error
					? { kind: "error", text: update.error }
					: {
							kind: "success",
							text: t(enabled ? "integration.added" : "integration.removed", { name: target.name }),
						},
			);
		} finally {
			setBusyId(null);
		}
	};

	// Na lista principal: o padrão do sistema, os instalados e os que já têm entradas.
	const main =
		info?.targets.filter((item) => item.recommended || item.detected || item.status !== "absent") ??
		[];
	const others = info?.targets.filter((item) => !main.includes(item)) ?? [];
	const renderRows = (targets: ContextMenuTarget[], showDetection: boolean) => (
		<ul className="integration-targets">
			{targets.map((target) => (
				<IntegrationTargetRow
					key={target.id}
					target={target}
					busy={busyId === target.id}
					disabled={busyId !== null}
					showDetection={showDetection}
					onChange={change}
				/>
			))}
		</ul>
	);

	return (
		<SettingsSection
			icon="menu"
			title={t("integration.title")}
			description={
				<>
					<p>{t("integration.description")}</p>
					<ul className="integration-entries">
						<li>
							<strong>{t("shellMenu.open")}</strong>: {t("integration.openItem")}
						</li>
						<li>
							<strong>{t("shellMenu.select")}</strong>: {t("integration.selectItem")}
						</li>
					</ul>
				</>
			}
		>
			{info === null ? (
				<p className="integration-loading">{t("integration.loading")}</p>
			) : (
				<>
					{info.warnings.map((warning) => (
						<p key={warning.key} className="integration-warning">
							<AppIcon name="alert" size={14} />
							<span>{tr(warning)}</span>
						</p>
					))}
					{main.length > 0 && renderRows(main, true)}
					{notice && (
						<p className={`integration-notice ${notice.kind}`} role="status">
							{notice.text}
						</p>
					)}
					{others.length > 0 && (
						<SettingsSubsection
							title={t("integration.othersTitle")}
							count={others.length}
							description={t("integration.othersHint")}
						>
							{renderRows(others, false)}
						</SettingsSubsection>
					)}
				</>
			)}
		</SettingsSection>
	);
}
