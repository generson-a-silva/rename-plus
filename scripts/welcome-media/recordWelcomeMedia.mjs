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
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const APP_DIR = path.resolve(import.meta.dirname, "../..");
const OUT_DIR = path.join(APP_DIR, "src/renderer/src/assets/welcome");
const WORK_DIR = "/tmp/rename-plus-welcome";
const PORT = 9341;
const VIEWPORT = { width: 1024, height: 640 };
/** Tamanho final das animações (mesma proporção 16:10 do quadro no diálogo). */
const OUTPUT = { width: 960, height: 600 };
/** Pausas longas (esperas do app) são encurtadas na animação. */
const MAX_FRAME_MS = 1600;
const ELECTRON = path.join(APP_DIR, "node_modules/electron/dist/electron");

/**
 * Catálogos de tradução do app, para achar botões pelo texto em cada idioma. O projeto é
 * CommonJS, então o .ts é convertido aqui (só tem `import type`, que some na conversão).
 */
async function loadCatalog(file, name) {
	const code = stripTypeScriptTypes(fs.readFileSync(path.join(APP_DIR, file), "utf8"));
	const module = await import(
		`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
	);
	return module[name];
}

const CATALOGS = {
	"pt-BR": await loadCatalog("src/shared/i18n/catalogs/ptBr.ts", "ptBr"),
	en: await loadCatalog("src/shared/i18n/catalogs/en.ts", "en"),
	es: await loadCatalog("src/shared/i18n/catalogs/es.ts", "es"),
};

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- CDP ------------------------------------------------------------------

async function connect(url) {
	const ws = new WebSocket(url);
	let id = 0;
	const waiting = new Map();
	const listeners = new Map();
	ws.onmessage = (message) => {
		const data = JSON.parse(message.data);
		if (data.id) waiting.get(data.id)?.(data);
		else listeners.get(data.method)?.(data.params);
	};
	await new Promise((resolve, reject) => {
		ws.onopen = resolve;
		ws.onerror = reject;
	});
	const call = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const n = ++id;
			waiting.set(n, (data) => {
				waiting.delete(n);
				if (data.error) reject(new Error(`${method}: ${data.error.message}`));
				else resolve(data.result);
			});
			ws.send(JSON.stringify({ id: n, method, params }));
		});
	return { call, on: (event, fn) => listeners.set(event, fn), close: () => ws.close() };
}

async function pageTarget() {
	const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
	return list.find((t) => t.type === "page" && t.url.startsWith("file:"));
}

// --- Ambiente de demonstração -------------------------------------------

function touch(file, content, date) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
	if (date) fs.utimesSync(file, date, date);
}

/** Pasta pessoal fictícia: fotos de viagem, Downloads e uma pasta de destino. */
function createDemoFiles(home, names) {
	fs.rmSync(home, { recursive: true, force: true });
	const photos = path.join(home, names.photos, names.trip);
	const base = new Date(2024, 5, 10, 9, 12).getTime();
	const shots = ["IMG_2041.JPG", "IMG_2042.JPG", "IMG_2043.JPG", "IMG_2047.JPG", "IMG_2050.JPG"];
	for (const [i, name] of shots.entries()) {
		const size = 1_800_000 + i * 230_000;
		touch(path.join(photos, name), Buffer.alloc(size), new Date(base + i * 47 * 60_000));
	}
	touch(path.join(photos, "IMG_2052.JPG"), Buffer.alloc(2_400_000), new Date(base + 9 * 3_600_000));
	for (const dir of ["Downloads", names.music, names.videos])
		fs.mkdirSync(path.join(home, dir), { recursive: true });
	touch(path.join(home, "Downloads", "notes.txt"), "demo", new Date(base - 86_400_000));
	const invoices = path.join(home, names.documents, names.invoices);
	fs.mkdirSync(invoices, { recursive: true });
	return { photos, invoices, downloads: path.join(home, "Downloads") };
}

// --- Sessão de gravação --------------------------------------------------

class Recorder {
	constructor(locale) {
		this.locale = locale;
		this.catalog = CATALOGS[locale];
		this.names = DEMO_NAMES[locale];
		this.dir = path.join(WORK_DIR, locale);
		// Caminho curto, que aparece na barra de endereço das animações.
		this.home = "/tmp/home";
	}

	/** Texto da interface no idioma gravado (sem plural/parâmetros). */
	t(key) {
		const message = this.catalog[key];
		if (message === undefined) throw new Error(`chave inexistente: ${key}`);
		return typeof message === "string" ? message : message.other;
	}

	async launch() {
		this.paths = createDemoFiles(this.home, this.names);
		const userData = path.join(this.dir, "user-data");
		fs.rmSync(userData, { recursive: true, force: true });
		fs.mkdirSync(userData, { recursive: true });
		fs.writeFileSync(path.join(userData, "theme.json"), JSON.stringify({ mode: "dark" }));
		const log = fs.openSync(path.join(this.dir, "electron.log"), "w");
		this.child = spawn(
			ELECTRON,
			[".", `--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`],
			{
				cwd: APP_DIR,
				stdio: ["ignore", log, log],
				env: { ...process.env, ELECTRON_RUN_AS_NODE: "", HOME: this.home },
			},
		);
		for (let i = 0; i < 60 && !this.session; i++) {
			await sleep(500);
			const page = await pageTarget().catch(() => null);
			if (page) this.session = await connect(page.webSocketDebuggerUrl);
		}
		if (!this.session) throw new Error("o app não abriu");
		await this.waitFor("!!document.querySelector('.status-bar')");
		await this.session.call("Emulation.setDeviceMetricsOverride", {
			...VIEWPORT,
			deviceScaleFactor: 1,
			mobile: false,
		});
	}

	/** Recarrega a janela com preferências limpas: idioma, pasta inicial e boas-vindas já vistas. */
	async reset(dir = this.paths.photos, { minRows = 1, ...extra } = {}) {
		createDemoFiles(this.home, this.names);
		const stored = {
			locale: this.locale,
			welcomeSeen: true,
			lastDir: dir,
			layout: { treeWidth: 190, panelsHeight: 285 },
			...extra,
		};
		await this.eval(`(() => {
			localStorage.clear();
			for (const [k, v] of Object.entries(${JSON.stringify(stored)}))
				localStorage.setItem("rename-plus:" + k, JSON.stringify(v));
			location.reload();
		})()`);
		await sleep(800);
		await this.waitFor(
			`!!document.querySelector(".status-bar") && document.querySelectorAll(".file-row").length >= ${minRows}`,
		);
		await sleep(600);
		await this.installCursor();
	}

	async stop() {
		this.session?.close();
		this.child?.kill();
		await sleep(800);
	}

	async eval(expression) {
		const result = await this.session.call("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		});
		if (result.exceptionDetails) {
			throw new Error(result.exceptionDetails.exception?.description ?? expression);
		}
		return result.result.value;
	}

	async waitFor(expression, timeout = 15_000) {
		const end = Date.now() + timeout;
		while (Date.now() < end) {
			if (
				await this.eval(
					`(() => { try { return !!(${expression}); } catch { return false; } })()`,
				).catch(() => false)
			)
				return;
			await sleep(150);
		}
		throw new Error(`tempo esgotado esperando: ${expression}`);
	}

	// --- Cursor e ações ---------------------------------------------------

	/**
	 * Cursor desenhado num popover: fica na camada superior, acima até dos <dialog> modais
	 * (é reaberto a cada ação para continuar por cima do último diálogo aberto).
	 */
	async installCursor() {
		await this.eval(`(() => {
			const el = document.createElement("div");
			el.id = "demo-cursor";
			el.popover = "manual";
			el.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l0 19 5-4.5 3.5 7.5 3.4-1.6-3.4-7.3 6.8-.4z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><span></span>';
			const style = document.createElement("style");
			style.textContent = \`
				#demo-cursor { position: fixed; inset: auto; left: 0; top: 0; margin: 0; padding: 0; border: 0;
					background: none; overflow: visible; pointer-events: none; width: 22px; height: 26px;
					transform: translate(640px, 420px); transition: transform 0.65s cubic-bezier(.45,.05,.3,1);
					filter: drop-shadow(0 2px 3px rgb(0 0 0 / .45)); }
				#demo-cursor span { position: absolute; left: -12px; top: -12px; width: 26px; height: 26px;
					border-radius: 50%; background: rgb(76 141 255 / .45); transform: scale(0); opacity: 0; }
				#demo-cursor.press span { animation: demo-press .45s ease-out; }
				@keyframes demo-press { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
				/* Aviso que só existe ao rodar pelo código-fonte (cita caminhos desta máquina). */
				.background-card .integration-warning { display: none !important; }
			\`;
			document.head.append(style);
			document.body.append(el);
			el.showPopover();
		})()`);
	}

	/** Centro do elemento (seletor CSS ou `text=…` para botões/links/opções). */
	async locate(target) {
		const box = await this.eval(`(() => {
			const s = ${JSON.stringify(target)};
			const pick = (list, text) => [...document.querySelectorAll(list)].find((e) => e.offsetParent !== null && e.textContent.trim().includes(text));
			const el = s.startsWith("text=") ? pick("button, a, summary, label, option, [role=menuitemradio], .rx-chip", s.slice(5)) : document.querySelector(s);
			if (!el) return null;
			// Rola (suavemente) cada ancestral rolável até o elemento ficar visível.
			let scrolled = false;
			for (let box = el.parentElement; box; box = box.parentElement) {
				const { overflowY } = getComputedStyle(box);
				if (!/auto|scroll/.test(overflowY) || box.scrollHeight <= box.clientHeight) continue;
				const outer = box.getBoundingClientRect();
				const inner = el.getBoundingClientRect();
				const margin = 24;
				let delta = 0;
				if (inner.bottom > outer.bottom - margin) delta = inner.bottom - outer.bottom + margin;
				else if (inner.top < outer.top + margin) delta = inner.top - outer.top - margin;
				if (Math.abs(delta) > 1) {
					box.scrollBy({ top: delta, behavior: "smooth" });
					scrolled = true;
				}
			}
			return { el: true, scrolled };
		})()`);
		if (!box) throw new Error(`não encontrado: ${target}`);
		if (box.scrolled) await sleep(650);
		const point = await this.eval(`(() => {
			const s = ${JSON.stringify(target)};
			const pick = (list, text) => [...document.querySelectorAll(list)].find((e) => e.offsetParent !== null && e.textContent.trim().includes(text));
			const el = s.startsWith("text=") ? pick("button, a, summary, label, option, [role=menuitemradio], .rx-chip", s.slice(5)) : document.querySelector(s);
			const r = el.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		})()`);
		return point;
	}

	async moveTo(target, { dx = 0, dy = 0 } = {}) {
		const { x, y } = typeof target === "string" ? await this.locate(target) : target;
		await this.eval(`(() => {
			const c = document.getElementById("demo-cursor");
			c.hidePopover(); c.showPopover();
			c.style.transform = "translate(${x + dx}px, ${y + dy}px)";
		})()`);
		await sleep(750);
		return { x: x + dx, y: y + dy };
	}

	/** Clique de verdade (Input.dispatchMouseEvent), com o efeito visual no cursor. */
	async click(target, options) {
		const { x, y } = await this.moveTo(target, options);
		await this.eval(`(() => { const c = document.getElementById("demo-cursor");
			c.classList.remove("press"); void c.offsetWidth; c.classList.add("press"); })()`);
		for (const type of ["mousePressed", "mouseReleased"])
			await this.session.call("Input.dispatchMouseEvent", {
				type,
				x,
				y,
				button: "left",
				clickCount: 1,
			});
		await sleep(450);
	}

	/** Digita caractere por caractere no campo focado. */
	async type(text, delay = 70) {
		for (const char of text) {
			await this.session.call("Input.insertText", { text: char });
			await sleep(delay);
		}
		await sleep(300);
	}

	async key(key, code = key, keyCode = 0) {
		for (const type of ["keyDown", "keyUp"])
			await this.session.call("Input.dispatchKeyEvent", {
				type,
				key,
				code,
				windowsVirtualKeyCode: keyCode,
			});
		await sleep(300);
	}

	/** Escolhe uma opção de um <select> (a lista nativa não aparece na gravação). */
	async select(selector, value) {
		await this.click(selector);
		await this.eval(`(() => {
			const el = document.querySelector(${JSON.stringify(selector)});
			Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, ${JSON.stringify(value)});
			el.dispatchEvent(new Event("change", { bubbles: true }));
			el.blur();
		})()`);
		await sleep(500);
	}

	/** Marca painéis e campos com atributos estáveis, independentes do idioma. */
	async tagPanels() {
		const titles = Object.fromEntries(
			Object.keys(this.catalog)
				.filter((k) => k.endsWith(".title"))
				.map((k) => [this.t(k), k]),
		);
		await this.eval(`(() => {
			const titles = ${JSON.stringify(titles)};
			for (const panel of document.querySelectorAll("fieldset.panel")) {
				const key = titles[panel.querySelector("legend")?.textContent.trim()];
				if (!key) continue;
				panel.dataset.demoPanel = key;
				for (const tag of ["input", "select"])
					panel.querySelectorAll(tag === "input" ? "input:not([type=checkbox])" : tag).forEach((el, i) => {
						el.dataset.demo = tag + i;
					});
			}
		})()`);
	}

	/** Seletor do n-ésimo campo de texto (`input`) ou lista (`select`) de um painel de regras. */
	field(panelKey, tag = "input", n = 0) {
		return `[data-demo-panel="${panelKey}"] [data-demo="${tag}${n}"]`;
	}

	/** Preenche um campo de texto sem gravar (preparação antes da gravação). */
	async fill(selector, value) {
		await this.eval(`(() => {
			const el = document.querySelector(${JSON.stringify(selector)});
			const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
			Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${JSON.stringify(value)});
			el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
		})()`);
		await sleep(250);
	}

	async selectAll() {
		await this.eval(`document.querySelector('[title="${this.t("toolbar.selectAll")}"]').click()`);
		await sleep(300);
	}

	/** Arrasta arquivos "de fora" até um ponto da janela e solta (eventos reais de arrasto). */
	async dropFiles(files, to) {
		const data = { items: [], files, dragOperationsMask: 1 };
		const start = { x: VIEWPORT.width - 40, y: 120 };
		await this.moveTo(start);
		await this.session.call("Input.dispatchDragEvent", { type: "dragEnter", ...start, data });
		const steps = 12;
		const end = await this.locate(to);
		for (let i = 1; i <= steps; i++) {
			const x = start.x + ((end.x - start.x) * i) / steps;
			const y = start.y + ((end.y - start.y) * i) / steps;
			await this.eval(`(() => { const c = document.getElementById("demo-cursor");
				c.style.transition = "none"; c.style.transform = "translate(${x}px, ${y}px)"; })()`);
			await this.session.call("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
			await sleep(60);
		}
		await sleep(900);
		await this.session.call("Input.dispatchDragEvent", { type: "drop", ...end, data });
		await this.eval(`document.getElementById("demo-cursor").style.transition = ""`);
		await sleep(900);
	}

	// --- Gravação -----------------------------------------------------------

	async startRecording() {
		this.frames = [];
		const framesDir = path.join(this.dir, "frames");
		fs.rmSync(framesDir, { recursive: true, force: true });
		fs.mkdirSync(framesDir, { recursive: true });
		this.session.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
			const file = path.join(framesDir, `${String(this.frames.length).padStart(5, "0")}.png`);
			fs.writeFileSync(file, Buffer.from(data, "base64"));
			this.frames.push({ file, time: metadata.timestamp * 1000 });
			void this.session.call("Page.screencastFrameAck", { sessionId });
		});
		await this.session.call("Page.startScreencast", {
			format: "png",
			maxWidth: VIEWPORT.width,
			maxHeight: VIEWPORT.height,
		});
		await sleep(400);
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
		const names = { "pt-BR": "Português (Brasil)", en: "English", es: "Español" };
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
