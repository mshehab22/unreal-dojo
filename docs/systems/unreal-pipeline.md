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

`RunnerFactory.forQuest(quest)` returns `HeadlessRunner` on macOS for any run that changes code, because Live Coding is not available on the Mac (A45). Otherwise it returns `LiveEditorRunner` when the engine is 5.8+, the editor is open with the sandbox project, the MCP server answers, and the diff since the last successful full build touches no header of a reflected type; otherwise `HeadlessRunner`. The choice and the reason go into the progress stream so the UI can say "fast loop" or "full build".

## Components

- `PlatformPaths.ts`: one interface, two objects (`WindowsPaths`, `MacPaths`). `engineCandidates()`, `buildScript(engine)`, `editorCmd(engine)`, `editorApp(engine)`, `killTree(pid)`, `toolchainCheck()` (vswhere on Windows, xcode-select on macOS). Nothing outside this file checks `process.platform` for Unreal matters. Unit tests with an injected fake fs.
- `EngineLocator.ts`: default install folders, the Windows registry key `HKLM\SOFTWARE\EpicGames\Unreal Engine\<ver>\InstalledDirectory` (read through `reg query`), manual pick, version read from `Engine/Build/Build.version`.
- `SandboxProjectService.ts`: copies `resources/sandbox-template/` to the chosen folder, writes `EngineAssociation`, enables plugins per engine version, runs the first full build with streamed progress, launches the editor once, remembers the sandbox path in settings. Warns when the path exceeds 100 characters on Windows.
- `UnrealBuilder.ts`: runs the platform build script with `DojoEditor <Win64|Mac> Development -Project="<uproject>" -WaitMutex` (Windows) and the Mac equivalent; stdin ignored (`stdio: ['ignore','pipe','pipe']`); streams lines; `LogFilter` keeps errors, warnings, and lines mentioning `Quests/` or `Tests/`; 15 minute timeout; cancel kills the process tree.
- `AutomationTestRunner.ts` (headless): `UnrealEditor-Cmd "<uproject>" -ExecCmds="Automation RunTests Dojo.<world>.<quest>" -Unattended -NullRHI -NoSplash -NoSound -NoPause -TestExit="Automation Test Queue Empty" -ReportExportPath="<tmp>/report" -Log -Log=<tmp>/run.log`; waits for exit; the `; Quit` form in "Exact commands" below is the one verified on 5.8.3 (A44); `ReportParser` reads `index.json` (tests array with state, errors, warnings, duration). Timeout 10 minutes.
- `McpEditorClient.ts`: MCP client over Streamable HTTP to `http://127.0.0.1:<port>/mcp` using `@modelcontextprotocol/sdk`. The port is a setting (default 8000) because another editor can already hold 8000 (A44). Calls the meta-tool `call_tool` with `{ toolset_name: "LiveCodingToolset.LiveCodingToolset", tool_name: "CompileLiveCoding", arguments: {} }` and `{ toolset_name: "AutomationTestToolset.AutomationTestToolset", tool_name: "RunTests", arguments: { TestNames: [...] } }` (names verified on 5.8.3, A44). `DiscoverTests` must run once per editor session first. `RunTests` returns the finished summary directly; `GetTestStatus` and `GetTestResults` are for polling and re-reading. One call in flight at a time (the server runs tools serially on the game thread). Health check: `list_toolsets`.
- `LiveEditorRunner.ts`: write files, `CompileLiveCoding`, parse its captured log for errors, `RunTests`, map results to `RunResult`. Falls back to `HeadlessRunner` with a logged reason when the compile reports that a full build is needed.
- `HeadlessRunner.ts`: write files, `UnrealBuilder`, `AutomationTestRunner`, `ReportParser`.
- `QuestFileWriter.ts`: learner files to `<Sandbox>/Source/Dojo/Quests/<quest-id>/`, quest tests to `<Sandbox>/Source/Dojo/Tests/<quest-id>.Test.cpp`, with a header comment naming the quest. Removes files from a quest when the learner resets it. Always write files fresh (never move an older copy back into place): UBT decides what to rebuild by modification time, and a restored file with an older time is silently skipped.
- `EditorLauncher.ts`: opens the editor on the sandbox project with `-ModelContextProtocolStartServer -ModelContextProtocolPort=<port>` when the engine is 5.8+. Closing: SIGTERM (or a normal window close), then a hard kill after 15 seconds; on the Mac the editor was seen hanging in shutdown after a SIGTERM.

## Sandbox template (`resources/sandbox-template/`)

Built and proven on the Mac in task M1.2a. Unverified on Windows.

```
Dojo.uproject                      EngineAssociation is "" in the template; the app writes the engine version at setup (A41).
                                   Plugins ModelContextProtocol, AutomationTestToolset, LiveCodingToolset are listed enabled;
                                   SandboxProjectService removes the three entries for engines older than 5.8 (A41).
Source/Dojo.Target.cs              Game target. BuildSettingsVersion.Latest and EngineIncludeOrderVersion.Latest (A42)
Source/DojoEditor.Target.cs        Editor target, same settings; this is the target the app builds
Source/Dojo/Dojo.Build.cs          Core, CoreUObject, Engine, InputCore, EnhancedInput, UMG, GameplayTags, AIModule, NavigationSystem;
                                   the module root is a public include path, so code includes "Support/DojoTestWorld.h"
Source/Dojo/Dojo.h, Dojo.cpp       primary game module, DECLARE_LOG_CATEGORY_EXTERN(LogDojo)
Source/Dojo/Quests/<QuestName>/    learner code, one folder per quest
Source/Dojo/Tests/<QuestName>.Test.cpp   quest tests, wrapped in #if WITH_AUTOMATION_TESTS
Source/Dojo/Support/DojoTestWorld.h/.cpp FDojoTestWorld: RAII test world (create, SpawnActor, AddComponent, Tick, tear down)
Source/Dojo/Support/DojoTestActor.h/.cpp ADojoTestActor: bare actor with a scene root, a host or dummy for tests
Source/Dojo/Quests/SampleHealth/   sample quest USampleHealthComponent (A40)
Source/Dojo/Tests/SampleHealth.Test.cpp  Dojo.Sample.Health.TakesDamage, the sandbox smoke test
Content/Dojo/Maps/DojoSandbox.umap empty level, 6.4 KB, committed; editor startup map and game default map
Tools/CreateSandboxMap.py          the editor Python script that made DojoSandbox.umap
Config/DefaultEngine.ini           startup and default map, Metal SM6 on Mac, DX12 on Windows
Config/DefaultGame.ini, DefaultInput.ini   project name; Enhanced Input classes
```

How the binary asset was made: `DojoSandbox.umap` is the only binary file. It was created on UE 5.8.3 by running `Tools/CreateSandboxMap.py` through the Python commandlet (command below) on a built copy of the template, then copied back into the template. It is an empty level (no actors added by us). To recreate it, delete it and run the same command. An engine older than 5.8 can load a 5.8 map only if the package version allows it; this is unverified (see `docs/problems.md`).

### FDojoTestWorld (the test-world helper)

- Route used: `UWorld::CreateWorld(EWorldType::Game, ...)` plus `GEngine->CreateNewWorldContext`, then `InitializeActorsForPlay`, `BeginPlay`, and `SetBegunPlay(true)`. There is no game mode, so `UWorld::BeginPlay` alone would not start actors; setting begun-play makes every actor spawned afterwards, and every component registered afterwards, get `BeginPlay` immediately (A43).
- Teardown: `World->EndPlay(LevelTransition)` (routes `EndPlay` to actors and clears begun-play), `ShutdownWorldNetDriver`, `DestroyWorld`, `DestroyWorldContext`. Without `EndPlay` the report carries a `LogWorld` warning and the test shows as "succeeded with warnings".
- The other route, `FAutomationEditorCommonUtils::CreateNewMap()` (needs `UnrealEd`), is documented in the header comment as the fallback for quests that need an editor map. CQTest's `FActorTestSpawner` uses the same route as ours.

### Exact commands (verified on the Mac, UE 5.8.3)

`<Engine>` is the engine root, for example `~/Applications/UE_5.8/Engine`. Every command was spawned with stdin from `/dev/null`.

Full or incremental editor build:

```
"<Engine>/Build/BatchFiles/Mac/Build.sh" DojoEditor Mac Development -Project="<Sandbox>/Dojo.uproject" -WaitMutex -Progress
```

Prints `@progress 'Compiling C++ source code...' NN%` lines, `[n/N] Compile [Apple] File.cpp` per file, and `Result: Succeeded` with exit code 0.

Headless test run:

```
"<Engine>/Binaries/Mac/UnrealEditor-Cmd" "<Sandbox>/Dojo.uproject" -ExecCmds="Automation RunTests Dojo; Quit" -Unattended -NoPause -NullRHI -NoSplash -NoSound -stdout -FullStdOutLogOutput -ReportExportPath="<ReportDir>" -log
```

- `<ReportDir>/index.json` is UTF-8 with a byte order mark; strip it before `JSON.parse`. It holds `succeeded`, `succeededWithWarnings`, `failed`, `notRun`, `totalDuration`, and `tests[]` with `fullTestPath`, `state`, `duration`, `warnings`, `errors`, `entries[].event.{type,message}`.
- A test that passes but logs a warning lands in `succeededWithWarnings`, not `succeeded`. Count both as passed.
- On a failed assertion the process exit code was 3 and the log said `TEST COMPLETE. EXIT CODE: -1`. The assertion text is in `entries[].event.message`; `filename` was `Unknown` with line 0, so the UI cannot point at a line from the report.

Create the sandbox map (one time, editor Python commandlet):

```
"<Engine>/Binaries/Mac/UnrealEditor-Cmd" "<Sandbox>/Dojo.uproject" -run=pythonscript -script="<Sandbox>/Tools/CreateSandboxMap.py" -unattended -nullrhi -nosplash -nosound -stdout -FullStdOutLogOutput
```

Editor with the MCP server (what was proven; `-NullRHI` because the Metal toolchain is missing on this Mac, see problems):

```
"<Engine>/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor" "<Sandbox>/Dojo.uproject" -ModelContextProtocolStartServer -ModelContextProtocolPort=8010 -NullRHI -Unattended -NoSplash -NoSound -log
```

MCP session, in order (plain JSON-RPC over HTTP POST, `Accept: application/json, text/event-stream`; the server answered with plain JSON, and returns an `Mcp-Session-Id` header to send back):

1. `initialize` with `protocolVersion: "2025-06-18"`, then the `notifications/initialized` notification.
2. `tools/list` returns three meta-tools: `list_toolsets`, `describe_toolset` (`toolset_name`), `call_tool` (`toolset_name`, `tool_name`, `arguments`).
3. `call_tool` `{ toolset_name: "AutomationTestToolset.AutomationTestToolset", tool_name: "DiscoverTests", arguments: { bForceRediscover: false } }` returns `{"status": "ready"}`.
4. `call_tool` ... `RunTests` with `{ TestNames: ["Dojo.Sample.Health.TakesDamage"] }` returns, inside `result.content[0].text`, a JSON string `{"returnValue": "<json>"}` whose inner JSON is `{ tests: [{ name, state, duration, errors[], warnings[] }], passed, failed, skipped, total, duration }`. Two levels of JSON-in-a-string: parse twice.
5. `CompileLiveCoding` on the Mac returns `Error: Live Coding is not available in this build configuration.`

Test macro conventions for content: `IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_<World>_<Quest>_<Case>, "Dojo.<world>.<quest>.<case>", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)`; latent commands for anything that needs frames; CQTest where it simplifies actor spawning. Document the two test-world patterns from the research (FAutomationEditorCommonUtils::CreateNewMap and UWorld::CreateWorld + CreateNewWorldContext) in `Support/` comments.

## Done criteria

- Both platform objects unit tested with a fake fs.
- The sample quest (Health component + one test) round-trips through the headless loop and the fast loop on the Windows desktop with timings written at the bottom of this file.
- Cancel works mid-build and mid-test; no orphan processes.
- A header change triggers the UBT fallback automatically.
- `docs/decisions.md` gets an entry for any command-line change from the research.

## Measured timings

(The builder fills this in: machine, engine version, cold full build, incremental build, headless test run, fast loop compile, fast loop test run.)

### MacBook Air M5 (10 cores, 24 GB), macOS 27, Xcode 27.1, UE 5.8.3 launcher install, 2026-10-21 (M1.2a)

Wall-clock times measured around the whole process. The engine's shared derived data cache was already warm from earlier editor runs on this machine.

| Step | Time | Notes |
| --- | --- | --- |
| Cold full editor build, fresh copy | 20 to 22 s | 10 actions: project shared PCH, 7 source files, link, metadata |
| Incremental build, one `.cpp` touched | 6.5 to 25 s | Both runs rebuilt the UBT makefile first ("ispc deleted"); the slower one may have waited on another session's UBT |
| Incremental build with the editor open | 5 s | Allowed on Mac, but the open editor keeps the old code |
| Map creation commandlet | 20 s | One time, only when remaking the map |
| Headless test run (launch, run, quit) | 18 to 22 s | The test itself takes 0.02 s; the rest is editor start and shutdown |
| Editor launch to MCP `initialize` answering | 9 s | `-NullRHI` |
| MCP `DiscoverTests`, first call | 0.6 to 4.4 s | Once per editor session |
| MCP `RunTests` round trip | 55 to 153 ms | Result comes back in the same call |
| Fast loop compile | not available | Live Coding is not available on the Mac (A45) |
