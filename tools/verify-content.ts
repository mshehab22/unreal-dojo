// Content verifier entry point. M0.4 (content-engine) replaces this placeholder with the real checks.

/** Prints that no checks exist yet and exits successfully, so CI and the scripts in CLAUDE.md can call it today. */
function main(): void
{
	console.log("no content checks yet");
	process.exitCode = 0;
}

main();
