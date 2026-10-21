// The two content enumerations the rules need, mirrored here until the content types merge (M0.4), then re-exported from there.

/** The six quest kinds (D14). */
export type QuestKind = "concept" | "drill" | "breakdown" | "build" | "refactor" | "boss";

/** How much of the code a build or refactor quest gives the learner. */
export type ScaffoldLevel = "worked" | "faded" | "stub" | "blank";
