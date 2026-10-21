// The steps of first-run setup, in order.

/** One setup step's id. */
export type FirstRunStepId = "engine" | "sandbox" | "build" | "editor" | "done";

/** Every step with its rail label. */
export const FIRST_RUN_STEPS: readonly { id: FirstRunStepId; label: string }[] = [
	{ id: "engine", label: "Pick the engine" },
	{ id: "sandbox", label: "Choose a folder" },
	{ id: "build", label: "First full build" },
	{ id: "editor", label: "Open the editor once" },
	{ id: "done", label: "Done" },
];
