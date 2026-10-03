import fs from "node:fs";
import path from "node:path";
import { app, type BrowserWindow, screen } from "electron";
import {
	defaultBoundsFor,
	type InitialWindowState,
	minimumSizeFor,
	parseSavedWindowState,
	type Rect,
	resolveInitialWindowState,
	type SavedWindowState,
} from "./windowBounds";

/** Espera após o último redimensionamento/movimento antes de gravar. */
const SAVE_DELAY_MS = 500;
/**
 * Ao restaurar, o gerenciador de janelas (ex.: KWin no Wayland) aplica o próprio
 * tamanho "restaurado" alguns milissegundos depois; o tamanho padrão é aplicado após isso.
 */
const FIRST_RESTORE_DELAY_MS = 200;

const stateFile = () => path.join(app.getPath("userData"), "window-state.json");

/**
 * No Wayland o app não lê nem escolhe a posição da janela (quem decide é o
 * compositor) e o cursor aparece sempre em 0,0. Forçar X11 (`--ozone-platform=x11`)
 * devolve posições reais.
 */
function isPositionKnown(): boolean {
	if (process.platform !== "linux") return true;
	const ozone = app.commandLine.getSwitchValue("ozone-platform");
	if (ozone) return ozone === "x11";
	return !(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === "wayland");
}

function readSavedState(): SavedWindowState | null {
	try {
		return parseSavedWindowState(JSON.parse(fs.readFileSync(stateFile(), "utf8")));
	} catch {
		// Primeira execução ou arquivo inválido.
		return null;
	}
}

function writeState(state: SavedWindowState): void {
	try {
		fs.writeFileSync(stateFile(), JSON.stringify(state));
	} catch {
		// Falha ao gravar só faz a janela abrir com o tamanho padrão da próxima vez.
	}
}

export interface WindowStartup extends InitialWindowState {
	/** Primeira execução: não há tamanho salvo para "restaurar" ainda. */
	firstRun: boolean;
}

/** Tamanho, posição e estado com que a janela principal deve abrir. Chamar após `app.ready`. */
export function loadWindowState(): WindowStartup {
	const saved = readSavedState();
	const workAreas = screen.getAllDisplays().map((display) => display.workArea);
	// "A tela em que o app for aberto": a do cursor (no Wayland não há como saber).
	const currentWorkArea = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
	return {
		...resolveInitialWindowState(saved, workAreas, currentWorkArea, isPositionKnown()),
		firstRun: saved === null,
	};
}

/**
 * Salva tamanho, posição e se está maximizada sempre que a janela muda e ao fechar.
 *
 * Na primeira execução a janela abre maximizada; o tamanho maximizado é a área útil
 * real da tela escolhida pelo sistema. Na primeira vez que o usuário restaura a
 * janela, ela recebe 70% × 90% dessa área (mais confiável que a estimativa inicial,
 * principalmente no Wayland).
 */
export function trackWindowState(window: BrowserWindow, startup: WindowStartup): void {
	let timer: NodeJS.Timeout | undefined;
	let pendingFirstRestore = startup.firstRun;
	let maximizedArea: Rect | null = null;

	const snapshot = (): SavedWindowState => ({
		// Mesmo maximizada, guarda o tamanho "restaurado" para usar ao desmaximizar.
		bounds: window.getNormalBounds(),
		maximized: window.isMaximized(),
	});

	const scheduleSave = () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			if (!window.isDestroyed() && !window.isMinimized() && !window.isFullScreen()) {
				writeState(snapshot());
			}
		}, SAVE_DELAY_MS);
	};

	const rememberMaximizedArea = () => {
		if (pendingFirstRestore && window.isMaximized()) maximizedArea = window.getBounds();
	};

	window.on("maximize", () => {
		rememberMaximizedArea();
		scheduleSave();
	});
	window.on("resize", () => {
		// No Linux o tamanho final da maximização pode chegar num "resize" posterior.
		rememberMaximizedArea();
		scheduleSave();
	});
	window.on("move", scheduleSave);
	window.on("unmaximize", () => {
		const area = maximizedArea;
		if (pendingFirstRestore && area) {
			pendingFirstRestore = false;
			setTimeout(() => {
				if (window.isDestroyed() || window.isMaximized()) return;
				const target = defaultBoundsFor(area);
				const minimum = minimumSizeFor(area);
				window.setMinimumSize(minimum.width, minimum.height);
				if (startup.restorePosition) window.setBounds(target);
				else window.setSize(target.width, target.height);
			}, FIRST_RESTORE_DELAY_MS);
		}
		scheduleSave();
	});
	window.on("close", () => {
		clearTimeout(timer);
		if (!window.isMinimized() && !window.isFullScreen()) writeState(snapshot());
	});
}
