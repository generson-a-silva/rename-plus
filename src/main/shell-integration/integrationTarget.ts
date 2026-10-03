import type { MessageRef } from "../../shared/i18n";
import type { ContextMenuStatus } from "../../shared/ipc";

/** Um gerenciador de arquivos cujo menu de contexto o app sabe alterar. */
export interface IntegrationTarget {
	id: string;
	name: string;
	desktops: string;
	detected: boolean;
	recommended: boolean;
	note: MessageRef | null;
	locations: string[];
	status: () => Promise<{ status: ContextMenuStatus; installedBySystem: boolean }>;
	install: () => Promise<void>;
	remove: () => Promise<void>;
}
