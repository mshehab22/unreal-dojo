// Windows lock retries for rename and copy: retried with short backoff on win32, thrown at once elsewhere.
import { describe, expect, it } from "vitest";

import { LOCK_RETRY_DELAYS_MS, retryWhileLocked } from "../../src/main/services/progress/retryWhileLocked";

/** An operation that fails with `code` the first `failures` times, then answers "done". */
function flaky(code: string, failures: number): { operation: () => Promise<string>; calls: () => number }
{
	let calls = 0;

	return {
		operation: async () =>
		{
			calls++;
			if (calls <= failures) throw Object.assign(new Error(code), { code });

			return "done";
		},
		calls: () => calls,
	};
}

describe("retryWhileLocked", () =>
{
	const waits: number[] = [];
	const windows = { platform: "win32" as const, sleep: async (milliseconds: number) => { waits.push(milliseconds); } };

	for (const code of ["EPERM", "EACCES", "EBUSY"])
	{
		it(`retries ${code} on Windows until it clears`, async () =>
		{
			const { operation, calls } = flaky(code, 2);

			expect(await retryWhileLocked(operation, windows)).toBe("done");
			expect(calls()).toBe(3);
		});
	}

	it("gives up after about 1.5 seconds of backoff", async () =>
	{
		waits.length = 0;
		const { operation, calls } = flaky("EBUSY", 99);

		await expect(retryWhileLocked(operation, windows)).rejects.toMatchObject({ code: "EBUSY" });
		expect(calls()).toBe(LOCK_RETRY_DELAYS_MS.length + 1);
		expect(waits.reduce((total, wait) => total + wait, 0)).toBeGreaterThanOrEqual(1000);
		expect(waits.reduce((total, wait) => total + wait, 0)).toBeLessThanOrEqual(2000);
	});

	it("does not retry on macOS or Linux, or for other errors", async () =>
	{
		const mac = flaky("EBUSY", 1);
		await expect(retryWhileLocked(mac.operation, { ...windows, platform: "darwin" })).rejects.toMatchObject({ code: "EBUSY" });
		expect(mac.calls()).toBe(1);

		const missing = flaky("ENOENT", 1);
		await expect(retryWhileLocked(missing.operation, windows)).rejects.toMatchObject({ code: "ENOENT" });
		expect(missing.calls()).toBe(1);
	});
});
