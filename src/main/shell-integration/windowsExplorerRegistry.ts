import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { tMain } from "../mainLocale";
import {
	type MenuContext,
	WINDOWS_SIGNATURE_VALUE,
	WINDOWS_VERB_KEYS,
	WINDOWS_VERBS,
	windowsInstallScript,
	windowsRemoveScript,
} from "./contextMenuEntries";
import type { IntegrationTarget } from "./integrationTarget";

function runReg(args: string[]): Promise<{ ok: boolean; stdout: string }> {
	return new Promise((resolve) => {
		execFile("reg.exe", args, { windowsHide: true, timeout: 15000 }, (error, stdout) =>
			resolve({ ok: !error, stdout }),
		);
	});
}

/** Aplica um arquivo .reg (UTF-16 com BOM, o formato que o reg.exe espera). */
async function importRegScript(script: string): Promise<void> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-"));
	const file = path.join(dir, "context-menu.reg");
	try {
		await fs.writeFile(
			file,
			Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(script, "utf16le")]),
		);
		const { ok } = await runReg(["import", file]);
		if (!ok) throw new Error("reg import falhou");
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

async function readSignature(root: "HKCU" | "HKLM", key: string): Promise<string | null> {
	const { ok, stdout } = await runReg([
		"query",
		`${root}\\Software\\Classes\\${key}`,
		"/v",
		WINDOWS_SIGNATURE_VALUE,
	]);
	if (!ok) return null;
	return stdout.match(new RegExp(`${WINDOWS_SIGNATURE_VALUE}\\s+REG_SZ\\s+(\\S+)`))?.[1] ?? null;
}

async function keyExists(root: "HKCU" | "HKLM", key: string): Promise<boolean> {
	return (await runReg(["query", `${root}\\Software\\Classes\\${key}`])).ok;
}

/**
 * Explorador de Arquivos: entradas no registro do usuário atual (HKCU), sem precisar
 * de administrador. O instalador pode ter criado as mesmas entradas para todos os
 * usuários (HKLM); essas só o instalador/desinstalador altera.
 */
export function windowsTargets(context: MenuContext): IntegrationTarget[] {
	const signature = createHash("sha256")
		.update(
			JSON.stringify({ command: context.command, icon: context.icon, labels: context.labels }),
		)
		.digest("hex")
		.slice(0, 16);
	const locations = WINDOWS_VERBS.map(
		(verb) => `HKEY_CURRENT_USER\\Software\\Classes\\${verb.key}`,
	);
	return [
		{
			id: "explorer",
			name: tMain("integration.explorer"),
			desktops: "Windows",
			detected: true,
			recommended: true,
			note: { key: "integration.noteWindows11" },
			locations,
			status: async () => {
				const [signatures, installedBySystem] = await Promise.all([
					Promise.all(WINDOWS_VERBS.map((verb) => readSignature("HKCU", verb.key))),
					keyExists("HKLM", `*\\shell\\${WINDOWS_VERB_KEYS.open}`),
				]);
				const found = signatures.filter((item) => item !== null);
				if (found.length === 0) return { status: "absent", installedBySystem };
				const complete = signatures.every((item) => item === signature);
				return { status: complete ? "installed" : "outdated", installedBySystem };
			},
			install: async () => {
				await importRegScript(windowsRemoveScript());
				await importRegScript(windowsInstallScript(context, signature));
			},
			remove: () => importRegScript(windowsRemoveScript()),
		},
	];
}
