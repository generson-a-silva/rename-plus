import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { resolveLocale } from "../shared/i18n";
import { registerIpcHandlers } from "./ipcHandlers";
import { parseLaunchArguments } from "./launchArguments";
import { asLaunchRequest, queueLaunchRequest } from "./launchRequestQueue";
import { setMainLocale } from "./mainLocale";
import { loadTheme, windowBackground } from "./themeSettings";
import { loadWindowState, trackWindowState } from "./windowStateService";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
/** Ícone da janela (barra de tarefas/Alt+Tab). Também é usado pelo electron-builder. */
const windowIcon = path.join(__dirname, "../../resources/icon.png");

let mainWindow: BrowserWindow | null = null;

/** Caminhos e modo pedidos na linha de comando (menu de contexto do sistema, terminal). */
function launchRequestFrom(argv: readonly string[], cwd: string) {
	// Em desenvolvimento ("electron [opções] ."), os argumentos do usuário vêm depois da pasta do app.
	const appIndex = process.defaultApp
		? argv.findIndex((arg, index) => index > 0 && !arg.startsWith("-"))
		: 0;
	return appIndex === -1 ? null : parseLaunchArguments(argv.slice(appIndex + 1), cwd);
}

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
	mainWindow = win;
	win.on("closed", () => {
		if (mainWindow === win) mainWindow = null;
	});

	// Soltar um arquivo fora das áreas tratadas faria a janela navegar até ele, trocando o
	// app pelo arquivo. A interface já impede isso; aqui fica a garantia (recarregar continua valendo).
	win.webContents.on("will-navigate", (event, url) => {
		if (url !== win.webContents.getURL()) event.preventDefault();
	});

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

// Uma instância só: abrir itens pelo menu de contexto com o app aberto os entrega à
// janela existente. O pedido vai já interpretado em `additionalData`, pois o Chromium
// pode reordenar os argumentos repassados no evento.
const ownLaunchRequest = launchRequestFrom(process.argv, process.cwd());
if (!app.requestSingleInstanceLock({ launch: ownLaunchRequest })) {
	app.quit();
} else {
	queueLaunchRequest(ownLaunchRequest);
	app.on("second-instance", (_event, argv, cwd, additionalData) => {
		const data = additionalData as { launch?: unknown } | null;
		queueLaunchRequest(
			data && "launch" in data ? asLaunchRequest(data.launch) : launchRequestFrom(argv, cwd),
		);
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.show();
			mainWindow.focus();
		}
	});
	startApp();
}

function startApp(): void {
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
}
