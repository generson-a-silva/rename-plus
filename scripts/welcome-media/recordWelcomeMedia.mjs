#!/usr/bin/env node
// Grava as animações da tela de boas-vindas (src/renderer/src/assets/welcome/<idioma>/<slide>.webp).
//
// Abre o app compilado (npm run build) com uma pasta pessoal de demonstração, dirige a
// interface pelo protocolo do DevTools (CDP) com um cursor desenhado na página e grava
// os quadros com Page.startScreencast. Cada quadro guarda o instante em que apareceu;
// o WebP animado é montado com essas durações (img2webp), recortado e reduzido (magick).
//
//   npm run welcome:record                     # todos os idiomas e slides
//   npm run welcome:record -- pt-BR regex      # só um idioma / slide
//
// Requer: Linux com sessão gráfica, ImageMagick (magick) e libwebp (img2webp).
// Menus de contexto e confirmações são nativos e não aparecem na gravação: os roteiros
// usam só o que é desenhado na página.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { APP_DIR, AppDriver, CATALOGS, LOCALE_NAMES, sleep, touch } from "../lib/appDriver.mjs";

const OUT_DIR = path.join(APP_DIR, "src/renderer/src/assets/welcome");
const WORK_DIR = "/tmp/rename-plus-welcome";
const VIEWPORT = { width: 1024, height: 640 };
/** Tamanho final das animações (mesma proporção 16:10 do quadro no diálogo). */
const OUTPUT = { width: 960, height: 600 };
/** Pausas longas (esperas do app) são encurtadas na animação. */
const MAX_FRAME_MS = 1600;

/** Nomes da pasta de demonstração em cada idioma. */
const DEMO_NAMES = {
	"pt-BR": {
		photos: "Fotos",
		trip: "Viagem",
		documents: "Documentos",
		music: "Músicas",
		videos: "Vídeos",
		invoices: "Faturas",
		invoice: "fatura energia.pdf",
	},
	en: {
		photos: "Pictures",
		trip: "Trip",
		documents: "Documents",
		music: "Music",
		videos: "Videos",
		invoices: "Invoices",
		invoice: "power bill.pdf",
	},
	es: {
		photos: "Imágenes",
		trip: "Viaje",
		documents: "Documentos",
		music: "Música",
		videos: "Vídeos",
		invoices: "Facturas",
		invoice: "factura luz.pdf",
	},
};

/** Pasta pessoal fictícia: fotos de viagem, Downloads e uma pasta de destino. */
function createDemoFiles(home, names) {
	fs.rmSync(home, { recursive: true, force: true });
	const photos = path.join(home, names.photos, names.trip);
	const base = new Date(2024, 5, 10, 9, 12).getTime();
	const shots = ["IMG_2041.JPG", "IMG_2042.JPG", "IMG_2043.JPG", "IMG_2047.JPG", "IMG_2050.JPG"];
	for (const [i, name] of shots.entries())
		touch(path.join(photos, name), 1_800_000 + i * 230_000, new Date(base + i * 47 * 60_000));
	touch(path.join(photos, "IMG_2052.JPG"), 2_400_000, new Date(base + 9 * 3_600_000));
	for (const dir of ["Downloads", names.music, names.videos])
		fs.mkdirSync(path.join(home, dir), { recursive: true });
	touch(path.join(home, "Downloads", "notes.txt"), 4, new Date(base - 86_400_000));
	const invoices = path.join(home, names.documents, names.invoices);
	fs.mkdirSync(invoices, { recursive: true });
	return { photos, invoices, downloads: path.join(home, "Downloads") };
}

// --- Sessão de gravação --------------------------------------------------

/** Sessão do piloto que também grava a tela. */
class Recorder extends AppDriver {
	constructor(locale) {
		const names = DEMO_NAMES[locale];
		super({
			locale,
			// Caminho curto, que aparece na barra de endereço das animações.
			home: "/tmp/home",
			workDir: path.join(WORK_DIR, locale),
			viewport: VIEWPORT,
			createFiles: (home) => createDemoFiles(home, names),
		});
		this.names = names;
	}

	/** Recarrega com a pasta de fotos (ou `dir`) e a janela no tamanho das animações. */
	reset(dir = this.paths.photos, { minRows = 1 } = {}) {
		fs.mkdirSync(this.dir, { recursive: true });
		return super.reset(dir, {
			minRows,
			stored: { layout: { treeWidth: 190, panelsHeight: 285 }, theme: "dark" },
		});
	}

	// --- Gravação -----------------------------------------------------------

	/**
	 * Começa a gravar. Confere o tamanho do primeiro quadro: se a janela real ficou menor
	 * que a área emulada, a captura sai reduzida; nesse caso reaplica a emulação e recomeça.
	 */
	async startRecording() {
		const framesDir = path.join(this.dir, "frames");
		for (let attempt = 1; ; attempt++) {
			this.frames = [];
			fs.rmSync(framesDir, { recursive: true, force: true });
			fs.mkdirSync(framesDir, { recursive: true });
			let firstSize = null;
			this.session.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
				const png = Buffer.from(data, "base64");
				firstSize ??= { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
				const file = path.join(framesDir, `${String(this.frames.length).padStart(5, "0")}.png`);
				fs.writeFileSync(file, png);
				this.frames.push({ file, time: metadata.timestamp * 1000 });
				void this.session.call("Page.screencastFrameAck", { sessionId });
			});
			await this.session.call("Emulation.setDeviceMetricsOverride", {
				...VIEWPORT,
				deviceScaleFactor: 1,
				mobile: false,
			});
			await sleep(300);
			await this.session.call("Page.startScreencast", {
				format: "png",
				maxWidth: VIEWPORT.width,
				maxHeight: VIEWPORT.height,
			});
			for (let i = 0; i < 20 && !firstSize; i++) await sleep(100);
			if (firstSize?.width === VIEWPORT.width && firstSize.height === VIEWPORT.height) break;
			await this.session.call("Page.stopScreencast");
			if (attempt >= 5) throw new Error(`quadros com tamanho errado: ${JSON.stringify(firstSize)}`);
			await sleep(800);
		}
		await sleep(300);
	}

	/**
	 * Para a gravação e monta o WebP: `crop` é a área gravada (proporção 16:10), reduzida
	 * para o tamanho final; `hold` mantém o último quadro antes de recomeçar.
	 */
	async finish(slide, { crop = { x: 0, y: 0, ...VIEWPORT }, hold = 2200 } = {}) {
		await sleep(300);
		// Print do estado real no fim, para comparar com o último quadro gravado.
		const { data } = await this.session.call("Page.captureScreenshot", { format: "png" });
		fs.writeFileSync(path.join(this.dir, `fim-${slide}.png`), Buffer.from(data, "base64"));
		const end = performance.timeOrigin + performance.now();
		await this.session.call("Page.stopScreencast");
		this.session.on("Page.screencastFrame", () => {});
		const frames = this.frames;
		if (frames.length === 0) throw new Error("nenhum quadro gravado");
		const args = ["-loop", "0", "-lossy", "-q", "65", "-m", "6", "-mixed"];
		const processed = path.join(this.dir, "processed");
		fs.rmSync(processed, { recursive: true, force: true });
		fs.mkdirSync(processed);
		frames.forEach((frame, i) => {
			const next = frames[i + 1]?.time ?? Math.max(end, frame.time + 100);
			let duration = Math.min(Math.round(next - frame.time), MAX_FRAME_MS);
			if (i === frames.length - 1) duration = hold;
			if (duration < 20) return; // quadros intermediários de animações muito rápidas
			const out = path.join(processed, path.basename(frame.file));
			execFileSync("magick", [
				frame.file,
				"-crop",
				`${crop.width}x${crop.height}+${crop.x}+${crop.y}`,
				"+repage",
				"-resize",
				`${OUTPUT.width}x${OUTPUT.height}`,
				out,
			]);
			args.push("-d", String(duration), out);
		});
		const target = path.join(OUT_DIR, this.locale, `${slide}.webp`);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		execFileSync("img2webp", [...args, "-o", target], { stdio: ["ignore", "ignore", "inherit"] });
		const kb = Math.round(fs.statSync(target).size / 1024);
		console.log(`  ${this.locale}/${slide}.webp: ${frames.length} quadros, ${kb} KB`);
	}
}

// --- Roteiros ---------------------------------------------------------------

const SCRIPTS = {
	/** Regras combinadas e a coluna Novo nome se atualizando ao digitar. */
	async intro(r) {
		await r.reset();
		await r.tagPanels();
		await r.startRecording();
		await sleep(600);
		await r.click(`[title="${r.t("toolbar.selectAll")}"]`);
		await r.click(r.field("replace.title", "input", 0));
		await r.type("IMG_");
		await r.click(r.field("replace.title", "input", 1));
		await r.type(`${r.names.trip} `);
		await r.select(r.field("extension.title", "select"), "lower");
		await r.moveTo(".file-rows", { dx: 60, dy: -20 });
		await sleep(1200);
		await r.finish("intro");
	},

	/** Construtor visual: exemplo pronto, pré-visualização e aplicar. */
	async regex(r) {
		await r.reset();
		await r.selectAll();
		await r.startRecording();
		await sleep(500);
		await r.click(".regex-builder-button");
		await sleep(600);
		await r.click(`text=${r.t("rxb.presetPrefix")}`);
		await sleep(900);
		await r.moveTo(".rx-preview-table", { dy: 10 });
		await sleep(1600);
		await r.click(`.rx-footer .button.primary`);
		await sleep(500);
		await r.moveTo(".file-rows", { dx: 60, dy: -20 });
		await sleep(1200);
		await r.finish("regex");
	},

	/** Salvar as regras em Seus Filtros, redefinir e aplicar de novo pela lista. */
	async presets(r) {
		await r.reset();
		await r.tagPanels();
		await r.selectAll();
		await r.fill(r.field("name.title", "select", 0), "fixed");
		await r.fill(r.field("name.title", "input", 0), `${r.names.trip} `);
		await r.fill(r.field("numbering.title", "select", 0), "suffix");
		await r.startRecording();
		await sleep(700);
		await r.click(".preset-save");
		await sleep(300);
		await r.type(r.names.trip, 80);
		await r.click(".prompt-actions .button.primary");
		await sleep(700);
		await r.click(`text=${r.t("actions.reset")}`);
		await sleep(900);
		const id = await r.eval(`document.querySelector(".preset-select option:last-child").value`);
		await r.select(".preset-select", id);
		await r.moveTo(".file-rows", { dx: 60, dy: -20 });
		await sleep(1200);
		await r.finish("presets");
	},

	/** Conflitos em vermelho bloqueiam a renomeação; a numeração os resolve. */
	async safety(r) {
		await r.reset();
		await r.tagPanels();
		await r.selectAll();
		await r.startRecording();
		await sleep(500);
		await r.select(r.field("name.title", "select", 0), "fixed");
		await r.click(r.field("name.title", "input", 0));
		await r.type("foto");
		await r.moveTo(".status-bar", { dx: -200 });
		await sleep(1400);
		await r.select(r.field("numbering.title", "select", 0), "suffix");
		await r.moveTo(".file-rows", { dx: 60, dy: -20 });
		await sleep(1200);
		await r.finish("safety");
	},

	/** Arrastar arquivos para a janela e renomear um item com F2 (com validação do nome). */
	async files(r) {
		await r.reset(r.home, { minRows: 0 });
		const files = ["IMG_2041.JPG", "IMG_2042.JPG"].map((name) => path.join(r.paths.photos, name));
		await r.startRecording();
		await sleep(500);
		await r.dropFiles(files, ".file-rows");
		await sleep(600);
		await r.click(".file-row.selected");
		await r.key("F2", "F2", 113);
		await sleep(400);
		await r.key("Home", "Home", 36);
		await r.type("Lisboa/");
		await sleep(1200);
		await r.key("Backspace", "Backspace", 8);
		await r.type(" ");
		await sleep(500);
		await r.click(".prompt-actions .button.primary");
		await r.moveTo(".file-rows", { dx: 60, dy: -20 });
		await sleep(1200);
		await r.finish("files");
	},

	/** Tema claro/escuro e troca de idioma. */
	async settings(r) {
		await r.reset();
		const other = r.locale === "en" ? "es" : "en";
		const names = LOCALE_NAMES;
		await r.startRecording();
		await sleep(500);
		await r.click(`[title="${r.t("settings.button")}"]`);
		await sleep(400);
		await r.click(`text=${r.t("theme.light")}`);
		await sleep(1200);
		await r.click(`text=${r.t("theme.dark")}`);
		await sleep(1000);
		await r.click(".settings-close");
		await r.click(".language-button");
		await r.click(`text=${names[other]}`);
		await sleep(1400);
		await r.click(".language-button");
		await r.click(`text=${names[r.locale]}`);
		await sleep(800);
		await r.finish("settings");
	},

	/**
	 * Regra de pasta monitorada recebendo um arquivo novo em Downloads. Fica por último: a
	 * regra continua salva e apareceria nas configurações dos outros roteiros.
	 */
	async watch(r) {
		await r.reset(r.paths.downloads);
		await r.tagPanels();
		// Regras da tela principal (preparadas antes de gravar): data na frente e Título.
		await r.fill(r.field("autoDate.title", "select", 0), "prefix");
		await r.fill(r.field("case.title", "select", 0), "title");
		await r.startRecording();
		await sleep(400);
		await r.click(`[title="${r.t("settings.button")}"]`);
		await sleep(500);
		await r.click(`text=${r.t("watch.add")}`);
		await sleep(400);
		await r.click(".watch-rule .folder-field input");
		await r.type(r.paths.downloads, 35);
		await r.click(`text=${r.t("watch.useCurrent")}`);
		await r.eval(
			`document.querySelectorAll(".watch-rule .folder-field input")[1].dataset.demo = "destination"`,
		);
		await r.click(`[data-demo="destination"]`);
		await r.type(r.paths.invoices, 35);
		await r.waitFor(`document.querySelector(".watch-status.watching")`);
		await sleep(800);
		fs.writeFileSync(path.join(r.paths.downloads, r.names.invoice), "%PDF-1.4 demo");
		await r.waitFor(`document.querySelector(".watch-activity li")`, 20_000);
		// O registro de atividade fica recolhido: abre e aponta para o arquivo renomeado.
		await r.click(`text=${r.t("watch.activityTitle")}`);
		await sleep(300);
		await r.moveTo(".watch-activity-detail", { dx: 40 });
		await sleep(1500);
		await r.finish("watch", { hold: 2600 });
	},
};

// --- Execução ---------------------------------------------------------------

const args = process.argv.slice(2);
const locales = args.filter((a) => a in CATALOGS);
const slides = args.filter((a) => a in SCRIPTS);

for (const locale of locales.length ? locales : Object.keys(CATALOGS)) {
	console.log(`${locale}:`);
	const recorder = new Recorder(locale);
	fs.mkdirSync(recorder.dir, { recursive: true });
	try {
		await recorder.launch();
		for (const slide of slides.length ? slides : Object.keys(SCRIPTS)) {
			try {
				await SCRIPTS[slide](recorder);
			} catch (error) {
				// Print da tela no momento da falha, para depurar o roteiro.
				const { data } = await recorder.session.call("Page.captureScreenshot", { format: "png" });
				const file = path.join(recorder.dir, `erro-${slide}.png`);
				fs.writeFileSync(file, Buffer.from(data, "base64"));
				throw new Error(`${locale}/${slide}: ${error.message} (print: ${file})`);
			}
		}
	} finally {
		await recorder.stop();
	}
}
