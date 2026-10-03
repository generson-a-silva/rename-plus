/**
 * Regras de tamanho e posição da janela principal. Sem dependência do Electron,
 * para poderem ser testadas: quem chama fornece as áreas úteis das telas.
 */

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface SavedWindowState {
	/** Tamanho e posição "restaurados" (mesmo se a janela estava maximizada). */
	bounds: Rect;
	maximized: boolean;
}

export interface InitialWindowState extends SavedWindowState {
	minimumSize: { width: number; height: number };
	/** `false` quando a posição não é confiável (Wayland): só o tamanho é aplicado. */
	restorePosition: boolean;
}

/** Menor tamanho permitido ao diminuir a janela (limitado pelo tamanho da tela). */
export const MIN_WINDOW_SIZE = { width: 1024, height: 768 } as const;

/** Tamanho padrão, quando não maximizada: fração da área útil da tela. */
const DEFAULT_WIDTH_RATIO = 0.7;
const DEFAULT_HEIGHT_RATIO = 0.9;

/** Quanto da barra de título precisa estar visível para a posição salva ser aceita. */
const REACHABLE_TITLE_WIDTH = 120;
const REACHABLE_TITLE_HEIGHT = 32;

export function minimumSizeFor(workArea: Rect): { width: number; height: number } {
	return {
		width: Math.min(MIN_WINDOW_SIZE.width, workArea.width),
		height: Math.min(MIN_WINDOW_SIZE.height, workArea.height),
	};
}

/** Garante o tamanho mínimo e que a janela não fique maior que a tela. */
function clampSize(bounds: Rect, workArea: Rect): Pick<Rect, "width" | "height"> {
	const minimum = minimumSizeFor(workArea);
	return {
		width: Math.min(workArea.width, Math.max(minimum.width, Math.round(bounds.width))),
		height: Math.min(workArea.height, Math.max(minimum.height, Math.round(bounds.height))),
	};
}

/** 70% × 90% da área útil, centralizado. */
export function defaultBoundsFor(workArea: Rect): Rect {
	const { width, height } = clampSize(
		{
			x: 0,
			y: 0,
			width: workArea.width * DEFAULT_WIDTH_RATIO,
			height: workArea.height * DEFAULT_HEIGHT_RATIO,
		},
		workArea,
	);
	return {
		x: workArea.x + Math.round((workArea.width - width) / 2),
		y: workArea.y + Math.round((workArea.height - height) / 2),
		width,
		height,
	};
}

function intersection(a: Rect, b: Rect): { width: number; height: number } {
	return {
		width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)),
		height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)),
	};
}

/** A barra de título está visível em alguma tela (dá para arrastar a janela)? */
export function isReachable(bounds: Rect, workAreas: readonly Rect[]): boolean {
	const titleBar: Rect = { ...bounds, height: REACHABLE_TITLE_HEIGHT };
	return workAreas.some((area) => {
		const overlap = intersection(titleBar, area);
		return overlap.width >= REACHABLE_TITLE_WIDTH && overlap.height >= REACHABLE_TITLE_HEIGHT / 2;
	});
}

/** Maior área útil entre as telas (referência quando a posição da janela é desconhecida). */
export function largestWorkArea(workAreas: readonly Rect[], fallback: Rect): Rect {
	return workAreas.reduce(
		(largest, area) => (area.width * area.height > largest.width * largest.height ? area : largest),
		fallback,
	);
}

/** Menor tamanho entre as telas: limite seguro quando não se sabe em qual tela a janela abrirá. */
function smallestScreenSize(workAreas: readonly Rect[], fallback: Rect): Rect {
	if (workAreas.length === 0) return fallback;
	return {
		...fallback,
		width: Math.min(...workAreas.map((area) => area.width)),
		height: Math.min(...workAreas.map((area) => area.height)),
	};
}

/** Tela que contém a maior parte da janela. */
function bestWorkArea(bounds: Rect, workAreas: readonly Rect[]): Rect | undefined {
	let best: Rect | undefined;
	let bestArea = -1;
	for (const area of workAreas) {
		const overlap = intersection(bounds, area);
		if (overlap.width * overlap.height > bestArea) {
			bestArea = overlap.width * overlap.height;
			best = area;
		}
	}
	return best;
}

/**
 * Decide como abrir a janela:
 * - sem estado salvo (primeira execução): maximizada, com 70% × 90% da tela atual ao restaurar;
 * - com estado salvo e visível: restaura tamanho, posição e se estava maximizada;
 * - com estado salvo fora das telas (monitor desconectado): tamanho padrão na tela atual.
 *
 * Sem `positionKnown` (Wayland, onde o app não lê nem escolhe a posição), as posições
 * são ignoradas e o compositor decide em qual tela abrir. O tamanho usa a maior tela
 * como referência; o mínimo usa a menor, para a janela nunca ficar maior que a tela.
 */
export function resolveInitialWindowState(
	saved: SavedWindowState | null,
	workAreas: readonly Rect[],
	currentWorkArea: Rect,
	positionKnown = true,
): InitialWindowState {
	if (!positionKnown) {
		const reference = largestWorkArea(workAreas, currentWorkArea);
		const bounds = saved
			? { ...saved.bounds, ...clampSize(saved.bounds, reference) }
			: defaultBoundsFor(reference);
		return {
			bounds,
			maximized: saved ? saved.maximized : true,
			minimumSize: minimumSizeFor(smallestScreenSize(workAreas, currentWorkArea)),
			restorePosition: false,
		};
	}
	if (saved && isReachable(saved.bounds, workAreas)) {
		const workArea = bestWorkArea(saved.bounds, workAreas) ?? currentWorkArea;
		const size = clampSize(saved.bounds, workArea);
		return {
			bounds: { x: Math.round(saved.bounds.x), y: Math.round(saved.bounds.y), ...size },
			maximized: saved.maximized,
			minimumSize: minimumSizeFor(workArea),
			restorePosition: true,
		};
	}
	return {
		bounds: defaultBoundsFor(currentWorkArea),
		maximized: saved ? saved.maximized : true,
		minimumSize: minimumSizeFor(currentWorkArea),
		restorePosition: true,
	};
}

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** Valida o conteúdo lido do arquivo; qualquer coisa inesperada vira `null`. */
export function parseSavedWindowState(data: unknown): SavedWindowState | null {
	if (!data || typeof data !== "object") return null;
	const { bounds, maximized } = data as Partial<SavedWindowState>;
	if (!bounds || typeof bounds !== "object" || typeof maximized !== "boolean") return null;
	const { x, y, width, height } = bounds as Partial<Rect>;
	if (![x, y, width, height].every(isFiniteNumber)) return null;
	if ((width as number) <= 0 || (height as number) <= 0) return null;
	return { bounds: { x, y, width, height } as Rect, maximized };
}
