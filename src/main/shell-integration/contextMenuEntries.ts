import type { LaunchMode } from "../../shared/ipc";
import { LAUNCH_FLAGS } from "../launchArguments";
import {
	escapeKeyFileValue,
	escapeRegString,
	escapeXml,
	quoteDesktopExecArg,
	quotePosixArg,
	quoteWindowsArg,
} from "./commandQuoting";

/** Texto de uma entrada do menu, em todos os idiomas do app. */
export interface MenuLabel {
	/** No idioma atual da interface (scripts e Thunar não têm traduções). */
	current: string;
	/** Inglês: valor padrão de `Name=` nos arquivos .desktop. */
	fallback: string;
	/** Traduções por código de idioma do .desktop (`pt_BR`, `es`). */
	translations: Record<string, string>;
}

/** O que todas as entradas precisam: o comando que abre o app, o ícone e os textos. */
export interface MenuContext {
	/** Executável e argumentos fixos (ex.: o AppImage; em desenvolvimento, electron + pasta do app). */
	command: readonly string[];
	/** Nome do ícone no tema (hicolor) ou caminho. */
	icon: string;
	labels: Record<LaunchMode, MenuLabel>;
}

export const LAUNCH_MODES: readonly LaunchMode[] = ["open", "select"];

/** Comentário que identifica arquivos criados pelo app (scripts com nome traduzido). */
export const SCRIPT_MARKER = "# rename-plus-context-menu:";

function desktopNames(label: MenuLabel, key = "Name"): string[] {
	return [
		`${key}=${escapeKeyFileValue(label.fallback)}`,
		...Object.entries(label.translations).map(
			([locale, text]) => `${key}[${locale}]=${escapeKeyFileValue(text)}`,
		),
	];
}

/** `Exec=` de um .desktop: comando + modo + `--`, seguido do código de campo. */
function desktopExec(context: MenuContext, mode: LaunchMode, fieldCode: string): string {
	const args = [...context.command, LAUNCH_FLAGS[mode], "--"].map(quoteDesktopExecArg);
	return escapeKeyFileValue(`${args.join(" ")} ${fieldCode}`);
}

function posixCommand(context: MenuContext, mode: LaunchMode): string {
	return [...context.command, LAUNCH_FLAGS[mode], "--"].map(quotePosixArg).join(" ");
}

// ---- Dolphin (KDE Plasma) ---------------------------------------------------

/** Service menu do Dolphin (~/.local/share/kio/servicemenus; precisa ser executável). */
export function dolphinServiceMenu(context: MenuContext, mode: LaunchMode): string {
	const action = mode === "open" ? "renamePlusOpen" : "renamePlusSelect";
	return [
		"[Desktop Entry]",
		"Type=Service",
		"X-KDE-ServiceTypes=KonqPopupMenu/Plugin",
		"MimeType=all/all;",
		"X-KDE-Protocols=file",
		"X-KDE-Priority=TopLevel",
		// "Abrir" com um item; "Abrir selecionados" com dois ou mais.
		mode === "open" ? "X-KDE-MaxNumberOfUrls=1" : "X-KDE-MinNumberOfUrls=2",
		`Actions=${action};`,
		"",
		`[Desktop Action ${action}]`,
		...desktopNames(context.labels[mode]),
		`Icon=${escapeKeyFileValue(context.icon)}`,
		`Exec=${desktopExec(context, mode, mode === "open" ? "%f" : "%F")}`,
		"",
	].join("\n");
}

// ---- PCManFM-Qt / PCManFM (LXQt, LXDE): "file-manager actions" --------------

export function fileManagerAction(context: MenuContext, mode: LaunchMode): string {
	return [
		"[Desktop Entry]",
		"Type=Action",
		...desktopNames(context.labels[mode]),
		"Tooltip=Rename Plus",
		`Icon=${escapeKeyFileValue(context.icon)}`,
		"Profiles=main;",
		"",
		"[X-Action-Profile main]",
		"MimeTypes=all/all;",
		"Schemes=file;",
		mode === "open" ? "SelectionCount==1" : "SelectionCount=>1",
		`Exec=${desktopExec(context, mode, mode === "open" ? "%f" : "%F")}`,
		"",
	].join("\n");
}

// ---- Nemo (Cinnamon) ---------------------------------------------------------

export function nemoAction(context: MenuContext, mode: LaunchMode): string {
	return [
		"[Nemo Action]",
		...desktopNames(context.labels[mode]),
		"Comment=Rename Plus",
		`Exec=${escapeKeyFileValue(`${posixCommand(context, mode)} %F`)}`,
		`Icon-Name=${escapeKeyFileValue(context.icon)}`,
		// s = exatamente um item; m = dois ou mais.
		`Selection=${mode === "open" ? "s" : "m"}`,
		"Extensions=any;",
		"Quote=double",
		"",
	].join("\n");
}

// ---- Nautilus (GNOME) e Caja (MATE): scripts --------------------------------

/**
 * Script do menu "Scripts". Sem itens selecionados (fundo da pasta), abre a pasta
 * atual, que o gerenciador informa como URI em `uriVariable`.
 */
export function fileManagerScript(
	context: MenuContext,
	mode: LaunchMode,
	uriVariable: string,
): string {
	return [
		"#!/bin/sh",
		`${SCRIPT_MARKER} ${mode}`,
		"# Criado pelo Rename Plus (Configurações › Menu de contexto do sistema).",
		`[ "$#" -eq 0 ] && [ -n "$${uriVariable}" ] && set -- "$${uriVariable}"`,
		`exec ${posixCommand(context, mode)} "$@"`,
		"",
	].join("\n");
}

/** Modo de um script criado pelo app (pelo comentário de identificação), ou `null`. */
export function scriptMode(content: string): LaunchMode | null {
	const line = content.split("\n").find((item) => item.startsWith(SCRIPT_MARKER));
	const mode = line?.slice(SCRIPT_MARKER.length).trim();
	return mode === "open" || mode === "select" ? mode : null;
}

// ---- Thunar (Xfce): ações personalizadas em uca.xml --------------------------

const THUNAR_ID_PREFIX = "rename-plus-";
const THUNAR_ACTION = /[ \t]*<action>(?:(?!<\/action>)[\s\S])*?<\/action>[ \t]*\r?\n?/g;

function thunarAction(context: MenuContext, mode: LaunchMode): string {
	const command = `${posixCommand(context, mode)} ${mode === "open" ? "%f" : "%F"}`;
	return [
		"<action>",
		`\t<icon>${escapeXml(context.icon)}</icon>`,
		`\t<name>${escapeXml(context.labels[mode].current)}</name>`,
		"\t<submenu></submenu>",
		`\t<unique-id>${THUNAR_ID_PREFIX}${mode}</unique-id>`,
		`\t<command>${escapeXml(command)}</command>`,
		"\t<description>Rename Plus</description>",
		// Thunar 4.18+: "1" = um item; "2-*" = dois ou mais (versões antigas ignoram).
		`\t<range>${mode === "open" ? "1" : "2-*"}</range>`,
		"\t<patterns>*</patterns>",
		"\t<directories/>",
		"\t<audio-files/>",
		"\t<image-files/>",
		"\t<other-files/>",
		"\t<text-files/>",
		"\t<video-files/>",
		"</action>",
	].join("\n");
}

function isOwnThunarAction(block: string): boolean {
	return block.includes(`<unique-id>${THUNAR_ID_PREFIX}`);
}

/** Nome e comando das ações do app em uca.xml (para comparar com o esperado). */
export function thunarActionSummary(xml: string): string[] {
	return [...xml.matchAll(THUNAR_ACTION)]
		.map(([block]) => block)
		.filter(isOwnThunarAction)
		.map((block) => {
			const pick = (tag: string) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1];
			return `${pick("unique-id")}|${pick("name")}|${pick("command")}`;
		})
		.sort();
}

export function expectedThunarSummary(context: MenuContext): string[] {
	return thunarActionSummary(
		`${LAUNCH_MODES.map((mode) => thunarAction(context, mode)).join("\n")}\n`,
	);
}

/**
 * uca.xml com as ações do app trocadas (ou removidas, com `context` nulo), mantendo
 * as demais ações do usuário.
 */
export function mergeThunarActions(xml: string, context: MenuContext | null): string {
	if (!xml.includes("</actions>")) throw new Error("uca.xml inválido: falta </actions>");
	const kept = xml.replace(THUNAR_ACTION, (block) => (isOwnThunarAction(block) ? "" : block));
	if (!context) return kept;
	const added = LAUNCH_MODES.map((mode) => `${thunarAction(context, mode)}\n`).join("");
	const end = kept.lastIndexOf("</actions>");
	return `${kept.slice(0, end)}${added}${kept.slice(end)}`;
}

export const EMPTY_THUNAR_ACTIONS =
	'<?xml version="1.0" encoding="UTF-8"?>\n<actions>\n</actions>\n';

// ---- Windows: Explorador de Arquivos (registro) -----------------------------

export const WINDOWS_VERB_KEYS = { open: "RenamePlus.Open", select: "RenamePlus.OpenSelection" };

interface WindowsVerb {
	/** Relativo a Software\Classes. */
	key: string;
	mode: LaunchMode;
	/** %1 = item clicado; %V = pasta aberta (clique no fundo). */
	argument: "%1" | "%V";
	/** Single: só com um item selecionado. Player: qualquer quantidade. */
	multiSelect: "Single" | "Player" | null;
}

/** Igual ao instalador (resources/installer.nsh). */
export const WINDOWS_VERBS: readonly WindowsVerb[] = [
	{
		key: `*\\shell\\${WINDOWS_VERB_KEYS.open}`,
		mode: "open",
		argument: "%1",
		multiSelect: "Single",
	},
	{
		key: `Directory\\shell\\${WINDOWS_VERB_KEYS.open}`,
		mode: "open",
		argument: "%1",
		multiSelect: "Single",
	},
	{
		key: `Directory\\Background\\shell\\${WINDOWS_VERB_KEYS.open}`,
		mode: "open",
		argument: "%V",
		multiSelect: null,
	},
	{
		key: `Drive\\shell\\${WINDOWS_VERB_KEYS.open}`,
		mode: "open",
		argument: "%1",
		multiSelect: "Single",
	},
	{
		key: `*\\shell\\${WINDOWS_VERB_KEYS.select}`,
		mode: "select",
		argument: "%1",
		multiSelect: "Player",
	},
	{
		key: `Directory\\shell\\${WINDOWS_VERB_KEYS.select}`,
		mode: "select",
		argument: "%1",
		multiSelect: "Player",
	},
];

/** Valor que identifica a versão das entradas (muda com o comando ou os textos). */
export const WINDOWS_SIGNATURE_VALUE = "RenamePlusSignature";

export function windowsVerbCommand(context: MenuContext, verb: WindowsVerb): string {
	const args = context.command.map(quoteWindowsArg).join(" ");
	return `${args} ${LAUNCH_FLAGS[verb.mode]} -- "${verb.argument}"`;
}

const REG_HEADER = "Windows Registry Editor Version 5.00";
const userClasses = (key: string) => `HKEY_CURRENT_USER\\Software\\Classes\\${key}`;

/** Arquivo .reg que cria as entradas para o usuário atual. */
export function windowsInstallScript(context: MenuContext, signature: string): string {
	const sections = WINDOWS_VERBS.flatMap((verb) => {
		const values = [
			`"MUIVerb"="${escapeRegString(context.labels[verb.mode].current)}"`,
			`"Icon"="${escapeRegString(context.icon)}"`,
			...(verb.multiSelect ? [`"MultiSelectModel"="${verb.multiSelect}"`] : []),
			`"${WINDOWS_SIGNATURE_VALUE}"="${signature}"`,
		];
		return [
			`[${userClasses(verb.key)}]`,
			...values,
			"",
			`[${userClasses(verb.key)}\\command]`,
			`@="${escapeRegString(windowsVerbCommand(context, verb))}"`,
			"",
		];
	});
	return [REG_HEADER, "", ...sections].join("\r\n");
}

/** Arquivo .reg que remove as entradas do usuário atual. */
export function windowsRemoveScript(): string {
	const sections = WINDOWS_VERBS.map((verb) => `[-${userClasses(verb.key)}]`);
	return [REG_HEADER, "", ...sections, ""].join("\r\n");
}
