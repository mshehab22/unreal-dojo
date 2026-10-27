// Explains a failed sandbox build in plain English from its filtered compiler output, for first-run setup or a Settings rebuild.

/** A headline and what to do, chosen from what the compiler said. */
export interface FailureExplanation
{
	message: string;
	suggestedAction: string;
}

/** Where the build was started: the first build of a new sandbox, or a clean rebuild of an existing one. */
export type SandboxBuildContext = "first-run" | "rebuild";

/** Reads the compiler output for the common causes; anything else gets the general advice. The wording fits the context. */
export function explainSandboxFailure(compilerOutput: string, context: SandboxBuildContext): FailureExplanation
{
	const output = compilerOutput.toLowerCase();

	// Another Unreal editor with Live Coding open made Unreal refuse the build (W10, A1223); name that instead of a vague failure.
	if (output.includes("live coding is active") || output.includes("editor with live coding is open"))
	{
		return { message: "Unreal refused to build because another Unreal editor with Live Coding is open.", suggestedAction: "Close the other Unreal editor, then try again. Your code was not compiled." };
	}

	if (output.includes("disk") || output.includes("no space"))
	{
		return { message: "The build ran out of disk space.", suggestedAction: "Free up at least 10 GB on the sandbox drive, then try again." };
	}

	if (output.includes("undeclared identifier") || output.includes("missing #include"))
	{
		return context === "first-run"
			? {
				message: "The first build stopped on a compile error inside the sandbox template, not in anything you wrote.",
				suggestedAction: "Try the build again. If it fails the same way, pick a different engine version in step 1.",
			}
			: {
				message: "The rebuild stopped on a compile error in the sandbox.",
				suggestedAction: "If a quest's files are in the sandbox, reset that quest and rebuild. If it keeps failing, pick another engine above.",
			};
	}

	return context === "first-run"
		? { message: "The first build of the sandbox did not finish.", suggestedAction: "Try again. The compiler's last lines are below if it keeps failing." }
		: { message: "The sandbox rebuild did not finish.", suggestedAction: "Try again. The details show the compiler's last lines if it keeps failing." };
}
