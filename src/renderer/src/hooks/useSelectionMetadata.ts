import { isFreshRead, planMetadataReads, type ReadStamp } from "@lib";
import type { FileEntry, FileMetadata, MetadataResult } from "@shared/ipc";
import { useEffect, useMemo, useRef, useState } from "react";

/** Espera a seleção parar (arrasto, Shift+setas) antes de pedir a leitura. */
const START_DELAY_MS = 150;
/** Acima disso, o que não está mais selecionado sai da memória. */
const MAX_REMEMBERED = 20_000;

interface Remembered extends ReadStamp {
	metadata: FileMetadata | null;
}

/** Leitura em andamento: os caminhos pedidos e como cancelá-la. */
interface RunningRead {
	paths: ReadonlySet<string>;
	cancel: () => void;
}

let nextId = 1;

/**
 * Metadados dos itens selecionados, pelo caminho, para a pré-visualização. Pastas e tipos
 * sem metadados entram direto como `null`; os demais são lidos pelo processo principal em
 * lote, chegando aos poucos (a prévia vai se completando). A leitura é cancelada quando
 * nada selecionado precisa mais dela, e trocada quando aparecem itens que ela não cobre.
 * `undefined` quando `enabled` é falso: nada é lido.
 */
export function useSelectionMetadata(
	entries: readonly FileEntry[],
	enabled: boolean,
): ReadonlyMap<string, FileMetadata | null> | undefined {
	const remembered = useRef(new Map<string, Remembered>());
	const running = useRef<RunningRead | null>(null);
	// Muda a cada leitura recebida, para refazer o mapa devolvido.
	const [version, setVersion] = useState(0);

	useEffect(() => {
		if (!enabled) {
			running.current?.cancel();
			return;
		}
		const known = remembered.current;
		if (known.size > MAX_REMEMBERED) {
			const selected = new Set(entries.map((entry) => entry.path));
			for (const path of known.keys()) if (!selected.has(path)) known.delete(path);
		}
		const plan = planMetadataReads(entries, known, running.current?.paths ?? null);
		for (const entry of plan.withoutMetadata) {
			known.set(entry.path, { mtimeMs: entry.mtimeMs, size: entry.size, metadata: null });
		}
		if (plan.withoutMetadata.length > 0) setVersion((value) => value + 1);
		if (plan.action === "cancel") running.current?.cancel();
		if (plan.action !== "start") return;
		running.current?.cancel();

		const toRead = new Map(plan.toRead.map((entry) => [entry.path, entry]));
		const id = nextId++;
		let current = true;
		const store = (results: readonly MetadataResult[]) => {
			for (const [path, metadata] of results) {
				const entry = toRead.get(path);
				if (entry) known.set(path, { mtimeMs: entry.mtimeMs, size: entry.size, metadata });
			}
			setVersion((value) => value + 1);
		};
		const finish = () => {
			current = false;
			unsubscribe();
			if (running.current?.cancel === cancel) running.current = null;
		};
		const cancel = () => {
			if (!current) return;
			finish();
			window.clearTimeout(timer);
			window.api.cancelMetadata(id);
		};
		const unsubscribe = window.api.onMetadataProgress((progress) => {
			if (current && progress.id === id) store(progress.results);
		});
		const timer = window.setTimeout(async () => {
			let results: MetadataResult[] | null;
			try {
				results = await window.api.readMetadata(id, [...toRead.keys()]);
			} catch {
				// Falha inesperada no processo principal: os itens seguem sem metadados.
				results = [...toRead.keys()].map((path): MetadataResult => [path, null]);
			}
			if (current && results) store(results);
			if (current) finish();
		}, START_DELAY_MS);
		running.current = { paths: new Set(toRead.keys()), cancel };
	}, [entries, enabled]);

	// Ao desmontar, a leitura em andamento não serve para mais ninguém.
	useEffect(() => () => running.current?.cancel(), []);

	return useMemo(() => {
		if (!enabled) return undefined;
		void version;
		const result = new Map<string, FileMetadata | null>();
		for (const entry of entries) {
			const item = remembered.current.get(entry.path);
			if (item && isFreshRead(item, entry)) result.set(entry.path, item.metadata);
		}
		return result;
	}, [entries, enabled, version]);
}
