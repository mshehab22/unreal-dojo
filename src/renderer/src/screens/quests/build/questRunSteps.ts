// The phase steps a quest Run and Submit show in the progress view.
import type { PhaseStep } from "@/components/BuildProgressView";

/** A Run: write, build, test. */
export const RUN_STEPS: readonly PhaseStep[] = [
	{ label: "Write files", phases: ["preparing", "writing"] },
	{ label: "Build", phases: ["building"] },
	{ label: "Test", phases: ["launching", "testing", "parsing"] },
];

/** A Submit adds the review. */
export const SUBMIT_STEPS: readonly PhaseStep[] = [...RUN_STEPS, { label: "Review", phases: ["reviewing"] }];
