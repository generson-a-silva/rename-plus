import { describe, expect, it } from "vitest";
import { insertItem, moveItem } from "./listReorder";

const list = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (items: { id: string }[]) => items.map((item) => item.id).join("");

describe("moveItem", () => {
	it("usa a posição da lista original, como o marcador de soltura", () => {
		expect(ids(moveItem(list, "a", 3))).toBe("bcad");
		expect(ids(moveItem(list, "a", 4))).toBe("bcda");
		expect(ids(moveItem(list, "d", 0))).toBe("dabc");
		expect(ids(moveItem(list, "c", 1))).toBe("acbd");
	});

	it("não muda nada ao soltar logo antes ou depois do próprio item", () => {
		expect(ids(moveItem(list, "b", 1))).toBe("abcd");
		expect(ids(moveItem(list, "b", 2))).toBe("abcd");
	});

	it("ignora ids desconhecidos e posições fora da lista", () => {
		expect(ids(moveItem(list, "x", 0))).toBe("abcd");
		expect(ids(moveItem(list, "a", 99))).toBe("bcda");
		expect(ids(moveItem(list, "d", -5))).toBe("dabc");
	});
});

describe("insertItem", () => {
	it("insere na posição, limitada ao tamanho", () => {
		expect(ids(insertItem(list, { id: "x" }, 1))).toBe("axbcd");
		expect(ids(insertItem(list, { id: "x" }, 99))).toBe("abcdx");
		expect(ids(insertItem(list, { id: "x" }, -1))).toBe("xabcd");
	});
});
