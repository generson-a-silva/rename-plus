import { describe, expect, it } from "vitest";
import { compareVersions, normalizeVersion, parseVersion } from "./versionCompare";

describe("parseVersion", () => {
	it("aceita tags com 'v' e versões curtas", () => {
		expect(parseVersion("v1.3.2")).toEqual({ core: [1, 3, 2], prerelease: [] });
		expect(parseVersion("2.1")).toEqual({ core: [2, 1, 0], prerelease: [] });
		expect(parseVersion("1.0.0-beta.2+build.5")).toEqual({
			core: [1, 0, 0],
			prerelease: ["beta", "2"],
		});
	});

	it("rejeita textos que não são versões", () => {
		expect(parseVersion("latest")).toBeNull();
		expect(parseVersion("")).toBeNull();
	});
});

describe("compareVersions", () => {
	it("ordena pelas partes numéricas, não como texto", () => {
		expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
		expect(compareVersions("1.3.2", "v1.3.2")).toBe(0);
		expect(compareVersions("1.3.2", "1.4.0")).toBe(-1);
		expect(compareVersions("2.0.0", "1.99.99")).toBe(1);
	});

	it("põe pré-lançamentos antes da versão final", () => {
		expect(compareVersions("1.4.0-beta.1", "1.4.0")).toBe(-1);
		expect(compareVersions("1.4.0", "1.4.0-rc.1")).toBe(1);
		expect(compareVersions("1.4.0-beta.2", "1.4.0-beta.10")).toBe(-1);
		expect(compareVersions("1.4.0-beta", "1.4.0-beta.1")).toBe(-1);
		expect(compareVersions("1.4.0-alpha", "1.4.0-beta")).toBe(-1);
	});

	it("considera versões inválidas anteriores às válidas", () => {
		expect(compareVersions("abc", "0.0.1")).toBe(-1);
		expect(compareVersions("0.0.1", "abc")).toBe(1);
	});
});

describe("normalizeVersion", () => {
	it("remove o 'v' das tags", () => {
		expect(normalizeVersion("v1.4.0")).toBe("1.4.0");
		expect(normalizeVersion(" 1.4.0 ")).toBe("1.4.0");
	});
});
