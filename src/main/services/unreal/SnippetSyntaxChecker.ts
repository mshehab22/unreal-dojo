// Checks a concept quest's scratch buffer with the platform compiler, without building the sandbox (A89, A402).
import type { SyntaxCheckResult } from "@shared/types/run";

/** Syntax-checks one C++ snippet against the sandbox's headers. */
export interface SnippetSyntaxChecker
{
	/** Compiles the snippet for syntax only and returns its diagnostics. Throws an AppError exception when the sandbox has not been built. */
	check(engineRoot: string, sandboxFolder: string, code: string): Promise<SyntaxCheckResult>;
}
