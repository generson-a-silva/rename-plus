import { describe, expect, it } from "vitest";
import {
	buildEntriesMenu,
	buildFolderMenu,
	buildListBackgroundMenu,
	matchFileShortcut,
	type ShortcutKeyEvent,
} from "./fileContextMenus";

const key = (k: string, mods: Partial<ShortcutKeyEvent> = {}): ShortcutKeyEvent => ({
	key: k,
	ctrlKey: false,
	metaKey: false,
	shiftKey: false,
	altKey: false,
	...mods,
});

const enabledIds = (items: ReturnType<typeof buildEntriesMenu>) =>
	items.flatMap((item) => ("id" in item && item.enabled !== false ? [item.id] : []));

describe("menus de contexto", () => {
	it("com um item, permite abrir e renomear", () => {
		const items = buildEntriesMenu({
			count: 1,
			singleIsDir: false,
			canPaste: false,
			showHidden: false,
		});
		expect(enabledIds(items)).toEqual([
			"open",
			"showInFolder",
			"rename",
			"cut",
			"copy",
			"copyPath",
			"trash",
			"toggleHidden",
		]);
	});

	it("com vários itens, desativa abrir/renomear e mostra a quantidade", () => {
		const items = buildEntriesMenu({
			count: 3,
			singleIsDir: false,
			canPaste: true,
			showHidden: true,
		});
		expect(enabledIds(items)).not.toContain("rename");
		expect(enabledIds(items)).toContain("paste");
		expect(items).toContainEqual(
			expect.objectContaining({ id: "trash", label: "Mover 3 itens para a lixeira" }),
		);
		expect(items).toContainEqual(expect.objectContaining({ id: "toggleHidden", checked: true }));
	});

	it("protege as raízes da árvore", () => {
		const ids = enabledIds(buildFolderMenu({ isRoot: true, canPaste: false, showHidden: false }));
		expect(ids).not.toContain("rename");
		expect(ids).not.toContain("trash");
		expect(ids).toContain("newFolder");
	});

	it("na área livre, oferece nova pasta e colar", () => {
		const ids = enabledIds(
			buildListBackgroundMenu({ canPaste: true, hasEntries: false, showHidden: false }),
		);
		expect(ids).toEqual(expect.arrayContaining(["newFolder", "paste", "refresh"]));
		expect(ids).not.toContain("selectAll");
	});
});

describe("matchFileShortcut", () => {
	it("reconhece os atalhos de arquivo", () => {
		expect(matchFileShortcut(key("F2"))).toBe("rename");
		expect(matchFileShortcut(key("Delete"))).toBe("trash");
		expect(matchFileShortcut(key("c", { ctrlKey: true }))).toBe("copy");
		expect(matchFileShortcut(key("X", { ctrlKey: true }))).toBe("cut");
		expect(matchFileShortcut(key("N", { ctrlKey: true, shiftKey: true }))).toBe("newFolder");
		expect(matchFileShortcut(key("h", { ctrlKey: true }))).toBe("toggleHidden");
	});

	it("ignora teclas sem relação", () => {
		expect(matchFileShortcut(key("c"))).toBeNull();
		expect(matchFileShortcut(key("c", { ctrlKey: true, altKey: true }))).toBeNull();
		expect(matchFileShortcut(key("a", { ctrlKey: true }))).toBeNull();
	});
});
