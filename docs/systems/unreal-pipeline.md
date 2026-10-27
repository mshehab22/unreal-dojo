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
interface RunResult { ok: boolean; compiled: boolean; compilerOutput: string; tests: TestCaseResult[]; testsPassed: number; testsTotal: number; durationMs: number; loop: 'fast' | 'headless'; error?: string; unrelatedFailure?: AppError }
interface TestCaseResult { name: string; passed: boolean; message?: string; durationMs?: number }
```

`BuildProgressEvent` is defined in `src/shared/types/run.ts` (A85); that file is the source of truth. Fields: `runId` (the id the renderer passed in its request; every event of a run carries it), `phase` (`preparing`, `writing`, `building`, `launching`, `testing`, `parsing`, `reviewing`), `elapsedMs`, `lastLine`, `percent?`, `loop?` (`fast` or `headless`, once chosen), `loopReason?` (sent once with the choice). Services emit it through `sendBuildProgress` in `src/main/ipc/sendBuildProgress.ts`. `RunResult` and `TestCaseResult` above match `run.ts`. `unrelatedFailure` is set only by `QuestRunService` when the run failed outside the learner's code (see "Failure explanation (M5.1d)" below); `SandboxSetupResult.failure` is its counterpart for a failed sandbox build.

`RunnerFactory.forContext(context)` returns a `LoopSelectingRunner` once the fast loop pieces are given (M1.4, A480); it chooses at the start of each run with `chooseLoop`. On macOS: Live Coding is not available there, and the open editor keeps the code it loaded at launch. So on the Mac `LiveEditorRunner` is used only when no build has finished since that editor launched and the run needs no build; otherwise `HeadlessRunner`, and the open editor is marked stale with a "restart the editor" offer (A45). On Windows it returns `LiveEditorRunner` when the engine is 5.8+, the editor is open with the sandbox project, the MCP server answers, and the diff since the last successful full build touches no header of a reflected type; otherwise `HeadlessRunner`. The choice and the reason go into the progress stream so the UI can say "fast loop" or "full build". Only an editor the app opened counts (A484). The exact rules are under "Fast loop (M1.4)" below.

## Components

- `PlatformPaths.ts`: one interface, two objects (`WindowsPlatformPaths`, `MacPlatformPaths`), chosen by `createUnrealPlatform`. Pure path math: build script, editor binary, editor-cmd binary, UBT, generate-project-files script and its output, `Build.version`, default install roots, the launcher's `LauncherInstalled.dat`. The toolchain check is its own pair (`WindowsToolchainChecker`, `MacToolchainChecker`); `killTree` arrives with the builder in M1.3. Nothing outside `createUnrealPlatform.ts` checks `process.platform` for Unreal matters. Built in M1.1 (A166).
- `EngineLocator.ts`: the launcher's `LauncherInstalled.dat` (both platforms), the Windows registry (`HKLM\SOFTWARE\EpicGames\Unreal Engine\<ver>\InstalledDirectory` and source builds under `HKCU\Software\Epic Games\Unreal Engine\Builds`, read through `reg query`), the default install folders, and manual pick; version read from `Engine/Build/Build.version`; toolchain check. Built in M1.1.
- `SandboxProjectService.ts`: copies `resources/sandbox-template/` to `<chosen folder>/DojoSandbox` (refused when that is not empty; build products are never copied, A184), writes `EngineAssociation` as `major.minor`, removes the three 5.8 plugins for older engines, remembers the sandbox path in settings, then runs the first full build with streamed progress. `rebuild` deletes `Binaries`, `Intermediate`, `Saved`, `DerivedDataCache` and builds again. Checks the picked folder with `SandboxFolderRules` (warnings in `pickSandboxFolder`'s answer and as `preparing` progress lines during `create`; a folder inside the engine is refused): see "Bad paths and preflight (M5.1e)" below. Built in M1.2. Since M1.4b, `buildHooks` run around both full builds: before (create: after the copy; rebuild: before anything is deleted) an editor open on this sandbox is closed, and after a successful build the ledger records it (A531). The editor is not opened automatically after setup; the learner opens it with `openEditor`.
- `UnrealBuilder.ts`: runs `DojoEditor <Win64|Mac> Development -Project=<uproject> -WaitMutex -Progress` through `Build.sh` on macOS and `UnrealBuildTool.exe` directly on Windows (Node cannot spawn `Build.bat` without a shell, A182); stdin ignored; streams lines with a percent from `@progress` and `[n/N]` lines; `LogFilter` keeps errors, warnings, and lines mentioning `Quests/` or `Tests/`; 15 minute timeout; cancel kills the process tree. Built in M1.3. A UBT that crashes while starting (it races other UBTs on its shared log backup before taking its lock) is tried again up to three times (A890), and a failed build whose lines all fall through the filter shows its last 20 raw lines (A891).

- `SandboxProjectService.ts`: copies `resources/sandbox-template/` to `<chosen folder>/DojoSandbox` (refused when that is not empty; build products are never copied, A184), writes `EngineAssociation` as `major.minor`, removes the three 5.8 plugins for older engines, remembers the sandbox path in settings, then runs the first full build with streamed progress. `rebuild` deletes `Binaries`, `Intermediate`, `Saved`, `DerivedDataCache` and builds again. Warns when the sandbox path exceeds 100 characters on Windows, in `pickSandboxFolder`'s answer and as a `preparing` progress line during `create`. Built in M1.2. Since M1.4b, `buildHooks` run around both full builds: before (create: after the copy; rebuild: before anything is deleted) an editor open on this sandbox is closed, and after a successful build the ledger records it (A531). The editor is not opened automatically after setup; the learner opens it with `openEditor`.
- `UnrealBuilder.ts`: runs `DojoEditor <Win64|Mac> Development -Project=<uproject> -WaitMutex -Progress -NoHotReloadFromIDE` through `Build.sh` on macOS and `UnrealBuildTool.exe` directly on Windows (Node cannot spawn `Build.bat` without a shell, A182); stdin ignored; streams lines with a percent from `@progress` and `[n/N]` lines; `LogFilter` keeps errors, warnings, and lines mentioning `Quests/` or `Tests/`; 15 minute timeout; cancel kills the process tree. Built in M1.3. A UBT that crashes while starting (it races other UBTs on its shared log backup before taking its lock) is tried again up to three times (A890), and a failed build whose lines all fall through the filter shows its last 20 raw lines (A891). `-NoHotReloadFromIDE` is left off only while the app's own sandbox editor is open (see "Other editors and Live Coding" below, A1220); a failed build that shows UBT's Live Coding guard line gets a plain pipeline error naming another open editor (A1223).
- `AutomationTestRunner.ts` (headless, built in M1.3): `UnrealEditor-Cmd "<uproject>" -ExecCmds="Automation RunTests ^<test name>$+...; Quit" (no $ on macOS) -Unattended -NoPause -NullRHI -NoSplash -NoSound -stdout -FullStdOutLogOutput -ReportExportPath="<tmp>/report" -log` (verified on 5.8.3, A44); waits for exit; `ReportParser` reads `index.json` (tests array with state, errors, warnings, duration). Exit codes seen: 0 all passed, 3 a failed assertion; the report decides, not the exit code. Timeout 10 minutes. The filter is the exact test names the quest's test source declares, each anchored because `RunTests` matches substrings: `^Name1$+^Name2$` on Windows, `^Name1+^Name2` on macOS, where Unreal turns every `$` on its command line into `"` (LaunchMac.cpp) and the broken quotes swallow `-NullRHI`. Report entries for any test the quest does not declare are dropped (A180). Never put a `$` in a macOS Unreal command line. Each run gets a fresh temp report folder, deleted afterwards.
- All runners resolve on the process exit event, not on stdout closing: a child daemon (likely the zen storage server) can outlive the editor and hold the pipe open.
- `McpEditorClient.ts`: MCP client over Streamable HTTP to `http://127.0.0.1:<port>/mcp` using `@modelcontextprotocol/sdk`. The port is a setting (default 8000) because another editor can already hold 8000 (A44). Calls the meta-tool `call_tool` with `{ toolset_name: "LiveCodingToolset.LiveCodingToolset", tool_name: "CompileLiveCoding", arguments: {} }` and `{ toolset_name: "AutomationTestToolset.AutomationTestToolset", tool_name: "RunTests", arguments: { TestNames: [...] } }` (names verified on 5.8.3, A44). `DiscoverTests` must run once per editor session first. `RunTests` returns the finished summary directly; `GetTestStatus` and `GetTestResults` are for polling and re-reading. One call in flight at a time (the server runs tools serially on the game thread). Health check: `list_toolsets`. Built in M1.4: a lost session is dropped and the next call reconnects and discovers tests again.
- `LiveEditorRunner.ts`: on Windows writes files and calls `CompileLiveCoding`, reading the answer with `LiveCodingAnswer` (A485, A1071); on macOS skips both, because the chooser only picks it for code the editor already loaded (A45). Then `RunTests` with the quest's declared test names, keeping only those in the answer. Falls back to the headless loop with a reason when the editor stops answering, a tool errors, Live Coding cannot take the change or is not running, or the editor does not know the quest's tests (A486). Built in M1.4.
- `LiveCodingAnswer.ts` (A485, A1071): reads the text `CompileLiveCoding` returns. On UE 5.8.3 the toolset answers plain text, not JSON: `Result: Success`, `Result: NoChanges`, `Result: Failure`, `Result: CompileStillActive`, `Result: CompileNotStarted`, followed by `Compile Output:` and `Compiler Diagnostics:` sections; or one line starting `Error:` (`Live Coding is not enabled for this session. Enable it in Editor Preferences.`, `Live Coding module is not loaded.`, `Live Coding is not available in this build configuration.`). A JSON field or the `Result:` line is read first. Then wording that means Live Coding cannot run here (`not available`, `not enabled`, `not loaded`, `not started`, `cannot be enabled`, `unable to start`) is `unavailable`, which sends the run to the headless loop; this is checked before the generic `error` match, so an `Error: ... not enabled` answer is never shown to the learner as a compile failure. Only a real compile failure is `failed`: a `Result: Failure` with compiler output after it. A `Result: Failure` or `Result: Cancelled` with no compiler error lines (`): error `, `): fatal error `, `error C1234`, `error LNK1234`) is `needs-full-build`, so the headless loop shows the real compiler output instead of an empty failure. This is the usual real answer: `Compile Output:` holds only the Live Coding log ("Live coding failed, please see Live console for more information", "Live coding canceled"), and `Compiler Diagnostics:` appears only when `<Engine>/Programs/UnrealBuildTool/Log.txt` changes, which a Launcher install never has (UBT logs under `%LOCALAPPDATA%\UnrealBuildTool`).
- `HeadlessRunner.ts`: write files, `UnrealBuilder`, `AutomationTestRunner`, `ReportParser`. Built in M1.3. `ok` only when it compiled, at least one test ran, every test passed, and there was no pipeline error.
- `QuestFileWriter.ts`: learner files, unchanged, to `<Sandbox>/Source/Dojo/Quests/<quest-id>/`; quest tests to `<Sandbox>/Source/Dojo/Tests/<quest-id>.Test.cpp` with a header comment naming the quest (only the test file, so compiler line numbers match the learner's editor, A188). Files left in the quest folder from an earlier run are removed; `remove` deletes a quest on reset. Refuses file names that are not plain `.h` or `.cpp` names. Each quest folder is an include path (A181). Built in M1.3. Always write files fresh (never move an older copy back into place): UBT decides what to rebuild by modification time, and a restored file with an older time is silently skipped.
- `EditorLauncher.ts`: checks the MCP port is free first and refuses with `editor-launch-failed` when anything listens there, since Unreal's server does not fail on a taken port (A491). Opens the editor on the sandbox project with `-ModelContextProtocolStartServer -ModelContextProtocolPort=<port>` when the engine is 5.8+ (plus `-NullRHI -Unattended -NoSplash -NoSound -stdout -FullStdOutLogOutput` when windowless). Keeps one editor; launching again closes the old one. Launches run one at a time, so a reopen after a full build and a second launch at once cannot leave the first editor running with no session to close it (A1075). When a windowless launch asks for Live Coding (`startLiveCoding`, Windows tests only, A1072) it drops `-Unattended`, adds `-ini:EditorPerProjectUserSettings:[/Script/LiveCoding.LiveCodingSettings]:bEnabled=True,[/Script/LiveCoding.LiveCodingSettings]:Startup=AutomaticButHidden`, and `waitUntilAnswering` then also waits (up to 60 s) for the log line `Live coding ready`, because Live Coding finishes starting 2 to 6 seconds after the MCP server answers and a compile before that answers `not enabled`. Closing: an exit request (SIGTERM on macOS, `taskkill /T` without `/F` on Windows) and the hard tree kill scheduled for 15 seconds later, then the MCP connection dropped at once so a call in flight does not hold the close; on the Mac the editor was seen hanging in shutdown after a SIGTERM. No kill after a clean exit, because the zen storage server it may have started is shared with other editors (A487). Built in M1.4.

## Architecture (built so far)

Last updated by M5.1e (bad paths and preflight), after M5.1d (failure explanation).

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
| `unrealErrors.ts` | Every plain-English `AppError` the locator, the checkers and the build failure explainer raise |
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
| `RunRegistry.ts` | Abort controller per run id, for `cancelRun`; `cancelAll` on `before-quit` stops every build and test (waits up to 5 s). Also keeps each run's last progress event and event count and the answers of the newest 20 finished runs, for `getRunStatus` (a run ended early by Submit stays running until its answer is recorded), and logs one line per run start and answer (A820, A823) |
| `SandboxPathStore.ts`, `UnrealSettingsStore.ts`, `SettingsServiceUnrealSettings.ts` | The pipeline's view of the app's settings service: the sandbox and engine folders (A400, A426). The temporary electron-store adapters are deleted |
| `createUnrealServices.ts` | Builds the real sandbox service and runner factory; the composition root calls it on first use |

`PlatformPaths` gained `buildProgram` (A182), `optionArgument`, `pathArgument`, `verbatimArguments` (A183), and `maximumSandboxPathLength` (100 on Windows).

IPC: `createSandbox`, `cancelRun`, and `pickSandboxFolder` answer (A189); `runQuest`, `checkSnippetSyntax`, and `rebuildSandbox` answer from M1.3b (below). `openEditor` waits for M1.4 (A405).

### Runs, prerequisites, and the snippet check (M1.3b)

| File | Job |
| --- | --- |
| `QuestRunService.ts` | `runQuest`, `checkSnippetSyntax`, `rebuildSandbox` for the IPC handlers. Prerequisites are followed transitively through each one's own dependency line, a boss's in its spec (A413). Reads the engine and sandbox from settings through `RunPreflight` (M5.1e: `sandbox-not-ready` before setup or when the sandbox was moved or deleted, `engine-not-found` when the engine moved or was uninstalled), the quest from the content catalog (`quest-not-found` for an unknown or non-code quest), fills prerequisites, then runs through `RunnerFactory` |
| `QuestDependencies.ts` | Every known quest id (from the content catalog) on the brief's "Compiles against earlier quests:" line, so "f1-popup-target as extended by f1-boss-training-yard" names both (A268, A407) |
| `ReferenceSolutions.ts` | `<solutions>/<quest-id>/<FileName>`: `tools/solutions` in development, `<resources>/solutions` when packaged (extraResources, A406) |
| `PrerequisiteFiller.ts` | Per prerequisite: not passed (tested out or not done) gets its whole reference; passed with files missing gets only those, from the progress save's `savedFiles`, else the reference; files already present are never touched. A boss prerequisite with an empty folder and nothing saved gets its reference code (never its tests) and its piece overrides, which win over the piece's own files and reference in any order. One `writing` line per folder names every file and its source (A65, A401, A408, A409) |
| `bossSolution.ts` | The A215 boss layout reader (code, `*.Test.cpp`, piece overrides), moved from `tools/verifier/` so the verifier and the app share one implementation; takes a folder reader, which also supplies `join`, so paths are spelled the way that file system spells them (the app passes its `PlatformPaths.join`; the verifier uses `node:path`) (A1000) |
| `SnippetSyntaxChecker.ts`, `ClangSnippetSyntaxChecker.ts` | The scratch buffer check on macOS: UBT's `DojoTestActor.cpp.o.rsp` with the source swapped for the snippet, a prelude that blanks the reflection macros, `-fsyntax-only`, run as `xcrun clang++` from `Engine/Source`; about 0.5 s (A403). Each check writes its own `Snippet-<id>` files and removes them (A410). `ok` needs exit code 0 and no errors; header errors land on the snippet line from clang's instantiation or include notes, else line 1; a timeout is its own error (A411). Windows answers `not-implemented` for now (A402) |

`CommandRunner.run` takes an optional working folder (the snippet check needs `Engine/Source`). `NodeCommandRunner` starts each command in its own process group and, on its 20 s limit, kills the whole tree and answers at once with `exitCode: null` (A412).

Real engine check: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/runQuest.test.ts` creates a sandbox through the `createSandbox` handler, runs `f1-score-keeper` with its reference solution through the `runQuest` handler (its two prerequisites filled from their reference solutions), and runs two snippet checks.

Running the real engine checks: take the shared engine lock, then run one file at a time, or several with `--no-file-parallelism`, for example `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration --no-file-parallelism`. Without that flag vitest runs the files in parallel: several sandboxes build at once and editors compete for ports and the machine, and the runs fail or time out (A612). There is no npm script for these checks.

Real engine check: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/headlessLoop.test.ts` creates a sandbox in a temp folder, builds it, writes the sample quest through `QuestFileWriter`, and runs it passing, with a failed assertion, with a compile error, and cancelled mid-build and mid-test (A187).

### Fast loop (M1.4)

| File | Job |
| --- | --- |
| `EditorToolClient.ts`, `EditorClientError.ts` | What runners ask of an open editor (health, RunTests, CompileLiveCoding); errors are `connection`, `tool`, or `format` |
| `McpEditorClient.ts` | The real client: `@modelcontextprotocol/sdk` over Streamable HTTP, a promise queue so calls never overlap, `DiscoverTests` once per session |
| `EditorTestSummaryParser.ts` | Unwraps `{"returnValue": "<json>"}` and reads the RunTests summary (errors as strings or objects) |
| `LiveCodingAnswer.ts` | Reads CompileLiveCoding's answer into `succeeded`, `no-changes`, `failed`, `needs-full-build`, `unavailable`, or `busy`; an unknown answer counts as needing a full build |
| `EditorLauncher.ts` | Above; also `reopen()`, `dispose()` (no editor starts afterwards), and `waitUntilAnswering(session, timeout)` (polls once a second). Refuses a taken MCP port (A491) |
| `PortProbe.ts`, `NodePortProbe.ts` | A one-second TCP connect to 127.0.0.1: is something already listening on the MCP port |
| `stopEngineWorkBeforeQuit.ts` | The app's one `before-quit` sequence: holds the quit, cancels runs, disposes the launcher, quits again (A530; replaced M1.4's editor-only `stopEditorBeforeQuit`) |
| `EditorService.ts` | The `openEditor` request and the `editorConnected` chip (M1.4b) |
| `FullBuildLedger.ts` | In memory: when the last full build finished, per quest the files and tests it compiled, and whether any quest's files in the sandbox changed since (`recordSandboxWrite`) |
| `chooseLoop.ts` | The rules below, as a pure function |
| `LoopSelectingRunner.ts` | Gathers the inputs, announces the loop and reason once, runs the fast runner or the headless one, and records every build that compiled |
| `LiveEditorRunner.ts` | Above |
| `runResultOf.ts` | Fills a `RunResult` the same way for both loops |
| `RunnerFactory.ts` | Without fast loop pieces, the headless runner as before; with them, a `LoopSelectingRunner` per context |

Rules, first match wins (`chooseLoop.ts`):
1. `loopMode` is `headless`: headless.
2. The engine is older than 5.8, no editor the app opened is on this engine and sandbox, or its server does not answer: headless.
3. Other quests' files changed since the last full build (prerequisite fill, reset): headless. A full build finished after the editor opened: headless, and the editor is stale; on the Mac the reason says to restart the editor.
4. Windows: headless when this quest has no full build this session, its record is not from the latest full build, its tests changed, files were added or removed, or a changed header contains a reflection macro (`UCLASS`, `USTRUCT`, `UENUM`, `UINTERFACE`, `UPROPERTY`, `UFUNCTION`, `UDELEGATE`, `GENERATED_BODY`, `DECLARE_DYNAMIC_*`) before or after the change; otherwise fast with Live Coding.
5. macOS: fast only when the files and tests equal the last full build of this quest, that build is the latest full build, and it finished before the editor opened; otherwise headless.
6. `loopMode` `fast` that cannot be honored says so at the start of the reason.

On Windows a headless run closes the open editor first and reopens it afterwards in the background (A483). Cancel takes effect between steps; a call already sent to the editor is not interrupted (A488).

Quitting: `stopEngineWorkBeforeQuit(app, { runs, editorLauncher })` is the app's one `before-quit` sequence (A530). It holds the quit, cancels running builds and tests (up to 5 seconds), then disposes the launcher (exit request, kill after the 15 second grace), then quits; every quit attempt meanwhile is held too. The launcher is disposed even when nothing is open, so the background `reopen()` after a full build cannot start an editor once quit began.

Wiring in the app (M1.4b, A489):
- `createUnrealServices` builds one `EditorLauncher` (with `NodePortProbe` and `McpEditorClient`), one `FullBuildLedger`, and the `RunnerFactory` with the fast loop pieces; the loop mode and MCP port come from settings through `UnrealSettingsStore.getLoopMode()` and `getMcpPort()`.
- `EditorService.openEditor()` answers the `openEditor` request: it needs the engine and sandbox from settings, keeps an editor that is on this sandbox, not stale, and answering, and otherwise (re)launches it with the MCP server on the settings port (on 5.8 and later) and waits up to 3 minutes for it to answer. It opens a windowless editor when the toolchain reports a non-blocking problem, which today means the missing Metal toolchain on the Mac (A532), and always when `alwaysWindowless` is set: tests and agent runs set it so no run opens an editor window (A643, A1074); the learner's own Open Editor stays windowed. `startLiveCodingWhenWindowless` (off by default) starts Live Coding in that windowless editor on Windows; see "Live Coding in a windowless editor" below (A1072). A quest id is accepted and ignored until per-quest maps exist (A533). `EditorService.isConnected()` answers `editorConnected` in `getEnvironmentStatus`.
- Sandbox create and rebuild record into the ledger through `buildHooks`; the `PrerequisiteFiller` reports its writes; `resetQuest` removes the quest's folder and test from the sandbox after resetting progress, and records that (A534).
- `src/main/index.ts` registers `stopEngineWorkBeforeQuit` in place of the run registry's own hook.

### Failure explanation (M5.1d)

When a build or test run fails for a reason that is not the learner's code, main says so in plain English and says what to do. The renderer reads `RunResult.unrelatedFailure` and `SandboxSetupResult.failure`; its own string guessing in `lib/sandboxFailure.ts` stays only as a fallback (A1200).

| File | Job |
| --- | --- |
| `buildFailureSignatures.ts` | Data: build output lines that mean an outside failure (Live Coding active, disk full, file locked, path too long, Visual Studio, Windows SDK or Xcode not usable), each with a function that makes the ready `AppError` and keeps the matched line as `detail` |
| `buildErrorLocations.ts` | Reads error lines in the MSVC shape (`path(line): error C1234:`), the clang shape (`path:line:col: error:`) and the linker shape, and says which part of the sandbox each points into: a quest folder or test file (by quest id), support code, the template or the engine, or unknown |
| `BuildFailureExplainer.ts` | One class. `explainRun` (a quest run) answers an `AppError` or undefined; `explainSandbox` (a sandbox build) always answers. Pure apart from the injected `checkToolchain` and `inspectEngine`. Never throws |
| `unrealErrors.ts` | The wording of every explanation |

Wiring: `QuestRunService.runQuest` gives the explainer the quest id, its prerequisite ids and where each prerequisite's files came from (`earlierQuestCode`: the reference solution when every file the filler wrote there came from one, otherwise the learner's saved code) and sets `unrelatedFailure` on the result. `SandboxProjectService.buildSandbox` sets `failure` on a failed build. Both take the explainer as an optional dependency, built once in `createUnrealServices`.

Rules, in order, first match wins (`explainRun`):

1. Known outside signatures (`BUILD_FAILURE_SIGNATURES`) on the lines of the output and on the pipeline error. Once the code compiled (`RunResult.compiled`), the output holds only kept warnings, so only the pipeline error is read: a coincident warning must not refund a test-time crash or loop. A line that names any quest folder or test file, and a clang code excerpt line (`   12 |   code`), is skipped, because the learner wrote its text (an `#error` or `static_assert` message saying "No space left on device"). The signatures for failures that stop a build before compiling (Live Coding active, Visual Studio or SDK, Xcode) are also skipped when the output names this quest, since that proves the compiler ran; a full disk, a locked file and a long path still win. Codes: `build-environment-failed`, `toolchain-missing`, `sandbox-path-too-long`.
2. A pipeline error (`RunResult.error`). Outside the learner's code for certain: a program could not start (the engine is inspected again; a moved or missing engine becomes that engine error, otherwise the engine's programs would not run), none of this quest's tests ran, and, only while the code had not compiled yet, a build timeout and a build tool that crashed while starting three times. Once the code compiled, a test timeout or a missing or unreadable test report may be the learner's crash or endless loop, so they stay with the quest; so does any pipeline text not listed (A1199, A1203). `RunResult.error` still shows. "Cancelled." is never explained.
3. ANY line of the output that names this quest's `Source/Dojo/Quests/<id>/` folder or `Source/Dojo/Tests/<id>.Test.cpp` (an error, a note, "In file included from", "see reference to", "requested here") keeps the blame with the quest: no `unrelatedFailure`, whatever else is in the output. So an engine `static_assert` raised by the learner's `Cast<>`, or a redefinition reported in an earlier quest's header with only a note naming the learner's file, stays with the quest.
4. Error lines only in earlier quests' folders (no support or engine lines), every one of them a quest among this quest's prerequisites: if an earlier quest's files came from the learner's saved code, the learner is told an earlier quest breaks the build and to open or reset it; if every broken earlier quest came from a reference solution it is a content bug to report. An error in a quest that is not an earlier one (a later or dependent quest, for example after the learner renamed an API) keeps the blame with this quest.
5. Error lines only in a `Support/*.cpp` file, a file directly in the module folder (the template), or the engine's `Source`, `Plugins`, `Build` or `Shaders` when the engine error says a file is missing (`Cannot open include file`, C1083, `file not found`, `No such file or directory`): suggest rebuilding the sandbox. "Only" is strict: an error line with an unknown location (a `.generated.h`, a linker line, a `Support/*.h` header) blocks rules 4 and 5. Any other error located in an engine header or a support header keeps the blame with the quest, because MSVC prints no include chain and the header may have been included by the learner's own file.
6. Otherwise run the toolchain check, but only when the output has no compiler or linker error line at all (a diagnostic proves the toolchain ran, and that includes Apple's linker output such as `Undefined symbols for architecture arm64:` and `clang++: error: linker command failed`): a blocking problem becomes the error. If there is none, no `unrelatedFailure`: the blame stays with the quest, the conservative default (A1199).

Quest paths are anchored on the module folder (`Source/Dojo/Quests/`, `Source/Dojo/Tests/`), so a sandbox inside a folder called Quests is not misread; relative build tool paths and Mac paths work. A run that compiled and only has failing tests, a cancelled run and a passing run never get `unrelatedFailure`, and the toolchain check runs only for failures none of rules 1 to 5 could place (A1201). Mixed evidence (earlier quest plus support code) skips rules 4 and 5 and, because it has error lines, ends with no `unrelatedFailure`. Linker lines such as `Module.Dojo.cpp.obj : error LNK2019` name no known folder, so they stay with the quest.

`explainSandbox` has no quest being run, so it answers every failure: rules 1 and 2 (an unlisted pipeline text gets a generic outside-your-code message), then, when ANY line of the output names a quest folder or test file (a rebuild keeps the quests already in the sandbox), "open or reset those quests", then errors only in support source, the template or an engine missing file (rebuild; an unknown-located line or any other engine error sends it to the generic message instead), then the toolchain check when no compiler or linker line exists, and last a generic `build-environment-failed` "the sandbox could not be built, this is about the setup on this computer" with the first error line as detail (A1203).

Signature strings were read in the UE 5.8.3 build tool source on Windows (Live Coding active, Visual Studio and Windows SDK toolchain selection, the Xcode messages). The disk, file lock and path length strings are the compilers' and operating systems' own. Nothing was run against macOS (A1202). Fixtures for every shape are in `tests/unreal/fixtures/build-logs/`.

### Bad paths and preflight (M5.1e)

Bad folders are explained before they hurt, and a moved engine or deleted sandbox never shows a raw `ENOENT`.

| File | Job |
| --- | --- |
| `SandboxFolderRules.ts` | Pure, takes `PlatformPaths`. `warnings(pickedFolder, sandboxFolder)`: a Windows sandbox path over 100 characters; letters outside plain ASCII; a cloud-synced folder (OneDrive, Dropbox, Google Drive, iCloud Drive; `My Drive` or `Shared drives` right under a Windows drive letter, which is Google Drive for desktop; `Library/Mobile Documents` and anything under `Library/CloudStorage/` on a Mac); a Windows network path (`\\server\share`, the local `\\?\` prefix excepted); under `Program Files` on Windows. `blockers(pickedFolder, engineRoot)`: the folder is the engine root or inside it. Separators are normalised and, on Windows, letter case is ignored (through `PlatformPaths.pathKey`). An engine root inside the picked folder is ignored (A1204) |
| `RunPreflight.ts` | `check()` returns the engine and sandbox from settings after proving both are still there: the engine must pass `EngineLocator.inspectFolder`, and the sandbox must still hold `Dojo.uproject`. Used by `runQuest`, `checkSnippetSyntax` and `rebuildSandbox` before they do anything else |
| `sandboxErrors.ts`, `unrealErrors.ts` | The new wording: `sandboxPathUnsupported`, `sandboxMovedOrDeleted`, `engineMovedOrUninstalled` |

- `SandboxProjectService.folderWarnings` uses the rules; `folderBlockers(pickedFolder, enginePath?)` uses the engine given, else the one saved in settings (`savedEnginePath`, set by `createUnrealServices`). The `pickSandboxFolder` answer carries both (`warnings`, `blockers`). `create` refuses a blocked folder first, before copying or remembering anything, with `sandbox-path-unsupported`, and checks again after symbolic links are resolved (the picked folder, and the engine as spelled and resolved), because a link can hide the engine folder from the first check; a folder with only warnings is still created and each warning is sent as a `preparing` line. `sandbox-path-too-long` is still raised only by the build failure explainer, after a build hits Windows' limit.
- Preflight failures are rejected calls with an `AppErrorException`, never a `RunResult` with `unrelatedFailure` (A1205). `engine-not-found` names the saved path and says to pick the engine again in Settings ("Pick another engine"); an engine that is too old keeps its own `engine-version-unsupported`; any other locator failure, including a raw `ENOENT`, becomes `engine-not-found` with the raw text as `detail`. `sandbox-not-ready` says the project could not be found at the saved folder and to put it back. Both messages are worded for every reason a read can fail (the readers return null for a moved folder, a locked one, or a drive that is not connected): "may have been moved, renamed or deleted, or its drive is not connected". The engine is checked first, then the sandbox. Before setup the message says the first-run setup is shown until it is done.
- Submit sits on `runQuest` without catching it (`QuestSubmitService.submit`), so a preflight rejection ends the Submit before the review and before anything is recorded.
- Nothing in the app can set up a deleted sandbox again today: Settings' Rebuild sandbox rebuilds an existing project and refuses a folder with no `Dojo.uproject`, and first-run cannot be reopened. So the sandbox messages say only what works: put the folder back. See the open problem in `docs/problems.md` and task M5.1k.

### Live Coding in a windowless editor (Windows, UE 5.8.3, A1071, A1072)

Findings from the engine source (`Engine/Source/Developer/Windows/LiveCoding/Private/LiveCodingModule.cpp`, `Engine/Plugins/Experimental/Toolsets/LiveCodingToolset`) and from runs on the Windows desktop:

- The editor started by the integration tests (`-NullRHI -Unattended`) never starts Live Coding. The module auto-starts only when `bEnabled`, `Startup` is not `Manual`, and the editor is not unattended. `CompileLiveCoding` then answers `Error: Live Coding is not enabled for this session...` in about 20 ms. The app treats that as `unavailable`, not as a compile failure: the run falls back to the headless loop, which closes the editor for the full build and opens it again afterwards. This is the default in the integration suite.
- `-LiveCoding` on the command line forces a start in `Manual` mode and works, but it starts the Live Coding console (`LiveCodingConsole.exe`, a Slate window titled `<Project> - Live Coding`, about 1200 by 640) visible. It is not used.
- The hidden start is `Startup=AutomaticButHidden` (the console gets `-Hidden`), which needs an editor that is not unattended. `-ini:EditorPerProjectUserSettings:[/Script/LiveCoding.LiveCodingSettings]:bEnabled=True,...:Startup=AutomaticButHidden` on the command line sets it without touching the learner's settings, and `-NullRHI` without `-Unattended` opened no window of its own. With that, `CompileLiveCoding` succeeded and the sample test ran in the editor (the "fast" loop for real).
- Every `CompileLiveCoding` call runs `EnableForSession(true)`, which unconditionally shows the console (`ShowConsole`), plus two small notification windows. So a real Live Coding compile makes a window appear on the desktop; there is no setting that prevents it. For that reason Live Coding in the windowless editor is off unless `DOJO_TEST_LIVE_CODING=1` is set by someone at the machine.
- Live Coding is ready 2 to 6 seconds after the MCP server first answers (the log lines `Successfully initialized, removing startup thread`, then `Live coding ready`). A compile before that answers `not enabled`.

### Integration suite support (`tests/support/`, A1070, A1074)

- `processesMentioning(folder)` lists the processes whose command line mentions a folder, for the "no process left behind" checks (A182). On Windows it runs PowerShell `Get-CimInstance Win32_Process`, passing the folder in an environment variable so the query's own command line never matches, and excluding its own process id; elsewhere it uses `pgrep -fl`. One shared file for `fastLoop`, `fastLoopWiring`, and `headlessLoop`.
- `GuardedProcessLauncher` wraps the real process launcher in every integration test: it records each launch and throws, before anything starts, on a `UnrealEditor` without `-NullRHI`. `createIntegrationServices` builds the services with `forceWindowlessEditor` and that guard. The fast loop tests print every editor launch and assert each one has `-NullRHI`.
- The scratch buffer syntax check test is skipped on Windows (A402): there is no Windows snippet checker yet. It stays open in `docs/problems.md`.
- Where Windows has no Live Coding in the windowless editor (the default), the fast loop tests expect the spec'd fallback: the first run answers `Full build: Live Coding answered "unavailable".`, builds headless, and the app reopens the editor; `RunTests` over MCP is checked directly against the reopened editor. With `DOJO_TEST_LIVE_CODING=1` they expect the fast loop. The Mac keeps its stale-editor test (A45).

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
"<Engine>/Build/BatchFiles/Mac/Build.sh" DojoEditor Mac Development -Project="<Sandbox>/Dojo.uproject" -WaitMutex -Progress -NoHotReloadFromIDE
```

Prints `@progress 'Compiling C++ source code...' NN%` lines, `[n/N] Compile [Apple] File.cpp` per file, and `Result: Succeeded` with exit code 0.

#### Other editors and Live Coding (W10, A1220 to A1223)

UBT refuses to build ("Unable to build while Live Coding is active") when `bAllowHotReloadFromIDE` is true and a mutex `Global\LiveCoding_<path of the target's executable>` exists. For an editor target on an installed engine that executable is the shared `Engine\Binaries\Win64\UnrealEditor.exe`, so a learner's own game editor, open with Live Coding on, blocked every sandbox build although it never loaded the sandbox's modules. `UnrealBuilder` therefore passes `-NoHotReloadFromIDE` (clears `bAllowHotReloadFromIDE`; skips the guard, the scan of `Engine\Intermediate\EditorRuns`, and UBT's FromIDE hot reload mode, so the sandbox's modules keep plain names). It does so for the app's builds and the verifier's engine stage alike, except while the app's own sandbox editor is open (`EditorLauncher.current()`, passed in by `createUnrealServices`): that editor has the sandbox's modules loaded, so UBT's own guard and hot reload handling stay on for it. On Windows the app closes its editor before every build (A483, A531), so the exception only matters on macOS. If the guard line still appears in a failed build, `buildPipelineError` returns the plain message in `LIVE_CODING_GUARD_MESSAGE` (another editor with Live Coding is open; the code was not compiled) as the build's pipeline error; the raw lines stay in the output as detail (the filter keeps none of them, so the last 20 raw lines show, A891). The app never looks for, closes, or touches an editor it did not open.

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

### MacBook Air M5, UE 5.8.3, the fast loop, 2026-10-21 (M1.4)

Measured by `tests/integration/fastLoop.test.ts` in one run under the shared engine lock (`DOJO_ENGINE_ROOT=~/Applications/UE_5.8`). The editor is windowless (`-NullRHI`) with the MCP server on a free port; Live Coding does not exist on the Mac, so "fast" here means re-running tests on code the editor already loaded (A45).

| Step | Time | Notes |
| --- | --- | --- |
| Create sandbox and cold full build | 21 s | |
| Run with no editor open (headless) | 26 s | Reason: the editor is not open |
| Editor launch to MCP answering | 10.5 s | |
| First fast run | 4.4 s | Includes `DiscoverTests`, once per editor session |
| Next fast run | 32 ms | `RunTests` alone |
| Run after a `.cpp` change (headless, editor left open) | 28 s | Reason: code changed, no Live Coding on the Mac |
| Next run with the now stale editor | 41 s | Headless; the reason says to restart the editor |
| Editor restart to MCP answering | 26 s | Includes closing the old editor |
| Fast run after the restart | 3.5 s | New session, so `DiscoverTests` again |
| Editor close (exit request, clean quit) | 1.7 s | No process left mentioning the sandbox |
| Fast loop compile (Live Coding) | not available | Windows only; unverified there |

### Windows desktop, UE 5.8.3, the fast loop tests, 2026-10-26 (W8)

Measured by `tests/integration/fastLoop.test.ts` in one run under the shared engine lock, with the windowless editor and no Live Coding (the default, A1072). Other work was running on the machine at the same time, so these are upper-end numbers.

| Step | Time | Notes |
| --- | --- | --- |
| Create sandbox and cold full build | 35 s | |
| Run with no editor open (headless) | 23 s | |
| Editor launch to MCP answering | 9 s | `-NullRHI`, no window |
| Run in the open editor | 36 s | Live Coding answers "not enabled" in 20 ms, so the run builds headless: the editor closes, the build runs, the tests run |
| Editor reopened by the app after that build, to MCP answering | 9 s | |
| Run after a reflected header change | 37 s | Straight to a full build, reason names the header |
| Editor close (exit request, then the kill after the grace period) | 15 s | A windowless editor ignores the soft `taskkill`, so it waits out the 15 s |
| Fast loop compile (Live Coding) | works, with a console window | Only with `DOJO_TEST_LIVE_CODING=1`; see "Live Coding in a windowless editor" |

The other four integration files were not re-run in their final form on Windows: Mohammad's own editors (BadBoys, then KAEL) had Live Coding active, so UBT refused every build (A1076). That run waits for W10's `-NoHotReloadFromIDE`.
