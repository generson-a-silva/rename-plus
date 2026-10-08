import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EntryGroup, ListOptions } from "../shared/ipc";
import { walkEntries } from "./directoryWalker";

const OPTIONS: ListOptions = {
	recursive: false,
	showHidden: false,
	includeFiles: true,
	includeFolders: true,
};

let root: string;

/** Estrutura: a.txt, b.txt, .oculto, Sub/{c.txt, Fundo/d.txt}, .pasta/e.txt, link → Sub. */
beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-walker-"));
	const write = (rel: string) => {
		fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
		fs.writeFileSync(path.join(root, rel), rel);
	};
	for (const rel of ["a.txt", "b.txt", ".oculto", "Sub/c.txt", "Sub/Fundo/d.txt", ".pasta/e.txt"])
		write(rel);
	fs.symlinkSync(path.join(root, "Sub"), path.join(root, "link"));
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

async function collect(options: Partial<ListOptions> & { signal?: AbortSignal } = {}) {
	const groups: EntryGroup[] = [];
	for await (const group of walkEntries(root, { ...OPTIONS, ...options, platform: "linux" }))
		groups.push(group);
	return groups;
}

const names = (groups: EntryGroup[]) =>
	groups.flatMap((group) =>
		group.items.map((item) => path.relative(root, path.join(group.dir, item[0]))),
	);

describe("walkEntries", () => {
	it("lista só a pasta, sem ocultos, com pastas e arquivos", async () => {
		const groups = await collect();
		expect(names(groups).sort()).toEqual(["Sub", "a.txt", "b.txt", "link"]);
		const sub = groups[0]?.items.find((item) => item[0] === "Sub");
		expect(sub?.[1]).toBe(1);
	});

	it("inclui os ocultos marcados quando pedidos", async () => {
		const items = (await collect({ showHidden: true })).flatMap((group) => group.items);
		const hidden = items.filter((item) => item[2] === 1).map((item) => item[0]);
		expect(hidden.sort()).toEqual([".oculto", ".pasta"]);
	});

	it("no modo Subpastas percorre em largura, sem seguir links nem entrar em ocultas", async () => {
		const groups = await collect({ recursive: true });
		expect(groups.map((group) => path.relative(root, group.dir))).toEqual(["", "Sub", "Sub/Fundo"]);
		expect(names(groups)).toContain("Sub/Fundo/d.txt");
		expect(names(groups).some((name) => name.startsWith("link/"))).toBe(false);
		expect(names(groups).some((name) => name.startsWith(".pasta"))).toBe(false);
	});

	it("respeita os filtros de arquivos e pastas", async () => {
		expect(names(await collect({ includeFolders: false })).sort()).toEqual([
			"a.txt",
			"b.txt",
			"link",
		]);
		expect(names(await collect({ includeFiles: false }))).toEqual(["Sub"]);
	});

	it("para quando cancelado", async () => {
		const abort = new AbortController();
		abort.abort();
		await expect(collect({ recursive: true, signal: abort.signal })).rejects.toThrow();
	});
});
