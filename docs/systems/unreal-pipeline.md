# System: unreal-pipeline

Owner: builder-unreal. Folder: `src/main/services/unreal/` and `src/main/services/runners/`. Research: `research/tooling-and-stack.md` section 9 (read it fully before starting).

## Purpose

Turn the learner's files for a build quest into a verdict: did it compile, did its automation tests pass, what did the engine say. Two loops behind one interface, chosen by engine version and editor state.

## Interface (shared types in `src/shared/types/run.ts`)

```ts
interface IRunner {
  // Never throws. Streams progress events. Errors land in RunResult.error.
  run(quest: Quest, files: Record<string, string>, onProgress: (e: BuildProgressEvent) => void, signal: AbortSignal): Promise<RunResult>
}
interface BuildProgressEvent { phase: 'writing' | 'building' | 'launching' | 'testing' | 'parsing'; elapsedMs: number; lastLine: string; percent?: number }
interface RunResult { ok: boolean; compiled: boolean; compilerOutput: string; tests: TestCaseResult[]; testsPassed: number; testsTotal: number; durationMs: number; loop: 'fast' | 'headless'; error?: string }
interface TestCaseResult { name: string; passed: boolean; message?: string; durationMs?: number }
```

`RunnerFactory.forQuest(quest)` returns `LiveEditorRunner` when the engine is 5.8+, the editor is open with the sandbox project, the MCP server answers, and the diff since the last successful full build touches no header of a reflected type; otherwise `HeadlessRunner`. The choice and the reason go into the progress stream so the UI can say "fast loop" or "full build".

## Components

- `PlatformPaths.ts`: one interface, two objects (`WindowsPaths`, `MacPaths`). `engineCandidates()`, `buildScript(engine)`, `editorCmd(engine)`, `editorApp(engine)`, `killTree(pid)`, `toolchainCheck()` (vswhere on Windows, xcode-select on macOS). Nothing outside this file checks `process.platform` for Unreal matters. Unit tests with an injected fake fs.
- `EngineLocator.ts`: default install folders, the Windows registry key `HKLM\SOFTWARE\EpicGames\Unreal Engine\<ver>\InstalledDirectory` (read through `reg query`), manual pick, version read from `Engine/Build/Build.version`.
- `SandboxProjectService.ts`: copies `resources/sandbox-template/` to the chosen folder, writes `EngineAssociation`, enables plugins per engine version, runs the first full build with streamed progress, launches the editor once, remembers the sandbox path in settings. Warns when the path exceeds 100 characters on Windows.
- `UnrealBuilder.ts`: runs the platform build script with `DojoEditor <Win64|Mac> Development -Project="<uproject>" -WaitMutex` (Windows) and the Mac equivalent; stdin ignored (`stdio: ['ignore','pipe','pipe']`); streams lines; `LogFilter` keeps errors, warnings, and lines mentioning `Quests/` or `Tests/`; 15 minute timeout; cancel kills the process tree.
- `AutomationTestRunner.ts` (headless): `UnrealEditor-Cmd "<uproject>" -ExecCmds="Automation RunTests Dojo.<world>.<quest>" -Unattended -NullRHI -NoSplash -NoSound -NoPause -TestExit="Automation Test Queue Empty" -ReportExportPath="<tmp>/report" -Log -Log=<tmp>/run.log`; waits for exit; `ReportParser` reads `index.json` (tests array with state, errors, warnings, duration). Timeout 10 minutes.
- `McpEditorClient.ts`: MCP client over Streamable HTTP to `http://127.0.0.1:8000/mcp` using `@modelcontextprotocol/sdk`. Calls `call_tool` with `{ toolset: "LiveCodingToolset", tool: "CompileLiveCoding" }` and `{ toolset: "AutomationTestToolset", tool: "RunTests", arguments: { TestNames: [...] } }`, then polls `GetTestStatus` and reads `GetTestResults`. One call in flight at a time (the server runs tools serially on the game thread). Health check: `list_toolsets`.
- `LiveEditorRunner.ts`: write files, `CompileLiveCoding`, parse its captured log for errors, `RunTests`, map results to `RunResult`. Falls back to `HeadlessRunner` with a logged reason when the compile reports that a full build is needed.
- `HeadlessRunner.ts`: write files, `UnrealBuilder`, `AutomationTestRunner`, `ReportParser`.
- `QuestFileWriter.ts`: learner files to `<Sandbox>/Source/Dojo/Quests/<quest-id>/`, quest tests to `<Sandbox>/Source/Dojo/Tests/<quest-id>.Test.cpp`, with a header comment naming the quest. Removes files from a quest when the learner resets it.
- `EditorLauncher.ts`: opens the editor on the sandbox project with `-ModelContextProtocolStartServer` when the engine is 5.8+.

## Sandbox template (`resources/sandbox-template/`)

```
Dojo.uproject                      EngineAssociation written at setup; plugins ModelContextProtocol, AutomationTestToolset, LiveCodingToolset enabled when 5.8+
Source/Dojo.Target.cs
Source/DojoEditor.Target.cs
Source/Dojo/Dojo.Build.cs           Core, CoreUObject, Engine, InputCore, EnhancedInput, UMG, GameplayTags, AIModule, NavigationSystem, AutomationTest modules as needed
Source/Dojo/Dojo.h, Dojo.cpp        module boilerplate, DECLARE_LOG_CATEGORY_EXTERN(LogDojo)
Source/Dojo/Quests/                 learner code, one folder per quest
Source/Dojo/Tests/                  quest tests
Source/Dojo/Support/DojoTestWorld.h/.cpp   creates a test UWorld and world context, spawns actors, ticks N frames, tears down
Source/Dojo/Support/DojoTestActor.h/.cpp   a minimal actor base used by tests as a target or dummy
Content/Dojo/Maps/DojoSandbox.umap  (built by the first editor launch through a small editor Python script, or committed if small)
Config/DefaultEngine.ini, DefaultGame.ini, DefaultInput.ini
```

Test macro conventions for content: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_<World>_<Quest>_<Case>, "Dojo.<world>.<quest>.<case>", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)`; latent commands for anything that needs frames; CQTest where it simplifies actor spawning. Document the two test-world patterns from the research (FAutomationEditorCommonUtils::CreateNewMap and UWorld::CreateWorld + CreateNewWorldContext) in `Support/` comments.

## Done criteria

- Both platform objects unit tested with a fake fs.
- The sample quest (Health component + one test) round-trips through the headless loop and the fast loop on the Windows desktop with timings written at the bottom of this file.
- Cancel works mid-build and mid-test; no orphan processes.
- A header change triggers the UBT fallback automatically.
- `docs/decisions.md` gets an entry for any command-line change from the research.

## Measured timings

(The builder fills this in: machine, engine version, cold full build, incremental build, headless test run, fast loop compile, fast loop test run.)
