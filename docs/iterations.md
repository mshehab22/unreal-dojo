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

## M0.2 Typed IPC contract (app-shell, builder-shell)
- What changed: the window and the main process now share one written-down list of everything the window can ask for: settings, finding the engine and setting up the sandbox, running and submitting quests with live progress and a cancel button, progress and rules, drills, the daily quest, and the AI reviewer. Each request is checked at the door, so a malformed request gets a friendly error instead of crashing the app, and any failure comes back as the same kind of error (what went wrong, in plain English, and what to do next). Only the app version actually answers today; every other request politely says "not built yet" and names the task that will build it.
- What was tried and what was solved: throwing an error straight out of the main process loses everything but its message, so the main process wraps every answer in an ok-or-error envelope and the bridge in the window unwraps it. A quick check in the built app confirmed the error arrives in the page whole (code, message, suggested action, details), that a request with a dangerous file name such as `../x.cpp` is refused, and that the progress subscription receives events and stops after unsubscribing.
- How to see it: `npm test` runs 27 checks on the boundary; `npm run build` then `npm run test:e2e` opens the app as before. Nothing visible changed on screen, so there is no new screenshot (the M0.1 title screen still shows the version).
- Proof: typecheck passes for main, preload, and renderer (including a compile-time check that each request has exactly one payload check per argument). Unit tests: 1 file, 27 tests passed. Build: main, preload, and renderer bundles written. End-to-end: 1 passed. All rerun after rebasing onto main with M0.1 merged.
- Change after the Lead's note: the door checks were first written by hand; the Lead added the zod library in the M0.1 fix round and asked for it, so every check is now a zod schema tied to the shared type it checks, which means a check that disagrees with its type no longer compiles (A83).
- Decisions made: A80 to A89 in `docs/decisions.md` (how errors travel, run ids, payload checks, progress event fields, file layout, the two-step breakdown submit, settings flags, the reference-solution question, and what waits for M0.2b).
- Not done or left for later: content methods (packs, worlds, quests, glossary, the term list for the code editor, pattern cards) and starting a drill wait for the content types from M0.4 (M0.2b, A89). Viewing a reference solution is left out until the specs agree on where solutions live (A88). Every real answer arrives with its system's task.

## M1.1 Engine locator and platform paths (unreal-pipeline, builder-unreal)
- What changed: the app can now find Unreal Engine on its own. It reads the Epic launcher's list of installed engines (on Windows and on the Mac), the Windows registry, and the usual install folders, reads each engine's exact version, and lists every engine from 5.4 up, newest first. A learner can also point at a folder by hand; a wrong folder or a too-old engine gets a plain explanation. It also checks the compiler setup: Visual Studio with the C++ game workload on Windows; on the Mac, that full Xcode is selected, answers, and has its license accepted, and whether the Metal toolchain is installed. Every missing piece comes back as a plain-English message with the exact fix. All the Windows and Mac path differences now live in two small objects chosen by one factory.
- What was tried and what was solved: the launcher's list on this Mac holds three entries for the same folder (the engine plus the Quixel Bridge and Fab plugins), so only entries named like `UE_5.8` count as engines. The engine is in `~/Applications`, not the launcher's documented default `/Users/Shared/Epic Games`, so both are scanned (A163). The missing Metal toolchain (found in M1.2a) is reported but does not count as "build blocked", because builds and headless tests work without it; the summary still names the Xcode version (A161). On the first real run the summary only mentioned Metal, so it was changed to "Xcode 27.1 is selected ... The Metal toolchain is not installed ...".
- How to see it: `npx tsx tools/locate-engine.ts --pick ~/Applications/UE_5.8/Engine` prints what the app finds on this machine. In the app, the `detectEngines` and `checkToolchain` requests now answer for real. Nothing visible changed on screen (the first-run screen is a later task), so there is no screenshot.
- Proof, the real run on this Mac (MacBook Air M5, UE 5.8.3, Xcode 27.1), trimmed:

```
engines:   /Users/mshehab22/Applications/UE_5.8   version 5.8.3   source launcher   supportsFastLoop true
toolchain: ok true, tool xcode-select, toolVersion 27.1
           "Xcode 27.1 is selected (/Applications/Xcode.app/Contents/Developer). The Metal toolchain is not installed.
            Builds and tests work, but the Unreal editor window will not open."
           problem: toolchain-missing, blocksBuild false, fix "Run once in Terminal: xcodebuild -downloadComponent MetalToolchain"
manual pick of ~/Applications/UE_5.8/Engine: /Users/mshehab22/Applications/UE_5.8, 5.8.3, source manual
exit code 0
```

- Checks: `npm run typecheck` passes; `npm test` 5 files, 70 tests passed (43 new: both path objects, the platform factory, every locator source on both platforms, duplicates, ordering, old and broken engines, manual pick, the registry reader, every Windows and Mac toolchain failure and the healthy cases); `npm run build` passes; `npm run test:e2e` 1 passed.
- Decisions made: A160 to A167 in `docs/decisions.md`.
- Not done or left for later: the Windows side is unit tested with fakes only and is unverified on a real Windows machine (registry output, vswhere output, the Program Files and ProgramData folders). `pickEngineFolder` still needs the folder dialog (A167). `getEnvironmentStatus` waits for the settings service. No Xcode minimum-version check yet (A165).
