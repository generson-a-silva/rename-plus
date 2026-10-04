import type { MessageRef } from "../i18n";

/** Pastas monitoradas com o app fechado: o app inicia com a sessão, sem janela. */
export interface BackgroundInfo {
	/** O sistema permite (Linux e Windows). */
	supported: boolean;
	/** Escolha deste usuário (ou o padrão do instalador, se ele ainda não escolheu). */
	enabled: boolean;
	/** Windows: o instalador ativou o início com o sistema para todos os usuários. */
	enabledByInstaller: boolean;
	/** Onde fica a entrada de início com o sistema (exibida nas configurações). */
	location: string | null;
	/** Avisos (ex.: AppImage que muda de lugar, modo de desenvolvimento). */
	warnings: MessageRef[];
	/** Erro ao criar/remover a entrada na última alteração. */
	error: string | null;
}
