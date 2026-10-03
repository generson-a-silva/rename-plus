import { describe, expect, it } from "vitest";
import { quoteDesktopExecArg, quotePosixArg } from "./commandQuoting";
import {
	dolphinServiceMenu,
	EMPTY_THUNAR_ACTIONS,
	expectedThunarSummary,
	fileManagerScript,
	type MenuContext,
	mergeThunarActions,
	scriptMode,
	thunarActionSummary,
	windowsInstallScript,
	windowsRemoveScript,
} from "./contextMenuEntries";

const label = (current: string, fallback: string) => ({
	current,
	fallback,
	translations: { pt_BR: current },
});

const context: MenuContext = {
	command: ["/home/ana/Apps/Rename Plus.AppImage"],
	icon: "rename-plus",
	labels: {
		open: label("Abrir no Rename Plus", "Open in Rename Plus"),
		select: label("Abrir selecionados no Rename Plus", "Open selected in Rename Plus"),
	},
};

describe("aspas", () => {
	it("Exec= de .desktop: aspas duplas, escapes e % dobrado", () => {
		expect(quoteDesktopExecArg("/usr/bin/app")).toBe("/usr/bin/app");
		expect(quoteDesktopExecArg("/a b/100%")).toBe('"/a b/100%%"');
		expect(quoteDesktopExecArg('/x/"$y"')).toBe('"/x/\\"\\$y\\""');
	});

	it("shell POSIX: aspas simples", () => {
		expect(quotePosixArg("/usr/bin/app")).toBe("/usr/bin/app");
		expect(quotePosixArg("/a b/it's")).toBe("'/a b/it'\\''s'");
	});
});

describe("Dolphin", () => {
	it("abre um item com %f e seleciona vários com %F", () => {
		const open = dolphinServiceMenu(context, "open");
		expect(open).toContain("X-KDE-MaxNumberOfUrls=1");
		expect(open).toContain('Exec="/home/ana/Apps/Rename Plus.AppImage" --open -- %f');
		expect(open).toContain("Name=Open in Rename Plus");
		expect(open).toContain("Name[pt_BR]=Abrir no Rename Plus");

		const select = dolphinServiceMenu(context, "select");
		expect(select).toContain("X-KDE-MinNumberOfUrls=2");
		expect(select).toContain("--select -- %F");
	});

	it("barra invertida no caminho é escapada duas vezes (aspas e valor)", () => {
		const menu = dolphinServiceMenu({ ...context, command: ["/a\\b c"] }, "open");
		expect(menu).toContain('Exec="/a\\\\\\\\b c" --open -- %f');
	});
});

describe("scripts (Nautilus/Caja)", () => {
	it("usa a pasta atual quando nada está selecionado", () => {
		const script = fileManagerScript(context, "select", "NAUTILUS_SCRIPT_CURRENT_URI");
		expect(script).toContain('set -- "$NAUTILUS_SCRIPT_CURRENT_URI"');
		expect(script).toContain(`exec '/home/ana/Apps/Rename Plus.AppImage' --select -- "$@"`);
		expect(scriptMode(script)).toBe("select");
		expect(scriptMode("#!/bin/sh\necho oi\n")).toBeNull();
	});
});

describe("Thunar (uca.xml)", () => {
	const userXml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		"<actions>",
		"<action>",
		"\t<name>Abrir terminal aqui</name>",
		"\t<unique-id>1234-1</unique-id>",
		"\t<command>exo-open --launch TerminalEmulator</command>",
		"</action>",
		"</actions>",
		"",
	].join("\n");

	it("adiciona, atualiza e remove só as ações do app", () => {
		const added = mergeThunarActions(userXml, context);
		expect(added).toContain("Abrir terminal aqui");
		expect(thunarActionSummary(added)).toEqual(expectedThunarSummary(context));

		const again = mergeThunarActions(added, context);
		expect(again).toBe(added);

		const removed = mergeThunarActions(added, null);
		expect(removed).toBe(userXml);
		expect(thunarActionSummary(removed)).toEqual([]);
	});

	it("comando com aspas simples e XML escapado", () => {
		const xml = mergeThunarActions(EMPTY_THUNAR_ACTIONS, context);
		expect(xml).toContain("<command>'/home/ana/Apps/Rename Plus.AppImage' --open -- %f</command>");
		expect(xml).toContain("<range>2-*</range>");
	});

	it("recusa arquivo inválido", () => {
		expect(() => mergeThunarActions("<lixo>", context)).toThrow();
	});
});

describe("Windows (.reg)", () => {
	const windows: MenuContext = {
		...context,
		command: ["C:\\Program Files\\Rename Plus\\Rename Plus.exe"],
		icon: "C:\\Program Files\\Rename Plus\\Rename Plus.exe,0",
	};

	it("cria as entradas no HKCU com comando e assinatura", () => {
		const script = windowsInstallScript(windows, "abc123");
		expect(script.startsWith("Windows Registry Editor Version 5.00\r\n")).toBe(true);
		expect(script).toContain("[HKEY_CURRENT_USER\\Software\\Classes\\*\\shell\\RenamePlus.Open]");
		expect(script).toContain('"MUIVerb"="Abrir no Rename Plus"');
		expect(script).toContain('"MultiSelectModel"="Player"');
		expect(script).toContain('"RenamePlusSignature"="abc123"');
		expect(script).toContain(
			'@="\\"C:\\\\Program Files\\\\Rename Plus\\\\Rename Plus.exe\\" --open -- \\"%V\\""',
		);
	});

	it("remove todas as chaves", () => {
		const script = windowsRemoveScript();
		expect(script).toContain(
			"[-HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\RenamePlus.Open]",
		);
		expect(script.match(/\[-/g)).toHaveLength(6);
	});
});
