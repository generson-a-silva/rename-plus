import os from "node:os";
import type { EntryGroup, ListingEvent, ListOptions, MemoryReport } from "../shared/ipc";
import { walkEntries } from "./directoryWalker";

/** Ao passar deste número de itens, a listagem pausa e pergunta se deve carregar todos. */
export const MANY_ITEMS = 150_000;
/**
 * Memória estimada por item, somando o processo principal (durante a leitura) e a
 * interface (lista, ordenação, seleção e pré-visualização). Medido: ~380 bytes por
 * item só no objeto da lista; o restante é folga para o que a interface monta em cima.
 */
const BYTES_PER_ITEM = 1_200;
/** Com memória para menos itens que isto, a listagem termina em vez de pausar de novo. */
const MIN_CHUNK = 5_000;
/** Primeiro lote cedo, para a lista começar a aparecer; depois, lotes cada vez mais espaçados. */
const FIRST_FLUSH_MS = 80;
const MAX_FLUSH_MS = 640;
const MAX_PENDING_ITEMS = 20_000;

/**
 * Quantos itens ainda cabem na memória: metade da memória livre do computador e 60%
 * do espaço livre no JavaScript da interface (o que for menor).
 */
export function memoryBudget(
	report: MemoryReport | null,
	available: number = process.availableMemory?.() ?? os.freemem(),
): number {
	const system = available * 0.5;
	const renderer =
		report && report.heapLimit > 0
			? Math.max(0, report.heapLimit - report.heapUsed) * 0.6
			: Number.POSITIVE_INFINITY;
	return Math.floor(Math.min(system, renderer) / BYTES_PER_ITEM);
}

export interface ListingSummary {
	dir: string;
	count: number;
	ms: number;
	outcome: string;
}

type Resume = { continue: true; memory: MemoryReport | null } | { continue: false };

export interface ListingJobOptions {
	id: number;
	dir: string;
	options: ListOptions;
	memory: MemoryReport | null;
	send: (event: ListingEvent) => void;
	/** Para testes: memória livre do computador, em bytes. */
	availableMemory?: (() => number) | undefined;
	/** Para testes: limites menores que os do app. */
	limits?: { manyItems: number; minChunk: number } | undefined;
	/** Chamado ao terminar (modo de desenvolvimento: tempo da listagem). */
	onFinish?: ((summary: ListingSummary) => void) | undefined;
}

/**
 * Uma listagem em andamento: lê com `walkEntries`, envia os itens em lotes, pausa ao
 * chegar a `MANY_ITEMS` ou ao limite da memória e pode ser cancelada a qualquer momento.
 */
export class ListingJob {
	private readonly abort = new AbortController();
	private resume: ((value: Resume) => void) | null = null;
	private count = 0;

	constructor(private readonly job: ListingJobOptions) {}

	cancel(): void {
		this.abort.abort();
		this.resume?.({ continue: false });
	}

	continue(memory: MemoryReport | null): void {
		this.resume?.({ continue: true, memory });
	}

	private budget(memory: MemoryReport | null): number {
		return memoryBudget(memory, this.job.availableMemory?.());
	}

	async run(): Promise<void> {
		const { id, send } = this.job;
		const started = performance.now();
		let pending: EntryGroup[] = [];
		let pendingItems = 0;
		let lastFlush = started;
		let flushInterval = FIRST_FLUSH_MS;
		let askedMany = false;
		const { manyItems, minChunk } = this.job.limits ?? {
			manyItems: MANY_ITEMS,
			minChunk: MIN_CHUNK,
		};
		let limit = Math.min(manyItems, Math.max(minChunk, this.budget(this.job.memory)));

		const flush = () => {
			if (pending.length > 0) send({ id, type: "batch", groups: pending });
			pending = [];
			pendingItems = 0;
			lastFlush = performance.now();
			flushInterval = Math.min(flushInterval * 2, MAX_FLUSH_MS);
		};
		const finish = (outcome: string) =>
			this.job.onFinish?.({
				dir: this.job.dir,
				count: this.count,
				ms: Math.round(performance.now() - started),
				outcome,
			});

		try {
			for await (const group of walkEntries(this.job.dir, {
				...this.job.options,
				signal: this.abort.signal,
			})) {
				let items = group.items;
				while (items.length > 0) {
					const take = items.slice(0, limit - this.count);
					items = items.slice(take.length);
					pending.push({ dir: group.dir, items: take });
					pendingItems += take.length;
					this.count += take.length;
					if (pendingItems >= MAX_PENDING_ITEMS || performance.now() - lastFlush >= flushInterval)
						flush();

					if (this.count < limit) continue;
					// Chegou ao limite: entrega o que tem e espera a decisão da interface.
					flush();
					const reason = !askedMany && this.count >= manyItems ? "many" : "memory";
					if (reason === "many") askedMany = true;
					send({ id, type: "paused", reason, count: this.count });
					const decision = await new Promise<Resume>((resolve) => {
						this.resume = resolve;
					});
					this.resume = null;
					if (!decision.continue) throw this.abort.signal.reason ?? new Error("cancelado");
					const room = this.budget(decision.memory);
					if (room < minChunk) {
						// Sem memória para um lote razoável: termina com o que já foi carregado.
						send({ id, type: "done", count: this.count, memoryExhausted: true });
						finish("memória esgotada");
						return;
					}
					limit = this.count + room;
				}
			}
			flush();
			send({ id, type: "done", count: this.count, memoryExhausted: false });
			finish("concluída");
		} catch (error) {
			if (this.abort.signal.aborted) {
				send({ id, type: "cancelled", count: this.count });
				finish("cancelada");
				return;
			}
			send({ id, type: "error", message: (error as Error).message });
			finish("erro");
		}
	}
}

/** Listagens ativas de uma janela, pelo `id` do pedido. */
export class ListingJobs {
	private readonly jobs = new Map<number, ListingJob>();

	start(options: ListingJobOptions): void {
		const job = new ListingJob(options);
		this.jobs.set(options.id, job);
		void job.run().finally(() => {
			if (this.jobs.get(options.id) === job) this.jobs.delete(options.id);
		});
	}

	continue(id: number, memory: MemoryReport | null): void {
		this.jobs.get(id)?.continue(memory);
	}

	cancel(id: number): void {
		this.jobs.get(id)?.cancel();
	}

	cancelAll(): void {
		for (const job of this.jobs.values()) job.cancel();
	}
}
