import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { resolveLocale } from "../shared/i18n";
import { registerIpcHandlers } from "./ipcHandlers";
import { setMainLocale } from "./mainLocale";
import { loadTheme, windowBackground } from "./themeSettings";
import { loadWindowState, trackWindowState } from "./windowStateService";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
/** Ícone da janela (barra de tarefas/Alt+Tab). Também é usado pelo electron-builder. */
const windowIcon = path.join(__dirname, "../../resources/icon.png");

function createWindow(): void {
	// Tamanho/posição da última sessão; na primeira, 70% × 90% da tela e maximizada.
	const state = loadWindowState();
	const { x, y, width, height } = state.bounds;
	const win = new BrowserWindow({
		// Sem posição confiável (Wayland), o compositor escolhe onde abrir.
		...(state.restorePosition ? { x, y } : {}),
		width,
		height,
		minWidth: state.minimumSize.width,
		minHeight: state.minimumSize.height,
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

	win.once("ready-to-show", () => {
		// Maximiza antes de exibir, para a janela não aparecer pequena e depois crescer.
		if (state.maximized) win.maximize();
		win.show();
	});
	trackWindowState(win, state);

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

// No Windows, associa a janela ao atalho/instalador (ícone e agrupamento na barra de tarefas).
// Deve ser igual a `build.appId` no package.json.
if (process.platform === "win32") app.setAppUserModelId("com.renameplus.app");

app.whenReady().then(() => {
	// Até a interface informar a escolha do usuário, segue o idioma do sistema.
	setMainLocale(resolveLocale(app.getLocale()));
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
