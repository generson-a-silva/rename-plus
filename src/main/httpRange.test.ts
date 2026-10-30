import { describe, expect, it } from "vitest";
import { parseRange } from "./httpRange";

describe("parseRange", () => {
	it("sem cabeçalho: arquivo inteiro", () => {
		expect(parseRange(null, 100)).toBeNull();
	});

	it.each([
		["bytes=0-", { start: 0, end: 99 }],
		["bytes=10-19", { start: 10, end: 19 }],
		["bytes=90-500", { start: 90, end: 99 }],
		["bytes=-30", { start: 70, end: 99 }],
		["bytes=-500", { start: 0, end: 99 }],
	])("%s", (header, expected) => {
		expect(parseRange(header, 100)).toEqual(expected);
	});

	it.each(["bytes=100-", "bytes=20-10", "bytes=-", "bytes=0-1,5-6", "items=0-1"])(
		"inválida: %s",
		(header) => {
			expect(parseRange(header, 100)).toBe("invalid");
		},
	);
});
