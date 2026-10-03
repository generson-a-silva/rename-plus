export interface ConfirmRequest {
	message: string;
	detail?: string;
	confirmLabel?: string;
	/** "warning" para ações irreversíveis (ícone de alerta do sistema). */
	severity?: "question" | "warning";
}
