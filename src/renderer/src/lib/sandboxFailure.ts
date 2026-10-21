// Explains a failed sandbox build in plain English from its filtered compiler output.

/** A headline and what to do, chosen from what the compiler said. */
export interface FailureExplanation
{
	message: string;
	suggestedAction: string;
}

/** Reads the compiler output for the common causes; anything else gets the general advice. */
export function explainSandboxFailure(compilerOutput: string): FailureExplanation
{
	const output = compilerOutput.toLowerCase();

	if (output.includes("undeclared identifier") || output.includes("missing #include"))
	{
		return {
			message: "The first build stopped on a compile error inside the sandbox template, not in anything you wrote.",
			suggestedAction: "Try the build again. If it fails the same way, pick a different engine version in step 1.",
		};
	}

	if (output.includes("disk") || output.includes("no space"))
	{
		return { message: "The build ran out of disk space.", suggestedAction: "Free up at least 10 GB on the sandbox drive, then try again." };
	}

	return {
		message: "The first build of the sandbox did not finish.",
		suggestedAction: "Try again. The details below show the compiler's last lines if it keeps failing.",
	};
}
