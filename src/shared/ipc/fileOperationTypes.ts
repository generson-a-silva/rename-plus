export interface FileOperationFailure {
	path: string;
	error: string;
	/** A lixeira não está disponível nesse disco (tmpfs, alguns pendrives e unidades de rede). */
	trashUnavailable?: boolean;
}

/** Resultado de copiar, mover, criar pasta ou mover para a lixeira. */
export interface FileOperationResult {
	ok: boolean;
	/** Caminhos criados/afetados no destino (ex.: cópias, pasta nova). */
	created: string[];
	failed: FileOperationFailure[];
}
