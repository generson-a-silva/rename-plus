import { describe, expect, it } from "vitest";
import { mergeLaunchRequests, parseLaunchArguments } from "./launchArguments";

describe("parseLaunchArguments", () => {
	it("sem caminhos, não há pedido", () => {
		expect(parseLaunchArguments([], "/home/ana")).toBeNull();
		expect(parseLaunchArguments(["--no-sandbox", "--select"], "/home/ana")).toBeNull();
	});

	it("um caminho abre; vários viram seleção", () => {
		expect(parseLaunchArguments(["/fotos"], "/")).toEqual({ mode: "open", paths: ["/fotos"] });
		expect(parseLaunchArguments(["--open", "--", "/a", "/b"], "/")).toEqual({
			mode: "select",
			paths: ["/a", "/b"],
		});
		expect(parseLaunchArguments(["--select", "--", "/a"], "/")).toEqual({
			mode: "select",
			paths: ["/a"],
		});
	});

	it("ignora opções desconhecidas e trata tudo depois de -- como caminho", () => {
		expect(
			parseLaunchArguments(["--no-sandbox", "--open", "--", "--estranho.txt"], "/pasta"),
		).toEqual({ mode: "open", paths: ["/pasta/--estranho.txt"] });
	});

	it("resolve caminhos relativos e URIs file://, descartando outros esquemas", () => {
		expect(
			parseLaunchArguments(
				["--select", "--", "a b.jpg", "file:///home/ana/Fotos%202024", "smb://srv/x"],
				"/home/ana",
			),
		).toEqual({ mode: "select", paths: ["/home/ana/a b.jpg", "/home/ana/Fotos 2024"] });
	});

	it("não repete caminhos", () => {
		expect(parseLaunchArguments(["/a", "/a"], "/")).toEqual({ mode: "open", paths: ["/a"] });
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
