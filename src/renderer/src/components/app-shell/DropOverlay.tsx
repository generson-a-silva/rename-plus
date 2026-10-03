import { AppIcon } from "@components/common";
import { useI18n } from "@hooks";

/** Sobreposição exibida enquanto arquivos/pastas do sistema são arrastados sobre a janela. */
export function DropOverlay() {
	const { t } = useI18n();
	return (
		<div className="drop-overlay" aria-hidden="true">
			<div className="drop-overlay-card">
				<AppIcon name="open" size={36} />
				<strong>{t("drop.title")}</strong>
				<span>{t("drop.hint")}</span>
			</div>
		</div>
	);
}
