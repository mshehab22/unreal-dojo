# Problems

Open problems and blockers. The Lead adds an entry when something cannot be resolved by the owning builder in one round, and removes it when solved (with a line in `decisions.md` if a decision was involved).

Format: date, system, problem, what was tried, current workaround, who owns it.

## Open


- 2026-10-21, qa: no GitHub remote and no `gh` CLI on the Mac, so M0.6 cannot show a green Actions run. Workaround: the workflow is written and each step run locally (A05). Owner: Lead, after Mohammad runs `gh auth login`.
- 2026-10-21, unreal-pipeline: the editor with a window (no `-NullRHI`) quits at startup on this Mac with "cannot execute tool 'metal' due to missing Metal Toolchain; use: xcodebuild -downloadComponent MetalToolchain". Xcode 27 ships the Metal toolchain as a separate download. Tried: nothing further; installing it is a download Mohammad should approve. Workaround: everything headless and the MCP proof ran with `-NullRHI`. Fix: Mohammad runs `xcodebuild -downloadComponent MetalToolchain` once. The app's toolchain check (`PlatformPaths.toolchainCheck`) should detect this and show the command. Owner: builder-unreal (check), Mohammad (install).
- 2026-10-21, unreal-pipeline: on the Mac the editor (`-NullRHI`) logged "Engine exit requested" after SIGTERM but did not exit within 60 seconds and needed SIGKILL. This was right after UBT replaced the module library it had loaded. Workaround: `EditorLauncher` kills hard after a grace period. Owner: builder-unreal.
- 2026-10-21, unreal-pipeline: a UE 5.8.3 on macOS forum report says Game-target builds can fail because UBA launches xcodebuild with a closed stdin. Spawn UBT with stdin set to ignore (or from `/dev/null`). With that, the editor target builds fine (M1.2a); the Game target was not built, so the report is neither confirmed nor ruled out.

- 2026-10-21, ai-review M1.7: no live review has come back yet. `claude` is not on PATH on the Mac (only the desktop app's bundled, signed-out copy), so the real `structured_output` shape and whether `--json-schema` with `--tools ""` and `--max-turns 1` returns structured output are unverified; the recorded success envelopes are hand-written. The live API run waits for Mohammad's key. Owner: builder-review, once a signed-in `claude` CLI is installed.

- 2026-10-21, unreal-pipeline: every quest lives in the one `Dojo` module, so a compile error left in one quest's files breaks the build of every other quest until it is fixed or reset (seen in the M1.3 integration run). Workaround: the compiler output names the file, and resetting the quest removes it (`QuestFileWriter.remove`). To decide with M2.2 (the Build screen): show which quest broke the build, or have the runner set aside other quests' failing files. Owner: builder-unreal with ui-quests.

- 2026-10-21, qa: under heavy machine load (load average about 21 with several Unreal builds running), single end-to-end tests fail on timing (Cmd+K glossary search, the smoke window-height check) and pass on rerun. Owner: tester, to raise waits on the slow steps and keep engine runs serialized.

## Unverified on a platform

(The Lead lists here anything that passed on one machine and could not be run on the other.)

- 2026-10-21, content-foundations M2.3: Pack 1 World 1 reference solutions and tests built and passed on the Mac (UE 5.8.3) by hand; unverified on Windows and not yet run through the verifier's `--engine` mode (M1.8).
- 2026-10-21, app-shell M0.1: the Windows nsis installer and the e2e smoke test have only run on the Mac. Covered by the CI matrix (M0.6) once the GitHub repo exists, or by a manual run on the Windows desktop.
- 2026-10-21, app-shell M0.1: the Intel (x64) dmg is configured but was not launched on an Intel Mac.
- 2026-10-21, unreal-pipeline M1.1: the Windows engine locator and toolchain check run only against fakes: real `reg query` output, the registry view (only the default 64-bit view is read, A164), vswhere JSON, and `ProgramFiles`/`ProgramData` values. Hardening to consider on the first Windows run: a `/reg:32` fallback query, and a Windows SDK (10.0.22621.0 or newer) check, which today only shows up as a build error.
- 2026-10-21, unreal-pipeline M1.1: the Xcode-not-selected, Command Line Tools only, and unaccepted-license paths are covered by unit tests only.
- 2026-10-21, unreal-pipeline M1.2 and M1.3: the headless loop and sandbox setup ran against UE 5.8.3 on the Mac only. Unverified on Windows: `UnrealBuildTool.exe` called directly instead of `Build.bat` (A182); the verbatim argument quoting `-ExecCmds="..."`, `-Project="..."` (A183), including the quoted program path passed as `argv0` so `C:\Program Files\...` stays one argument; that `^Name$` anchors in `Automation RunTests` behave the same as on the Mac (A180); `taskkill /T /F` reaching UBT's compiler children and the editor; the 100 character sandbox path warning.
- 2026-10-21, content-engine M1.8: `verify-content --engine` ran only on the Mac with UE 5.8.3. Since round 2 it builds and tests through M1.3's `UnrealBuilder` and `AutomationTestRunner` (A211), so on Windows it inherits whatever M1.3 does there (the M1.2 and M1.3 Windows items above); it has not been run on the Windows desktop the plan names.
- 2026-10-21, unreal-pipeline: M1.2a sandbox template, headless build and test, and the MCP calls passed on the Mac (UE 5.8.3). Unverified on Windows. Also unverified on UE 5.4 to 5.7: that `L_Sandbox.umap`, saved by 5.8, opens there, and that the C++ APIs used by `FDojoTestWorld` (`UWorld::SetBegunPlay`, `UWorld::CreateWorld` with its 5.8 signature, `FWorldContext::SetCurrentWorld`) exist with the same signatures.

## Solved

- 2026-10-21, ui-core: Cmd/Ctrl+K palette highlighted rows under a resting pointer. Fixed in M2.1d (highlight on real pointer movement, with a resting-pointer e2e test).

- 2026-10-21, unreal-pipeline (found by content-engine M1.8): `FDojoTestWorld::Tick` advanced timers only on its first frame. Solved in M1.3 (`++GFrameCounter` before each `World->Tick`); `--engine` passed both timer examples through M1.3's runners on 2026-10-21.

- 2026-10-21, unreal-pipeline: "nothing has been verified against a real engine yet". Solved by M1.2a: the template builds and its test passes headless on the Mac with UE 5.8.3.

(Move entries here with the fix in one line.)
