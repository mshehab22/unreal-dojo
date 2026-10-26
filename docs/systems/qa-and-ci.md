# System: qa-and-ci

Owner: tester. Folders: `e2e/`, `.github/workflows/`, `docs/iterations/` (screenshots). Research: `research/tooling-and-stack.md` sections 7 and 8.

## Responsibilities

- GitHub Actions matrix (windows-latest, macos-latest): install, typecheck, unit tests, parse-only verifier, build, Playwright smoke with screenshots uploaded as artifacts, package installers on tags.
- Playwright `_electron` flows: first run (dialogs stubbed), the vertical-slice learner flow, every screen screenshot at two sizes, keyboard shortcuts.
- Engine runs: the verifier with `--engine` and the pipeline integration tests run on the Windows desktop (self-hosted or manual) and results pasted into `docs/iterations.md`; CI runners have no engine.
- Content spot checks after each world merge: a fresh reviewer agent samples 8 quests for copied wording, solution leaks in starters or hints, UE API accuracy, fade ladder, and glossary coverage.
- Performance checks: content load time with 300 quests, editor responsiveness during a build, memory after an hour of use.

## Done criteria

- Green matrix on main after every merge.
- Every UI task has screenshots in `docs/iterations/`.
- A failing verifier or e2e run blocks merge; the Lead sends it back.

## CI (keep current)

Last updated by M0.6.

### Workflows
- `.github/workflows/ci.yml`: runs on push to `main`, on every pull request, by hand (`workflow_dispatch`), and when called by `release.yml`. One job, `test`, on a matrix of `windows-latest` and `macos-latest` (`fail-fast: false`, so one platform failing still shows the other's result). Steps, in order: check out, Node 24.22.1 with the npm cache, restore the Electron download cache (`electron_config_cache` points `install.js` at `.cache/electron`), `npm ci`, `node node_modules/electron/install.js` (fetches Electron's binary, which npm 11 does not do at install time, A19), `npm run typecheck`, `npm test`, `npx tsx tools/verify-content.ts`, `npm run build`, `npm run test:e2e`. Screenshots (`test-results/**/*.png`, where the e2e tests save them) and the HTML Playwright report (`playwright-report/`) upload as artifacts on every run that was not cancelled, failures included. CI never sets `SAVE_PROOF`, so it does not touch `docs/iterations/`; proof pictures for an iterations entry are still made locally with `SAVE_PROOF=1 npm run test:e2e`.
- `.github/workflows/release.yml`: runs on tags `v*`. Calls `ci.yml` first; only if every check passes on both platforms does the `package` job build installers: `npx electron-builder --publish never` on each runner, which builds the targets in the `package.json` `build` config (nsis x64 on Windows, dmg arm64 and x64 on macOS), unsigned (`CSC_IDENTITY_AUTO_DISCOVERY=false`). The `.exe` and `.dmg` files upload as `installers-<os>` artifacts. Nothing is published to GitHub Releases yet.
- Every step uses `shell: bash` (Git Bash on Windows) so one command line works on both runners. Permissions are `contents: read` only; checkout does not keep the token.
- Every action is pinned to a full commit SHA with the version in a comment (A110). To bump one: pick a release at least 14 days old, resolve its tag to a commit with `git ls-remote`, replace the SHA and the comment in both files.
- `playwright.config.ts` adds the HTML reporter only when `CI` is set, so local runs stay terminal-only.
- Screenshots on failure: Playwright's `screenshot: "only-on-failure"` option does not cover `_electron` windows, so the e2e harness's `dojo` fixture saves `failure.png` for every failing test (see "E2E harness" below). A failing run still uploads a picture of the window as it was.
- Display: both hosted runners have a logged-in desktop session, so Electron opens a real window; no virtual display or `xvfb-run` is needed. Playwright's `_electron` drives the Electron binary itself, so `npx playwright install` (browser downloads) is not run.

## E2E harness (`e2e/support/`)

Last updated by the QA harness task, fix round 2 (A280 to A286, A118). Every spec imports `test` and `expect` from `e2e/support/dojoTest.ts`, never from `@playwright/test` directly, and none launches the app on its own, so no e2e run touches the learner's real userData: `harness.spec.ts`, `smoke.spec.ts`, `ui-core-tokens.spec.ts`, `ui-core-screens.spec.ts`.

- `dojoTest.ts`: Playwright fixtures. `dojo` launches the app before each test and closes it after; if the test failed it first saves `failure.png` in the test's `test-results/` folder. `camera` is a `ProofCamera` for the test.
- Hidden windows (A970): `launchDojo()` sets `DOJO_TEST_HIDDEN_WINDOW=1` for every launch, so e2e runs never show a window, take focus, or put an icon in the macOS Dock; the person at the computer can keep working. The window still paints and runs unthrottled, so screenshots match a shown window (checked byte for byte on the M5 Air). To watch a run, set `DOJO_TEST_SHOW_WINDOW=1`, for example `DOJO_TEST_SHOW_WINDOW=1 npx playwright test e2e/smoke.spec.ts`. Packaged builds ignore both variables.
- `launchDojo.ts`: `launchDojo()` starts the built app (run `npm run build` first) from the project folder, so Electron reads `package.json` as the packaged app does, with `--user-data-dir=<fresh temp folder>`. `app.getPath("userData")` then points at that folder, so no test sees another test's settings or the learner's real ones (A280). `closeDojo()` closes the app and deletes the folder. If the launch itself fails, the folder is deleted before the error is passed on. Each test pays one launch, about 0.4 s on the M5 Air.
- `dialogStubs.ts`: `stubOpenDialog(electronApp, path | null)` makes `dialog.showOpenDialog` and `showOpenDialogSync` answer with that path, or as cancelled for null; `stubMessageBox(electronApp, buttonIndex)` does the same for message boxes. They replace the methods on Electron's `dialog` object inside the main process, which is the object the app's own `import { dialog } from "electron"` uses (A283). Call them after launch and before the click that opens the dialog.
- `ProofCamera.ts`: `camera.capture(page, fileName, { proofFileName?, proofFormat? })` saves a screenshot under `test-results/`; when the test passes and `SAVE_PROOF=1` is set, every captured file is copied into `docs/iterations/` (as `proofFileName`, default the same name). `proofFormat: "jpeg"` makes the proof a JPG at one pixel per CSS pixel (taken at capture time, copied on pass), as ui-core's `m2-1-*.jpg` proofs need. A failing test never overwrites a proof picture (A282).
- `windowSize.ts`: `expectedWindowSize(workArea)` is 1440x900 shrunk to the work area but never below the 1100x700 minimum (A117); `measureWindowSizes(electronApp)` reads the window's bounds, minimum size, and the screen's work area. When the work area sets the height (between 700 and 900), `heightIsLimitedByScreen` is true and the smoke test checks that the height is within `SCREEN_HEIGHT_SLACK` (12 points) of min(900, work area height) and at least 700, because the Dock can resize the work area after macOS sized the window (A118); a 1440x800 window still fails. A full 900 is still exact; width is always exact.
- Pointer: a fresh window opens under wherever the OS pointer rests. ui-core fixed the Codex palette so a resting pointer no longer steals the highlight (M2.1d), and `ui-core-screens.spec.ts` has a test for it, so no spec needs to park the mouse.
- `e2e/harness.spec.ts` checks the harness itself: the userData folder is the temp one, a second launch inside one test gets a different empty one and the first is gone (so it does not depend on test order), both dialog stubs answer, and the size rule's floor (1024x768 gives 1100x768).

## Learner flow against the real engine (`e2e/learner-flow.spec.ts`, opt-in)

M2.4 (A640 to A645). Skipped unless `DOJO_E2E_ENGINE=1`, so `npm run test:e2e` and CI never run it. Run it after `npm run build`:

    DOJO_E2E_ENGINE=1 npx playwright test e2e/learner-flow.spec.ts

Options: `DOJO_E2E_ENGINE_PATH` (engine root, default `~/Applications/UE_5.8`), `DOJO_E2E_ENGINE_LOCK` (a lock folder taken with mkdir only around the sandbox build, each Run, and each Submit), `SAVE_PROOF=1` (a passing run writes `docs/iterations/m2-4-*.jpg`). One test, up to two hours, on the real bridge (no fake): a fresh learner names the studio, picks the engine, gets a temp sandbox folder from the stubbed folder picker, runs the first full build, skips the editor step, sets Review to Tests only, passes concept quests 1 to 4 (a prediction, a hover term), does a drill, fails the training dummy build, buys a hint, types both fixes in Monaco, passes it, passes the rest of World 1 up to the breakdown (builds from their reference solutions, A642), submits and revises the breakdown, sees the boss unlock, then restarts the app on the same userData and checks the name, the passed stages, the review setting, and the paid hint. Answers come from `tools/qa/printAnswerKey.ts` (A641). It never opens the windowed editor (A643). A failed run keeps its sandbox folder and prints its path. Its two known failures (a self-checked explain item reported as due for review, and self-explanations lost on restart) were fixed in M1.6g and are plain expectations now; the `expectKnownFailure` helper that wrapped them was removed with them, and can come back for the next known bug.

## Engine smoke (`tools/qa/engine-smoke.ts`)

`npx tsx tools/qa/engine-smoke.ts [--engine <engine root>] [--keep]` makes a temp folder, creates and builds a sandbox in it with M1.3's `SandboxProjectService.create` (template copy, `EngineAssociation`, plugin list, full `DojoEditor` build through `UnrealBuilder`), runs `Dojo.Sample.Health.TakesDamage` with `AutomationTestRunner`, and prints a timing table plus the test result. It spawns nothing itself: every Unreal process goes through `src/main/services/unreal/` (A63), so the Windows command line, timeouts, and process-tree kill are the app's own. `createUnrealServices` does not hand out the test runner, so the script wires the same classes the same way, with a path store that remembers nothing. The engine comes from `EngineLocator` (newest supported) unless `--engine` is given. It passes only when the build succeeds, the runner reports no pipeline problem, and the sample test is in the report as passed (A285). Build progress lines go to `build.log` and editor output to `test.log` in the temp folder, which is deleted on a pass and kept on a failure, with `--keep`, or when the script stops with an error (it prints the path).

Run it under the shared engine lock when other sessions use Unreal on the same machine (only one engine run at a time): take it with `mkdir <lock folder>` in a retry loop and remove it with `rmdir` when the run ends, also on failure. CI runners have no engine, so this runs by hand on each machine; results go into `docs/iterations.md`. Unverified on Windows.

### Linting the workflows
Run from the repository root; each file separately (the tool takes one path):

    npx --yes @action-validator/cli@0.6.0 .github/workflows/ci.yml
    npx --yes @action-validator/cli@0.6.0 .github/workflows/release.yml

This checks the files against the GitHub workflow schema. M0.6 also ran the actionlint 2.0.6 wasm build (expression and context checks) from a scratch folder; neither tool is a project dependency (A114).

### Still needs the real runners
- No GitHub remote exists yet (A05), so neither workflow has run on GitHub. Every step was replayed on the Mac (arm64) in a clean clone; see the M0.6 entry in `docs/iterations.md`.
- Unverified on Windows: every Windows step, in particular `install.js` under Git Bash, the e2e smoke test, and the nsis build. Hosted Windows runners have a 1024x768 screen, smaller than the window's 1100x700 minimum. Two guards, both owned here (`e2e/` belongs to qa-and-ci): the smoke test expects 1440x900 shrunk to the work area but never below 1100x700, and `ci.yml` runs `Set-DisplayResolution -Width 1920 -Height 1080 -Force` in pwsh before e2e on Windows only. That step is unverified on the windows-2025 image until the first real run; it is `continue-on-error`, and its log prints the resulting resolution (A117).
- Unverified on hosted macOS: the runner's screen size. Both dmg files (arm64 and x64) were built on the Mac but neither was opened or installed in M0.6; the x64 one has never been run on an Intel Mac.
- Cache hits (npm, Electron), artifact upload, and the `workflow_call` from `release.yml` can only be seen on GitHub.
