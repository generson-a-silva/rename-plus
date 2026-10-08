import { ThemeModeSelector } from "@components/common";
import { useI18n } from "@hooks";
import type { ThemeMode } from "@shared/ipc";
import { useId } from "react";
import { SettingsSection } from "./SettingsSection";

interface AppearanceSectionProps {
	theme: ThemeMode;
	onThemeChange: (mode: ThemeMode) => void;
}

/** Tema da interface: sistema, claro ou escuro. */
export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
	const { t } = useI18n();
	const labelId = useId();
	return (
		<SettingsSection
			icon="sun"
			title={t("settings.appearance")}
			description={t("settings.appearanceHint")}
		>
			<div className="settings-row">
				<span className="settings-row-label" id={labelId}>
					{t("theme.label")}
				</span>
				<ThemeModeSelector theme={theme} onChange={onThemeChange} labelledBy={labelId} />
			</div>
		</SettingsSection>
	);
}
