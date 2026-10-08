import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ListingEvent } from "../shared/ipc";
import { ListingJob, memoryBudget } from "./listingJobs";

let root: string;

beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-jobs-"));
	for (let i = 0; i < 30; i++) fs.writeFileSync(path.join(root, `f${i}.txt`), "");
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const OPTIONS = { recursive: false, showHidden: false, includeFiles: true, includeFolders: true };
const GIB = 1024 ** 3;
/** Memória livre que dá espaço para `items` itens (metade da memória, 1.200 bytes por item). */
const roomFor = (items: number) => items * 1200 * 2;

/** Listagem da pasta de teste (30 arquivos) com limites pequenos: "muitos itens" = 10. */
function job(memory: number[]) {
	const events: ListingEvent[] = [];
	let call = 0;
	const listing = new ListingJob({
		id: 7,
		dir: root,
		options: OPTIONS,
		memory: null,
		send: (event) => events.push(event),
		availableMemory: () => memory[Math.min(call++, memory.length - 1)] ?? 0,
		limits: { manyItems: 10, minChunk: 5 },
	});
	const count = () =>
		events
			.flatMap((event) => (event.type === "batch" ? event.groups : []))
			.reduce((total, group) => total + group.items.length, 0);
	return { listing, events, count };
}

const waitForPause = async (events: ListingEvent[], pauses = 1) => {
	for (let i = 0; i < 400; i++) {
		if (events.filter((event) => event.type === "paused").length >= pauses) return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("a listagem não pausou");
};

describe("memoryBudget", () => {
	it("usa metade da memória livre do computador", () => {
		expect(memoryBudget(null, 2 * GIB)).toBe(Math.floor(GIB / 1200));
	});

	it("fica com o menor entre computador e interface", () => {
		const report = { heapLimit: 1 * GIB, heapUsed: 0.5 * GIB };
		expect(memoryBudget(report, 64 * GIB)).toBe(Math.floor((0.5 * GIB * 0.6) / 1200));
	});
});

describe("ListingJob", () => {
	it("pausa em “muitos itens” e, ao continuar, carrega tudo", async () => {
		const { listing, events, count } = job([16 * GIB]);
		const running = listing.run();
		await waitForPause(events);
		expect(events.find((event) => event.type === "paused")).toEqual({
			id: 7,
			type: "paused",
			reason: "many",
			count: 10,
		});
		expect(count()).toBe(10);
		listing.continue(null);
		await running;
		expect(count()).toBe(30);
		expect(events.at(-1)).toEqual({ id: 7, type: "done", count: 30, memoryExhausted: false });
	});

	it("depois de “muitos itens”, carrega conforme a memória e pausa de novo", async () => {
		// Início: memória de sobra; ao continuar, cabem só mais 8 itens; depois, mais 100.
		const { listing, events, count } = job([16 * GIB, roomFor(8), roomFor(100)]);
		const running = listing.run();
		await waitForPause(events);
		listing.continue(null);
		await waitForPause(events, 2);
		expect(events.filter((event) => event.type === "paused").at(-1)).toMatchObject({
			reason: "memory",
			count: 18,
		});
		listing.continue(null);
		await running;
		expect(count()).toBe(30);
	});

	it("termina avisando quando não há memória para continuar", async () => {
		const { listing, events, count } = job([16 * GIB, roomFor(2)]);
		const running = listing.run();
		await waitForPause(events);
		listing.continue(null);
		await running;
		expect(count()).toBe(10);
		expect(events.at(-1)).toEqual({ id: 7, type: "done", count: 10, memoryExhausted: true });
	});

	it("pode ser cancelada enquanto está pausada", async () => {
		const { listing, events } = job([16 * GIB]);
		const running = listing.run();
		await waitForPause(events);
		listing.cancel();
		await running;
		expect(events.at(-1)).toEqual({ id: 7, type: "cancelled", count: 10 });
	});
});
