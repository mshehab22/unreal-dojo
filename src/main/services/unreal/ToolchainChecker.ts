// The platform build toolchain check, behind an interface so the locator does not know which platform it is on.
import type { ToolchainCheck } from "@shared/types/engine";

/** Checks that the compiler toolchain Unreal needs is installed. Never throws; problems come back inside the result. */
export interface ToolchainChecker
{
	/** Runs the platform's checks and explains anything missing. */
	check(): Promise<ToolchainCheck>;
}
