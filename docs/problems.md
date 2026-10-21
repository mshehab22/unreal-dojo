# Problems

Open problems and blockers. The Lead adds an entry when something cannot be resolved by the owning builder in one round, and removes it when solved (with a line in `decisions.md` if a decision was involved).

Format: date, system, problem, what was tried, current workaround, who owns it.

## Open


- 2026-10-21, unreal-pipeline: nothing has been verified against a real engine yet. UE 5.8.3 is now found on the Mac at `~/Applications/UE_5.8` (A03); task M1.2a proves the template build there first.
- 2026-10-21, qa: no GitHub remote and no `gh` CLI on the Mac, so M0.6 cannot show a green Actions run. Workaround: the workflow is written and each step run locally (A05). Owner: Lead, after Mohammad runs `gh auth login`.
- 2026-10-21, unreal-pipeline: a UE 5.8.3 on macOS forum report says Game-target builds can fail because UBA launches xcodebuild with a closed stdin. Spawn UBT with stdin set to ignore.
- 2026-10-21, unreal-pipeline: the editor with a window (no `-NullRHI`) quits at startup on this Mac with "cannot execute tool 'metal' due to missing Metal Toolchain; use: xcodebuild -downloadComponent MetalToolchain". Xcode 27 ships the Metal toolchain as a separate download. Tried: nothing further; installing it is a download Mohammad should approve. Workaround: everything headless and the MCP proof ran with `-NullRHI`. Fix: Mohammad runs `xcodebuild -downloadComponent MetalToolchain` once. The app's toolchain check (`PlatformPaths.toolchainCheck`) should detect this and show the command. Owner: builder-unreal (check), Mohammad (install).
- 2026-10-21, unreal-pipeline: on the Mac the editor (`-NullRHI`) logged "Engine exit requested" after SIGTERM but did not exit within 60 seconds and needed SIGKILL. This was right after UBT replaced the module library it had loaded. Workaround: `EditorLauncher` kills hard after a grace period. Owner: builder-unreal.
- 2026-10-21, unreal-pipeline: the UBA closed-stdin note above: the editor target builds fine with stdin from `/dev/null` (M1.2a). The Game target was not built, so the original report is neither confirmed nor ruled out.

## Unverified on a platform

(The Lead lists here anything that passed on one machine and could not be run on the other.)

- 2026-10-21, app-shell M0.1: the Windows nsis installer and the e2e smoke test have only run on the Mac. Covered by the CI matrix (M0.6) once the GitHub repo exists, or by a manual run on the Windows desktop.
- 2026-10-21, app-shell M0.1: the Intel (x64) dmg is configured but was not launched on an Intel Mac.
- 2026-10-21, unreal-pipeline: M1.2a sandbox template, headless build and test, and the MCP calls passed on the Mac (UE 5.8.3). Unverified on Windows. Also unverified: that `DojoSandbox.umap`, saved by 5.8, opens on 5.4 to 5.7.

## Solved

(Move entries here with the fix in one line.)
