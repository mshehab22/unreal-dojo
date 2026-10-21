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

## M0.4 Content types, parser, verifier (content-engine, builder-content-engine)
- What changed: the app can now read lesson files. A quest is a Markdown file with a short settings block at the top and fixed headed sections below it; each of the six quest kinds has its own section order. The new reader turns those files, the glossary, and the pattern cards into typed data, and when something is wrong it says which file, which section, and which line, in plain words, and keeps going so one run shows every problem. Two quests with the same id, or two glossary entries with the same id, are caught. Eight example lesson files, one per kind (a build quest at each of the four help levels), show authors exactly what to write.
- How to see it: run `npx tsx tools/verify-content.ts`. It lists every file as `ok` or `FAIL` with the problems under it, then a summary. Add `--pack <id>` or `--quest <id>` to narrow it. To see an error, rename `# Card` to `# Cards` in `content/examples/01-concept-uproperty.md` and run it again (then undo).
- Proof: `npm run typecheck` passes; `npm test` 4 files, 41 tests passed (one happy path per kind including all four scaffold levels, 13 malformed cases, duplicate quest, glossary, and pattern ids, empty and missing folders, verifier filters and the check extension point, and a 300-quest timing test); `npm run build` passes; the verifier on the repo prints 8 `ok` lines and exits 0; on an empty folder it exits 0. With author-foundations' real `glossary.json` (191 entries) and `patterns.json` (22 cards) copied in, everything parses with no changes to their files.
- Timing: a generated pack of 300 quests (12 worlds, all kinds) plus the real glossary and patterns and the examples, 323 files: parsing takes about 112 ms, the whole `npx tsx tools/verify-content.ts` command 0.31 seconds on the MacBook Air, against a 3 second budget.
- Terminal capture:

```
ok    examples/01-concept-uproperty.md
...
ok    examples/08-boss-lighthouse.md

Parsed 8 files (0 packs, 0 worlds, 0 quests, 8 examples, 0 glossary entries, 0 pattern cards) in 16 ms: no problems.
```

- Decisions made: A100 to A109 (YAML blocks in sections, examples folder, `@explain` markers, examples not compiled, the `yaml` package, question shapes from author-foundations, parser versus verifier rules, folder naming, verifier edge cases, hand-written readers).
- Not done or left for later: the content rules beyond parsing (fade ladder, reachability, terms and patterns existing, rubric sizes, coverage) and `--engine` are M1.8; they plug into `PARSE_ONLY_CHECKS` in `tools/verifier/runVerifier.ts`. Term linking and the glossary service are M1.8. No IPC method exposes content yet; builder-shell wires `ContentLoader` into the contract. The examples' C++ has not been compiled (A103). Windows path handling is written for both platforms (forward slashes in every reported path) but unverified on Windows.

