import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { app } from "electron";
import { createLatestOnlyQueue, findExecutable, runTool, withTempDir } from "./externalTools";

/** Arquivos que costumam abrir bem mas travam o LibreOffice não seguram o painel para sempre. */
const TIMEOUT_MS = 30_000;

/** `soffice` instalado: no PATH ou nos locais padrão dos instaladores (Windows/macOS). */
function findLibreOffice(): Promise<string | null> {
	const locations =
		process.platform === "win32"
			? [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].flatMap((dir) =>
					dir ? [path.join(dir, "LibreOffice", "program", "soffice.exe")] : [],
				)
			: process.platform === "darwin"
				? ["/Applications/LibreOffice.app/Contents/MacOS/soffice"]
				: [];
	return findExecutable(["soffice", "libreoffice"], locations);
}

/** Uma conversão por vez: cada uma abre o LibreOffice inteiro. */
const queue = createLatestOnlyQueue();

/**
 * Primeira página, planilha ou slide como PNG, convertida pelo LibreOffice; `null` se ele
 * não estiver instalado, falhar ou se um pedido mais recente tomar a vez.
 */
export function renderWithLibreOffice(file: string): Promise<Buffer | null> {
	return queue(() => convert(file));
}

async function convert(file: string): Promise<Buffer | null> {
	const soffice = await findLibreOffice();
	if (!soffice) return null;
	return withTempDir(async (outDir) => {
		// Perfil próprio: com o LibreOffice do usuário aberto, o pedido iria para aquela
		// instância e voltaria sem converter.
		const profile = pathToFileURL(path.join(app.getPath("userData"), "libreoffice-profile"));
		await runTool(
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
			TIMEOUT_MS,
		);
		const [output] = await fs.readdir(outDir);
		return output ? await fs.readFile(path.join(outDir, output)) : null;
	}).catch(() => null);
}
