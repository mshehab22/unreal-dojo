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
- Screenshots on failure: Playwright's `screenshot: "only-on-failure"` option does not cover `_electron` windows, so each e2e test takes its own screenshot in a `finally` block (`testInfo.outputPath("window.png")`). A failing run still uploads a picture of the window as it was. `SAVE_PROOF=1` copies it into `docs/iterations/` only when the test passed.
- Display: both hosted runners have a logged-in desktop session, so Electron opens a real window; no virtual display or `xvfb-run` is needed. Playwright's `_electron` drives the Electron binary itself, so `npx playwright install` (browser downloads) is not run.

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
