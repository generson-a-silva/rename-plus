import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
	root: r("./src/renderer"),
	base: "./",
	plugins: [react()],
	// Manter em sincronia com `paths` em tsconfig.react.json. Cada alias aponta para uma
	// pasta com index.ts; "@components/<subpasta>" e "@shared/<subpasta>" também.
	resolve: {
		alias: {
			"@components": r("./src/renderer/src/components"),
			"@hooks": r("./src/renderer/src/hooks"),
			"@lib": r("./src/renderer/src/lib"),
			"@shared": r("./src/shared"),
		},
	},
	build: {
		outDir: r("./build-react"),
		emptyOutDir: true,
		target: "chrome140",
	},
});
