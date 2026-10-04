import { spawn } from "node:child_process";
import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { resolveLocale } from "../shared/i18n";
import { appLaunchCommand } from "./appLaunchCommand";
import {
	asInstanceIdentity,
	BACKGROUND_FLAG,
	type InstanceIdentity,
	shouldHandOver,
} from "./backgroundLaunch";
import { announceResident, initBackground, shouldStayResident } from "./backgroundService";
import { registerIpcHandlers } from "./ipcHandlers";
import { parseLaunchArguments } from "./launchArguments";
import { asLaunchRequest, queueLaunchRequest } from "./launchRequestQueue";
import { loadSavedLocale } from "./localePreference";
import { setMainLocale } from "./mainLocale";
import { loadTheme, windowBackground } from "./themeSettings";
import { startUpdateChecks } from "./updateChecker";
import { startWatchFolders, stopWatchFolders } from "./watchFolderService";
import { loadWindowState, trackWindowState } from "./windowStateService";

const devServerUrl = process.env.VITE_DEV_SERVER_URL;
/** Ícone da janela (barra de tarefas/Alt+Tab). Também é usado pelo electron-builder. */
const windowIcon = path.join(__dirname, "../../resources/icon.png");

let mainWindow: BrowserWindow | null = null;

/** Argumentos do usuário: sem o executável e, em desenvolvimento ("electron [opções] ."), sem a pasta do app. */
function userArguments(argv: readonly string[]): string[] {
	const appIndex = process.defaultApp
		? argv.findIndex((arg, index) => index > 0 && !arg.startsWith("-"))
		: 0;
	return appIndex === -1 ? [] : argv.slice(appIndex + 1);
}

/** Caminhos e modo pedidos na linha de comando (menu de contexto do sistema, terminal). */
function launchRequestFrom(argv: readonly string[], cwd: string) {
	return parseLaunchArguments(userArguments(argv), cwd);
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

/** Abre a janela, ou traz para a frente a que já está aberta. */
function showWindow(): void {
	if (!mainWindow) {
		createWindow();
		return;
	}
	if (mainWindow.isMinimized()) mainWindow.restore();
	mainWindow.show();
	mainWindow.focus();
}

/**
 * Sem janela, só com as pastas monitoradas: aberto pelo início com o sistema
 * (`--background`). Abrir o app de novo mostra a janela neste mesmo processo.
 */
const startInBackground = userArguments(process.argv).includes(BACKGROUND_FLAG);

// Uma instância só: abrir itens pelo menu de contexto com o app aberto os entrega à
// janela existente, e abrir o app com ele em segundo plano mostra a janela. O pedido vai
// já interpretado em `additionalData`, pois o Chromium pode reordenar os argumentos.
const ownLaunchRequest = launchRequestFrom(process.argv, process.cwd());
const ownIdentity: InstanceIdentity = {
	version: app.getVersion(),
	command: appLaunchCommand(),
	args: userArguments(process.argv),
};
if (!app.requestSingleInstanceLock({ launch: ownLaunchRequest, identity: ownIdentity })) {
	app.quit();
} else {
	queueLaunchRequest(ownLaunchRequest);
	app.on("second-instance", (_event, argv, cwd, additionalData) => {
		const data = additionalData as { launch?: unknown; identity?: unknown } | null;
		const incoming = asInstanceIdentity(data?.identity);
		if (shouldHandOver(ownIdentity, mainWindow !== null, incoming) && incoming) {
			// Outra versão (ex.: AppImage novo): ela assume, com os mesmos argumentos.
			handOver(incoming);
			return;
		}
		queueLaunchRequest(
			data && "launch" in data ? asLaunchRequest(data.launch) : launchRequestFrom(argv, cwd),
		);
		// Outra cópia em segundo plano (ex.: entrada do instalador e do usuário) não abre janela.
		if (!incoming?.args.includes(BACKGROUND_FLAG)) showWindow();
	});
	startApp();
}

/** Libera a instância única e abre a outra versão no lugar desta. */
function handOver(incoming: InstanceIdentity): void {
	app.releaseSingleInstanceLock();
	const [executable, ...prefix] = incoming.command;
	if (executable) {
		spawn(executable, [...prefix, ...incoming.args], { detached: true, stdio: "ignore" }).unref();
	}
	app.quit();
}

function startApp(): void {
	app.whenReady().then(async () => {
		// Idioma escolhido na interface (salvo); na primeira vez, o do sistema.
		setMainLocale(loadSavedLocale() ?? resolveLocale(app.getLocale()));
		loadTheme();
		registerIpcHandlers();
		startWatchFolders();
		await initBackground({ open: showWindow, hasWindow: () => mainWindow !== null });
		if (!startInBackground) {
			createWindow();
		} else if (!shouldStayResident()) {
			// Iniciado com o sistema, mas sem nada a monitorar (ou o usuário desativou).
			app.quit();
			return;
		}
		startUpdateChecks();

		app.on("activate", () => {
			if (BrowserWindow.getAllWindows().length === 0) createWindow();
		});
	});

	app.on("will-quit", stopWatchFolders);

	app.on("window-all-closed", () => {
		// Continua sem janela, com o ícone na bandeja, enquanto houver pastas monitoradas.
		if (shouldStayResident()) {
			announceResident();
			return;
		}
		if (process.platform !== "darwin") app.quit();
	});
}
