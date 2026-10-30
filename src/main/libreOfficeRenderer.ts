import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { app } from "electron";

/** Arquivos que costumam abrir bem mas travam o LibreOffice não seguram o painel para sempre. */
const TIMEOUT_MS = 30_000;

let executable: Promise<string | null> | null = null;

/** `soffice` instalado: no PATH (Linux) ou nos locais padrão dos instaladores (Windows/macOS). */
function findLibreOffice(): Promise<string | null> {
	executable ??= (async () => {
		const candidates =
			process.platform === "win32"
				? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].flatMap((dir) =>
						dir ? [path.join(dir, "LibreOffice", "program", "soffice.exe")] : [],
					)
				: process.platform === "darwin"
					? ["/Applications/LibreOffice.app/Contents/MacOS/soffice"]
					: (process.env.PATH ?? "")
							.split(path.delimiter)
							.flatMap((dir) =>
								dir ? [path.join(dir, "soffice"), path.join(dir, "libreoffice")] : [],
							);
		for (const candidate of candidates) {
			if (
				await fs.access(candidate, fs.constants.X_OK).then(
					() => true,
					() => false,
				)
			) {
				return candidate;
			}
		}
		return null;
	})();
	return executable;
}

let running: Promise<unknown> = Promise.resolve();
let latestTicket = 0;

/**
 * Primeira página, planilha ou slide como PNG, convertida pelo LibreOffice; `null` se ele
 * não estiver instalado ou falhar. Uma conversão por vez (cada uma abre o LibreOffice
 * inteiro): quem chega com outra em andamento espera, e só o pedido mais recente segue
 * (passar por vários arquivos com as setas não enfileira conversões que ninguém vai ver).
 */
export async function renderWithLibreOffice(file: string): Promise<Buffer | null> {
	const ticket = ++latestTicket;
	await running.catch(() => undefined);
	if (ticket !== latestTicket) return null;
	const job = convert(file);
	running = job;
	return job;
}

async function convert(file: string): Promise<Buffer | null> {
	const soffice = await findLibreOffice();
	if (!soffice) return null;
	const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "rename-plus-preview-"));
	try {
		// Perfil próprio: com o LibreOffice do usuário aberto, o pedido iria para aquela
		// instância e voltaria sem converter.
		const profile = pathToFileURL(path.join(app.getPath("userData"), "libreoffice-profile"));
		await new Promise<void>((resolve, reject) => {
			execFile(
				soffice,
				[
					`-env:UserInstallation=${profile.href}`,
					"--headless",
					"--norestore",
					"--convert-to",
					"png",
					"--outdir",
					outDir,
					file,
				],
				{ timeout: TIMEOUT_MS, windowsHide: true },
				(error) => (error ? reject(error) : resolve()),
			);
		});
		const [output] = await fs.readdir(outDir);
		return output ? await fs.readFile(path.join(outDir, output)) : null;
	} catch {
		return null;
	} finally {
		await fs.rm(outDir, { recursive: true, force: true });
	}
}
