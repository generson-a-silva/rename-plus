import { joinPath } from "@lib";
import type { EntryGroup, FileEntry, ListingEvent, ListOptions, MemoryReport } from "@shared/ipc";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Situação da listagem:
 * - `loading`: lendo (os itens vão aparecendo);
 * - `paused-many`: parou ao passar de muitos itens e pergunta se carrega todos;
 * - `paused-memory`: parou no que a memória livre permite; dá para tentar carregar mais;
 * - `memory-exhausted`: terminou sem carregar tudo, por falta de memória;
 * - `cancelled`: interrompida pelo usuário (fica o que já tinha chegado).
 */
export type ListingStatus =
	| "idle"
	| "loading"
	| "paused-many"
	| "paused-memory"
	| "done"
	| "memory-exhausted"
	| "cancelled"
	| "error";

export interface DirectoryListing {
	entries: FileEntry[];
	status: ListingStatus;
	/** Mensagem do erro, quando `status` é `error`. */
	error: string | null;
}

export const EMPTY_LISTING: DirectoryListing = { entries: [], status: "idle", error: null };

interface ActiveJob {
	id: number;
	entries: FileEntry[];
	/** Já chegou algum item: até lá, a lista anterior continua na tela (sem piscar). */
	received: boolean;
	finished: boolean;
	/** Recebe os itens ao assentar, ou `null` se a listagem foi substituída por outra. */
	resolve: ((entries: FileEntry[] | null) => void) | null;
}

/** Memória do JavaScript desta janela, para o processo principal medir o que ainda cabe. */
function memoryReport(): MemoryReport | null {
	try {
		return window.api.getMemoryReport();
	} catch {
		return null;
	}
}

function toEntries(groups: readonly EntryGroup[]): FileEntry[] {
	const entries: FileEntry[] = [];
	for (const { dir, items } of groups) {
		for (const [name, isDir, hidden, size, mtimeMs, birthtimeMs] of items) {
			entries.push({
				path: joinPath(dir, name),
				dir,
				name,
				isDir: isDir === 1,
				hidden: hidden === 1,
				size,
				mtimeMs,
				birthtimeMs,
			});
		}
	}
	return entries;
}

const SETTLED: Partial<Record<ListingEvent["type"], ListingStatus>> = {
	cancelled: "cancelled",
	error: "error",
};

/**
 * Listagem progressiva de uma pasta: os itens chegam em lotes do processo principal.
 * Só uma listagem fica ativa; começar outra cancela a anterior. `load` resolve quando a
 * listagem termina, pausa ou é cancelada, com os itens recebidos até ali, ou com `null`
 * se outra listagem tomou o lugar dela antes disso.
 */
export function useDirectoryListing(options: ListOptions) {
	const [listing, setListing] = useState<DirectoryListing>(EMPTY_LISTING);
	const active = useRef<ActiveJob | null>(null);
	const nextId = useRef(0);

	useEffect(
		() =>
			window.api.onListingEvent((event) => {
				const job = active.current;
				if (!job || event.id !== job.id) return;
				if (event.type === "batch") {
					const added = toEntries(event.groups);
					job.entries = job.received ? job.entries.concat(added) : added;
					job.received = true;
					setListing({ entries: job.entries, status: "loading", error: null });
					return;
				}
				// Pausa, fim, cancelamento ou erro: a lista passa a ser só o que chegou.
				if (!job.received) job.entries = [];
				job.received = true;
				let status: ListingStatus = SETTLED[event.type] ?? "done";
				if (event.type === "paused")
					status = event.reason === "many" ? "paused-many" : "paused-memory";
				if (event.type === "done" && event.memoryExhausted) status = "memory-exhausted";
				if (event.type !== "paused") job.finished = true;
				setListing({
					entries: job.entries,
					status,
					error: event.type === "error" ? event.message : null,
				});
				job.resolve?.(job.entries);
				job.resolve = null;
			}),
		[],
	);

	/** Cancela a listagem ativa e libera quem esperava por ela. */
	const supersede = useCallback(() => {
		const previous = active.current;
		if (!previous) return;
		if (!previous.finished) window.api.cancelListing(previous.id);
		previous.resolve?.(null);
		previous.resolve = null;
		active.current = null;
	}, []);

	// Ao sair (fechar a janela, recarregar), não deixa leitura rodando à toa.
	useEffect(() => supersede, [supersede]);

	const load = useCallback(
		(dir: string): Promise<FileEntry[] | null> => {
			supersede();
			const job: ActiveJob = {
				id: ++nextId.current,
				entries: [],
				received: false,
				finished: false,
				resolve: null,
			};
			active.current = job;
			setListing((prev) => ({ ...prev, status: "loading", error: null }));
			const done = new Promise<FileEntry[] | null>((resolve) => {
				job.resolve = resolve;
			});
			window.api.startListing(job.id, dir, options, memoryReport());
			return done;
		},
		[options, supersede],
	);

	/** Interrompe a leitura; os itens que já chegaram continuam na lista. */
	const cancel = useCallback(() => {
		const job = active.current;
		if (job && !job.finished) window.api.cancelListing(job.id);
	}, []);

	/** Continua uma listagem pausada (muitos itens ou limite de memória). */
	const loadMore = useCallback(() => {
		const job = active.current;
		if (!job || job.finished) return;
		setListing((prev) => ({ ...prev, status: "loading" }));
		window.api.continueListing(job.id, memoryReport());
	}, []);

	/** Esvazia a lista (ao trocar de pasta), cancelando a leitura em andamento. */
	const clear = useCallback(() => {
		supersede();
		setListing(EMPTY_LISTING);
	}, [supersede]);

	return { listing, load, cancel, loadMore, clear };
}
