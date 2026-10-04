import { describe, expect, it } from "vitest";
import {
	asInstanceIdentity,
	autostartDesktopEntry,
	BACKGROUND_FLAG,
	shouldHandOver,
} from "./backgroundLaunch";

const own = { version: "1.4.0", command: ["/home/u/Apps/rename-plus-1.4.0.AppImage"] };

describe("shouldHandOver", () => {
	it("cede a uma versão diferente ou a outro executável quando está sem janela", () => {
		const newer = { version: "1.5.0", command: own.command, args: [] };
		const moved = { version: "1.4.0", command: ["/opt/rename-plus.AppImage"], args: [] };
		expect(shouldHandOver(own, false, newer)).toBe(true);
		expect(shouldHandOver(own, false, moved)).toBe(true);
	});

	it("mantém-se com a mesma instalação, com janela aberta ou sem identificação", () => {
		const same = { ...own, args: ["--open", "/tmp"] };
		expect(shouldHandOver(own, false, same)).toBe(false);
		expect(shouldHandOver(own, true, { ...same, version: "2.0.0" })).toBe(false);
		expect(shouldHandOver(own, false, null)).toBe(false);
	});
});

describe("asInstanceIdentity", () => {
	it("aceita só o formato esperado", () => {
		expect(asInstanceIdentity({ version: "1.0.0", command: ["/a"], args: [] })).toEqual({
			version: "1.0.0",
			command: ["/a"],
			args: [],
		});
		expect(asInstanceIdentity({ version: "1.0.0", command: [], args: [] })).toBeNull();
		expect(asInstanceIdentity({ version: 1, command: ["/a"], args: [] })).toBeNull();
		expect(asInstanceIdentity("x")).toBeNull();
	});
});

describe("autostartDesktopEntry", () => {
	it("inicia o comando com a opção de segundo plano, com aspas quando preciso", () => {
		const entry = autostartDesktopEntry(
			["/home/u/My Apps/rename-plus.AppImage"],
			"Pastas monitoradas\nem segundo plano",
		);
		expect(entry).toContain(`Exec="/home/u/My Apps/rename-plus.AppImage" ${BACKGROUND_FLAG}\n`);
		expect(entry).toContain("Comment=Pastas monitoradas\\nem segundo plano\n");
		expect(entry).toContain("NoDisplay=true");
		expect(entry.startsWith("[Desktop Entry]\nType=Application")).toBe(true);
	});

	it("mantém o Electron e a pasta do projeto em desenvolvimento", () => {
		const entry = autostartDesktopEntry(
			["/repo/node_modules/electron/dist/electron", "/repo"],
			"x",
		);
		expect(entry).toContain(
			`Exec=/repo/node_modules/electron/dist/electron /repo ${BACKGROUND_FLAG}`,
		);
	});
});
