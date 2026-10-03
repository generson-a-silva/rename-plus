import { describe, expect, it } from "vitest";
import { mergeLaunchRequests, parseLaunchArguments } from "./launchArguments";

// As regras de caminho são fixadas em cada teste: o resultado não pode depender do
// sistema que roda os testes (o CI roda no Linux e no Windows).
const posix = (args: string[], cwd = "/") => parseLaunchArguments(args, cwd, "posix");
const win32 = (args: string[], cwd = "C:\\") => parseLaunchArguments(args, cwd, "win32");

describe("parseLaunchArguments (Linux)", () => {
	it("sem caminhos, não há pedido", () => {
		expect(posix([], "/home/ana")).toBeNull();
		expect(posix(["--no-sandbox", "--select"], "/home/ana")).toBeNull();
	});

	it("um caminho abre; vários viram seleção", () => {
		expect(posix(["/fotos"])).toEqual({ mode: "open", paths: ["/fotos"] });
		expect(posix(["--open", "--", "/a", "/b"])).toEqual({ mode: "select", paths: ["/a", "/b"] });
		expect(posix(["--select", "--", "/a"])).toEqual({ mode: "select", paths: ["/a"] });
	});

	it("ignora opções desconhecidas e trata tudo depois de -- como caminho", () => {
		expect(posix(["--no-sandbox", "--open", "--", "--estranho.txt"], "/pasta")).toEqual({
			mode: "open",
			paths: ["/pasta/--estranho.txt"],
		});
	});

	it("resolve caminhos relativos e URIs file://, descartando outros esquemas", () => {
		expect(
			posix(
				["--select", "--", "a b.jpg", "file:///home/ana/Fotos%202024", "smb://srv/x"],
				"/home/ana",
			),
		).toEqual({ mode: "select", paths: ["/home/ana/a b.jpg", "/home/ana/Fotos 2024"] });
	});

	it("não repete caminhos", () => {
		expect(posix(["/a", "/a"])).toEqual({ mode: "open", paths: ["/a"] });
	});
});

describe("parseLaunchArguments (Windows)", () => {
	it("aceita caminhos com unidade, como o Explorador envia (%1 / %V)", () => {
		expect(win32(["--open", "--", "C:\\Users\\Ana\\Fotos 2024"])).toEqual({
			mode: "open",
			paths: ["C:\\Users\\Ana\\Fotos 2024"],
		});
		expect(win32(["--select", "--", "D:\\"])).toEqual({ mode: "select", paths: ["D:\\"] });
	});

	it("resolve caminhos relativos pela pasta de trabalho", () => {
		expect(win32(["IMG_01.jpg", "..\\Outra\\b.jpg"], "C:\\Users\\Ana\\Fotos")).toEqual({
			mode: "select",
			paths: ["C:\\Users\\Ana\\Fotos\\IMG_01.jpg", "C:\\Users\\Ana\\Outra\\b.jpg"],
		});
	});

	it("converte URIs file:// com unidade e não confunde C: com um esquema", () => {
		expect(win32(["file:///C:/Users/Ana/Fotos%202024"])).toEqual({
			mode: "open",
			paths: ["C:\\Users\\Ana\\Fotos 2024"],
		});
		expect(win32(["C:/Users/Ana"])).toEqual({ mode: "open", paths: ["C:\\Users\\Ana"] });
	});
});

describe("mergeLaunchRequests", () => {
	it("junta seleções seguidas (um processo por item no Windows)", () => {
		expect(
			mergeLaunchRequests([
				{ mode: "select", paths: ["/p/a"] },
				{ mode: "select", paths: ["/p/b"] },
				{ mode: "select", paths: ["/p/a"] },
				{ mode: "open", paths: ["/q"] },
			]),
		).toEqual([
			{ mode: "select", paths: ["/p/a", "/p/b"] },
			{ mode: "open", paths: ["/q"] },
		]);
	});
});
