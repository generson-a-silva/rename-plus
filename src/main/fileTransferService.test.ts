import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	copyItems,
	createFolder,
	deleteItems,
	findAvailablePath,
	moveItems,
} from "./fileTransferService";

let root: string;
const p = (name: string) => path.join(root, name);

async function touch(...names: string[]) {
	for (const name of names) {
		await fs.mkdir(path.dirname(p(name)), { recursive: true });
		await fs.writeFile(p(name), name);
	}
}

async function list(dir = root): Promise<string[]> {
	const result: string[] = [];
	for (const dirent of await fs.readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, dirent.name);
		result.push(path.relative(root, full).split(path.sep).join("/"));
		if (dirent.isDirectory()) result.push(...(await list(full)));
	}
	return result.sort();
}

beforeEach(async () => {
	root = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-transfer-"));
});

afterEach(async () => {
	await fs.rm(root, { recursive: true, force: true });
});

describe("findAvailablePath", () => {
	it("acrescenta (2), (3)… antes da extensão", async () => {
		await touch("foto.jpg", "foto (2).jpg");
		expect(await findAvailablePath(root, "nova.jpg", false)).toBe(p("nova.jpg"));
		expect(await findAvailablePath(root, "foto.jpg", false)).toBe(p("foto (3).jpg"));
	});

	it("em pastas, não trata o ponto como extensão", async () => {
		await fs.mkdir(p("v1.2"));
		expect(await findAvailablePath(root, "v1.2", true)).toBe(p("v1.2 (2)"));
	});
});

describe("createFolder", () => {
	it("cria a pasta e recusa nomes existentes ou inválidos", async () => {
		expect((await createFolder(root, "Nova")).created).toEqual([p("Nova")]);
		expect((await createFolder(root, "Nova")).failed[0]?.error).toMatch(/Já existe/);
		expect((await createFolder(root, "a/b")).ok).toBe(false);
		expect(await list()).toEqual(["Nova"]);
	});
});

describe("copyItems", () => {
	it("copia arquivos e pastas, sem sobrescrever", async () => {
		await touch("a.txt", "pasta/x.txt", "destino/a.txt");
		const result = await copyItems([p("a.txt"), p("pasta")], p("destino"));
		expect(result.ok).toBe(true);
		expect(result.created).toEqual([p("destino/a (2).txt"), p("destino/pasta")]);
		expect(await fs.readFile(p("destino/a.txt"), "utf8")).toBe("destino/a.txt");
		expect(await list()).toContain("destino/pasta/x.txt");
		expect(await list()).toContain("a.txt");
	});

	it("colar na mesma pasta duplica o item", async () => {
		await touch("a.txt");
		await copyItems([p("a.txt")], root);
		expect(await list()).toEqual(["a (2).txt", "a.txt"]);
	});

	it("recusa copiar uma pasta para dentro dela mesma", async () => {
		await touch("pasta/x.txt");
		const result = await copyItems([p("pasta")], p("pasta"));
		expect(result.failed[0]?.error).toMatch(/dentro dela mesma/);
	});
});

describe("moveItems", () => {
	it("move itens e ignora os que já estão no destino", async () => {
		await touch("a.txt", "b.txt", "destino/c.txt");
		const result = await moveItems([p("a.txt"), p("destino/c.txt")], p("destino"));
		expect(result.ok).toBe(true);
		expect(result.created).toEqual([p("destino/a.txt")]);
		expect(await list()).toEqual(["b.txt", "destino", "destino/a.txt", "destino/c.txt"]);
	});

	it("recusa mover uma pasta para dentro de uma subpasta dela", async () => {
		await touch("pasta/sub/x.txt");
		const result = await moveItems([p("pasta")], p("pasta/sub"));
		expect(result.ok).toBe(false);
		expect(await list()).toContain("pasta/sub/x.txt");
	});

	it("informa itens que não existem mais e continua com os demais", async () => {
		await touch("a.txt", "destino/.keep");
		const result = await moveItems([p("sumiu.txt"), p("a.txt")], p("destino"));
		expect(result.failed).toHaveLength(1);
		expect(result.created).toEqual([p("destino/a.txt")]);
	});
});

describe("deleteItems", () => {
	it("exclui arquivos e pastas com conteúdo, informando o que não existe", async () => {
		await touch("a.txt", "pasta/sub/x.txt", "fica.txt");
		const result = await deleteItems([p("a.txt"), p("pasta"), p("sumiu.txt")]);
		expect(result.failed.map((f) => path.basename(f.path))).toEqual(["sumiu.txt"]);
		expect(await list()).toEqual(["fica.txt"]);
	});
});
