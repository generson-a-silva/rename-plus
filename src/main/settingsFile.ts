import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow } from "electron";

const settingsPath = (name: string) => path.join(app.getPath("userData"), name);

/** Conteúdo de um arquivo JSON da pasta de dados, ou `null` se não existir/for inválido. */
export function readSettingsFile(name: string): unknown {
	try {
		return JSON.parse(fs.readFileSync(settingsPath(name), "utf8"));
	} catch {
		return null;
	}
}

/**
 * Grava um arquivo JSON na pasta de dados. Escreve num temporário e renomeia, para
 * não deixar o arquivo pela metade se o app fechar no meio da gravação.
 */
export function writeSettingsFile(name: string, value: unknown): void {
	const target = settingsPath(name);
	const temp = `${target}.tmp`;
	try {
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(temp, JSON.stringify(value, null, "\t"));
		fs.renameSync(temp, target);
	} catch {
		// Falha ao persistir não impede o uso na sessão atual.
	}
}

/** Envia um evento a todas as janelas abertas. */
export function broadcast(channel: string, payload: unknown): void {
	for (const win of BrowserWindow.getAllWindows()) {
		if (!win.webContents.isDestroyed()) win.webContents.send(channel, payload);
	}
}
