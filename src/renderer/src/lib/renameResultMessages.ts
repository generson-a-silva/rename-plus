import type { RenameResult } from "@shared/ipc";
import type { Preview } from "@shared/rename";
import { baseName } from "./filePathUtils";
import { pluralize } from "./textPluralization";

export function describeRenameFailure(result: RenameResult): string {
	const failure = result.failed[0];
	if (!failure) return "Nada foi renomeado.";
	return `Nada foi renomeado — ${baseName(failure.from)}: ${failure.error}`;
}

/** Texto do painel "Renomear" explicando o estado da pré-visualização. */
export function describePreview(preview: Preview, selectedCount: number): string {
	if (preview.configError) return preview.configError;
	if (preview.errors > 0) {
		return `${pluralize(preview.errors, "conflito", "conflitos")} — passe o mouse sobre a linha para ver o motivo.`;
	}
	if (selectedCount === 0) return "Selecione itens na lista para ver a pré-visualização.";
	if (preview.changed > 0) {
		return `${pluralize(preview.changed, "item será renomeado", "itens serão renomeados")}.`;
	}
	return "Nenhum nome seria alterado.";
}
