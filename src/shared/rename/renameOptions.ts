/** Posição de um texto gerado em relação ao nome. */
export type Placement = "none" | "prefix" | "suffix";

/** (1) Expressão regular aplicada ao nome. */
export interface RegexOptions {
	match: string;
	replace: string;
	includeExt: boolean;
	global: boolean;
	ignoreCase: boolean;
}

/** (2) Tratamento do nome original. */
export interface NameOptions {
	mode: "keep" | "remove" | "fixed" | "reverse";
	fixed: string;
}

/** (3) Substituição de texto simples. */
export interface ReplaceOptions {
	find: string;
	with: string;
	matchCase: boolean;
}

/** (4) Maiúsculas/minúsculas. */
export interface CaseOptions {
	mode: "same" | "lower" | "upper" | "title" | "sentence";
	/** Palavras mantidas exatamente como escritas, separadas por `;`. */
	exceptions: string;
}

/** (5) Remoção de partes do nome. */
export interface RemoveOptions {
	first: number;
	last: number;
	/** Posições 1-based, inclusivas. 0 desativa. */
	from: number;
	to: number;
	chars: string;
	/** Palavras separadas por espaço. */
	words: string;
	cropMode: "none" | "before" | "after";
	cropText: string;
	digits: boolean;
	high: boolean;
	trim: boolean;
	doubleSpaces: boolean;
	accents: boolean;
	symbols: boolean;
	leadDots: boolean;
}

/** (6) Adição de texto. */
export interface AddOptions {
	prefix: string;
	insert: string;
	/** Quantidade de caracteres antes do ponto de inserção; negativo conta a partir do fim. */
	insertAt: number;
	suffix: string;
	wordSpace: boolean;
}

/** (7) Data automática. */
export interface AutoDateOptions {
	mode: Placement;
	type: "modified" | "created" | "current";
	/** Tokens: YYYY, YY, MM, DD, HH, mm, ss. */
	format: string;
	separator: string;
}

/** (8) Nome da pasta. */
export interface AppendFolderOptions {
	mode: Placement;
	separator: string;
	levels: number;
}

/** (9) Numeração sequencial. */
export interface NumberingOptions {
	mode: "none" | "prefix" | "suffix" | "both" | "insert";
	insertAt: number;
	start: number;
	increment: number;
	padding: number;
	separator: string;
	style: "decimal" | "lower" | "upper" | "roman";
	resetPerFolder: boolean;
}

/** (10) Extensão. */
export interface ExtensionOptions {
	mode: "same" | "lower" | "upper" | "title" | "remove" | "fixed" | "extra";
	value: string;
}

export interface RenameOptions {
	regex: RegexOptions;
	name: NameOptions;
	replace: ReplaceOptions;
	case: CaseOptions;
	remove: RemoveOptions;
	add: AddOptions;
	autoDate: AutoDateOptions;
	appendFolder: AppendFolderOptions;
	numbering: NumberingOptions;
	extension: ExtensionOptions;
}

export type RenameSection = keyof RenameOptions;

/** Valores padrão: nenhuma seção altera o nome. */
export function createDefaultOptions(): RenameOptions {
	return {
		regex: { match: "", replace: "", includeExt: false, global: false, ignoreCase: false },
		name: { mode: "keep", fixed: "" },
		replace: { find: "", with: "", matchCase: false },
		case: { mode: "same", exceptions: "" },
		remove: {
			first: 0,
			last: 0,
			from: 0,
			to: 0,
			chars: "",
			words: "",
			cropMode: "none",
			cropText: "",
			digits: false,
			high: false,
			trim: false,
			doubleSpaces: false,
			accents: false,
			symbols: false,
			leadDots: false,
		},
		add: { prefix: "", insert: "", insertAt: 0, suffix: "", wordSpace: false },
		autoDate: { mode: "none", type: "modified", format: "YYYY-MM-DD", separator: "_" },
		appendFolder: { mode: "none", separator: "_", levels: 1 },
		numbering: {
			mode: "none",
			insertAt: 0,
			start: 1,
			increment: 1,
			padding: 0,
			separator: "_",
			style: "decimal",
			resetPerFolder: false,
		},
		extension: { mode: "same", value: "" },
	};
}
