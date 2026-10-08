import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	createHiddenCheck,
	needsOwnHiddenCheck,
	parseHiddenPathList,
	toDirQueryPath,
	toLongUncPath,
} from "./hiddenFileDetector";

describe("parseHiddenPathList", () => {
	it("lê um caminho por linha, ignorando linhas vazias e CRLF", () => {
		const hidden = parseHiddenPathList(
			"C:\\Users\\Ana\\desktop.ini\r\n\r\nC:\\Users\\Ana\\AppData\r\n",
		);
		expect([...hidden]).toEqual(["c:\\users\\ana\\desktop.ini", "c:\\users\\ana\\appdata"]);
	});

	it("com a pasta-base, monta o caminho a partir dos nomes (dir sem /s)", () => {
		const hidden = parseHiddenPathList("desktop.ini\r\nAção.txt\r\n", "C:\\Users\\Ana");
		expect([...hidden]).toEqual(["c:\\users\\ana\\desktop.ini", "c:\\users\\ana\\ação.txt"]);
	});

	it("mantém o espaço no início do nome", () => {
		const hidden = parseHiddenPathList("  nota.txt\r\n", "C:\\Ana");
		expect([...hidden]).toEqual(["c:\\ana\\  nota.txt"]);
	});

	it("lê a saída UTF-16 do cmd /u sem perder acentos", () => {
		const output = Buffer.from("C:\\Fotos\\Família\r\n", "utf16le").toString("utf16le");
		expect([...parseHiddenPathList(output)]).toEqual(["c:\\fotos\\família"]);
	});

	it("tira o prefixo \\\\?\\ das linhas do dir /s", () => {
		const hidden = parseHiddenPathList("\\\\?\\C:\\Fotos\\Família\r\n");
		expect([...hidden]).toEqual(["c:\\fotos\\família"]);
	});
});

describe("toDirQueryPath", () => {
	it("em unidades, usa o prefixo de caminho longo com o caminho normalizado", () => {
		expect(toDirQueryPath("C:\\Fotos\\")).toBe("\\\\?\\C:\\Fotos");
		expect(toDirQueryPath("c:/Fotos/./Viagem")).toBe("\\\\?\\c:\\Fotos\\Viagem");
		expect(toDirQueryPath("Z:\\")).toBe("\\\\?\\Z:\\");
	});

	it("em caminhos de rede, mantém o caminho sem prefixo (o cmd não aceita \\\\?\\UNC\\)", () => {
		expect(toDirQueryPath("\\\\servidor\\pasta\\Fotos")).toBe("\\\\servidor\\pasta\\Fotos");
	});
});

describe("caminhos de rede longos", () => {
	const unc = (length: number) => `\\\\srv\\pasta\\${"a".repeat(length - 12)}`;

	it("só pastas de rede acima de 257 caracteres precisam de consulta própria", () => {
		expect(unc(257)).toHaveLength(257);
		expect(needsOwnHiddenCheck(unc(257), "win32")).toBe(false);
		expect(needsOwnHiddenCheck(unc(258), "win32")).toBe(true);
		expect(needsOwnHiddenCheck(`C:\\${"a".repeat(300)}`, "win32")).toBe(false);
		expect(needsOwnHiddenCheck(unc(258), "linux")).toBe(false);
	});

	it("converte para o formato longo do PowerShell e volta", () => {
		expect(toLongUncPath("\\\\srv\\pasta\\Fotos\\")).toBe("\\\\?\\UNC\\srv\\pasta\\Fotos");
		const hidden = parseHiddenPathList("\\\\?\\UNC\\srv\\pasta\\Família\r\n");
		expect([...hidden]).toEqual(["\\\\srv\\pasta\\família"]);
	});
});

describe("createHiddenCheck", () => {
	it("fora do Windows, oculto é o que começa com ponto", async () => {
		const isHidden = await createHiddenCheck("/home/ana", false, "linux");
		expect(isHidden("/home/ana/.config", ".config")).toBe(true);
		expect(isHidden("/home/ana/Fotos", "Fotos")).toBe(false);
	});
});

/** No Windows, consulta o `dir` de verdade em pastas com nomes que o cmd poderia interpretar. */
describe.runIf(process.platform === "win32")("createHiddenCheck no Windows", () => {
	let root: string;
	// [caminho relativo, oculto?]; pastas terminam com "/".
	const tree: Array<[string, boolean]> = [
		["normal.txt", false],
		["Ação oculta.txt", true],
		["  espaço inicial.txt", true],
		["a&b %PATH% !x! ^c (p);.txt", true],
		["emoji 😀 日本語.txt", true],
		["Família/", true],
		["Família/dentro oculto ç.txt", true],
		["Família/dentro visível.txt", false],
		["Pasta/", false],
		["Pasta/Ñandú oculto.txt", true],
	];
	const full = (rel: string) => path.win32.join(root, rel.replace(/\/$/, ""));

	beforeAll(() => {
		const base = fs.mkdtempSync(path.join(os.tmpdir(), "rename-plus-ocultos-"));
		root = path.join(base, "Raíz & 100% !bang! ^c");
		fs.mkdirSync(root);
		for (const [rel] of tree)
			if (rel.endsWith("/")) fs.mkdirSync(full(rel));
			else fs.writeFileSync(full(rel), rel);
		for (const [rel, hidden] of tree) if (hidden) execFileSync("attrib.exe", ["+h", full(rel)]);
	});

	afterAll(() => fs.rmSync(path.dirname(root), { recursive: true, force: true }));

	const expectMatches = (
		isHidden: (fullPath: string, name: string) => boolean,
		recursive: boolean,
	) => {
		for (const [rel, hidden] of tree) {
			if (!recursive && rel.slice(0, -1).includes("/")) continue;
			expect([rel, isHidden(full(rel), path.win32.basename(full(rel)))]).toEqual([rel, hidden]);
		}
	};

	it("detecta os ocultos da pasta, com acentos e símbolos no caminho", async () => {
		expectMatches(await createHiddenCheck(root, false), false);
	});

	it("detecta os ocultos das subpastas", async () => {
		expectMatches(await createHiddenCheck(root, true), true);
	});

	it("aceita a pasta com barra no final", async () => {
		expectMatches(await createHiddenCheck(`${root}\\`, true), true);
	});

	it("pasta inexistente não oculta nada", async () => {
		const isHidden = await createHiddenCheck(path.join(root, "não existe"), true);
		expect(isHidden(full("Ação oculta.txt"), "Ação oculta.txt")).toBe(false);
	});

	it("detecta ocultos além de 260 caracteres, mesmo sem LongPathsEnabled", async () => {
		let deep = path.join(root, "Pasta");
		while (deep.length < 300) deep = path.join(deep, "pasta longa com acentuação");
		fs.mkdirSync(deep, { recursive: true });
		const file = path.join(deep, "oculto ç.txt");
		fs.writeFileSync(file, "x");
		// O attrib não aceita o prefixo \\?\; o .NET aceita.
		execFileSync(
			"powershell.exe",
			["-NoProfile", "-Command", "[IO.File]::SetAttributes($env:F, 'Hidden')"],
			{ env: { ...process.env, F: `\\\\?\\${file}` } },
		);
		expect((await createHiddenCheck(deep, false))(file, "oculto ç.txt")).toBe(true);
		expect((await createHiddenCheck(root, true))(file, "oculto ç.txt")).toBe(true);
	});

	// Rede de verdade pelo compartilhamento administrativo da própria máquina, quando acessível.
	const viaNetwork = (local: string) => `\\\\localhost\\${local[0]}$\\${local.slice(3)}`;
	it.runIf(fs.existsSync(viaNetwork(os.tmpdir())))(
		"detecta ocultos em pasta de rede além de 257 caracteres",
		async () => {
			let deep = path.join(root, "Rede");
			while (viaNetwork(deep).length < 290) deep = path.join(deep, "pasta longa de rede ção");
			fs.mkdirSync(deep, { recursive: true });
			const file = path.join(deep, "oculto ü.txt");
			fs.writeFileSync(file, "x");
			execFileSync(
				"powershell.exe",
				["-NoProfile", "-Command", "[IO.File]::SetAttributes($env:F, 'Hidden')"],
				{ env: { ...process.env, F: `\\\\?\\${file}` } },
			);
			const networkDeep = viaNetwork(deep);
			const networkFile = viaNetwork(file);
			expect((await createHiddenCheck(networkDeep, false))(networkFile, "oculto ü.txt")).toBe(true);
			expect((await createHiddenCheck(networkDeep, true))(networkFile, "oculto ü.txt")).toBe(true);
		},
	);
});
