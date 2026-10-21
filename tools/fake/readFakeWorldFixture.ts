// Runs print-fake-world-fixture.ts with tsx (which resolves the app's `@shared` paths) and answers its JSON. Used by the Vite plugin and the e2e spec.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

/** The project folder: npm scripts, Vite, vitest, and Playwright all run from it (this file's own folder moves when the build config is bundled). */
const PROJECT_FOLDER = process.cwd();

/** The fixture as JSON text, built from the current `content/` folder. Throws with the loader's message when World 1 cannot be built. */
export function readFakeWorldFixtureJson(): string
{
	const tsxCli = resolve(PROJECT_FOLDER, "node_modules/tsx/dist/cli.mjs");
	const script = resolve(PROJECT_FOLDER, "tools/fake/print-fake-world-fixture.ts");

	return execFileSync(process.execPath, [tsxCli, script], { cwd: PROJECT_FOLDER, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}
