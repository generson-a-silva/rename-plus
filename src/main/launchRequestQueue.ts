import fs from "node:fs";
import type { WebContents } from "electron";
import { IpcChannel, type LaunchRequest } from "../shared/ipc";
import { mergeLaunchRequests } from "./launchArguments";

/**
 * Espera antes de entregar um pedido: no Windows, o Explorador abre um processo por
 * item selecionado, e cada um chega aqui separado (via instância única).
 */
const MERGE_DELAY_MS = 350;

let incoming: LaunchRequest[] = [];
let pending: LaunchRequest[] = [];
let mergeTimer: ReturnType<typeof setTimeout> | undefined;
let receiver: WebContents | null = null;

function flush(): void {
	const merged = mergeLaunchRequests(incoming);
	incoming = [];
	if (receiver && !receiver.isDestroyed()) {
		for (const request of merged) receiver.send(IpcChannel.LaunchRequest, request);
	} else {
		pending.push(...merged);
	}
}

/** Recebe um pedido da linha de comando (desta instância ou de uma segunda). */
export function queueLaunchRequest(request: LaunchRequest | null): void {
	if (!request) return;
	const paths = request.paths.filter((item) => fs.existsSync(item));
	if (paths.length === 0) return;
	incoming.push({ mode: request.mode, paths });
	clearTimeout(mergeTimer);
	mergeTimer = setTimeout(flush, MERGE_DELAY_MS);
}

/**
 * Chamado pela interface quando já está pronta para receber pedidos: devolve os que
 * chegaram antes disso; os próximos são enviados pelo canal `LaunchRequest`.
 */
export function takeLaunchRequests(sender: WebContents): LaunchRequest[] {
	receiver = sender;
	const ready = mergeLaunchRequests(pending);
	pending = [];
	return ready;
}

/** Confere o formato de um pedido vindo de outra instância (`additionalData`). */
export function asLaunchRequest(value: unknown): LaunchRequest | null {
	if (typeof value !== "object" || value === null) return null;
	const { mode, paths } = value as Partial<LaunchRequest>;
	if (mode !== "open" && mode !== "select") return null;
	if (!Array.isArray(paths) || !paths.every((item) => typeof item === "string")) return null;
	return { mode, paths };
}
