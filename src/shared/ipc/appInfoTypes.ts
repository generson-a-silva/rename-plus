/** Identificação do app, vinda do package.json (exibida na barra de status). */
export interface AppInfo {
	productName: string;
	version: string;
	/** Autor/proprietário ("" se não definido). */
	author: string;
}
