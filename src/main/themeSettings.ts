import fs from "node:fs";
import path from "node:path";
import { app, nativeTheme } from "electron";
import { THEME_MODES, type ThemeMode } from "../shared/ipc";

/** Cores de fundo da janela antes do React carregar (iguais a `--bg` no CSS). */
const BACKGROUND = { light: "#f4f5f7", dark: "#15171c" } as const;

const settingsFile = () => path.join(app.getPath("userData"), "theme.json");

function isThemeMode(value: unknown): value is ThemeMode {
	return THEME_MODES.includes(value as ThemeMode);
}

/** Aplica o tema salvo. Chamar antes de criar a janela. */
export function loadTheme(): void {
	try {
		const { mode } = JSON.parse(fs.readFileSync(settingsFile(), "utf8")) as { mode?: unknown };
		if (isThemeMode(mode)) nativeTheme.themeSource = mode;
	} catch {
		// Primeira execução ou arquivo inválido: segue o sistema.
	}
}

export function setTheme(mode: unknown): void {
	if (!isThemeMode(mode)) return;
	nativeTheme.themeSource = mode;
	try {
		fs.writeFileSync(settingsFile(), JSON.stringify({ mode }));
	} catch {
		// Falha ao persistir não impede a troca de tema na sessão atual.
	}
}

export function windowBackground(): string {
	return nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light;
}
