import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canUndo, renameBatch, undoLastBatch } from "./batchRenamer";

let root: string;

async function tree(dir = root): Promise<string[]> {
	const result: string[] = [];
	for (const dirent of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, dirent.name);
		result.push(path.relative(root, full));
		if (dirent.isDirectory()) result.push(...(await tree(full)));
	}
	return result.sort();
}

async function touch(...names: string[]) {
	for (const name of names) {
		await fs.mkdir(path.dirname(path.join(root, name)), { recursive: true });
		await fs.writeFile(path.join(root, name), name);
	}
}

const p = (name: string) => path.join(root, name);

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-"));
});

afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe("renameBatch", () => {
	it("renomeia e desfaz", async () => {
		await touch("a.txt", "b.txt");
		const result = await renameBatch([
			{ from: p("a.txt"), to: p("1.txt") },
			{ from: p("b.txt"), to: p("2.txt") },
		]);
		expect(result.ok).toBe(true);
		expect(await tree()).toEqual(["1.txt", "2.txt"]);

		expect(canUndo()).toBe(true);
		expect((await undoLastBatch()).ok).toBe(true);
		expect(await tree()).toEqual(["a.txt", "b.txt"]);
		expect(canUndo()).toBe(false);
	});

	it("troca nomes entre itens do lote", async () => {
		await touch("a.txt", "b.txt");
		const result = await renameBatch([
			{ from: p("a.txt"), to: p("b.txt") },
			{ from: p("b.txt"), to: p("a.txt") },
		]);
		expect(result.ok).toBe(true);
		expect(await fs.readFile(p("a.txt"), "utf8")).toBe("b.txt");
		expect(await fs.readFile(p("b.txt"), "utf8")).toBe("a.txt");
	});

	it("não sobrescreve arquivos fora do lote", async () => {
		await touch("a.txt", "b.txt");
		const result = await renameBatch([{ from: p("a.txt"), to: p("b.txt") }]);
		expect(result.ok).toBe(false);
		expect(result.failed[0]?.error).toMatch(/Já existe/);
		expect(await fs.readFile(p("b.txt"), "utf8")).toBe("b.txt");
	});

	it("rejeita destino em outra pasta e nomes inválidos", async () => {
		await touch("a.txt", "sub/x.txt");
		expect((await renameBatch([{ from: p("a.txt"), to: p("sub/a.txt") }])).ok).toBe(false);
		expect((await renameBatch([{ from: p("a.txt"), to: p("..") }])).ok).toBe(false);
		expect(await tree()).toEqual(["a.txt", "sub", "sub/x.txt"]);
	});

	it("renomeia pasta e conteúdo no mesmo lote, e desfaz", async () => {
		await touch("pasta/arq.txt");
		const result = await renameBatch([
			{ from: p("pasta"), to: p("PASTA") },
			{ from: p("pasta/arq.txt"), to: p("pasta/ARQ.txt") },
		]);
		expect(result.ok).toBe(true);
		expect(await tree()).toEqual(["PASTA", "PASTA/ARQ.txt"]);

		expect((await undoLastBatch()).ok).toBe(true);
		expect(await tree()).toEqual(["pasta", "pasta/arq.txt"]);
	});

	it("valida o lote inteiro antes de renomear", async () => {
		await touch("a.txt", "b.txt");
		const result = await renameBatch([
			{ from: p("a.txt"), to: p("x.txt") },
			{ from: p("b.txt"), to: p("y.txt") },
			{ from: p("sumiu.txt"), to: p("z.txt") },
		]);
		expect(result.ok).toBe(false);
		expect(await tree()).toEqual(["a.txt", "b.txt"]);
	});

	it.skipIf(process.getuid?.() === 0)("desfaz o que já foi feito se falhar no meio", async () => {
		// O item mais fundo (w/f.txt) é renomeado primeiro; o da raiz falha por permissão.
		await touch("a.txt", "w/f.txt");
		await fs.chmod(root, 0o555);
		try {
			const result = await renameBatch([
				{ from: p("a.txt"), to: p("b.txt") },
				{ from: p("w/f.txt"), to: p("w/g.txt") },
			]);
			expect(result.ok).toBe(false);
			expect(await tree()).toEqual(["a.txt", "w", "w/f.txt"]);
		} finally {
			await fs.chmod(root, 0o755);
		}
	});
});
