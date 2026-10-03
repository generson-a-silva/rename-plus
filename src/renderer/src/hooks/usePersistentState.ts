import { loadStored, mergeDefaults, saveStored } from "@lib";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

/** `useState` que persiste no localStorage, mesclando com os padrões ao carregar. */
export function usePersistentState<T>(key: string, defaults: T): [T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		const stored = loadStored<unknown>(key);
		if (stored === null) return defaults;
		if (defaults && typeof defaults === "object") return mergeDefaults(defaults, stored);
		return typeof stored === typeof defaults ? (stored as T) : defaults;
	});

	useEffect(() => {
		const timer = window.setTimeout(() => saveStored(key, value), 300);
		return () => window.clearTimeout(timer);
	}, [key, value]);

	return [value, setValue];
}
