import { THEME_MODES, type ThemeMode } from "@shared/ipc";
import { useLayoutEffect } from "react";
import { usePersistentState } from "./usePersistentState";

/**
 * Tema da interface. `data-theme` no <html> troca as cores na hora; o processo
 * principal ajusta `nativeTheme`, para que diálogos e controles nativos acompanhem.
 */
export function useThemeMode() {
	const [stored, setMode] = usePersistentState<ThemeMode>("theme", "system");
	const mode = THEME_MODES.includes(stored) ? stored : "system";

	useLayoutEffect(() => {
		const root = document.documentElement;
		if (mode === "system") delete root.dataset.theme;
		else root.dataset.theme = mode;
		void window.api.setTheme(mode);
	}, [mode]);

	return { mode, setMode };
}
