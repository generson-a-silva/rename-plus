import type { FileEntry } from "@shared/ipc";
import { describe, expect, it } from "vitest";
import { planMetadataReads, type ReadStamp } from "./metadataReads";

function entry(name: string, extra: Partial<FileEntry> = {}): FileEntry {
	return {
		path: `/m/${name}`,
		dir: "/m",
		name,
		isDir: false,
		hidden: false,
		size: 10,
		mtimeMs: 1,
		birthtimeMs: 1,
		...extra,
	};
}

const a = entry("a.mp3");
const b = entry("b.mp3");
const c = entry("c.jpg");
const none = new Map<string, ReadStamp>();
const paths = (list: readonly FileEntry[]) => list.map((item) => item.name);

describe("planMetadataReads", () => {
	it("começa a ler o que falta e marca pastas e outros tipos como sem metadados", () => {
		const folder = entry("Fotos", { isDir: true });
		const text = entry("notas.txt");
		const plan = planMetadataReads([a, folder, text], none, null);
		expect(plan.action).toBe("start");
		expect(paths(plan.toRead)).toEqual(["a.mp3"]);
		expect(paths(plan.withoutMetadata)).toEqual(["Fotos", "notas.txt"]);
	});

	it("não relê o que já foi lido, se o arquivo não mudou", () => {
		const known = new Map([[a.path, { mtimeMs: 1, size: 10 }]]);
		expect(planMetadataReads([a], known, null).action).toBe("none");
		const changed = { ...a, mtimeMs: 2 };
		expect(paths(planMetadataReads([changed], known, null).toRead)).toEqual(["a.mp3"]);
	});

	it("mantém a leitura em andamento quando a listagem muda sem itens novos a ler", () => {
		const running = new Set([a.path, b.path, c.path]);
		const known = new Map([[a.path, { mtimeMs: 1, size: 10 }]]);
		expect(planMetadataReads([a, b, c], known, running).action).toBe("keep");
		expect(planMetadataReads([b], none, running).action).toBe("keep");
	});

	it("troca a leitura quando aparece um item que ela não cobre", () => {
		const plan = planMetadataReads([a, b], none, new Set([a.path]));
		expect(plan.action).toBe("start");
		expect(paths(plan.toRead)).toEqual(["a.mp3", "b.mp3"]);
	});

	it("cancela a leitura quando nada selecionado falta ler", () => {
		const known = new Map([[a.path, { mtimeMs: 1, size: 10 }]]);
		expect(planMetadataReads([a], known, new Set([b.path])).action).toBe("cancel");
		expect(planMetadataReads([], none, new Set([b.path])).action).toBe("cancel");
	});
});
