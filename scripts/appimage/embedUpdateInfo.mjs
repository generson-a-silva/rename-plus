// Hook afterAllArtifactBuild do electron-builder: grava a "update information" no AppImage e
// gera o .zsync ao lado dele. É assim que o Gear Lever, o AppImageUpdate e o AppImageLauncher
// descobrem que há versão nova (e onde baixá-la) sem o usuário configurar nada.
//
// O runtime do AppImage já reserva a seção ELF .upd_info (vazia no electron-builder); basta
// escrever a string nela. Formato: https://github.com/AppImage/AppImageSpec (update information).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const UPDATE_INFO =
	"gh-releases-zsync|generson-a-silva|rename-plus|latest|rename-plus-*-linux-x86_64.AppImage.zsync";

/** Posição e tamanho de uma seção num ELF de 64 bits (little-endian), ou null se não houver. */
function findSection(fd, name) {
	const header = Buffer.alloc(64);
	fs.readSync(fd, header, 0, 64, 0);
	const shoff = Number(header.readBigUInt64LE(0x28));
	const shentsize = header.readUInt16LE(0x3a);
	const shnum = header.readUInt16LE(0x3c);
	const shstrndx = header.readUInt16LE(0x3e);

	const table = Buffer.alloc(shentsize * shnum);
	fs.readSync(fd, table, 0, table.length, shoff);
	const section = (i) => ({
		name: table.readUInt32LE(i * shentsize),
		offset: Number(table.readBigUInt64LE(i * shentsize + 0x18)),
		size: Number(table.readBigUInt64LE(i * shentsize + 0x20)),
	});

	const strtab = section(shstrndx);
	const names = Buffer.alloc(strtab.size);
	fs.readSync(fd, names, 0, strtab.size, strtab.offset);
	for (let i = 0; i < shnum; i++) {
		const s = section(i);
		if (names.toString("latin1", s.name, names.indexOf(0, s.name)) === name) return s;
	}
	return null;
}

function embedUpdateInfo(file) {
	const fd = fs.openSync(file, "r+");
	try {
		const section = findSection(fd, ".upd_info");
		if (!section) throw new Error(`${file} não tem a seção .upd_info`);
		const data = Buffer.alloc(section.size);
		if (data.write(UPDATE_INFO, "latin1") < UPDATE_INFO.length) {
			throw new Error("A update information não cabe na seção .upd_info");
		}
		fs.writeSync(fd, data, 0, data.length, section.offset);
	} finally {
		fs.closeSync(fd);
	}
}

/** Gera o .zsync (precisa do zsyncmake, pacote "zsync"). O -u relativo aponta para o AppImage
 * publicado na mesma release. */
function makeZsync(file) {
	const zsync = `${file}.zsync`;
	const result = spawnSync(
		"zsyncmake",
		["-u", path.basename(file), "-o", path.basename(zsync), path.basename(file)],
		{ cwd: path.dirname(file), stdio: "inherit" },
	);
	if (result.error?.code === "ENOENT") {
		if (process.env.CI) throw new Error("zsyncmake não encontrado (instale o pacote zsync)");
		console.warn("  • zsyncmake não encontrado: o .zsync não foi gerado (só é preciso na release)");
		return null;
	}
	if (result.status !== 0) throw new Error(`zsyncmake falhou para ${file}`);
	return zsync;
}

export default async function afterAllArtifactBuild({ artifactPaths }) {
	const extras = [];
	for (const file of artifactPaths.filter((p) => p.endsWith(".AppImage"))) {
		embedUpdateInfo(file);
		console.log(`  • update information gravada em ${path.basename(file)}`);
		const zsync = makeZsync(file);
		if (zsync) extras.push(zsync);
	}
	return extras;
}
