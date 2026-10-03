import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Os testes do renderer importam módulos do shared pelo alias.
	resolve: {
		alias: { "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)) },
	},
	test: {
		root: ".",
		include: ["src/**/*.test.ts"],
		environment: "node",
	},
});
