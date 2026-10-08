import { useI18n } from "@hooks";
import type { MessageKey } from "@shared/i18n";
import { THEME_MODES, type ThemeMode } from "@shared/ipc";
import { useId } from "react";
import { AppIcon, type AppIconName } from "./AppIcon";

const THEME_OPTIONS: Record<ThemeMode, { icon: AppIconName; labelKey: MessageKey }> = {
	system: { icon: "monitor", labelKey: "theme.system" },
	light: { icon: "sun", labelKey: "theme.light" },
	dark: { icon: "moon", labelKey: "theme.dark" },
};

interface ThemeModeSelectorProps {
	theme: ThemeMode;
	onChange: (mode: ThemeMode) => void;
	/** `id` do rótulo visível do grupo. */
	labelledBy: string;
}

/** Tema da interface: sistema, claro ou escuro (botões de opção lado a lado). */
export function ThemeModeSelector({ theme, onChange, labelledBy }: ThemeModeSelectorProps) {
	const { t } = useI18n();
	const name = useId();
	return (
		<div className="segmented" role="radiogroup" aria-labelledby={labelledBy}>
			{THEME_MODES.map((mode) => (
				<label key={mode} className="segmented-option">
					<input
						type="radio"
						name={name}
						value={mode}
						checked={theme === mode}
						onChange={() => onChange(mode)}
					/>
					<AppIcon name={THEME_OPTIONS[mode].icon} size={14} />
					{t(THEME_OPTIONS[mode].labelKey)}
				</label>
			))}
		</div>
	);
}
