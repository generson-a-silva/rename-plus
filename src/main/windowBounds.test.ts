import { describe, expect, it } from "vitest";
import {
	defaultBoundsFor,
	isReachable,
	MIN_WINDOW_SIZE,
	parseSavedWindowState,
	type Rect,
	resolveInitialWindowState,
} from "./windowBounds";

const FULL_HD: Rect = { x: 0, y: 0, width: 1920, height: 1040 }; // descontando a barra de tarefas
const SECOND: Rect = { x: 1920, y: 0, width: 2560, height: 1400 };
const SMALL: Rect = { x: 0, y: 0, width: 1000, height: 700 };

describe("defaultBoundsFor", () => {
	it("usa 70% da largura e 90% da altura, centralizado", () => {
		expect(defaultBoundsFor(FULL_HD)).toEqual({ x: 288, y: 52, width: 1344, height: 936 });
	});

	it("respeita o mínimo de 1024×768", () => {
		const area: Rect = { x: 0, y: 0, width: 1280, height: 800 };
		expect(defaultBoundsFor(area)).toMatchObject({ width: 1024, height: 768 });
	});

	it("nunca passa do tamanho da tela", () => {
		expect(defaultBoundsFor(SMALL)).toEqual({ x: 0, y: 0, width: 1000, height: 700 });
	});
});

describe("resolveInitialWindowState", () => {
	it("na primeira execução abre maximizada, com o padrão para restaurar", () => {
		const state = resolveInitialWindowState(null, [FULL_HD], FULL_HD);
		expect(state.maximized).toBe(true);
		expect(state.bounds).toEqual(defaultBoundsFor(FULL_HD));
		expect(state.minimumSize).toEqual(MIN_WINDOW_SIZE);
	});

	it("restaura tamanho, posição e estado salvos", () => {
		const saved = { bounds: { x: 2000, y: 100, width: 1500, height: 1000 }, maximized: false };
		const state = resolveInitialWindowState(saved, [FULL_HD, SECOND], FULL_HD);
		expect(state).toMatchObject(saved);
	});

	it("ajusta tamanhos salvos menores que o mínimo", () => {
		const saved = { bounds: { x: 10, y: 10, width: 500, height: 400 }, maximized: false };
		const state = resolveInitialWindowState(saved, [FULL_HD], FULL_HD);
		expect(state.bounds).toMatchObject({ width: 1024, height: 768 });
	});

	it("se a janela salva ficou fora das telas, usa o padrão na tela atual", () => {
		const saved = { bounds: { x: 2000, y: 100, width: 1500, height: 1000 }, maximized: false };
		const state = resolveInitialWindowState(saved, [FULL_HD], FULL_HD);
		expect(state.bounds).toEqual(defaultBoundsFor(FULL_HD));
		expect(state.maximized).toBe(false);
	});

	it("em telas menores que 1024×768, o mínimo vira o tamanho da tela", () => {
		expect(resolveInitialWindowState(null, [SMALL], SMALL).minimumSize).toEqual({
			width: 1000,
			height: 700,
		});
	});
});

describe("resolveInitialWindowState sem posição confiável (Wayland)", () => {
	// Tela vertical em 0,0 e a principal ao lado: o cursor "em 0,0" apontaria para a vertical.
	const PORTRAIT: Rect = { x: 0, y: 0, width: 900, height: 1600 };
	const MAIN: Rect = { x: 900, y: 0, width: 1920, height: 1080 };

	it("usa a maior tela para o tamanho, a menor para o mínimo e não restaura posição", () => {
		const state = resolveInitialWindowState(null, [PORTRAIT, MAIN], PORTRAIT, false);
		expect(state.restorePosition).toBe(false);
		expect(state.maximized).toBe(true);
		// A tela vertical tem só 900px: o mínimo não pode passar disso.
		expect(state.minimumSize).toEqual({ width: 900, height: 768 });
		expect(state.bounds).toMatchObject({ width: 1344, height: 972 });
	});

	it("restaura o tamanho salvo mesmo com posição falsa", () => {
		const saved = { bounds: { x: 0, y: 80, width: 1200, height: 850 }, maximized: false };
		const state = resolveInitialWindowState(saved, [PORTRAIT, MAIN], PORTRAIT, false);
		expect(state.bounds).toMatchObject({ width: 1200, height: 850 });
		expect(state.maximized).toBe(false);
	});
});

describe("isReachable", () => {
	it("exige parte da barra de título visível", () => {
		expect(isReachable({ x: 100, y: 100, width: 800, height: 600 }, [FULL_HD])).toBe(true);
		expect(isReachable({ x: 1850, y: 100, width: 800, height: 600 }, [FULL_HD])).toBe(false);
		expect(isReachable({ x: 100, y: -500, width: 800, height: 600 }, [FULL_HD])).toBe(false);
	});
});

describe("parseSavedWindowState", () => {
	it("aceita só dados completos e válidos", () => {
		const valid = { bounds: { x: 1, y: 2, width: 1100, height: 800 }, maximized: true };
		expect(parseSavedWindowState(valid)).toEqual(valid);
		expect(parseSavedWindowState(null)).toBeNull();
		expect(
			parseSavedWindowState({ bounds: { x: 1, y: 2, width: 1100 }, maximized: true }),
		).toBeNull();
		expect(parseSavedWindowState({ ...valid, maximized: "sim" })).toBeNull();
		expect(
			parseSavedWindowState({ bounds: { ...valid.bounds, width: -5 }, maximized: false }),
		).toBeNull();
	});
});
