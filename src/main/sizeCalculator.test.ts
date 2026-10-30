import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculateTotalSize } from "./sizeCalculator";

let root: string;

/** Estrutura: a.txt (3 B), Sub/{b.txt (5 B), Fundo/c.txt (7 B)}, Vazia/, link → Sub. */
beforeAll(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-size-"));
	const write = (rel: string, bytes: number) => {
		fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
		fs.writeFileSync(path.join(root, rel), "x".repeat(bytes));
	};
	write("a.txt", 3);
	write("Sub/b.txt", 5);
	write("Sub/Fundo/c.txt", 7);
	fs.mkdirSync(path.join(root, "Vazia"));
	fs.symlinkSync(path.join(root, "Sub"), path.join(root, "link"), "junction");
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const at = (...parts: string[]) => path.join(root, ...parts);

describe("calculateTotalSize", () => {
	it("soma arquivos soltos", async () => {
		expect(await calculateTotalSize([at("a.txt"), at("Sub", "b.txt")])).toEqual({
			bytes: 8,
			files: 2,
			folders: 0,
		});
	});

	it("entra nas pastas, inclusive as vazias", async () => {
		expect(await calculateTotalSize([at("Sub"), at("Vazia")])).toEqual({
			bytes: 12,
			files: 2,
			folders: 3,
		});
	});

	it("não conta duas vezes o que está dentro de outra pasta pedida", async () => {
		const total = await calculateTotalSize([
			at("Sub"),
			at("Sub", "b.txt"),
			at("Sub", "Fundo"),
			at("Sub"),
		]);
		expect(total.bytes).toBe(12);
		expect(total.files).toBe(2);
	});

	it("não segue links simbólicos", async () => {
		const total = await calculateTotalSize([at("link")]);
		expect(total.folders).toBe(0);
		expect(total.files).toBe(1);
		// Conta só o próprio link, não o conteúdo de Sub.
		expect(total.bytes).toBe(fs.lstatSync(at("link")).size);
	});

	it("ignora itens que não existem", async () => {
		expect(await calculateTotalSize([at("sumiu.txt")])).toEqual({ bytes: 0, files: 0, folders: 0 });
	});

	it("para quando cancelada", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(calculateTotalSize([root], { signal: controller.signal })).rejects.toThrow();
	});
});
