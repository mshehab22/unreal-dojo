// Runs the real EngineLocator on this machine and prints every engine found and the toolchain check. Usage: npx tsx tools/locate-engine.ts [--pick <folder>]
import { createEngineLocator } from "../src/main/services/unreal/createEngineLocator";

/** Prints the locator's findings as JSON, plus a manual pick when `--pick <folder>` is given. Exits with 1 when no engine is found or the toolchain blocks builds. */
async function main(): Promise<void>
{
	const locator = createEngineLocator();
	const engines = await locator.findEngines();
	const toolchain = await locator.checkToolchain();
	const pickIndex = process.argv.indexOf("--pick");
	const pickedFolder = pickIndex >= 0 ? process.argv[pickIndex + 1] : undefined;
	const manualPick = pickedFolder === undefined ? undefined : await locator.inspectFolder(pickedFolder).catch((error: unknown) => ({ error: String(error) }));

	console.log(JSON.stringify({ platform: process.platform, engines, toolchain, manualPick }, null, "\t"));

	if (engines.length === 0 || !toolchain.ok) process.exitCode = 1;
}

void main();
