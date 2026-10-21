# Iterations

One entry per task per builder, written when the task is sent for review, plus one entry per fix round. Plain English, no code. Screenshots or terminal captures of the proof. The Lead sends back any entry that is missing or that only lists files.

Template:

## <task id> <task title> (<system>, <builder session>)
- What changed, in two or three sentences a non-programmer could follow.
- How to see it: the exact steps, keys, or commands.
- Proof: test output summary, screenshot paths under `docs/iterations/`.
- What was not done or is left for a later task.

### Fix round 1
- What the reviewer asked for and what changed.

## M0.1 Scaffold the app (app-shell, builder-shell)
- The app now exists as a real desktop program. It opens one dark window titled Unreal Dojo with a placeholder title screen and the app version, using the stack chosen in D01 to D08. Most libraries later tasks need were installed, but four were missed (radix-ui, gray-matter, zod, fast-xml-parser) and were added in fix round 1. The window follows the security rules in the spec: the page cannot reach Node, scripts only load from the app itself, and outside links open in the normal browser.
- How to see it: run `npm install`, then `npm run dev` for a live window, or `npm run build` then `npm run test:e2e` to open it automatically and take a picture. `npm run package` makes an installer in `dist/` (on this Mac, `Unreal Dojo-0.1.0-arm64.dmg` for Apple silicon, about 129 MB, and `Unreal Dojo-0.1.0.dmg` for Intel, about 133 MB, both unsigned; see the README note on opening it).
- What went wrong and how it was solved: the first smoke test failed because this MacBook Air's screen is shorter than 900 points, so macOS shrinks the window to fit; the test now accepts the spec's size capped by the screen (A17). The version on screen first showed Electron's version instead of the app's, because the test started the app the wrong way; it now starts the project folder like the packaged app does (A18). React's live reload would have been blocked by the strict script rule in dev; it now loads as a file instead (A16). The installer was 153 MB until libraries that are already bundled into the page stopped being shipped twice (A12).
- Proof: typecheck passes for main, preload, and renderer. Unit tests: 1 file, 1 test passed. Build: main, preload, and renderer bundles written to `out/`. End-to-end: 1 passed (window opens, title and version shown, size and minimum size checked, page has no Node access). Package: dmg built, and the packaged app was launched once and showed version 0.1.0.
- Screenshot: `docs/iterations/m0-1-window.png`

![[m0-1-window.png|800]]
*The window on first launch: dark background, title, tagline, and version.*

- Decisions made: A07 to A19 in `docs/decisions.md` (version pins and the electron-vite exception, ESM with a CommonJS preload, sandbox on, packaging layout, CSP string, test choices).
- Not done or left for later: the full typed IPC contract and its coverage test (M0.2); design tokens and the real frame (M0.3); the real content verifier (M0.4, the placeholder prints "no content checks yet"); settings service, AppError, and first-run IPC (later app-shell tasks); no app icon yet (electron-builder uses the default). The Windows nsis installer is configured but unverified on Windows. `content/` and `resources/` did not exist on this branch, so the packaged app does not contain them yet; they are picked up automatically once merged.

### Fix round 1
- What the reviewer asked for: (1) the smoke test rewrote the committed screenshot on every run; (2) with the hidden macOS title bar nothing could be dragged to move the window and the window buttons sat over the page; (3) four packages were missing and this entry wrongly said everything was installed; (4) the preload left packages to be loaded at runtime, which a sandboxed preload cannot do; (5) the app-shell and packaging specs still said content and resources go inside the app archive, and A12 did not say whether the markdown packages are used by the main process.
- What changed: test screenshots now go to the ignored `test-results/` folder, and the proof picture in `docs/iterations/` only updates when `SAVE_PROOF=1` is set. A 36px strip across the top of the window now moves the window when dragged, the macOS window buttons sit centered inside it, and the app-shell spec tells ui-core to keep that strip in the real frame. radix-ui, gray-matter, zod, and fast-xml-parser were added with exact versions under the two-week rule, plus remark-parse, which the content parser in the main process needs. The preload now bundles everything it imports. Both specs now describe the real packaging layout and point to A13; A12 explains why the markdown packages stay with the main process. The packaging config also now matches the packaging spec's app id and architectures (dmg for Apple silicon and Intel, nsis for 64-bit Windows).
- Proof: typecheck passes; unit tests 1 of 1 passed; build passes; end-to-end 1 passed, now also checking the drag strip is 36px tall and marked draggable. After the end-to-end run the working tree showed no changed tracked files. The screenshot was refreshed once with `SAVE_PROOF=1`: `docs/iterations/m0-1-window.png` (it looks the same; the strip has the page's background color).
## M1.2a Sandbox template builds on the Mac (unreal-pipeline, builder-unreal)
- What changed: the app now has the small Unreal project it will copy for every learner, with one hand-written sample quest (a health component) and its test. It was copied to a temporary folder, built with Unreal 5.8.3 on the MacBook, and its test was run without opening a window. Both worked on the first build. The editor's built-in MCP server was also reached and ran the same test in about a tenth of a second.
- How to see it: copy `resources/sandbox-template/` to a folder outside the repo, set `EngineAssociation` to `5.8` in `Dojo.uproject`, then run the build and headless test commands listed under "Exact commands" in `docs/systems/unreal-pipeline.md`. The report lands in the folder given to `-ReportExportPath`.
- Proof (terminal capture summary, no screenshots: nothing visible changed):
  - Build on a fresh copy: 10 actions, `Result: Succeeded`, 22 s. One `.cpp` changed: 6.5 s.
  - Headless test: `Found 1 automation tests based on 'Dojo'`, `Result={Success} Path={Dojo.Sample.Health.TakesDamage}`, `TEST COMPLETE. EXIT CODE: 0`, 18 s for the whole run. Report: 1 succeeded, 0 failed, no warnings.
  - The first run passed with one warning (the test world was destroyed without ending play). Fixed in the helper; the rerun is clean.
  - Failure check: the health clamp was removed on purpose in the copy. The report showed `Fail` with "Expected 'Health clamps at zero' to be 0, but it was -430", process exit code 3. Then restored.
  - MCP: the editor answered `initialize` 9 s after launch; `tools/list` gave `list_toolsets`, `describe_toolset`, `call_tool`; `RunTests` returned `Success` in 55 ms. Live Coding answered "not available in this build configuration" on the Mac.
- Things found along the way: the windowed editor quits on this Mac because Xcode 27's Metal toolchain is not installed (`docs/problems.md`), so the MCP proof used `-NullRHI`. Another session's editor held port 8000, so the proof used port 8010 (A44). The spec's MCP argument names were wrong and are corrected (A44). Mac cannot hot-compile, so the Mac uses the headless loop for code changes (A45). Restoring a file with an older timestamp made UBT skip the rebuild; the spec now tells `QuestFileWriter` to always write fresh files.
- Decisions: A40 to A45 in `docs/decisions.md`.
- Not done: Windows run; SandboxProjectService and the runners themselves (rest of M1.2 and later tasks); the windowed editor on the Mac until the Metal toolchain is installed; checking the 5.8 map on older engines.
