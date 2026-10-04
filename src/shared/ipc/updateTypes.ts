/** Uma versão publicada nas releases do GitHub. */
export interface ReleaseInfo {
	/** Sem o "v" da tag (ex.: "1.4.0"). */
	version: string;
	/** Título da release ("" se não tiver). */
	name: string;
	/** Página da release, com as notas e os arquivos para baixar. */
	url: string;
	/** Data de publicação (ISO 8601). */
	publishedAt: string;
}

/** Preferências da verificação de atualizações (salvas em `updates.json`). */
export interface UpdateSettings {
	/** Verifica ao abrir o app e, com ele aberto, a cada 12 horas. */
	autoCheck: boolean;
	/** Versão que o usuário pediu para ignorar: não volta a ser anunciada ("" = nenhuma). */
	skippedVersion: string;
}

export type UpdateCheckState =
	| { status: "idle" }
	| { status: "checking" }
	| { status: "upToDate"; checkedAt: number }
	| { status: "available"; release: ReleaseInfo; checkedAt: number }
	| { status: "error"; error: string; checkedAt: number };

export interface UpdateStatus {
	/** Versão instalada. */
	currentVersion: string;
	settings: UpdateSettings;
	state: UpdateCheckState;
}
