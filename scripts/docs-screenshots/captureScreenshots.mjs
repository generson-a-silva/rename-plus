#!/usr/bin/env node
// Gera os prints dos READMEs (docs/screenshot.png e docs/screenshots/**), 1280×800, nos
// três idiomas, a partir do app empacotado (AppImage): assim os avisos e caminhos são os
// que o usuário vê.
//
//   npm run docs:screenshots -- build/rename-plus-1.5.3-linux-x86_64.AppImage
//   npm run docs:screenshots -- <AppImage> pt-BR conflitos     # só um idioma / print
//
// Requer: Linux com sessão gráfica e o AppImage gerado por `npm run dist`.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { APP_DIR, AppDriver, CATALOGS, sleep, touch } from "../lib/appDriver.mjs";

const WORK_DIR = "/tmp/rename-plus-docs";
const HOME = "/tmp/rename-plus-demo/home";
const VIEWPORT = { width: 1280, height: 800 };
/** Tamanhos padrão da janela (árvore e área de painéis), como na primeira execução. */
const LAYOUT = { treeWidth: 260, panelsHeight: 340 };
const MB = 1024 * 1024;

/** Onde cada idioma guarda os prints e o print principal (o do topo do README). */
const OUTPUT = {
	"pt-BR": { dir: "docs/screenshots/pt-BR", hero: "docs/screenshots/pt-BR/screenshot.png" },
	en: { dir: "docs/screenshots", hero: "docs/screenshot.png" },
	es: { dir: "docs/screenshots/es-ES", hero: "docs/screenshots/es-ES/screenshot.png" },
};

/** Pastas, arquivos e textos de demonstração em cada idioma. */
const NAMES = {
	"pt-BR": {
		pictures: "Imagens",
		trip: "Viagem Lisboa 2024",
		itinerary: "Roteiro da viagem.pdf",
		family: "Família",
		familyFiles: ["DSC00412.jpg", "DSC00413.jpg", "DSC00420.jpg", "foto.jpg", "Natal 2023.jpg"],
		music: "Músicas",
		videos: "Vídeos",
		documents: "Documentos",
		downloads: "Downloads",
		invoices: "Faturas",
		city: "Lisboa",
		presetTrip: "Viagens",
		presetInvoices: "Faturas",
		presetFamily: "Fotos de família",
		familyFixed: "Família",
		conflictFixed: "foto",
		missingDir: "~/Imagens/Viagem Porto 2025",
		invalidName: "Roteiro 10/06 a 14/06.pdf",
		invoiceFiles: [
			"fatura-energia-setembro.pdf",
			"boleto-condominio.pdf",
			"nota-fiscal-notebook.pdf",
		],
		testName: "fatura-agua-outubro.pdf",
	},
	en: {
		pictures: "Pictures",
		trip: "Lisbon Trip 2024",
		itinerary: "Trip itinerary.pdf",
		family: "Family",
		familyFiles: [
			"DSC00412.jpg",
			"DSC00413.jpg",
			"DSC00420.jpg",
			"photo.jpg",
			"Christmas 2023.jpg",
		],
		music: "Music",
		videos: "Videos",
		documents: "Documents",
		downloads: "Downloads",
		invoices: "Invoices",
		city: "Lisbon",
		presetTrip: "Trips",
		presetInvoices: "Invoices",
		presetFamily: "Family photos",
		familyFixed: "Family",
		conflictFixed: "photo",
		missingDir: "~/Pictures/Porto Trip 2025",
		invalidName: "Itinerary 06/10 to 06/14.pdf",
		invoiceFiles: ["power-bill-september.pdf", "condo-fee.pdf", "laptop-receipt.pdf"],
		testName: "water-bill-october.pdf",
	},
	es: {
		pictures: "Imágenes",
		trip: "Viaje a Lisboa 2024",
		itinerary: "Itinerario del viaje.pdf",
		family: "Familia",
		familyFiles: ["DSC00412.jpg", "DSC00413.jpg", "DSC00420.jpg", "foto.jpg", "Navidad 2023.jpg"],
		music: "Música",
		videos: "Vídeos",
		documents: "Documentos",
		downloads: "Descargas",
		invoices: "Facturas",
		city: "Lisboa",
		presetTrip: "Viajes",
		presetInvoices: "Facturas",
		presetFamily: "Fotos de familia",
		familyFixed: "Familia",
		conflictFixed: "foto",
		missingDir: "~/Imágenes/Viaje a Oporto 2025",
		invalidName: "Itinerario 10/06 a 14/06.pdf",
		invoiceFiles: ["factura-luz-septiembre.pdf", "cuota-comunidad.pdf", "factura-portatil.pdf"],
		testName: "factura-agua-octubre.pdf",
	},
};

const ALBUM = "the midnight orchestra - live sessions";
const TRACKS = {
	cd1: ["01_opening_theme.MP3", "02_city_lights.MP3", "03_after_hours.MP3", "04_slow_dance.MP3"],
	cd2: ["01_encore.MP3", "02_last_train_home.MP3", "03_closing_credits.MP3"],
};

/** Fotos da viagem: [arquivo, MB, dia de junho, hora, minuto]. */
const TRIP_PHOTOS = [
	["IMG_2041.JPG", 3.5, 10, 11, 21],
	["IMG_2042.JPG", 2.9, 11, 12, 22],
	["IMG_2047.JPG", 2.7, 11, 13, 23],
	["IMG_2051.JPG", 3, 11, 14, 24],
	["IMG_2058.JPG", 3.6, 12, 15, 25],
	["IMG_2063.JPG", 4.2, 12, 16, 20],
	["IMG_2070.JPG", 2.7, 12, 17, 21],
	["IMG_2074.JPG", 3.8, 13, 18, 22],
	["IMG_2081.JPG", 4.3, 13, 10, 23],
	["IMG_2089.JPG", 4, 13, 11, 24],
	["IMG_2093.JPG", 3.3, 14, 12, 25],
	["IMG_2104.JPG", 4.4, 14, 13, 20],
];

/** Fotos da família: [MB, data]. */
const FAMILY_PHOTOS = [
	[2.1, new Date(2023, 11, 3, 19, 0)],
	[2.5, new Date(2023, 11, 3, 19, 7)],
	[2.9, new Date(2023, 11, 4, 19, 14)],
	[2, new Date(2023, 10, 30, 9, 0)],
	[3.3, new Date(2023, 11, 25, 19, 21)],
];

function createDemoFiles(home, n) {
	fs.rmSync(path.dirname(home), { recursive: true, force: true });
	const trip = path.join(home, n.pictures, n.trip);
	for (const [name, mb, day, hour, minute] of TRIP_PHOTOS)
		touch(path.join(trip, name), Math.round(mb * MB), new Date(2024, 5, day, hour, minute));
	touch(path.join(trip, n.itinerary), 180 * 1024, new Date(2024, 4, 28, 20, 14));

	const family = path.join(home, n.pictures, n.family);
	n.familyFiles.forEach((name, i) => {
		const [mb, date] = FAMILY_PHOTOS[i];
		touch(path.join(family, name), Math.round(mb * MB), date);
	});

	const album = path.join(home, n.music, ALBUM);
	for (const [cd, tracks] of Object.entries(TRACKS)) {
		for (const [i, track] of tracks.entries()) {
			const size = Math.round((6.2 + i * 0.7) * MB);
			touch(path.join(album, cd, track), size, new Date(2022, 2, 14, 20, i * 5));
		}
	}

	for (const dir of [n.videos, n.downloads, path.join(n.documents, n.invoices)])
		fs.mkdirSync(path.join(home, dir), { recursive: true });
	return {
		trip,
		family,
		album,
		downloads: path.join(home, n.downloads),
		invoices: path.join(home, n.documents, n.invoices),
	};
}

// --- Ações compostas -----------------------------------------------------------

class DocsDriver extends AppDriver {
	constructor(locale, app) {
		const names = NAMES[locale];
		super({
			locale,
			home: HOME,
			workDir: path.join(WORK_DIR, locale),
			viewport: VIEWPORT,
			exec: app.exec,
			env: app.env,
			createFiles: (home) => createDemoFiles(home, names),
		});
		this.n = names;
	}

	/** Abre `dir` com tudo zerado, sem cursor desenhado, e marca os painéis. */
	async open(dir, { filters, sort, theme = "dark", minRows = 1 } = {}) {
		const stored = { layout: LAYOUT, theme };
		if (filters) stored.filters = filters;
		if (sort) stored.sort = sort;
		await this.reset(dir, { minRows, cursor: false, stored });
		await this.tagPanels();
	}

	async out(name, { settle = true } = {}) {
		const { dir, hero } = OUTPUT[this.locale];
		const file = path.join(APP_DIR, name === "screenshot" ? hero : path.join(dir, `${name}.png`));
		if (settle) {
			// Sem foco piscando nem dica de mouse no print.
			await this.eval(`document.activeElement?.blur?.()`);
			await sleep(300);
		}
		await this.screenshot(file);
		console.log(`  ${path.relative(APP_DIR, file)}`);
	}

	/** Salva as regras atuais em Seus Filtros, pelo botão de salvar ao lado da lista. */
	async savePreset(name) {
		await this.press(".preset-save");
		await this.waitFor(`document.querySelector(".prompt-dialog[open] input")`);
		await this.fill(".prompt-dialog input", name);
		await this.press(".prompt-actions .button.primary");
		await sleep(400);
	}

	async applyPreset(name) {
		const id = await this.eval(
			`[...document.querySelector(".preset-select").options].find((o) => o.textContent === ${JSON.stringify(name)})?.value`,
		);
		await this.fill(".preset-select", id);
	}

	/** Regras do print principal: data na frente, a cidade no lugar de IMG_1234 e numeração. */
	async tripRules() {
		await this.fill(this.field("regex.title", "input", 0), "IMG_(\\d+)");
		await this.fill(this.field("regex.title", "input", 1), this.n.city);
		await this.fill(this.field("autoDate.title", "select", 0), "prefix");
		await this.fill(this.field("autoDate.title", "input", 1), " ");
		await this.fill(this.field("numbering.title", "select", 0), "suffix");
		await this.fill(this.field("numbering.title", "input", 3), "2");
		await this.fill(this.field("numbering.title", "input", 4), " - ");
		await this.fill(this.field("extension.title", "select", 0), "lower");
	}

	/** Seleciona as fotos da viagem (todas menos o roteiro em PDF). */
	async selectTripPhotos() {
		await this.selectRows(TRIP_PHOTOS.map(([name]) => name));
	}

	async openSettings() {
		await this.press(`[title="${this.t("settings.button")}"]`);
		await this.waitFor(`document.querySelector(".settings-dialog[open] .settings-body")`);
		await sleep(300);
	}

	/** Rola o corpo das Configurações até `selector` ficar `offset` px abaixo do topo. */
	async scrollSettingsTo(selector, offset = 16) {
		await this.eval(`(() => {
			const body = document.querySelector(".settings-dialog[open] .settings-body");
			const el = document.querySelector(${JSON.stringify(selector)});
			body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top - ${offset};
		})()`);
		await sleep(300);
	}
}

// --- Prints --------------------------------------------------------------------

const SHOTS = {
	/** Print principal: fotos da viagem com data, cidade e numeração (preset "Viagens"). */
	async screenshot(d) {
		await d.open(d.paths.trip);
		await d.tripRules();
		await d.savePreset(d.n.presetTrip);
		// Recarrega para sair a mensagem de "salvo": as regras e o preset continuam.
		await sleep(500);
		await d.reset(d.paths.trip, {
			cursor: false,
			stored: { layout: LAYOUT, theme: "dark" },
			keepStorage: true,
		});
		await d.tagPanels();
		await d.selectTripPhotos();
		await d.out("screenshot");
	},

	/**
	 * Tela de boas-vindas: o primeiro slide (idioma e tema) e o do construtor de RegEx, com
	 * a animação já no ponto em que mostra a pré-visualização.
	 */
	async "boas-vindas"(d) {
		await d.open(d.paths.trip);
		await d.press(`[title="${d.t("toolbar.welcome")}"]`);
		await d.waitFor(`document.querySelector(".welcome-dialog[open]")`);
		await sleep(600);
		await d.out("boas-vindas");
		for (let i = 0; i < 2; i++) await d.press(`text=${d.t("welcome.next")}`);
		await d.waitFor(
			`document.querySelector(".welcome-slide:not([inert]) .welcome-media img")?.complete`,
		);
		await sleep(5200);
		await d.out("boas-vindas-recursos", { settle: false });
		await d.press(".welcome-dialog .settings-close");
	},

	/** Construtor visual com o exemplo IMG_1234 → Foto 1234. */
	async "construtor-regex"(d) {
		await d.open(d.paths.trip);
		await d.tripRules();
		await d.selectTripPhotos();
		await d.press(".regex-builder-button");
		await d.waitFor(`document.querySelector(".rx-dialog[open]")`);
		await d.press(`text=${d.t("rxb.presetPrefix")}`);
		await sleep(400);
		await d.eval(`document.querySelector(".rx-dialog .rx-body").scrollTop = 0`);
		await d.out("construtor-regex");
		await d.press(".rx-footer .button:not(.primary)");
	},

	/** Mensagens de erro: RegEx inválida e pasta inexistente digitada na barra. */
	async erros(d) {
		await d.open(d.paths.trip);
		await d.fill(d.field("regex.title", "input", 0), "IMG_(\\d+");
		await d.fill(d.field("regex.title", "input", 1), `${d.n.city} $1`);
		await d.selectRows(TRIP_PHOTOS.slice(0, 6).map(([name]) => name));
		await d.press(".toolbar form input");
		await d.fill(".toolbar form input", d.n.missingDir);
		await d.eval(`document.querySelector(".toolbar form").requestSubmit()`);
		await sleep(600);
		await d.out("erros");
	},

	/** Nome inválido ao renomear um item (F2), no tema claro. */
	async validacao(d) {
		await d.open(d.paths.trip, { theme: "light" });
		await d.selectRows([d.n.itinerary]);
		await d.key("F2", "F2", 113);
		await d.waitFor(`document.querySelector(".prompt-dialog[open] input")`);
		await d.fill(".prompt-dialog input", d.n.invalidName);
		await sleep(300);
		await d.eval(`document.querySelector(".prompt-dialog input").focus()`);
		await d.out("validacao");
		await d.press(".prompt-actions .button:not(.primary)");
	},

	/** Arrastar arquivos para a janela (aviso "Solte para abrir"). */
	async arrastar(d) {
		await d.open(d.paths.family);
		const files = d.n.familyFiles.slice(0, 2).map((name) => path.join(d.paths.family, name));
		await d.dropFiles(files, ".file-rows", { drop: false });
		// O aviso some 400 ms depois do último movimento: um último, e o print logo em seguida.
		const point = await d.locate(".file-rows");
		await d.session.call("Input.dispatchDragEvent", {
			type: "dragOver",
			...point,
			data: { items: [], files, dragOperationsMask: 1 },
		});
		await sleep(150);
		await d.out("arrastar", { settle: false });
		await d.session.call("Input.dispatchDragEvent", {
			type: "dragCancel",
			x: 10,
			y: 10,
			data: { items: [], files, dragOperationsMask: 1 },
		});
	},

	/** Salvar em Seus Filtros: nome fixo, data automática e numeração. */
	async presets(d) {
		await d.open(d.paths.family);
		await d.fill(d.field("name.title", "select", 0), "fixed");
		await d.fill(d.field("name.title", "input", 0), d.n.familyFixed);
		await d.fill(d.field("autoDate.title", "select", 0), "prefix");
		await d.fill(d.field("autoDate.title", "input", 1), " ");
		await d.fill(d.field("numbering.title", "select", 0), "suffix");
		await d.fill(d.field("numbering.title", "input", 3), "2");
		await d.fill(d.field("numbering.title", "input", 4), " ");
		await d.selectAll();
		await d.press(".preset-save");
		await d.waitFor(`document.querySelector(".prompt-dialog[open] input")`);
		await d.fill(".prompt-dialog input", d.n.presetFamily);
		await d.eval(`document.querySelector(".prompt-dialog input").focus()`);
		await d.out("presets");
		await d.press(".prompt-actions .button:not(.primary)");
	},

	/** Conflitos: o mesmo nome fixo para várias fotos (e igual a um arquivo que já existe). */
	async conflitos(d) {
		await d.open(d.paths.family);
		await d.fill(d.field("name.title", "select", 0), "fixed");
		await d.fill(d.field("name.title", "input", 0), d.n.conflictFixed);
		const existing = `${d.n.conflictFixed}.jpg`;
		await d.selectRows(d.n.familyFiles.filter((name) => name !== existing));
		await d.out("conflitos");
	},

	/** Modo Subpastas com as faixas de dois CDs, no tema claro. */
	async subpastas(d) {
		await d.open(d.paths.album, {
			theme: "light",
			filters: { mask: "*", files: true, folders: false, hidden: false, subfolders: true },
			sort: { key: "dir", desc: false },
		});
		await d.fill(d.field("remove.title", "input", 0), "3");
		await d.fill(d.field("replace.title", "input", 0), "_");
		await d.fill(d.field("replace.title", "input", 1), " ");
		await d.fill(d.field("case.title", "select", 0), "title");
		await d.fill(d.field("numbering.title", "select", 0), "prefix");
		await d.fill(d.field("numbering.title", "input", 3), "2");
		await d.fill(d.field("numbering.title", "input", 4), " - ");
		await d.check(d.field("numbering.title", "checkbox", 0), true);
		await d.fill(d.field("extension.title", "select", 0), "lower");
		await d.selectAll();
		await d.out("subpastas");
	},

	/**
	 * Configurações e pastas monitoradas, com o segundo plano ativado: regra "Faturas" em
	 * Downloads com o preset de mesmo nome, três PDFs já renomeados e um nome de teste.
	 */
	async configuracoes(d) {
		await d.open(d.paths.trip);
		// Preset das faturas: hífens viram espaços, Título e data na frente.
		await d.fill(d.field("replace.title", "input", 0), "-");
		await d.fill(d.field("replace.title", "input", 1), " ");
		await d.fill(d.field("case.title", "select", 0), "title");
		await d.fill(d.field("autoDate.title", "select", 0), "prefix");
		await d.fill(d.field("autoDate.title", "input", 1), " ");
		await d.savePreset(d.n.presetInvoices);
		await d.press(`text=${d.t("actions.reset")}`);
		await d.tripRules();
		await d.savePreset(d.n.presetTrip);
		await sleep(500);
		await d.reset(d.paths.trip, {
			cursor: false,
			stored: { layout: LAYOUT, theme: "dark" },
			keepStorage: true,
		});
		await d.tagPanels();
		await d.selectTripPhotos();

		await d.openSettings();
		await d.check(".background-toggle input", true);
		await d.waitFor(`document.querySelector(".background-card")?.innerText.includes("autostart")`);
		await d.eval(`document.querySelector(".settings-dialog[open] .settings-body").scrollTop = 0`);
		await d.out("configuracoes");

		// Regra de pasta monitorada.
		await d.press(`text=${d.t("watch.add")}`);
		await d.waitFor(`document.querySelector(".watch-rule .folder-field input")`);
		await d.eval(`(() => {
			const rule = document.querySelector(".watch-rule");
			const inputs = [...rule.querySelectorAll(".watch-rule-body input:not([type=checkbox])")];
			inputs.forEach((el, i) => { el.dataset.demo = "watch" + i; });
			rule.querySelector(".preset-select").dataset.demo = "watch-preset";
		})()`);
		await d.fill('[data-demo="watch0"]', d.n.presetInvoices);
		await d.fill('[data-demo="watch1"]', "*.pdf");
		await d.fill('[data-demo="watch2"]', d.paths.downloads);
		await d.applyWatchPreset(d.n.presetInvoices);
		await d.fill('[data-demo="watch3"]', d.paths.invoices);
		await d.check(".watch-rule-footer input[type=checkbox]", true);
		await d.waitFor(`document.querySelector(".watch-status.watching")`);
		// O selo "Monitorando" aparece antes de o processo principal confirmar: espera a regra
		// valer e cria cada arquivo só depois que o anterior foi movido para a pasta de destino.
		await sleep(3000);
		for (const name of d.n.invoiceFiles) {
			const file = path.join(d.paths.downloads, name);
			touch(file, 120 * 1024);
			for (let i = 0; i < 100 && fs.existsSync(file); i++) await sleep(200);
			if (fs.existsSync(file)) throw new Error(`a pasta monitorada não moveu ${name}`);
			await sleep(1200);
		}
		await d.waitFor(
			`[...document.querySelectorAll(".settings-subsection-count")].some((c) => c.textContent === "3")`,
		);
		await d.eval(`(() => {
			const tester = document.querySelector(".watch-tester input");
			tester.dataset.demo = "tester";
		})()`);
		await d.fill('[data-demo="tester"]', d.n.testName);
		await d.scrollSettingsTo(".settings-section:has(.watch-rule)", 8);
		await d.out("pastas-monitoradas");

		await d.press(`text=${d.t("watch.activityTitle")}`);
		await d.scrollSettingsTo(".watch-rename", 8);
		await d.out("pastas-monitoradas-atividade");
	},
};

// O preset da regra é escolhido pela lista dela (mesmo componente da tela principal).
DocsDriver.prototype.applyWatchPreset = async function applyWatchPreset(name) {
	const id = await this.eval(
		`[...document.querySelector('[data-demo="watch-preset"]').options].find((o) => o.textContent === ${JSON.stringify(name)})?.value`,
	);
	await this.fill('[data-demo="watch-preset"]', id);
};

// --- Execução ------------------------------------------------------------------

const args = process.argv.slice(2);
const exec = args.find((arg) => arg.endsWith(".AppImage"));
if (!exec || !fs.existsSync(exec)) {
	console.error("uso: npm run docs:screenshots -- <AppImage> [idioma…] [print…]");
	process.exit(2);
}
/**
 * Extrai o AppImage e roda o binário de dentro dele com `APPIMAGE` apontando para o
 * arquivo: para o app é o mesmo que rodar como AppImage (avisos e caminhos iguais), sem
 * depender do FUSE nem de integradores como o AppImageLauncher, que podem travar a abertura.
 */
function extractAppImage(file) {
	const target = path.join(WORK_DIR, "appimage");
	fs.rmSync(target, { recursive: true, force: true });
	fs.mkdirSync(target, { recursive: true });
	execFileSync(file, ["--appimage-extract"], { cwd: target, stdio: "ignore" });
	const root = path.join(target, "squashfs-root");
	return { exec: path.join(root, "rename-plus"), env: { APPIMAGE: file, APPDIR: root } };
}

const app = extractAppImage(path.resolve(exec));
const locales = args.filter((arg) => arg in CATALOGS);
const shots = args.filter((arg) => arg in SHOTS);

for (const locale of locales.length ? locales : Object.keys(CATALOGS)) {
	console.log(`${locale}:`);
	const driver = new DocsDriver(locale, app);
	fs.mkdirSync(driver.dir, { recursive: true });
	try {
		await driver.launch();
		for (const shot of shots.length ? shots : Object.keys(SHOTS)) {
			try {
				await SHOTS[shot](driver);
			} catch (error) {
				const file = path.join(driver.dir, `erro-${shot}.png`);
				await driver.screenshot(file).catch(() => {});
				throw new Error(`${locale}/${shot}: ${error.message} (print: ${file})`);
			}
		}
	} finally {
		await driver.stop();
	}
}
