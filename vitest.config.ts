// Unit test config: runs every tests/**/*.test.ts in Node with the same @shared alias the app uses.
import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { alias: { "@shared": resolve("src/shared"), "@": resolve("src/renderer/src") } },
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
	},
});
