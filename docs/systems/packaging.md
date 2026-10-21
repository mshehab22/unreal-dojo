# System: packaging

Owner: builder-shell (shared with app-shell). Research: `research/tooling-and-stack.md` section 8.

## v1

- electron-builder: `nsis` x64 on Windows, `dmg` on macOS (arm64 and x64). Unsigned: set `CSC_IDENTITY_AUTO_DISCOVERY=false` in CI. README explains the Gatekeeper right-click-open step and the SmartScreen "more info, run anyway" step.
- `files`: `out/**`, `content/**`, `resources/**`, `package.json`. Research and docs are not shipped.
- App id `dev.mshehab.unrealdojo`, product name `Unreal Dojo`.

## Later (waits for Mohammad: money)

- macOS: Apple Developer ID, hardened runtime, notarization.
- Windows: Azure Trusted Signing or an EV certificate.
- Auto-update through electron-updater with the GitHub provider (macOS requires a signed app).

## Done criteria

- Installers built by CI on tag, downloaded and run on both of Mohammad's machines, first-run flow works from a clean install.
