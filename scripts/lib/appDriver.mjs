// Piloto do app para scripts de documentação (prints dos READMEs e animações da tela de
// boas-vindas): abre o Rename Plus com uma pasta pessoal de demonstração e o dirige pelo
// protocolo do DevTools (CDP), com cliques e teclas de verdade e um cursor desenhado.
//
// Abre o código compilado (npm run build) ou, com `exec`, um app empacotado (AppImage).
import { spawn } from "node:child_process";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

export const APP_DIR = path.resolve(import.meta.dirname, "../..");
const ELECTRON = path.join(APP_DIR, "node_modules/electron/dist/electron");

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export const CATALOGS = {
	"pt-BR": await loadCatalog("src/shared/i18n/catalogs/ptBr.ts", "ptBr"),
	en: await loadCatalog("src/shared/i18n/catalogs/en.ts", "en"),
	es: await loadCatalog("src/shared/i18n/catalogs/es.ts", "es"),
};

export const LOCALE_NAMES = { "pt-BR": "Português (Brasil)", en: "English", es: "Español" };

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

// --- Arquivos de demonstração ----------------------------------------------

/**
 * Cria um arquivo com o tamanho e a data pedidos. O conteúdo é esparso (não ocupa o
 * disco): só o tamanho aparece na lista.
 */
export function touch(file, size = 0, date = undefined) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, "");
	if (size > 0) fs.truncateSync(file, size);
	if (date) fs.utimesSync(file, date, date);
}

// --- Piloto ------------------------------------------------------------------

/**
 * Uma sessão do app num idioma.
 * - `home`: pasta pessoal de demonstração (recriada por `createFiles` a cada `reset`);
 * - `workDir`: dados do app, registro e prints de erro;
 * - `viewport`: área da janela usada nas capturas;
 * - `exec`: app empacotado no lugar do código compilado; `env`, variáveis extras para ele.
 */
export class AppDriver {
	constructor({ locale, home, workDir, viewport, port = 9341, exec, env = {}, createFiles }) {
		this.locale = locale;
		this.catalog = CATALOGS[locale];
		this.home = home;
		this.dir = workDir;
		this.viewport = viewport;
		this.port = port;
		this.exec = exec;
		this.env = env;
		this.createFiles = createFiles;
	}

	/** Texto da interface no idioma da sessão (sem plural/parâmetros). */
	t(key) {
		const message = this.catalog[key];
		if (message === undefined) throw new Error(`chave inexistente: ${key}`);
		return typeof message === "string" ? message : message.other;
	}

	async pageTarget() {
		const list = await (await fetch(`http://127.0.0.1:${this.port}/json`)).json();
		return list.find((t) => t.type === "page" && t.url.startsWith("file:"));
	}

	async launch({ theme = "dark" } = {}) {
		this.paths = this.createFiles(this.home);
		const userData = path.join(this.dir, "user-data");
		fs.rmSync(userData, { recursive: true, force: true });
		fs.mkdirSync(userData, { recursive: true });
		fs.writeFileSync(path.join(userData, "theme.json"), JSON.stringify({ mode: theme }));
		const log = fs.openSync(path.join(this.dir, "electron.log"), "w");
		const args = [`--remote-debugging-port=${this.port}`, `--user-data-dir=${userData}`];
		this.child = spawn(this.exec ?? ELECTRON, this.exec ? args : [".", ...args], {
			cwd: APP_DIR,
			stdio: ["ignore", log, log],
			// Grupo próprio: `stop` encerra também os processos filhos (o AppImage abre outros).
			detached: true,
			env: {
				...process.env,
				ELECTRON_RUN_AS_NODE: "",
				HOME: this.home,
				// Início com o sistema e demais configurações ficam na pasta de demonstração.
				XDG_CONFIG_HOME: path.join(this.home, ".config"),
				...this.env,
			},
		});
		for (let i = 0; i < 60 && !this.session; i++) {
			await sleep(500);
			const page = await this.pageTarget().catch(() => null);
			if (page) this.session = await connect(page.webSocketDebuggerUrl);
		}
		if (!this.session) throw new Error("o app não abriu");
		await this.waitFor("!!document.querySelector('.status-bar')");
		// A janela real precisa caber a área emulada, senão capturas saem reduzidas.
		try {
			const { windowId } = await this.session.call("Browser.getWindowForTarget");
			await this.session.call("Browser.setWindowBounds", {
				windowId,
				bounds: {
					windowState: "normal",
					width: this.viewport.width + 80,
					height: this.viewport.height + 120,
				},
			});
		} catch {
			// Nem todo sistema deixa mudar a janela; a gravação confere o tamanho dos quadros.
		}
		await this.session.call("Emulation.setDeviceMetricsOverride", {
			...this.viewport,
			deviceScaleFactor: 1,
			mobile: false,
		});
	}

	/**
	 * Recarrega a janela com preferências limpas: idioma, pasta inicial, boas-vindas já
	 * vistas e o que vier em `stored`. Recria os arquivos de demonstração antes. Com
	 * `keepStorage`, mantém o que o app já salvou (regras, Seus Filtros) e os arquivos.
	 */
	async reset(dir, { minRows = 1, cursor = true, stored = {}, keepStorage = false } = {}) {
		if (!keepStorage) this.paths = this.createFiles(this.home);
		const values = { locale: this.locale, welcomeSeen: true, lastDir: dir, ...stored };
		await this.eval(`(() => {
			if (!${keepStorage}) localStorage.clear();
			for (const [k, v] of Object.entries(${JSON.stringify(values)}))
				localStorage.setItem("rename-plus:" + k, JSON.stringify(v));
			location.reload();
		})()`);
		await sleep(800);
		await this.waitFor(
			`!!document.querySelector(".status-bar") && !/${this.t("status.loading")}/.test(document.querySelector(".status-bar").innerText) && document.querySelectorAll(".file-row").length >= ${minRows}`,
		);
		await sleep(600);
		await this.installHelpers(cursor);
	}

	async stop() {
		this.session?.close();
		if (this.child?.pid) {
			try {
				process.kill(-this.child.pid);
			} catch {
				// Já tinha encerrado.
			}
		}
		await sleep(1000);
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

	/** Troca o tema do app (sistema, claro ou escuro), como nas Configurações. */
	async setTheme(mode) {
		await this.eval(`window.api.setTheme(${JSON.stringify(mode)})`);
		await sleep(400);
	}

	/** Salva a tela (área `viewport`) em `file`. */
	async screenshot(file) {
		const { data } = await this.session.call("Page.captureScreenshot", { format: "png" });
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, Buffer.from(data, "base64"));
	}

	// --- Cursor e ações ---------------------------------------------------

	/**
	 * Estilos de apoio e, se `cursor`, um cursor desenhado num popover: fica na camada
	 * superior, acima até dos <dialog> modais (é reaberto a cada ação para continuar por
	 * cima do último diálogo aberto).
	 */
	async installHelpers(cursor) {
		await this.eval(`(() => {
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
				.demo-hide-dev-warning .background-card .integration-warning { display: none !important; }
			\`;
			document.head.append(style);
			if (${cursor}) {
				const el = document.createElement("div");
				el.id = "demo-cursor";
				el.popover = "manual";
				el.innerHTML = '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2l0 19 5-4.5 3.5 7.5 3.4-1.6-3.4-7.3 6.8-.4z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><span></span>';
				document.body.append(el);
				el.showPopover();
			}
		})()`);
		if (!this.exec)
			await this.eval(`document.documentElement.classList.add("demo-hide-dev-warning")`);
	}

	/** Centro do elemento (seletor CSS ou `text=…` para botões/links/opções). */
	async locate(target, { smooth = true } = {}) {
		const finder = `const s = ${JSON.stringify(target)};
			const pick = (list, text) => [...document.querySelectorAll(list)].find((e) => e.offsetParent !== null && e.textContent.trim().includes(text));
			const el = s.startsWith("text=") ? pick("button, a, summary, label, option, [role=menuitemradio], .rx-chip", s.slice(5)) : document.querySelector(s);`;
		const box = await this.eval(`(() => {
			${finder}
			if (!el) return null;
			// Rola cada ancestral rolável até o elemento ficar visível.
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
					box.scrollBy({ top: delta, behavior: ${smooth ? '"smooth"' : '"instant"'} });
					scrolled = true;
				}
			}
			return { el: true, scrolled };
		})()`);
		if (!box) throw new Error(`não encontrado: ${target}`);
		if (box.scrolled) await sleep(smooth ? 650 : 100);
		return this.eval(`(() => {
			${finder}
			const r = el.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		})()`);
	}

	async moveTo(target, { dx = 0, dy = 0 } = {}) {
		const { x, y } = typeof target === "string" ? await this.locate(target) : target;
		await this.eval(`(() => {
			const c = document.getElementById("demo-cursor");
			if (!c) return;
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
			if (c) { c.classList.remove("press"); void c.offsetWidth; c.classList.add("press"); } })()`);
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

	/** Clique imediato (sem animar o cursor), para preparar prints. */
	async press(target, { modifiers = 0 } = {}) {
		const { x, y } = await this.locate(target, { smooth: false });
		for (const type of ["mousePressed", "mouseReleased"])
			await this.session.call("Input.dispatchMouseEvent", {
				type,
				x,
				y,
				button: "left",
				clickCount: 1,
				modifiers,
			});
		await sleep(250);
	}

	/** Digita caractere por caractere no campo focado. */
	async type(text, delay = 70) {
		for (const char of text) {
			await this.session.call("Input.insertText", { text: char });
			await sleep(delay);
		}
		await sleep(300);
	}

	async key(key, code = key, keyCode = 0, modifiers = 0) {
		for (const type of ["keyDown", "keyUp"])
			await this.session.call("Input.dispatchKeyEvent", {
				type,
				key,
				code,
				windowsVirtualKeyCode: keyCode,
				modifiers,
			});
		await sleep(300);
	}

	/** Escolhe uma opção de um <select> (a lista nativa não aparece na gravação). */
	async select(selector, value) {
		await this.click(selector);
		await this.fill(selector, value);
		await this.eval(`document.querySelector(${JSON.stringify(selector)}).blur()`);
		await sleep(250);
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
				for (const tag of ["input", "select", "checkbox"])
					panel.querySelectorAll(tag === "input" ? "input:not([type=checkbox])" : tag === "checkbox" ? "input[type=checkbox]" : tag).forEach((el, i) => {
						el.dataset.demo = tag + i;
					});
			}
		})()`);
	}

	/** Seletor do n-ésimo campo de texto (`input`), lista (`select`) ou caixa (`checkbox`) de um painel. */
	field(panelKey, tag = "input", n = 0) {
		return `[data-demo-panel="${panelKey}"] [data-demo="${tag}${n}"]`;
	}

	/** Preenche um campo de texto ou lista sem animar (preparação). */
	async fill(selector, value) {
		await this.eval(`(() => {
			const el = document.querySelector(${JSON.stringify(selector)});
			if (!el) throw new Error("campo não encontrado: " + ${JSON.stringify(selector)});
			const proto = el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement;
			Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, ${JSON.stringify(value)});
			el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
		})()`);
		await sleep(250);
	}

	/** Marca ou desmarca uma caixa de seleção. */
	async check(selector, checked = true) {
		const current = await this.eval(`document.querySelector(${JSON.stringify(selector)}).checked`);
		if (current !== checked)
			await this.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
		await sleep(250);
	}

	async selectAll() {
		await this.eval(`document.querySelector('[title="${this.t("toolbar.selectAll")}"]').click()`);
		await sleep(300);
	}

	/** Seleciona as linhas da lista com estes nomes (Ctrl+clique). */
	async selectRows(names) {
		await this.eval(`document.querySelector('[title="${this.t("toolbar.selectNone")}"]').click()`);
		for (const name of names) {
			await this.eval(`(() => {
				const row = [...document.querySelectorAll(".file-row")].find((r) => r.querySelector(".name .cell-text")?.textContent === ${JSON.stringify(name)});
				if (!row) throw new Error("linha não encontrada: " + ${JSON.stringify(name)});
				row.dataset.demoRow = "1";
			})()`);
			await this.press('[data-demo-row="1"]', { modifiers: 2 });
			await this.eval(
				`document.querySelector('[data-demo-row="1"]')?.removeAttribute("data-demo-row")`,
			);
		}
	}

	/** Arrasta arquivos "de fora" até um ponto da janela e solta (eventos reais de arrasto). */
	async dropFiles(files, to, { drop = true } = {}) {
		const data = { items: [], files, dragOperationsMask: 1 };
		const start = { x: this.viewport.width - 40, y: 120 };
		await this.moveTo(start);
		await this.session.call("Input.dispatchDragEvent", { type: "dragEnter", ...start, data });
		const steps = 12;
		const end = await this.locate(to);
		for (let i = 1; i <= steps; i++) {
			const x = start.x + ((end.x - start.x) * i) / steps;
			const y = start.y + ((end.y - start.y) * i) / steps;
			await this.eval(`(() => { const c = document.getElementById("demo-cursor");
				if (c) { c.style.transition = "none"; c.style.transform = "translate(${x}px, ${y}px)"; } })()`);
			await this.session.call("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
			await sleep(60);
		}
		if (!drop) return;
		await sleep(900);
		await this.session.call("Input.dispatchDragEvent", { type: "drop", ...end, data });
		await this.eval(
			`(() => { const c = document.getElementById("demo-cursor"); if (c) c.style.transition = ""; })()`,
		);
		await sleep(900);
	}
}
