// PointerTrail: tells a real pointer move onto a glossary term from the events a browser sends when content appears under a still pointer (W9).
import { describe, expect, it } from "vitest";

import { PointerTrail } from "../../src/renderer/src/lib/pointerMovement";

describe("PointerTrail", () =>
{
	it("counts nothing before any event and nothing for the first event", () =>
	{
		const trail = new PointerTrail();

		expect(trail.lastEventMoved()).toBe(false);

		trail.record({ x: 10, y: 20 });

		expect(trail.lastEventMoved()).toBe(false);
	});

	it("counts a move to a new position", () =>
	{
		const trail = new PointerTrail();

		trail.record({ x: 10, y: 20 });
		trail.record({ x: 400, y: 300 });

		expect(trail.lastEventMoved()).toBe(true);
	});

	it("ignores the event sent when content appears under a pointer that has not moved since its click", () =>
	{
		const trail = new PointerTrail();

		trail.record({ x: 400, y: 300 });
		trail.record({ x: 400, y: 300 });

		expect(trail.lastEventMoved()).toBe(false);
	});

	it("counts the next real move after a still event", () =>
	{
		const trail = new PointerTrail();

		trail.record({ x: 400, y: 300 });
		trail.record({ x: 400, y: 300 });
		trail.record({ x: 401, y: 300 });

		expect(trail.lastEventMoved()).toBe(true);
	});
});
