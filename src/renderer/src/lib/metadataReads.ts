import type { FileEntry } from "@shared/ipc";
import { metadataKindOf } from "@shared/metadata";

/** Versão do arquivo quando os metadados foram lidos (mudou, precisa ler de novo). */
export interface ReadStamp {
	mtimeMs: number;
	size: number;
}

export interface MetadataReadPlan {
	/**
	 * `start`: cancelar a leitura em andamento (se houver) e ler `toRead`; `keep`: a leitura
	 * em andamento já cobre tudo; `cancel`: nada selecionado falta ler; `none`: nada a fazer.
	 */
	action: "start" | "keep" | "cancel" | "none";
	toRead: FileEntry[];
	/** Pastas e tipos que não têm metadados: entram direto como `null`. */
	withoutMetadata: FileEntry[];
}

export function isFreshRead(stamp: ReadStamp | undefined, entry: FileEntry): boolean {
	return stamp?.mtimeMs === entry.mtimeMs && stamp.size === entry.size;
}

/**
 * Decide o que fazer com a leitura de metadados quando a seleção (ou a listagem) muda.
 * Uma listagem que se atualiza o tempo todo (download, arquivos chegando) recria os
 * itens a cada evento: se a leitura em andamento (`running`) já cobre o que falta, ela
 * continua, em vez de recomeçar e nunca terminar.
 */
export function planMetadataReads(
	entries: readonly FileEntry[],
	known: ReadonlyMap<string, ReadStamp>,
	running: ReadonlySet<string> | null,
): MetadataReadPlan {
	const toRead: FileEntry[] = [];
	const withoutMetadata: FileEntry[] = [];
	for (const entry of entries) {
		if (isFreshRead(known.get(entry.path), entry)) continue;
		if (entry.isDir || !metadataKindOf(entry.name)) withoutMetadata.push(entry);
		else toRead.push(entry);
	}
	let action: MetadataReadPlan["action"];
	if (toRead.length === 0) action = running ? "cancel" : "none";
	else if (running && toRead.every((entry) => running.has(entry.path))) action = "keep";
	else action = "start";
	return { action, toRead, withoutMetadata };
}
