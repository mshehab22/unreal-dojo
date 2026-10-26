// Checks when the e2e harness gets a hidden window and when a person watching, or an installed app, overrides it.
import { describe, expect, it } from "vitest";

import { isHiddenTestWindow } from "../../src/main/window/testWindowMode";

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
