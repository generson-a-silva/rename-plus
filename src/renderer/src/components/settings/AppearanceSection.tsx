import { LanguageSelector, ThemeModeSelector } from "@components/common";
import { useI18n } from "@hooks";
import type { ThemeMode } from "@shared/ipc";
import { useId } from "react";
import { SettingsSection } from "./SettingsSection";

interface AppearanceSectionProps {
	theme: ThemeMode;
	onThemeChange: (mode: ThemeMode) => void;
}

/** Tema (sistema, claro ou escuro) e idioma da interface. */
export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
	const { t } = useI18n();
	const themeLabelId = useId();
	const languageLabelId = useId();
	return (
		<SettingsSection
			icon="sun"
			title={t("settings.appearance")}
			description={t("settings.appearanceHint")}
		>
			<div className="settings-row">
				<span className="settings-row-label" id={themeLabelId}>
					{t("theme.label")}
				</span>
				<ThemeModeSelector theme={theme} onChange={onThemeChange} labelledBy={themeLabelId} />
			</div>
			<div className="settings-row">
				<span className="settings-row-label" id={languageLabelId}>
					{t("language.label")}
				</span>
				<LanguageSelector labelledBy={languageLabelId} />
			</div>
		</SettingsSection>
	);
}
