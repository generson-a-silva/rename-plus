export { mergeDefaults } from "@shared/settings";

const PREFIX = "rename-plus:";

/** Lê um valor salvo no localStorage. Falhas (modo privado, JSON corrompido) retornam `null`. */
export function loadStored<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw === null ? null : (JSON.parse(raw) as T);
	} catch {
		return null;
	}
}

export function saveStored(key: string, value: unknown): void {
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Armazenamento indisponível: preferências simplesmente não persistem.
	}
}
