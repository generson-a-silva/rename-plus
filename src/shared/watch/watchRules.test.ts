import { describe, expect, it } from "vitest";
import type { FileEntry } from "../ipc";
import {
	createWatchRule,
	isIncompleteDownload,
	planWatchedFile,
	sanitizeWatchRules,
	type WatchRule,
	watchRuleProblem,
} from "./watchRules";

const NOW = new Date(2026, 9, 4, 12, 0, 0);

function entry(name: string, extra: Partial<FileEntry> = {}): FileEntry {
	const dir = extra.dir ?? "/home/user/Downloads";
	return {
		path: `${dir}/${name}`,
		dir,
		name,
		isDir: false,
		hidden: false,
		size: 10,
		mtimeMs: NOW.getTime(),
		birthtimeMs: NOW.getTime(),
		...extra,
	};
}

function rule(patch: Partial<WatchRule> = {}): WatchRule {
	return { ...createWatchRule("r1"), folder: "/home/user/Downloads", ...patch };
}

function lowerCaseRule(patch: Partial<WatchRule> = {}): WatchRule {
	const base = rule(patch);
	return { ...base, rename: { ...base.rename, case: { mode: "lower", exceptions: "" } } };
}

describe("watchRuleProblem", () => {
	it("exige uma pasta e alguma ação", () => {
		expect(watchRuleProblem(createWatchRule("a"))).toBe("noFolder");
		expect(watchRuleProblem(rule())).toBe("noAction");
		expect(watchRuleProblem(rule({ destination: "/home/user/Docs" }))).toBeNull();
		expect(watchRuleProblem(lowerCaseRule())).toBeNull();
	});
});

describe("sanitizeWatchRules", () => {
	it("descarta itens inválidos e ids repetidos", () => {
		const rules = sanitizeWatchRules([
			{ id: "a", folder: "/x" },
			{ id: "a", folder: "/y" },
			{ folder: "/sem-id" },
			null,
			"texto",
		]);
		expect(rules.map((item) => [item.id, item.folder])).toEqual([["a", "/x"]]);
	});

	it("completa campos ausentes e ignora tipos errados", () => {
		const [item] = sanitizeWatchRules([
			{ id: "a", enabled: "sim", mask: "*.pdf", rename: { case: { mode: "upper" } } },
		]);
		expect(item?.enabled).toBe(true);
		expect(item?.mask).toBe("*.pdf");
		expect(item?.rename.case).toEqual({ mode: "upper", exceptions: "" });
		expect(item?.rename.numbering.start).toBe(1);
	});

	it("aceita só listas", () => {
		expect(sanitizeWatchRules({ id: "a" })).toEqual([]);
	});
});

describe("isIncompleteDownload", () => {
	it("reconhece arquivos temporários de download", () => {
		expect(isIncompleteDownload("video.mp4.crdownload")).toBe(true);
		expect(isIncompleteDownload("arquivo.PART")).toBe(true);
		expect(isIncompleteDownload("relatorio.pdf")).toBe(false);
		expect(isIncompleteDownload(".tmp")).toBe(false);
	});
});

describe("planWatchedFile", () => {
	it("renomeia na mesma pasta", () => {
		expect(planWatchedFile(lowerCaseRule(), entry("Foto.JPG"), 0, NOW, "linux")).toEqual({
			kind: "move",
			name: "foto.JPG",
			dir: "/home/user/Downloads",
		});
	});

	it("move para o destino mesmo sem mudar o nome", () => {
		const plan = planWatchedFile(
			rule({ destination: "/home/user/Docs" }),
			entry("a.pdf"),
			0,
			NOW,
			"linux",
		);
		expect(plan).toEqual({ kind: "move", name: "a.pdf", dir: "/home/user/Docs" });
	});

	it("ignora arquivos fora da máscara, ocultos, pastas e downloads incompletos", () => {
		const r = lowerCaseRule({ mask: "*.pdf" });
		expect(planWatchedFile(r, entry("A.jpg"), 0, NOW, "linux").kind).toBe("skip");
		expect(planWatchedFile(r, entry(".A.pdf"), 0, NOW, "linux").kind).toBe("skip");
		expect(planWatchedFile(r, entry("A.pdf", { isDir: true }), 0, NOW, "linux").kind).toBe("skip");
		expect(planWatchedFile(r, entry("A.pdf.crdownload"), 0, NOW, "linux").kind).toBe("skip");
		expect(planWatchedFile(r, entry("A.pdf"), 0, NOW, "linux").kind).toBe("move");
	});

	it("não faz nada quando o nome já está no formato da regra", () => {
		expect(planWatchedFile(lowerCaseRule(), entry("foto.jpg"), 0, NOW, "linux").kind).toBe("skip");
	});

	it("usa a posição do arquivo na numeração", () => {
		const base = rule();
		const numbered: WatchRule = {
			...base,
			rename: { ...base.rename, numbering: { ...base.rename.numbering, mode: "prefix" } },
		};
		expect(planWatchedFile(numbered, entry("a.txt"), 4, NOW, "linux")).toMatchObject({
			name: "5_a.txt",
		});
	});

	it("informa RegEx inválida e nomes inválidos", () => {
		const base = rule();
		const badRegex: WatchRule = {
			...base,
			rename: { ...base.rename, regex: { ...base.rename.regex, match: "(" } },
		};
		expect(planWatchedFile(badRegex, entry("a.txt"), 0, NOW, "linux")).toMatchObject({
			kind: "error",
			error: { key: "engine.invalidRegex" },
		});
		const removeName: WatchRule = {
			...base,
			rename: {
				...base.rename,
				name: { mode: "remove", fixed: "" },
				extension: { mode: "remove", value: "" },
			},
		};
		expect(planWatchedFile(removeName, entry("a.txt"), 0, NOW, "linux")).toEqual({
			kind: "error",
			error: { key: "validation.empty" },
		});
	});
});
