import { AppIcon } from "@components/common";
import { useI18n } from "@hooks";
import type { BackgroundInfo } from "@shared/ipc";
import { useEffect, useState } from "react";

/**
 * Pastas monitoradas com o app fechado: o app inicia com a sessão do usuário, sem
 * janela, e fica no ícone da bandeja enquanto houver pastas monitoradas.
 */
export function BackgroundModeCard() {
	const { t, tr } = useI18n();
	const [info, setInfo] = useState<BackgroundInfo | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let active = true;
		void window.api.getBackground().then((loaded) => {
			if (active) setInfo(loaded);
		});
		return () => {
			active = false;
		};
	}, []);

	if (!info?.supported) return null;

	const change = async (enabled: boolean) => {
		setBusy(true);
		try {
			setInfo(await window.api.setBackground(enabled));
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="background-card" aria-busy={busy}>
			<label className="background-toggle">
				<input
					type="checkbox"
					checked={info.enabled}
					disabled={busy}
					onChange={(event) => void change(event.target.checked)}
				/>
				<span>
					<strong>{t("background.toggle")}</strong>
					<span className="background-hint">{t("background.hint")}</span>
				</span>
			</label>
			{info.enabledByInstaller && <p className="background-note">{t("background.byInstaller")}</p>}
			{info.enabled && info.location && (
				<p className="integration-locations">
					<span>{t("background.location")}:</span>
					<code>{info.location}</code>
				</p>
			)}
			{info.warnings.map((warning) => (
				<p key={warning.key} className="integration-warning">
					<AppIcon name="alert" size={14} />
					<span>{tr(warning)}</span>
				</p>
			))}
			{info.error && (
				<p className="integration-notice error" role="alert">
					{info.error}
				</p>
			)}
		</div>
	);
}
