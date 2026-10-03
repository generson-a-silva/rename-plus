import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface LinuxDesktopEnvironment {
	/** Nomes de XDG_CURRENT_DESKTOP em minúsculas ("kde", "gnome", "x-cinnamon"…). */
	desktops: string[];
	/** Arquivo .desktop do gerenciador de arquivos padrão ("org.kde.dolphin.desktop"), em minúsculas. */
	defaultFileManager: string | null;
	dataHome: string;
	configHome: string;
	/** Pastas de configuração do sistema (XDG_CONFIG_DIRS). */
	configDirs: string[];
}

function queryDefaultFileManager(): Promise<string | null> {
	return new Promise((resolve) => {
		execFile(
			"xdg-mime",
			["query", "default", "inode/directory"],
			{ timeout: 3000 },
			(error, stdout) => resolve(error ? null : stdout.trim().toLowerCase() || null),
		);
	});
}

export async function detectLinuxDesktop(): Promise<LinuxDesktopEnvironment> {
	const desktops = (process.env.XDG_CURRENT_DESKTOP ?? "")
		.split(":")
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);
	const home = os.homedir();
	return {
		desktops,
		defaultFileManager: await queryDefaultFileManager(),
		dataHome: process.env.XDG_DATA_HOME || path.join(home, ".local", "share"),
		configHome: process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
		configDirs: (process.env.XDG_CONFIG_DIRS || "/etc/xdg").split(":").filter(Boolean),
	};
}

/** O programa está no PATH (o gerenciador de arquivos está instalado)? */
export function isProgramInstalled(name: string): boolean {
	return (process.env.PATH ?? "").split(path.delimiter).some((dir) => {
		try {
			fs.accessSync(path.join(dir, name), fs.constants.X_OK);
			return true;
		} catch {
			return false;
		}
	});
}
