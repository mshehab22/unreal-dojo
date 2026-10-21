# System: unreal-pipeline

Owner: builder-unreal. Folder: `src/main/services/unreal/` and `src/main/services/runners/`. Research: `research/tooling-and-stack.md` section 9 (read it fully before starting).

## Purpose

Turn the learner's files for a build quest into a verdict: did it compile, did its automation tests pass, what did the engine say. Two loops behind one interface, chosen by engine version and editor state.

## Interface (shared types in `src/shared/types/run.ts`)

```ts
interface IRunner {
  // Never throws. Streams progress events. Errors land in RunResult.error.
  // quest is { id, title, tests }; onProgress gets a BuildProgressEvent without runId and elapsedMs, which trackRun adds (A185).
  run(quest: QuestForWriting, files: Record<string, string>, onProgress: (update: ProgressUpdate) => void, signal: AbortSignal): Promise<RunResult>
}
interface RunResult { ok: boolean; compiled: boolean; compilerOutput: string; tests: TestCaseResult[]; testsPassed: number; testsTotal: number; durationMs: number; loop: 'fast' | 'headless'; error?: string }
interface TestCaseResult { name: string; passed: boolean; message?: string; durationMs?: number }
```

`BuildProgressEvent` is defined in `src/shared/types/run.ts` (A85); that file is the source of truth. Fields: `runId` (the id the renderer passed in its request; every event of a run carries it), `phase` (`preparing`, `writing`, `building`, `launching`, `testing`, `parsing`, `reviewing`), `elapsedMs`, `lastLine`, `percent?`, `loop?` (`fast` or `headless`, once chosen), `loopReason?` (sent once with the choice). Services emit it through `sendBuildProgress` in `src/main/ipc/sendBuildProgress.ts`. `RunResult` and `TestCaseResult` above match `run.ts`.

`RunnerFactory.forQuest(quest)` on macOS: Live Coding is not available there, and the open editor keeps the code it loaded at launch. So on the Mac `LiveEditorRunner` is used only when no build has finished since that editor launched and the run needs no build; otherwise `HeadlessRunner`, and the open editor is marked stale with a "restart the editor" offer (A45). On Windows it returns `LiveEditorRunner` when the engine is 5.8+, the editor is open with the sandbox project, the MCP server answers, and the diff since the last successful full build touches no header of a reflected type; otherwise `HeadlessRunner`. The choice and the reason go into the progress stream so the UI can say "fast loop" or "full build".

## Components

- `PlatformPaths.ts`: one interface, two objects (`WindowsPlatformPaths`, `MacPlatformPaths`), chosen by `createUnrealPlatform`. Pure path math: build script, editor binary, editor-cmd binary, UBT, generate-project-files script and its output, `Build.version`, default install roots, the launcher's `LauncherInstalled.dat`. The toolchain check is its own pair (`WindowsToolchainChecker`, `MacToolchainChecker`); `killTree` arrives with the builder in M1.3. Nothing outside `createUnrealPlatform.ts` checks `process.platform` for Unreal matters. Built in M1.1 (A166).
- `EngineLocator.ts`: the launcher's `LauncherInstalled.dat` (both platforms), the Windows registry (`HKLM\SOFTWARE\EpicGames\Unreal Engine\<ver>\InstalledDirectory` and source builds under `HKCU\Software\Epic Games\Unreal Engine\Builds`, read through `reg query`), the default install folders, and manual pick; version read from `Engine/Build/Build.version`; toolchain check. Built in M1.1.
- `SandboxProjectService.ts`: copies `resources/sandbox-template/` to `<chosen folder>/DojoSandbox` (refused when that is not empty; build products are never copied, A184), writes `EngineAssociation` as `major.minor`, removes the three 5.8 plugins for older engines, remembers the sandbox path in settings, then runs the first full build with streamed progress. `rebuild` deletes `Binaries`, `Intermediate`, `Saved`, `DerivedDataCache` and builds again. Warns when the sandbox path exceeds 100 characters on Windows, in `pickSandboxFolder`'s answer and as a `preparing` progress line during `create`. Launching the editor once after setup arrives with `EditorLauncher` (M1.4). Built in M1.2.
- `UnrealBuilder.ts`: runs `DojoEditor <Win64|Mac> Development -Project=<uproject> -WaitMutex -Progress` through `Build.sh` on macOS and `UnrealBuildTool.exe` directly on Windows (Node cannot spawn `Build.bat` without a shell, A182); stdin ignored; streams lines with a percent from `@progress` and `[n/N]` lines; `LogFilter` keeps errors, warnings, and lines mentioning `Quests/` or `Tests/`; 15 minute timeout; cancel kills the process tree. Built in M1.3.
- `AutomationTestRunner.ts` (headless, built in M1.3): `UnrealEditor-Cmd "<uproject>" -ExecCmds="Automation RunTests ^<test name>$+...; Quit" (no $ on macOS) -Unattended -NoPause -NullRHI -NoSplash -NoSound -stdout -FullStdOutLogOutput -ReportExportPath="<tmp>/report" -log` (verified on 5.8.3, A44); waits for exit; `ReportParser` reads `index.json` (tests array with state, errors, warnings, duration). Exit codes seen: 0 all passed, 3 a failed assertion; the report decides, not the exit code. Timeout 10 minutes. The filter is the exact test names the quest's test source declares, each anchored because `RunTests` matches substrings: `^Name1$+^Name2$` on Windows, `^Name1+^Name2` on macOS, where Unreal turns every `$` on its command line into `"` (LaunchMac.cpp) and the broken quotes swallow `-NullRHI`. Report entries for any test the quest does not declare are dropped (A180). Never put a `$` in a macOS Unreal command line. Each run gets a fresh temp report folder, deleted afterwards.
- All runners resolve on the process exit event, not on stdout closing: a child daemon (likely the zen storage server) can outlive the editor and hold the pipe open.
- `McpEditorClient.ts`: MCP client over Streamable HTTP to `http://127.0.0.1:<port>/mcp` using `@modelcontextprotocol/sdk`. The port is a setting (default 8000) because another editor can already hold 8000 (A44). Calls the meta-tool `call_tool` with `{ toolset_name: "LiveCodingToolset.LiveCodingToolset", tool_name: "CompileLiveCoding", arguments: {} }` and `{ toolset_name: "AutomationTestToolset.AutomationTestToolset", tool_name: "RunTests", arguments: { TestNames: [...] } }` (names verified on 5.8.3, A44). `DiscoverTests` must run once per editor session first. `RunTests` returns the finished summary directly; `GetTestStatus` and `GetTestResults` are for polling and re-reading. One call in flight at a time (the server runs tools serially on the game thread). Health check: `list_toolsets`.
- `LiveEditorRunner.ts`: write files, `CompileLiveCoding`, parse its captured log for errors, `RunTests`, map results to `RunResult`. Falls back to `HeadlessRunner` with a logged reason when the compile reports that a full build is needed.
- `HeadlessRunner.ts`: write files, `UnrealBuilder`, `AutomationTestRunner`, `ReportParser`. Built in M1.3. `ok` only when it compiled, at least one test ran, every test passed, and there was no pipeline error.
- `QuestFileWriter.ts`: learner files, unchanged, to `<Sandbox>/Source/Dojo/Quests/<quest-id>/`; quest tests to `<Sandbox>/Source/Dojo/Tests/<quest-id>.Test.cpp` with a header comment naming the quest (only the test file, so compiler line numbers match the learner's editor, A188). Files left in the quest folder from an earlier run are removed; `remove` deletes a quest on reset. Refuses file names that are not plain `.h` or `.cpp` names. Each quest folder is an include path (A181). Built in M1.3. Always write files fresh (never move an older copy back into place): UBT decides what to rebuild by modification time, and a restored file with an older time is silently skipped.
- `EditorLauncher.ts`: opens the editor on the sandbox project with `-ModelContextProtocolStartServer -ModelContextProtocolPort=<port>` when the engine is 5.8+. Closing: SIGTERM (or a normal window close), then a hard kill after 15 seconds; on the Mac the editor was seen hanging in shutdown after a SIGTERM.

## Architecture (built so far)

Everything below lives in `src/main/services/unreal/`. Every file system, registry, and process call goes through an injected interface, so both platforms are unit tested on any machine (`tests/unreal/`).

| File | Job |
| --- | --- |
| `PlatformPaths.ts` | The interface for every Unreal path that differs by platform |
| `WindowsPlatformPaths.ts`, `MacPlatformPaths.ts` | The two implementations. Windows uses win32 path rules even when tested on a Mac, and compares paths without regard to case |
| `createUnrealPlatform.ts` | Picks paths, toolchain checker, and registry from `process.platform`; null on anything but `win32` and `darwin` |
| `FileSystemReader.ts`, `NodeFileSystemReader.ts` | Read a text file (byte order mark stripped) or list child folders; missing paths answer null or an empty list |
| `CommandRunner.ts`, `NodeCommandRunner.ts` | Run a short command without a shell, stdin closed, 20 second timeout; never throws |
| `EngineRegistry.ts`, `WindowsEngineRegistry.ts` | Engine folders from the Windows registry through `reg query` |
| `ToolchainChecker.ts` | The interface for the platform toolchain check |
| `WindowsToolchainChecker.ts` | vswhere: Visual Studio with `Microsoft.VisualStudio.Workload.NativeGame` and the MSVC x64 tools, version 17.14 or later |
| `MacToolchainChecker.ts` | `xcode-select -p` (full Xcode, not only the Command Line Tools), `xcodebuild -version` (license accepted), `xcrun metal --version` (Metal toolchain) |
| `toolchainCheckResult.ts` | Turns a list of problems into a `ToolchainCheck` the same way on both platforms |
| `EngineVersion.ts` | Parses `Build.version`; minimum 5.4 (D10); fast loop from 5.8 (D09) |
| `LauncherInstalledFile.ts` | Reads engine folders out of `LauncherInstalled.dat`, skipping plugin entries such as `QuixelBridge_5.8` that share the engine's folder |
| `EngineLocator.ts` | `findEngines()`, `requireEngines()`, `inspectFolder(folder)`, `checkToolchain()` |
| `unrealErrors.ts` | Every plain-English `AppError` the locator and checkers raise |
| `createEngineLocator.ts` | Builds the real locator for this machine; the composition root (`src/main/index.ts`) calls it lazily on the first engine request |

How engines are found, in order: the launcher list, then the registry (Windows only), then `UE_*` folders in the default roots (`%ProgramFiles%\Epic Games` on Windows; `/Users/Shared/Epic Games` and `~/Applications` on macOS). Each folder is listed once, with the first source that found it. Folders without a readable `Build.version` and engines older than 5.4 are left out. The list is newest first. A manual pick accepts the engine root or its `Engine` folder and explains a wrong folder (`engine-not-found`) or an old engine (`engine-version-unsupported`).

Toolchain problems: each is an `AppError` with code `toolchain-missing` and a `blocksBuild` flag. Blocking: no Visual Studio, no C++ game workload, Visual Studio older than 17.14, Xcode not selected, only the Command Line Tools selected, Xcode license not accepted, Xcode not answering. Not blocking: the Metal toolchain missing (builds and headless tests work; the editor window does not open).

IPC: `detectEngines` and `checkToolchain` answer from the locator. `pickEngineFolder` is still a stub because it needs Electron's folder dialog (follow-up).

Try it on a real machine: `npx tsx tools/locate-engine.ts [--pick <folder>]` prints what the locator finds as JSON.

### Headless loop and sandbox setup (M1.2, M1.3)

| File | Job |
| --- | --- |
| `ProcessLauncher.ts`, `NodeProcessLauncher.ts` | Start a long process without a shell, stdin ignored, output line by line (`LineSplitter.ts`); `exited` resolves on the process exit event, then the pipes are dropped. With verbatim arguments (Windows) the program path goes in quoted as `argv0` (A183) |
| `ProcessTreeKiller.ts`, `PosixProcessTreeKiller.ts`, `WindowsProcessTreeKiller.ts` | Kill a process and its children: SIGKILL to the process group on macOS (processes start in their own group), `taskkill /T /F` on Windows (A188). Chosen by `createUnrealPlatform` |
| `SupervisedProcess.ts` | `runSupervised`: start, time limit, cancel signal, kill the tree on either, resolve on exit; `Timer` so tests control time |
| `LogFilter.ts` | Keeps errors, warnings, and quest or test lines; reads a percent from UBT's lines |
| `UnrealBuilder.ts` | The build (above) |
| `TestFilter.ts`, `ReportParser.ts`, `AutomationTestRunner.ts` | The per-quest filter (A180), `index.json` parsing (byte order mark, `Success` and `SuccessWithWarnings` pass, first `Error` event is the message), the headless test run |
| `SandboxFileSystem.ts`, `NodeSandboxFileSystem.ts` | Read, fresh write (old file removed first), copy without timestamps, remove, temp folders |
| `QuestFileWriter.ts`, `SandboxProjectService.ts`, `sandboxErrors.ts` | Above |
| `Runner.ts` (`IRunner`, `RunnerContext`), `HeadlessRunner.ts`, `RunnerFactory.ts` | The loop; the factory returns `HeadlessRunner` until M1.4 |
| `ProgressUpdate.ts` | A progress event without `runId` and `elapsedMs`; `src/main/ipc/trackRun.ts` stamps both (A185) |
| `RunRegistry.ts` | Abort controller per run id, for `cancelRun`; `cancelAll` on `before-quit` stops every build and test (waits up to 5 s) |
| `SandboxPathStore.ts`, `UnrealSettingsStore.ts`, `SettingsServiceUnrealSettings.ts` | The pipeline's view of the app's settings service: the sandbox and engine folders (A400, A426). The temporary electron-store adapters are deleted |
| `createUnrealServices.ts` | Builds the real sandbox service and runner factory; the composition root calls it on first use |

`PlatformPaths` gained `buildProgram` (A182), `optionArgument`, `pathArgument`, `verbatimArguments` (A183), and `maximumSandboxPathLength` (100 on Windows).

IPC: `createSandbox`, `cancelRun`, and `pickSandboxFolder` answer (A189); `runQuest`, `checkSnippetSyntax`, and `rebuildSandbox` answer from M1.3b (below). `openEditor` waits for M1.4 (A405).

### Runs, prerequisites, and the snippet check (M1.3b)

| File | Job |
| --- | --- |
| `QuestRunService.ts` | `runQuest`, `checkSnippetSyntax`, `rebuildSandbox` for the IPC handlers. Prerequisites are followed transitively through each one's own dependency line, a boss's in its spec (A413). Reads the engine and sandbox from settings (`sandbox-not-ready` before setup), the quest from the content catalog (`quest-not-found` for an unknown or non-code quest), fills prerequisites, then runs through `RunnerFactory` |
| `QuestDependencies.ts` | Every known quest id (from the content catalog) on the brief's "Compiles against earlier quests:" line, so "f1-popup-target as extended by f1-boss-training-yard" names both (A268, A407) |
| `ReferenceSolutions.ts` | `<solutions>/<quest-id>/<FileName>`: `tools/solutions` in development, `<resources>/solutions` when packaged (extraResources, A406) |
| `PrerequisiteFiller.ts` | Per prerequisite: not passed (tested out or not done) gets its whole reference; passed with files missing gets only those, from the progress save's `savedFiles`, else the reference; files already present are never touched. A boss prerequisite with an empty folder and nothing saved gets its reference code (never its tests) and its piece overrides, which win over the piece's own files and reference in any order. One `writing` line per folder names every file and its source (A65, A401, A408, A409) |
| `bossSolution.ts` | The A215 boss layout reader (code, `*.Test.cpp`, piece overrides), moved from `tools/verifier/` so the verifier and the app share one implementation; takes a folder reader |
| `SnippetSyntaxChecker.ts`, `ClangSnippetSyntaxChecker.ts` | The scratch buffer check on macOS: UBT's `DojoTestActor.cpp.o.rsp` with the source swapped for the snippet, a prelude that blanks the reflection macros, `-fsyntax-only`, run as `xcrun clang++` from `Engine/Source`; about 0.5 s (A403). Each check writes its own `Snippet-<id>` files and removes them (A410). `ok` needs exit code 0 and no errors; header errors land on the snippet line from clang's instantiation or include notes, else line 1; a timeout is its own error (A411). Windows answers `not-implemented` for now (A402) |

`CommandRunner.run` takes an optional working folder (the snippet check needs `Engine/Source`). `NodeCommandRunner` starts each command in its own process group and, on its 20 s limit, kills the whole tree and answers at once with `exitCode: null` (A412).

Real engine check: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/runQuest.test.ts` creates a sandbox through the `createSandbox` handler, runs `f1-score-keeper` with its reference solution through the `runQuest` handler (its two prerequisites filled from their reference solutions), and runs two snippet checks.

Real engine check: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration` creates a sandbox in a temp folder, builds it, writes the sample quest through `QuestFileWriter`, and runs it passing, with a failed assertion, with a compile error, and cancelled mid-build and mid-test (A187).

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
Source/Dojo/Quests/<quest-id>/     learner code, one folder per quest; Dojo.Build.cs adds each one as an include path (A181)
Source/Dojo/Tests/<quest-id>.Test.cpp    quest tests, wrapped in #if WITH_AUTOMATION_TESTS
Source/Dojo/Support/DojoTestWorld.h/.cpp FDojoTestWorld: RAII test world (create, SpawnActor, AddComponent, Tick, tear down)
Source/Dojo/Support/DojoTestActor.h/.cpp ADojoTestActor: bare actor with a scene root, a host or dummy for tests
Source/Dojo/Quests/sample-health/  sample quest USampleHealthComponent (A40), laid out as QuestFileWriter writes quest id sample-health (A181)
Source/Dojo/Tests/sample-health.Test.cpp  Dojo.Sample.Health.TakesDamage, the sandbox smoke test
Content/Dojo/Maps/L_Sandbox.umap   empty level, 6.4 KB, committed; editor startup map and game default map (A46)
Tools/CreateSandboxMap.py          the editor Python script that made L_Sandbox.umap
Config/DefaultEngine.ini           startup and default map, Metal SM6 on Mac, DX12 on Windows
Config/DefaultGame.ini, DefaultInput.ini   project name; Enhanced Input classes
```

How the binary asset was made: `L_Sandbox.umap` is the only binary file. It was created on UE 5.8.3 by running `Tools/CreateSandboxMap.py` through the Python commandlet (command below) on a built copy of the template, then copied back into the template. It is an empty level (no actors added by us). To recreate it, delete it and run the same command. An engine older than 5.8 can load a 5.8 map only if the package version allows it; this is unverified (see `docs/problems.md`).

### FDojoTestWorld (the test-world helper)

- Route used: `UWorld::CreateWorld(EWorldType::Game, ...)` plus `GEngine->CreateNewWorldContext`, then `InitializeActorsForPlay`, `BeginPlay`, and `SetBegunPlay(true)`. There is no game mode, so `UWorld::BeginPlay` alone would not start actors; setting begun-play makes every actor spawned afterwards, and every component registered afterwards, get `BeginPlay` immediately (A43).
- `Tick(frames, seconds)` advances `GFrameCounter` before each `World->Tick`: the timer manager runs once per engine frame number and only the engine loop advances it, so without this, timers fired on the first frame only (found by content-engine's M1.8 verifier run).
- Teardown: `RouteEndPlay(LevelTransition)` on every actor, `SetBegunPlay(false)`, `ShutdownWorldNetDriver`, `DestroyWorld`, `DestroyWorldContext`. This is done by hand instead of `UWorld::EndPlay`, which 5.8 has but older engines may not, so 5.8 runs the same path older engines will. If begun-play is still set when the world is destroyed, the report carries a `LogWorld` warning and the test shows as "succeeded with warnings". The C++ APIs used are verified on 5.8.3 only (see `docs/problems.md`).
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

### MacBook Air M5, UE 5.8.3, the app's own headless loop, 2026-10-21 (M1.2 and M1.3)

Measured by `tests/integration/headlessLoop.test.ts` over its last three runs (each a fresh sandbox in the macOS temp folder). Other sessions were building Unreal projects at the same time during some runs, so the upper ends include waiting on the machine; M1.2a's quiet-machine numbers above are the better guide to a learner's experience.

| Step | Time | Notes |
| --- | --- | --- |
| Create sandbox and cold full build | 20 to 37 s | Template copy is under 1 s; the rest is UBT |
| Run after rewriting the sample quest (build and headless test) | 42 to 57 s | Every quest file is written fresh, so UBT recompiles it; the editor start and quit is about 18 s of this |
| Run of a brand new quest folder | 34 to 36 s | UBT reruns `Dojo.Build.cs` and picks up the new include path (A181) |
| Run with a failed assertion | 33 to 53 s | Same shape as a passing run |
| Run that stops at a compile error | 9 to 14 s | The editor is never started |
| Cancel mid-build | about 1 s | UBT and clang gone within a second; no process left mentioning the sandbox |
| Cancel mid-test | about 3 s after the editor starts | The editor and its helpers gone; no process left |

Fix round 1, run under the shared engine lock (no other Unreal work on the machine), 2026-10-21: create and cold build 17 s; run after rewriting the sample 23 s; a brand new quest 23 s; a failed assertion 24 s; a compile error 6.5 s; the whole integration test 105 s. These are the numbers to expect on a quiet M5.
