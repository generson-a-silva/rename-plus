import { AppIcon, type AppIconName } from "@components/common";
import { useI18n } from "@hooks";
import type { MessageKey } from "@shared/i18n";
import { THEME_MODES, type ThemeMode } from "@shared/ipc";
import { useId } from "react";
import { SettingsSection } from "./SettingsSection";

const THEME_OPTIONS: Record<ThemeMode, { icon: AppIconName; labelKey: MessageKey }> = {
	system: { icon: "monitor", labelKey: "theme.system" },
	light: { icon: "sun", labelKey: "theme.light" },
	dark: { icon: "moon", labelKey: "theme.dark" },
};

interface AppearanceSectionProps {
	theme: ThemeMode;
	onThemeChange: (mode: ThemeMode) => void;
}

/** Tema da interface: sistema, claro ou escuro (botões de opção lado a lado). */
export function AppearanceSection({ theme, onThemeChange }: AppearanceSectionProps) {
	const { t } = useI18n();
	const name = useId();
	return (
		<SettingsSection
			icon="sun"
			title={t("settings.appearance")}
			description={t("settings.appearanceHint")}
		>
			<div className="settings-row">
				<span className="settings-row-label" id={`${name}-label`}>
					{t("theme.label")}
				</span>
				<div className="segmented" role="radiogroup" aria-labelledby={`${name}-label`}>
					{THEME_MODES.map((mode) => (
						<label key={mode} className="segmented-option">
							<input
								type="radio"
								name={name}
								value={mode}
								checked={theme === mode}
								onChange={() => onThemeChange(mode)}
							/>
							<AppIcon name={THEME_OPTIONS[mode].icon} size={14} />
							{t(THEME_OPTIONS[mode].labelKey)}
						</label>
					))}
				</div>
			</div>
		</SettingsSection>
	);
}
