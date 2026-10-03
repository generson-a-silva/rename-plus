import { describe, expect, it } from "vitest";
import { getPlatformPaths } from "./platformPaths";

describe("caminhos POSIX", () => {
	const paths = getPlatformPaths("linux");

	it("navega entre pastas", () => {
		expect(paths.join("/home/ana", "Fotos")).toBe("/home/ana/Fotos");
		expect(paths.join("/", "etc")).toBe("/etc");
		expect(paths.dirname("/home/ana/Fotos")).toBe("/home/ana");
		expect(paths.dirname("/home")).toBe("/");
		expect(paths.dirname("/")).toBe("/");
		expect(paths.basename("/home/ana/Fotos/")).toBe("Fotos");
		expect(paths.segments("/home/ana")).toEqual(["home", "ana"]);
	});

	it("diferencia maiúsculas e trata a barra final", () => {
		expect(paths.equals("/home/Ana", "/home/ana")).toBe(false);
		expect(paths.equals("/home/ana/", "/home/ana")).toBe(true);
		expect(paths.isAbsolute("home")).toBe(false);
		expect(paths.contains("/home/ana", "/home/ana/Fotos/a.jpg")).toBe(true);
		expect(paths.contains("/home/ana", "/home/anabela")).toBe(false);
		expect(paths.contains("/", "/etc")).toBe(true);
	});

	it("calcula caminho relativo", () => {
		expect(paths.relative("/home/ana", "/home/ana")).toBe(".");
		expect(paths.relative("/home/ana", "/home/ana/Fotos/2024")).toBe("Fotos/2024");
		expect(paths.relative("/", "/etc/x")).toBe("etc/x");
		expect(paths.relative("/home/ana", "/tmp")).toBe("/tmp");
	});
});

describe("caminhos Windows", () => {
	const paths = getPlatformPaths("win32");

	it("reconhece unidades e caminhos de rede", () => {
		expect(paths.root("c:/Users")).toBe("C:\\");
		expect(paths.root("\\\\servidor\\publico\\docs")).toBe("\\\\servidor\\publico\\");
		expect(paths.isAbsolute("C:\\")).toBe(true);
		expect(paths.isAbsolute("Users\\ana")).toBe(false);
		expect(paths.isAbsolute("/Users")).toBe(false);
	});

	it("navega entre pastas", () => {
		expect(paths.join("C:\\Users\\Ana", "Fotos")).toBe("C:\\Users\\Ana\\Fotos");
		expect(paths.join("C:\\", "Users")).toBe("C:\\Users");
		expect(paths.dirname("C:\\Users\\Ana")).toBe("C:\\Users");
		expect(paths.dirname("C:\\Users")).toBe("C:\\");
		expect(paths.dirname("C:\\")).toBe("C:\\");
		expect(paths.dirname("\\\\srv\\pub\\docs")).toBe("\\\\srv\\pub\\");
		expect(paths.basename("C:\\Users\\Ana\\")).toBe("Ana");
		expect(paths.segments("C:\\Users\\Ana/Fotos")).toEqual(["Users", "Ana", "Fotos"]);
	});

	it("compara sem diferenciar maiúsculas nem o tipo de barra", () => {
		expect(paths.equals("C:\\Users\\Ana", "c:/users/ana/")).toBe(true);
		expect(paths.contains("C:\\Users", "c:\\USERS\\ana\\x.txt")).toBe(true);
		expect(paths.contains("C:\\Users\\Ana", "C:\\Users\\Anabela")).toBe(false);
		expect(paths.contains("C:\\", "C:\\Windows")).toBe(true);
		expect(paths.contains("C:\\", "D:\\Dados")).toBe(false);
	});

	it("calcula caminho relativo", () => {
		expect(paths.relative("C:\\Users\\Ana", "C:\\Users\\Ana\\Fotos\\2024")).toBe("Fotos\\2024");
		expect(paths.relative("C:\\", "C:\\Windows\\x")).toBe("Windows\\x");
		expect(paths.relative("c:\\users\\ana", "C:\\Users\\Ana")).toBe(".");
	});
});
