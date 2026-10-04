import { escapeKeyFileValue, quoteDesktopExecArg } from "./shell-integration/commandQuoting";

/**
 * Inicia sem janela, só para as pastas monitoradas (início com o sistema). Abrir o app
 * de novo mostra a janela nesse mesmo processo.
 */
export const BACKGROUND_FLAG = "--background";

/** Nome do valor em ...\CurrentVersion\Run (igual ao do instalador, resources/installer.nsh). */
export const WINDOWS_RUN_VALUE = "Rename Plus";

/** Arquivo em ~/.config/autostart (XDG Autostart, seguido por KDE, GNOME, XFCE, Cinnamon…). */
export const AUTOSTART_FILE = "rename-plus-background.desktop";

/** Como uma instância identifica a si mesma ao repassar a abertura para outra. */
export interface InstanceIdentity {
	version: string;
	/** Comando que abre esta instância (ex.: o caminho do AppImage). */
	command: string[];
	/** Argumentos do usuário (sem o executável nem, em desenvolvimento, a pasta do app). */
	args: string[];
}

export function asInstanceIdentity(value: unknown): InstanceIdentity | null {
	if (typeof value !== "object" || value === null) return null;
	const { version, command, args } = value as Partial<InstanceIdentity>;
	const strings = (list: unknown): list is string[] =>
		Array.isArray(list) && list.every((item) => typeof item === "string");
	if (typeof version !== "string" || !strings(command) || !strings(args) || command.length === 0)
		return null;
	return { version, command, args };
}

/**
 * Uma instância em segundo plano (sem janela) cede o lugar a outra versão do app que
 * acabou de ser aberta, por exemplo um AppImage novo baixado: senão a versão antiga
 * continuaria rodando e mostraria a própria janela. Com janela aberta, nada muda.
 */
export function shouldHandOver(
	own: Omit<InstanceIdentity, "args">,
	hasWindow: boolean,
	incoming: InstanceIdentity | null,
): boolean {
	if (hasWindow || !incoming) return false;
	return incoming.version !== own.version || incoming.command.join("\0") !== own.command.join("\0");
}

/** Entrada XDG Autostart que inicia o app em segundo plano ao entrar na sessão. */
export function autostartDesktopEntry(command: readonly string[], comment: string): string {
	const exec = [...command, BACKGROUND_FLAG].map(quoteDesktopExecArg).join(" ");
	return [
		"[Desktop Entry]",
		"Type=Application",
		"Version=1.0",
		"Name=Rename Plus",
		`Comment=${escapeKeyFileValue(comment)}`,
		`Exec=${exec}`,
		"Icon=rename-plus",
		"Terminal=false",
		"NoDisplay=true",
		"X-GNOME-Autostart-enabled=true",
		// KDE: espera o painel, para o ícone da bandeja ter onde aparecer.
		"X-KDE-autostart-after=panel",
		"",
	].join("\n");
}
