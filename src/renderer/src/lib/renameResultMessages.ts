import type { Translator } from "@shared/i18n";
import type { RenameResult } from "@shared/ipc";
import type { Preview } from "@shared/rename";
import { baseName } from "./filePathUtils";

export function describeRenameFailure(result: RenameResult, t: Translator): string {
	const failure = result.failed[0];
	if (!failure) return t("rename.failedNothing");
	return t("rename.failedItem", { name: baseName(failure.from), error: failure.error });
}

/** Texto da área de ações explicando o estado da pré-visualização. */
export function describePreview(preview: Preview, selectedCount: number, t: Translator): string {
	if (preview.configError) return t(preview.configError.key, preview.configError.params);
	if (preview.errors > 0) return t("preview.conflicts", { count: preview.errors });
	if (selectedCount === 0) return t("preview.selectItems");
	if (preview.changed > 0) return t("preview.willRename", { count: preview.changed });
	return t("preview.nothingToChange");
}
