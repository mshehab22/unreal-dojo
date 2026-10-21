// Build config for the three Electron targets: main process, preload bridge, and React renderer.
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

import { fakeWorldFixture } from "./tools/fake/fakeWorldPlugin";

const sharedAlias = { "@shared": resolve("src/shared") };

export default defineConfig({
	main: {
		resolve: { alias: sharedAlias },
		build: { externalizeDeps: true },
	},
	preload: {
		resolve: { alias: sharedAlias },
		build: {
			// A sandboxed preload cannot require packages at runtime, so every import is bundled in. electron-vite still keeps electron and Node built-ins external.
			externalizeDeps: false,

			// Sandboxed preload scripts must be CommonJS, even though the rest of the app is ESM.
			rolldownOptions: { output: { format: "cjs", entryFileNames: "[name].cjs" } },
		},
	},
	renderer: {
		resolve: { alias: { ...sharedAlias, "@": resolve("src/renderer/src") } },
		plugins: [react(), tailwindcss(), fakeWorldFixture()],
	},
});
