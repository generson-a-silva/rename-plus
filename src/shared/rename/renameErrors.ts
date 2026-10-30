import type { MessageRef } from "../i18n";

/** Opções que impedem calcular os nomes (ex.: RegEx malformada); `ref` descreve o motivo. */
export class RenameConfigError extends Error {
	constructor(readonly ref: MessageRef) {
		super(ref.key);
	}
}

/** Um item não pode ser renomeado com as opções atuais (ex.: falta um campo nos metadados). */
export class RenameItemError extends Error {
	constructor(readonly ref: MessageRef) {
		super(ref.key);
	}
}
