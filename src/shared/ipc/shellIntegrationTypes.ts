import type { MessageRef } from "../i18n";

/**
 * Como abrir os itens recebidos de fora (menu de contexto do sistema, linha de comando):
 * - `open`: um item — pasta abre direto; arquivo abre a pasta onde está, já selecionado.
 * - `select`: vários itens — abre a pasta onde estão, todos selecionados.
 */
export type LaunchMode = "open" | "select";

export interface LaunchRequest {
	mode: LaunchMode;
	/** Caminhos absolutos, já conferidos no processo principal. */
	paths: string[];
}

/** Situação das entradas no menu de contexto de um gerenciador de arquivos. */
export type ContextMenuStatus = "installed" | "outdated" | "absent";

export interface ContextMenuTarget {
	id: string;
	/** Nome do gerenciador de arquivos ("Dolphin", "Explorador de Arquivos"). */
	name: string;
	/** Ambientes em que ele é o padrão ("KDE Plasma"). */
	desktops: string;
	/** Instalado neste sistema. */
	detected: boolean;
	/** É o gerenciador de arquivos padrão (ou o do ambiente atual). */
	recommended: boolean;
	status: ContextMenuStatus;
	/** Windows: o instalador adicionou as entradas para todos os usuários. */
	installedBySystem: boolean;
	/** Arquivos ou chaves de registro criados. */
	locations: string[];
	/** Observação sobre onde as opções aparecem. */
	note: MessageRef | null;
}

export interface ShellIntegrationInfo {
	/** Comando que as entradas executam. */
	command: string;
	/** Avisos sobre o executável (AppImage que pode mudar de lugar, modo de desenvolvimento). */
	warnings: MessageRef[];
	targets: ContextMenuTarget[];
}

export interface ShellIntegrationUpdate {
	info: ShellIntegrationInfo;
	/** Mensagem de erro já traduzida, se a alteração falhou. */
	error: string | null;
}
