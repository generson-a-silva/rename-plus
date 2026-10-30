import { readSettingsFile, writeSettingsFile } from "./settingsFile";

/** Preferência do painel de configurações: renomear sem a janela de confirmação. */
const FILE = "rename-confirmation.json";

export function getSkipRenameConfirmation(): boolean {
	const stored = readSettingsFile(FILE) as { skip?: unknown } | null;
	return stored?.skip === true;
}

export function setSkipRenameConfirmation(skip: unknown): boolean {
	const value = skip === true;
	writeSettingsFile(FILE, { skip: value });
	return value;
}
