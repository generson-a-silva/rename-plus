export interface ConfirmRequest {
	message: string;
	detail?: string;
	confirmLabel?: string;
	/** "warning" para ações irreversíveis (ícone de alerta do sistema). */
	severity?: "question" | "warning";
	/** Caixa de seleção abaixo da mensagem (ex.: "Não exibir esta confirmação novamente"). */
	checkbox?: { label: string; checked: boolean };
}

/** Resposta de uma confirmação com caixa de seleção. */
export interface ConfirmResult {
	confirmed: boolean;
	/** Situação da caixa de seleção ao fechar. */
	checked: boolean;
}
