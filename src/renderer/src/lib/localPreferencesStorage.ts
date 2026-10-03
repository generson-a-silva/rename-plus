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

/**
 * Mescla um objeto salvo sobre os padrões, um nível de seções por vez, mantendo
 * apenas chaves conhecidas com o mesmo tipo. Protege contra dados de versões antigas.
 */
export function mergeDefaults<T extends object>(defaults: T, stored: unknown): T {
	if (!stored || typeof stored !== "object") return defaults;
	const result = { ...defaults } as Record<string, unknown>;
	for (const [key, value] of Object.entries(defaults)) {
		const saved = (stored as Record<string, unknown>)[key];
		if (saved === undefined || typeof saved !== typeof value) continue;
		result[key] =
			value && typeof value === "object" && !Array.isArray(value)
				? mergeDefaults(value as object, saved)
				: saved;
	}
	return result as T;
}
