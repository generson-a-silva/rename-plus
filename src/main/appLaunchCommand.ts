import { app } from "electron";

/**
 * Como abrir o app de fora (menu de contexto, início com o sistema): o AppImage (não o
 * executável dentro dele, que só existe enquanto o app roda), o executável instalado
 * ou, em desenvolvimento, o Electron com a pasta do projeto.
 */
export function appLaunchCommand(): string[] {
	if (process.env.APPIMAGE) return [process.env.APPIMAGE];
	if (!app.isPackaged) return [process.execPath, app.getAppPath()];
	return [process.execPath];
}
