// Explains a failed sandbox build in plain English, for first-run setup or a Settings rebuild: the main process's own explanation when it sent one, else a guess from the compiler output.
import type { SandboxSetupResult } from "@shared/types/engine";
import type { AppError } from "@shared/types/errors";

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

/** The error to show for a failed setup: the AppError the main process sent when there is one (it knows the cause), otherwise the guess from the compiler output. */
export function describeSandboxFailure(result: Pick<SandboxSetupResult, "compilerOutput" | "failure">, context: SandboxBuildContext): AppError
{
	if (result.failure) return result.failure;

	return { code: "sandbox-not-ready", ...explainSandboxFailure(result.compilerOutput, context) };
}

/** The error a failed Settings rebuild shows: the explanation of describeSandboxFailure, with the main process's detail and the compiler output both behind the details toggle. */
export function describeRebuildFailure(result: Pick<SandboxSetupResult, "compilerOutput" | "failure">): AppError
{
	const error = describeSandboxFailure(result, "rebuild");
	const detailParts = [error.detail, result.compilerOutput].filter((part): part is string => Boolean(part));
	const uniqueParts = detailParts.filter((part, index) => detailParts.indexOf(part) === index);

	return uniqueParts.length > 0 ? { ...error, detail: uniqueParts.join("\n\n") } : error;
}
