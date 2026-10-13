import type { WatchRule, WatchRuleProblem } from "../watch";

/** Situação de uma regra de pasta monitorada no processo principal. */
export type WatchRuleStatus =
	| { state: "watching" }
	| { state: "disabled" }
	/** Configuração incompleta: a regra não faria nada. */
	| { state: "incomplete"; problem: WatchRuleProblem }
	/** Não foi possível monitorar (pasta inexistente, sem permissão…). */
	| { state: "error"; error: string };

/** Um arquivo processado (ou que falhou) por uma regra. */
export interface WatchActivity {
	id: number;
	time: number;
	ruleId: string;
	ruleName: string;
	/** Caminho original do arquivo. */
	from: string;
	/** Caminho final, ou `null` se falhou. */
	to: string | null;
	error: string | null;
}

export interface WatchFoldersInfo {
	rules: WatchRule[];
	/** Por `id` da regra. */
	statuses: Record<string, WatchRuleStatus>;
	/** Arquivos já processados por regra (por `id`); é a posição usada pela numeração. */
	counters: Record<string, number>;
	/** Mais recentes primeiro. */
	activity: WatchActivity[];
}
