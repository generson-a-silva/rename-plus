import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { registerIpcHandlers } from "./ipcHandlers";
import { loadTheme, windowBackground } from "./themeSettings";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
/** Ícone da janela (barra de tarefas/Alt+Tab). Também é usado pelo electron-builder. */
const windowIcon = path.join(__dirname, "../../resources/icon.png");

function createWindow(): void {
	const win = new BrowserWindow({
		width: 1280,
		height: 860,
		minWidth: 960,
		minHeight: 600,
		show: false,
		backgroundColor: windowBackground(),
		icon: windowIcon,
		title: "Rename Plus",
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, "../preload/preloadBridge.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	win.once("ready-to-show", () => win.show());

	// Links externos abrem no navegador padrão, nunca dentro do app.
	win.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});

	if (devServerUrl) {
		void win.loadURL(devServerUrl);
		win.webContents.openDevTools({ mode: "detach" });
	} else {
		void win.loadFile(path.join(__dirname, "../../build-react/index.html"));
	}
}

app.whenReady().then(() => {
	loadTheme();
	registerIpcHandlers();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
