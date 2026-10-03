import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import type { AppInfo } from "../shared/ipc";

interface PackageJson {
	author?: string | { name?: string };
	/**
	 * O nome de exibição fica só em `build.productName`: na raiz, o Electron o usaria
	 * como nome do app e mudaria a pasta de dados (~/.config/rename-plus).
	 */
	build?: { productName?: string };
}

/** Lê o package.json do app (também funciona dentro do .asar empacotado). */
function readPackageJson(): PackageJson {
	try {
		return JSON.parse(fs.readFileSync(path.join(app.getAppPath(), "package.json"), "utf8"));
	} catch {
		return {};
	}
}

/** "Nome <email> (url)" ou { name } → só o nome. */
function authorName(author: PackageJson["author"]): string {
	if (!author) return "";
	if (typeof author === "string") return author.replace(/\s*[<(].*$/, "").trim();
	return author.name?.trim() ?? "";
}

let cached: AppInfo | null = null;

export function getAppInfo(): AppInfo {
	if (!cached) {
		const pkg = readPackageJson();
		cached = {
			productName: pkg.build?.productName ?? app.getName(),
			version: app.getVersion(),
			author: authorName(pkg.author),
		};
	}
	return cached;
}
