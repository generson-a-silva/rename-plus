/** Item de menu de contexto nativo, descrito pelo renderer e exibido pelo processo principal. */
export type ContextMenuItem =
	| { type: "separator" }
	| {
			type?: "normal" | "checkbox";
			/** Devolvido pelo `showContextMenu` quando o item é clicado. */
			id: string;
			label: string;
			enabled?: boolean;
			checked?: boolean;
			/** Atalho exibido ao lado do item (só informativo), ex.: "CmdOrCtrl+C". */
			accelerator?: string;
	  };
