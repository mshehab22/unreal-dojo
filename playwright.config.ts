// End-to-end config: drives the built Electron app (run `npm run build` first). No browsers are used.
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	timeout: 60_000,
	workers: 1,
	// CI also writes an HTML report to `playwright-report/`, which the workflow uploads.
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
});
