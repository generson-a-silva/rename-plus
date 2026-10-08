#!/usr/bin/env node
// Mede a leitura de pastas do app (o mesmo código da listagem, já compilado em build-electron).
//
//   npm run perf:listing -- /usr/bin ~/Fotos                # só a pasta
//   npm run perf:listing -- --subfolders --hidden ~/.config # com subpastas e ocultos
//
// Cada pasta é lida 3 vezes; a 1ª pode incluir o disco "frio", as outras usam o cache.
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const APP_DIR = path.resolve(import.meta.dirname, "../..");
const { walkEntries } = require(path.join(APP_DIR, "build-electron/main/directoryWalker.js"));

const args = process.argv.slice(2);
const options = {
	recursive: args.includes("--subfolders"),
	showHidden: args.includes("--hidden"),
	includeFiles: true,
	includeFolders: true,
};
const dirs = args.filter((arg) => !arg.startsWith("--"));
if (dirs.length === 0) {
	console.error("uso: npm run perf:listing -- [--subfolders] [--hidden] <pasta>…");
	process.exit(2);
}

for (const dir of dirs) {
	const times = [];
	let count = 0;
	for (let run = 0; run < 3; run++) {
		const start = performance.now();
		count = 0;
		for await (const group of walkEntries(path.resolve(dir), options)) count += group.items.length;
		times.push(Math.round(performance.now() - start));
	}
	console.log(`${dir}: ${count} itens — ${times.join(" / ")} ms`);
}
