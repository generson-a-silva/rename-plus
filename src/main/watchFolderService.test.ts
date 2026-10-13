import type { Stats } from "node:fs";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWatchRule, type WatchRule } from "../shared/watch";

/** Arquivos de configuração em memória: sobrevivem ao "reinício" do serviço entre imports. */
const settings = vi.hoisted(() => new Map<string, string>());
/** Roda logo antes de cada arquivo ser movido (para agir no meio do processamento). */
const hooks = vi.hoisted(() => ({ beforeMove: null as (() => void) | null }));

vi.mock("electron", () => ({ Notification: { isSupported: () => false }, shell: {} }));
vi.mock("./settingsFile", () => ({
	readSettingsFile: (name: string) => JSON.parse(settings.get(name) ?? "null"),
	writeSettingsFile: (name: string, value: unknown) => settings.set(name, JSON.stringify(value)),
	broadcast: () => {},
}));
vi.mock("./fileTransferService", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./fileTransferService")>();
	return {
		...actual,
		move: async (source: string, target: string) => {
			hooks.beforeMove?.();
			await actual.move(source, target);
		},
	};
});

type Service = typeof import("./watchFolderService");

let root: string;
let service: Service;

/** Carrega o serviço do zero, como ao abrir o app. */
async function start(): Promise<Service> {
	service?.stopWatchFolders();
	vi.resetModules();
	service = await import("./watchFolderService.js");
	service.startWatchFolders();
	return service;
}

function numberedRule(patch: Partial<WatchRule> = {}, start = 1): WatchRule {
	const base = createWatchRule("r1");
	return {
		...base,
		folder: root,
		rename: { ...base.rename, numbering: { ...base.rename.numbering, mode: "prefix", start } },
		...patch,
	};
}

/** Entrega os arquivos ao serviço todos de uma vez, como se parassem de mudar juntos. */
async function deliver(files: string[]): Promise<void> {
	const settled: [string, Stats][] = [];
	for (const file of files) settled.push([file, await fs.lstat(file)]);
	await Promise.all(settled.map(([file, stats]) => service.processSettledFile(file, stats)));
}

/** Cria os arquivos na pasta monitorada e os entrega ao serviço. */
async function arrive(...names: string[]): Promise<void> {
	const files = names.map((name) => path.join(root, name));
	for (const file of files) await fs.writeFile(file, path.basename(file));
	await deliver(files);
}

const list = async (dir = root) => (await fs.readdir(dir)).sort();

beforeEach(async () => {
	settings.clear();
	hooks.beforeMove = null;
	root = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-watch-"));
	await start();
});

afterEach(async () => {
	vi.restoreAllMocks();
	service.stopWatchFolders();
	await fs.rm(root, { recursive: true, force: true });
});

describe("fila de processamento", () => {
	it("numera em sequência os arquivos que chegam juntos, sem perder nenhum", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt", "b.txt", "c.txt", "d.txt", "e.txt");

		expect(await list()).toEqual(["1_a.txt", "2_b.txt", "3_c.txt", "4_d.txt", "5_e.txt"]);
		expect(await fs.readFile(path.join(root, "3_c.txt"), "utf8")).toBe("c.txt");
		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 5 });
	});

	it("não sobrescreve quando duas regras levam ao mesmo nome de destino", async () => {
		const other = path.join(root, "outra");
		const destination = path.join(root, "destino");
		await fs.mkdir(other);
		service.setWatchRules([
			numberedRule({ destination }),
			numberedRule({ id: "r2", folder: other, destination }),
		]);
		const files = [path.join(root, "a.txt"), path.join(other, "a.txt")];
		for (const file of files) await fs.writeFile(file, file);
		await deliver(files);

		expect(await list(destination)).toEqual(["1_a (2).txt", "1_a.txt"]);
	});

	it("continua processando depois de uma falha", async () => {
		service.setWatchRules([numberedRule()]);
		const missing = path.join(root, "sumiu.txt");
		await fs.writeFile(missing, "");
		const stats = await fs.lstat(missing);
		await fs.rm(missing);
		await service.processSettledFile(missing, stats);
		await arrive("a.txt");

		expect(await list()).toEqual(["1_a.txt"]);
		expect(service.getWatchFoldersInfo().activity.map((item) => Boolean(item.error))).toEqual([
			false,
			true,
		]);
	});
});

describe("reinício da numeração", () => {
	it("recomeça do novo início quando a numeração da regra muda", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt", "b.txt", "c.txt");
		service.setWatchRules([numberedRule({}, 4)]);
		await arrive("d.txt");

		expect(await list()).toEqual(["1_a.txt", "2_b.txt", "3_c.txt", "4_d.txt"]);
		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 1 });
	});

	it("mantém a sequência quando outra parte da regra muda", async () => {
		const destination = path.join(root, "destino");
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt", "b.txt");
		service.setWatchRules([
			numberedRule({ name: "Notas", mask: "*.txt", destination, notify: true }),
		]);
		await arrive("c.txt");
		service.setWatchRules([numberedRule({ enabled: false })]);
		service.setWatchRules([numberedRule()]);
		await arrive("d.txt");

		expect(await list(destination)).toEqual(["3_c.txt"]);
		expect(await list()).toEqual(["1_a.txt", "2_b.txt", "4_d.txt", "destino"]);
	});

	it("recomeça pelo botão, só na regra pedida", async () => {
		const other = path.join(root, "outra");
		await fs.mkdir(other);
		service.setWatchRules([numberedRule(), numberedRule({ id: "r2", folder: other })]);
		await arrive("a.txt", "b.txt", "outra/x.txt");
		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 2, r2: 1 });

		expect(service.resetWatchNumbering("r1").counters).toEqual({ r2: 1 });
		await arrive("c.txt", "outra/y.txt");

		expect(await list()).toEqual(["1_a.txt", "1_c.txt", "2_b.txt", "outra"]);
		expect(await list(other)).toEqual(["1_x.txt", "2_y.txt"]);
	});

	it("ignora pedidos de reinício inválidos", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt");
		service.resetWatchNumbering("nao-existe");
		service.resetWatchNumbering(undefined);

		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 1 });
	});

	it("não conta o arquivo que estava em andamento na hora do reinício", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt");
		hooks.beforeMove = () => {
			hooks.beforeMove = null;
			service.resetWatchNumbering("r1");
		};
		await arrive("b.txt");
		expect(service.getWatchFoldersInfo().counters).toEqual({});
		await arrive("c.txt");

		expect(await list()).toEqual(["1_a.txt", "1_c.txt", "2_b.txt"]);
	});

	it("esquece a contagem de uma regra removida", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt");
		service.setWatchRules([]);
		service.setWatchRules([numberedRule()]);
		await arrive("b.txt");

		expect(await list()).toEqual(["1_a.txt", "1_b.txt"]);
	});
});

describe("contagem salva em disco", () => {
	it("continua de onde parou depois de reiniciar o app", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt", "b.txt", "c.txt");
		await start();
		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 3 });
		await arrive("d.txt");

		expect(await list()).toEqual(["1_a.txt", "2_b.txt", "3_c.txt", "4_d.txt"]);
	});

	it("mantém o reinício da numeração depois de reiniciar o app", async () => {
		service.setWatchRules([numberedRule()]);
		await arrive("a.txt", "b.txt");
		service.resetWatchNumbering("r1");
		await start();
		await arrive("c.txt");

		expect(await list()).toEqual(["1_a.txt", "1_c.txt", "2_b.txt"]);
	});

	it("descarta valores inválidos e regras que não existem mais", async () => {
		service.setWatchRules([numberedRule()]);
		settings.set(
			"watch-counters.json",
			JSON.stringify({ r1: 2, apagada: 7, texto: "3", negativo: -1, quebrado: 1.5 }),
		);
		await start();
		expect(service.getWatchFoldersInfo().counters).toEqual({ r1: 2 });

		settings.set("watch-counters.json", JSON.stringify([5]));
		await start();
		expect(service.getWatchFoldersInfo().counters).toEqual({});
	});
});

describe("pasta monitorada que some ou é trocada", () => {
	let folder: string;
	const status = () => service.getWatchFoldersInfo().statuses.r1?.state;

	beforeEach(async () => {
		folder = path.join(root, "entrada");
		await fs.mkdir(folder);
	});

	it("avisa o erro quando a pasta é apagada e volta a monitorar quando ela reaparece", async () => {
		service.setWatchRules([numberedRule({ folder })]);
		await fs.rm(folder, { recursive: true });
		service.checkWatchedFolders();
		expect(status()).toBe("error");
		// Esperando a pasta voltar, a regra ainda conta para o app continuar em segundo plano.
		expect(service.activeWatchCount()).toBe(1);

		await fs.mkdir(folder);
		service.checkWatchedFolders();
		expect(status()).toBe("watching");
		await arrive("entrada/a.txt");
		expect(await list(folder)).toEqual(["1_a.txt"]);
	});

	it("troca o observador quando outra pasta toma o lugar no mesmo caminho", async () => {
		const watch = vi.spyOn(fsSync, "watch");
		service.setWatchRules([numberedRule({ folder })]);
		expect(watch).toHaveBeenCalledTimes(1);

		await fs.rename(folder, path.join(root, "antiga"));
		await fs.mkdir(folder);
		service.checkWatchedFolders();

		expect(watch).toHaveBeenCalledTimes(2);
		expect(status()).toBe("watching");
	});

	it("mantém o observador enquanto a pasta é a mesma", async () => {
		const watch = vi.spyOn(fsSync, "watch");
		service.setWatchRules([numberedRule({ folder })]);
		await arrive("entrada/a.txt");
		service.checkWatchedFolders();
		service.checkWatchedFolders();

		expect(watch).toHaveBeenCalledTimes(1);
		expect(status()).toBe("watching");
	});

	it("passa a monitorar a pasta que não existia quando a regra foi salva", async () => {
		const later = path.join(root, "depois");
		service.setWatchRules([numberedRule({ folder: later })]);
		expect(status()).toBe("error");

		await fs.mkdir(later);
		service.checkWatchedFolders();
		expect(status()).toBe("watching");
	});

	it("não conta regras desativadas nem incompletas como ativas", () => {
		service.setWatchRules([
			numberedRule({ folder, enabled: false }),
			numberedRule({ id: "r2", folder: "" }),
		]);
		service.checkWatchedFolders();

		expect(service.activeWatchCount()).toBe(0);
		expect(service.getWatchFoldersInfo().statuses.r2?.state).toBe("incomplete");
	});
});
