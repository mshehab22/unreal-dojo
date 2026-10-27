# System: packaging

Owner: builder-shell (shared with app-shell). Research: `research/tooling-and-stack.md` section 8.

## v1

- electron-builder: `nsis` x64 on Windows, `dmg` on macOS (arm64 and x64). Unsigned: set `CSC_IDENTITY_AUTO_DISCOVERY=false` in CI. The READMEs explain the Gatekeeper and SmartScreen steps (see "READMEs" below).
- `files`: `out/**`, `package.json`. `content/` and `resources/` are copied beside the app as `extraResources` (outside the asar, read through `process.resourcesPath`) so the sandbox template exists as real files; see A13 in `docs/decisions.md`. Research and docs are not shipped.
- App id `dev.mshehab.unrealdojo`, product name `Unreal Dojo`.

## Current state (M5.2)

- `npm run package` is `electron-vite build && electron-builder --publish never`. On Windows it makes `dist/Unreal Dojo Setup 0.1.0.exe` (121 MB, x64, not one-click, per-user by default with an install-mode page that also offers all users, install folder changeable) plus a `.blockmap`, and the unpacked build in `dist/win-unpacked`. Its `resources` folder holds all three packs (`content`), the sandbox template (`resources`), the 74 reference solutions (`solutions`), and the font licenses (`licenses/fonts`). Checked on Windows on 2026-10-26.
- Which installers CI builds: the `package` job in `.github/workflows/ci.yml` runs the same command after `test` passes on every push to `main` and on manual runs, on `windows-latest` (nsis) and `macos-latest` (dmg arm64 and x64, from the `build.mac.target` list). It uploads `dist/*.exe` and `dist/*.dmg` as `installers-<os>` workflow artifacts kept 7 days, never as a GitHub Release (A1180, A1181). Tags still build through `release.yml`. Details in `docs/systems/qa-and-ci.md`.
- A resources check in the job fails it if an unpacked build lacks `content`, `resources`, `solutions`, or `licenses/fonts` (A1182).
- No app icon is set (`build/` does not exist), so electron-builder logs "default Electron icon is used" and the installer, taskbar, and Dock show Electron's. Designing an icon is a separate task (A1184).
- Unsigned: `CSC_IDENTITY_AUTO_DISCOVERY=false` in the job and no certificate configured. The READMEs tell the user how to get past SmartScreen and Gatekeeper.
- Not yet verified: installing and launching either installer (Mohammad tests on both machines, A77), the macOS build on a hosted runner, the exact dmg file names, and whether the Sequoia-and-later Open Anyway route and the `xattr` command behave as the macOS guide says on an unsigned arm64 build.

## READMEs (M5.2, A1183)

- `README.md` (top level): what the app is, how to get a build from an Actions run (the repository is private, A78) with a placeholder line for a future public release, requirements, where saves live, AI review setup, build from source, and a map of the repository.
- `docs/install/windows.md` and `docs/install/macos.md`: one guide per platform with prerequisites, getting and opening the installer past SmartScreen or Gatekeeper, first run, save paths, and AI review. They are the only place the platform steps are written; the top level links to them.
- The facts they state come from `docs/systems/app-shell.md` (settings, `safeStorage`, `config.json`), `ai-review.md` (providers, A70), `progress-and-rules.md` (`progress.json` and its backup), and the toolchain checkers (Visual Studio 17.14 with the C++ game workload, full Xcode, the Metal toolchain). Change the READMEs in the same commit as any change to those facts.

## Later (waits for Mohammad: money)

- macOS: Apple Developer ID, hardened runtime, notarization.
- Windows: Azure Trusted Signing or an EV certificate.
- Auto-update through electron-updater with the GitHub provider (macOS requires a signed app).

## Done criteria

- Installers built by CI on every push to `main` (as artifacts) and on tag, downloaded and run on both of Mohammad's machines, first-run flow works from a clean install.
