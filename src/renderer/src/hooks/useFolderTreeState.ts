import type { DirEntry } from "@shared/ipc";
import { useCallback, useEffect, useRef, useState } from "react";

export type ChildrenState = DirEntry[] | "loading";

/** Caminhos de cada ancestral de `target` abaixo de `root` (inclusive `root`, exclusive `target`). */
function ancestorsBetween(root: string, target: string): string[] {
	if (target === root) return [];
	const prefix = root === "/" ? "/" : `${root}/`;
	if (!target.startsWith(prefix)) return [];
	const parts = target.slice(prefix.length).split("/").filter(Boolean);
	const result = [root];
	let current = root;
	for (const part of parts.slice(0, -1)) {
		current = current === "/" ? `/${part}` : `${current}/${part}`;
		result.push(current);
	}
	return result;
}

/** Estado da árvore de pastas: subpastas carregadas sob demanda e nós expandidos. */
export function useFolderTreeState(showHidden: boolean) {
	const [children, setChildren] = useState<Map<string, ChildrenState>>(() => new Map());
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const childrenRef = useRef(children);
	childrenRef.current = children;

	const load = useCallback(
		async (path: string, force = false) => {
			const cached = childrenRef.current.get(path);
			if (!force && cached) return;
			setChildren((prev) => new Map(prev).set(path, cached && force ? cached : "loading"));
			const dirs = await window.api.listDirectories(path, showHidden);
			setChildren((prev) => new Map(prev).set(path, dirs));
		},
		[showHidden],
	);

	// Mudar a exibição de ocultas invalida o cache inteiro, recarregando o que estava aberto.
	const showHiddenRef = useRef(showHidden);
	useEffect(() => {
		if (showHiddenRef.current === showHidden) return;
		showHiddenRef.current = showHidden;
		const loaded = [...childrenRef.current.keys()];
		setChildren(new Map());
		for (const path of loaded) void load(path, true);
	}, [showHidden, load]);

	const expandedRef = useRef(expanded);
	expandedRef.current = expanded;

	const toggle = useCallback(
		(path: string) => {
			const next = new Set(expandedRef.current);
			if (next.has(path)) next.delete(path);
			else {
				next.add(path);
				void load(path);
			}
			setExpanded(next);
		},
		[load],
	);

	/** Expande todos os ancestrais de `target` dentro de `root`, carregando-os. */
	const reveal = useCallback(
		async (root: string, target: string) => {
			const ancestors = ancestorsBetween(root, target);
			if (ancestors.length === 0) return;
			setExpanded((prev) => new Set([...prev, ...ancestors]));
			await Promise.all(ancestors.map((path) => load(path)));
		},
		[load],
	);

	/** Recarrega as subpastas de `paths` que já tinham sido carregadas. */
	const refresh = useCallback(
		async (paths: Iterable<string>) => {
			const loaded = [...new Set(paths)].filter((path) => childrenRef.current.has(path));
			await Promise.all(loaded.map((path) => load(path, true)));
		},
		[load],
	);

	return { children, expanded, load, toggle, reveal, refresh };
}

export type FolderTreeState = ReturnType<typeof useFolderTreeState>;
