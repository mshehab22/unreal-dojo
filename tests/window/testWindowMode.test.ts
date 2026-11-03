// Checks when the e2e harness gets a hidden window and software rendering, and when a person watching, or an installed app, overrides them.
import { describe, expect, it } from "vitest";

import { isHiddenTestWindow, isTestLaunch } from "../../src/main/window/testWindowMode";

describe("isHiddenTestWindow", () =>
{
	it("hides the window when the harness asks for it", () =>
	{
		expect(isHiddenTestWindow({ DOJO_TEST_HIDDEN_WINDOW: "1" }, false)).toBe(true);
	});

	it("shows the window when nobody asks", () =>
	{
		expect(isHiddenTestWindow({}, false)).toBe(false);
	});

	it("shows the window when a person asks to watch the run", () =>
	{
		expect(isHiddenTestWindow({ DOJO_TEST_HIDDEN_WINDOW: "1", DOJO_TEST_SHOW_WINDOW: "1" }, false)).toBe(false);
	});

	it("never hides the window of an installed app", () =>
	{
		expect(isHiddenTestWindow({ DOJO_TEST_HIDDEN_WINDOW: "1" }, true)).toBe(false);
	});
});

describe("isTestLaunch (A1470)", () =>
{
	it("is a test launch when the harness started it, hidden or watched", () =>
	{
		expect(isTestLaunch({ DOJO_TEST_HIDDEN_WINDOW: "1" }, false)).toBe(true);
		expect(isTestLaunch({ DOJO_TEST_HIDDEN_WINDOW: "1", DOJO_TEST_SHOW_WINDOW: "1" }, false)).toBe(true);
	});

	it("is not a test launch for a normal start, or a person who only sets the show variable", () =>
	{
		expect(isTestLaunch({}, false)).toBe(false);
		expect(isTestLaunch({ DOJO_TEST_SHOW_WINDOW: "1" }, false)).toBe(false);
		expect(isTestLaunch({ DOJO_TEST_HIDDEN_WINDOW: "0" }, false)).toBe(false);
	});

	it("is never a test launch for an installed app, so production keeps hardware acceleration", () =>
	{
		expect(isTestLaunch({ DOJO_TEST_HIDDEN_WINDOW: "1" }, true)).toBe(false);
	});
});
