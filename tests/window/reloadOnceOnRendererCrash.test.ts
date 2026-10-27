// Checks that a crashed window reloads once, and never in a loop.
import { describe, expect, it } from "vitest";

import { reloadOnceOnRendererCrash, type CrashableContents } from "../../src/main/lifecycle/reloadOnceOnRendererCrash";

/** Web contents that can be crashed on demand and count reloads. */
function createContents(): { contents: CrashableContents; crash: (reason: string) => void; reloads: () => number; destroy: () => void }
{
	let listener: (event: unknown, details: { reason: string }) => void = () => undefined;
	let reloadCount = 0;
	let destroyed = false;

	return {
		contents: { on: (_eventName, newListener) => (listener = newListener), reload: () => reloadCount++, isDestroyed: () => destroyed },
		crash: (reason) => listener({}, { reason }),
		reloads: () => reloadCount,
		destroy: () => (destroyed = true),
	};
}

describe("reloadOnceOnRendererCrash", () =>
{
	it("reloads the window on the first crash", () =>
	{
		const { contents, crash, reloads } = createContents();
		reloadOnceOnRendererCrash(contents, () => undefined);

		crash("crashed");

		expect(reloads()).toBe(1);
	});

	it("does not reload a second time", () =>
	{
		const { contents, crash, reloads } = createContents();
		const lines: string[] = [];
		reloadOnceOnRendererCrash(contents, (line) => lines.push(line));

		crash("crashed");
		crash("oom");
		crash("crashed");

		expect(reloads()).toBe(1);
		expect(lines).toHaveLength(3);
	});

	it("leaves a destroyed window alone", () =>
	{
		const { contents, crash, reloads, destroy } = createContents();
		reloadOnceOnRendererCrash(contents, () => undefined);

		destroy();
		crash("crashed");

		expect(reloads()).toBe(0);
	});

	it("ignores a clean exit and keeps its one reload for a real crash", () =>
	{
		const { contents, crash, reloads } = createContents();
		reloadOnceOnRendererCrash(contents, () => undefined);

		crash("clean-exit");
		expect(reloads()).toBe(0);

		crash("killed");
		expect(reloads()).toBe(1);
	});
});
