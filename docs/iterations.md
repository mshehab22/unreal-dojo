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

### Fix round 1
- What the reviewer asked for: (1) the unreal-pipeline spec still described the old progress event, without the run id; (2) four learner features had no place in the contract: the syntax-check button on a concept quest's example, testing out of a world, the Parsons fallback after two failed submits, and the "why does this line exist" answers on worked quests; (3) the follow-up questions about a review found it by attempt, but attempts did not keep their review; (4) an error carrying an odd extra property could break on its way to the window; (5) the bridge in the window had no test of its own.
- What changed: the pipeline spec now points to the shared progress event and lists its fields. The syntax check and test-out eligibility are now requests of their own; taking a test-out and the Parsons fallback both become kinds of drill once quest content exists (M0.2b); the fallback offer and the self-explanation gate live in the window, and the self-explanations are saved with the quest's draft (A89). Each recorded attempt can now keep its review. Errors are rebuilt from their four fields before they are sent, so nothing else can ride along. A new test runs the bridge against a fake Electron and checks it exposes only the contract, unwraps answers and errors, and that stopping a progress subscription works and is safe to do twice.
- Proof: typecheck passes; unit tests: 2 files, 35 tests passed; build passes; end-to-end: 1 passed.

## M0.3 Design tokens, app frame, navigation (ui-core, builder-ui-core)
- The app now has its look and its frame. A dark "ink and paper" theme with one accent color per pack (amber Foundations, violet Patterns, cyan Mechanics, green Systems) replaces the placeholder, with three bundled fonts: a characterful display face for headings, a calm reading face, and a code face. A rail on the left moves between the six screens (Title, Studio, World Map, Character, Codex, Settings); each unbuilt screen shows its name, what it is for, and what a later task will put there. Cmd+K (Ctrl+K on Windows) opens a Codex search panel from anywhere and Esc closes it. A hidden page lists every token and base component for anyone building a screen.
- How to see it: `npm run dev`, then click through the rail, press Cmd+K and Esc. For the token gallery, open the dev tools console and run `location.hash = "#/dev/tokens"`. To regenerate the pictures: `npm run build`, then `SAVE_PROOF=1 npm run test:e2e`.
- What went wrong and how it was solved: the OS will not open a 1440x900 window on this MacBook Air, so the test renders the page at exact sizes instead of resizing the window (A90). The first pictures caught the rail highlight and the search panel halfway through their fade; the test now runs with reduced motion, which zeroes every animation token. The Foundations name overflowed its gallery card at 1100 wide and the World Map region names sat at different heights; both fixed. After the Lead asked for no package changes, the fonts became committed files instead of npm packages, and the branch was rebased onto main to use M0.1's radix-ui and its window drag strip, which now floats across the top of the frame.
- Proof (after rebasing onto main and `npm ci`): typecheck passes (node and web). Unit tests: 3 files, 8 tests passed (new: hash routes, and a check that the gallery's token list and `tokens.css` agree). Build passes. End-to-end: 4 passed (the M0.1 smoke test, including its drag strip check, plus three new ones: every screen at both sizes with no sideways scroll, gallery shows all four accents with live values, rail navigation plus Cmd/Ctrl+K and Esc).
- Screenshots (all in `docs/iterations/`): `m0-3-title-1100x700.png`, `m0-3-title-1440x900.png`, `m0-3-studio-*.png`, `m0-3-world-map-*.png`, `m0-3-character-*.png`, `m0-3-codex-*.png`, `m0-3-settings-*.png`, `m0-3-dev-tokens-1100x700.png`, `m0-3-dev-tokens-1440x900.png`, `m0-3-dev-tokens-full-1440.png` (whole gallery), `m0-3-codex-search-1100x700.png`.

![[m0-3-title-1100x700.png|800]]
*Title screen at the minimum size: wordmark, Continue, environment chips (not checked yet), the four pack accents.*

![[m0-3-world-map-1440x900.png|800]]
*A placeholder screen: name, purpose, the four pack regions in their accents, and what the World Map task will add.*

![[m0-3-codex-search-1100x700.png|800]]
*Cmd/Ctrl+K opens Codex search over any screen; Esc closes it.*

![[m0-3-dev-tokens-full-1440.png|400]]
*The token gallery at `#/dev/tokens`: accents, surfaces, outcomes, type, spacing, radii, shadows, motion, components.*

- Decisions made: A90 to A97 in `docs/decisions.md` (screenshot method, tokens as Tailwind theme variables, fonts, colors, hash router, hand-written shadcn components on radix-ui 1.7.0, Title inside the frame, placeholder content).
- Not done or left for later: the shared components in the spec (`TermText`, `HoverCard`, `XpBar`, `RoleBadge`, `PatternCard`, `SkillTree`, `StreakFlame`, `SpreeMeter`, `QuestCard`, `Chest`, `AppError`, `KeyboardHints`) and the studio character portraits come with the screens that use them. The search panel does not search yet (Codex task). The renderer bundle is about 900 KB unminified; fine for a desktop app, worth a look if startup feels slow. Windows look (Ctrl label, default title bar over the drag strip) is unverified on Windows.

### Fix round 1
- What the reviewer asked for: (1) the three font licenses were not in the packaged app; (2) the faint text color was only 4.16:1 on the dialog background, below the 4.5:1 floor; (3) the hover and dialog transitions needed a ruling against "motion only on reward moments".
- What changed: the packaged app now carries the font licenses in `licenses/fonts/` (one `extraResources` entry in the package build settings, no dependency change); `npx electron-builder --mac dir --arm64` shows all three in `Unreal Dojo.app/Contents/Resources/licenses/fonts/`. Faint text is lighter (`#8a8e9c`), now at least 4.8:1 on every surface (ink 6.02, surface 5.69, raised 5.27, overlay 4.81); the token file, the gallery note, and A93 state the real ratios (muted is at least 6.9:1 everywhere, not 7:1). The Lead ruled that feedback motion of 150 ms or less is fine (A98), so the dialog entrance now runs at the 140 ms feedback speed instead of 220 ms, and the longer duration tokens are labeled as reserved for reward moments; the spec's visual direction line says the same.
- Proof: typecheck passes; unit tests 3 files, 8 passed; build passes; end-to-end 4 passed. Proof screenshots regenerated with `SAVE_PROOF=1` because the lighter faint text shows on every screen (same `docs/iterations/m0-3-*.png` paths).

## M0.6 GitHub Actions matrix (qa-and-ci, tester)
- What changed: the project now has two automatic checklists for GitHub. The first runs on every pull request and every change to `main`, on a Windows machine and a Mac at the same time: it installs everything, checks the types, runs the unit tests and the content checker, builds the app, opens it and takes a screenshot, and keeps the screenshots and the test report for 30 days. The second runs only when a version tag like `v0.1.0` is pushed: it runs the whole first checklist again and, only if that passes, builds the Windows installer and both Mac installers (Apple Silicon and Intel), unsigned.
- How to see it: read `.github/workflows/ci.yml` and `.github/workflows/release.yml`. To check the files: `npx --yes @action-validator/cli@0.6.0 .github/workflows/ci.yml` (and the same for `release.yml`). Once the private GitHub repository exists, the Actions tab shows the runs.
- What went wrong and how it was solved: npm 11 leaves Electron without its program after install (A19), so the first test would have downloaded 130 MB inside its 30 second launch limit; CI now fetches it in its own step and caches it (A112). The research sketch installed Playwright's browsers, which an Electron test never uses; that 500 MB step is dropped (A113). The first local run showed the packaging tool ignores the Electron cache setting, so the release job no longer pretends to cache it. After M0.1 merged, the screenshot upload moved to `test-results/` and the release job dropped its architecture flags, because the config now names them.
- Proof: after rebasing onto `main` (M0.1 merged), a fresh clone of this branch at `b0768dc` on the Mac (Node 24.22.1, npm 11.19.1) with an empty Electron cache and `CI=true`, every workflow step run in order: `npm ci` passed (3 s); Electron fetch passed (10 s, 130 MB arm64 build downloaded into `.cache/electron`); typecheck passed for main, preload, and renderer; unit tests 1 file, 1 test passed; content verifier printed "no content checks yet" and exited 0; build wrote main, preload, and renderer bundles; end-to-end 1 passed (1.8 s) and wrote `test-results/smoke-the-app-opens-its-main-window/window.png` (the file the screenshot upload picks up) and `playwright-report/index.html`, with no tracked file changed; packaging with plain `npx electron-builder --publish never` and signing off passed (25 s), building both architectures from the config: `Unreal Dojo-0.1.0-arm64.dmg` (136 MB) and `Unreal Dojo-0.1.0.dmg` (x64, 139 MB). Both linters passed both files and both failed a copy broken on purpose (a misspelled `runs-on` and an unknown matrix value).
- Decisions made: A110 to A116 in `docs/decisions.md` (action pins, release reruns CI, Electron fetch step, no Playwright browsers, linters, dmg architectures, triggers and Node version).
- Not done or left for later: no run on GitHub yet, because no repository exists (A05). Every Windows step is unverified, and the Windows runner's small screen may trip the smoke test's window-size check; see "Still needs the real runners" in `docs/systems/qa-and-ci.md`. The built dmg files were not opened in this task.

### Fix round 1
- What the reviewer asked for: (1) on the hosted Windows runner, whose screen is 1024x768, the smoke test would fail because the window cannot shrink below its 1100x700 minimum; (2) a failing e2e run uploaded no screenshot, because the only picture was taken after every check had passed; (3) docs must land in the same commit as the change they describe.
- What changed: the smoke test now expects 1440x900 shrunk to fit the screen but never below 1100x700, so it is right on any screen size. On Windows, CI also raises the screen to 1920x1080 before the end-to-end tests; that step has not run on a real Windows runner yet, so it is allowed to fail without failing the job, and it prints the resulting resolution (A117). The screenshot is now taken whether the test passes or fails, and `SAVE_PROOF=1` only copies it into `docs/iterations/` when the test passed. The spec now says plainly that `e2e/` belongs to qa-and-ci. This round's code, spec, and decision went in one commit.
- Proof: a fresh clone at `6daa288`, same setup as before: `npm ci`, Electron fetch, typecheck, unit tests (1 of 1), content verifier, build, end-to-end (1 passed), and packaging (both dmg files, 45 s) all passed, and no tracked file changed. Then a copy of the smoke test with one wrong expected version was run with `SAVE_PROOF=1`: it failed as intended ("Expected v0.0.0-wrong, Received v0.1.0"), still wrote `test-results/failing-the-app-opens-its-main-window/window.png`, and left `docs/iterations/m0-1-window.png` unchanged. Both workflow linters still pass.
- Not verified here: the 1100x700 floor case itself, because this Mac's screen is larger than the minimum; and the Windows resolution step, which needs a real windows-2025 runner.

## M0.4 Content types, parser, verifier (content-engine, builder-content-engine)
- What changed: the app can now read lesson files. A quest is a Markdown file with a short settings block at the top and fixed headed sections below it; each of the six quest kinds has its own section order. The new reader turns those files, the glossary, and the pattern cards into typed data, and when something is wrong it says which file, which section, and which line, in plain words, and keeps going so one run shows every problem. Two quests with the same id, or two glossary entries with the same id, are caught. Eight example lesson files, one per kind (a build quest at each of the four help levels), show authors exactly what to write.
- How to see it: run `npx tsx tools/verify-content.ts`. It lists every file as `ok` or `FAIL` with the problems under it, then a summary. Add `--pack <id>` or `--quest <id>` to narrow it. To see an error, rename `# Card` to `# Cards` in `content/examples/01-concept-uproperty.md` and run it again (then undo).
- Proof (after rebasing onto main 0e5d4c9 and `npm ci`): `npm run typecheck` passes; `npm test` 4 files, 42 tests passed (one happy path per kind including all four scaffold levels, 14 malformed cases, duplicate quest, glossary, and pattern ids, empty and missing folders, verifier filters and the check extension point, and a 300-quest timing test); `npm run build` passes; the verifier on the repo prints 8 `ok` lines and exits 0; on an empty folder it exits 0. With author-foundations' real `glossary.json` (191 entries) and `patterns.json` (22 cards) copied in, everything parses with no changes to their files.
- Timing: a generated pack of 300 quests (12 worlds, all kinds) plus the real glossary and patterns and the examples, 323 files: parsing takes about 46 ms, the whole `npx tsx tools/verify-content.ts` command 0.28 seconds on the MacBook Air (three runs), against a 3 second budget.
- Terminal capture:

```
ok    examples/01-concept-uproperty.md
...
ok    examples/08-boss-lighthouse.md

Parsed 8 files (0 packs, 0 worlds, 0 quests, 8 examples, 0 glossary entries, 0 pattern cards) in 13 ms: no problems.
```

- Decisions made: A100 to A109 (YAML blocks in sections, examples folder, `@explain` markers, examples not compiled, YAML through gray-matter, question shapes from author-foundations, parser versus verifier rules, folder naming, verifier edge cases, zod schemas with plain-words messages).
- Built on the packages M0.1 pinned: gray-matter for every YAML read and zod for every check; M0.4 changes no package file. Section splitting uses a small fence-aware line scanner instead of remark-parse, because the sections only need headings and code fences; remark-parse stays in dependencies for the TermLinker (M1.8).
- Not done or left for later: the content rules beyond parsing (fade ladder, reachability, terms and patterns existing, rubric sizes, coverage) and `--engine` are M1.8; they plug into `PARSE_ONLY_CHECKS` in `tools/verifier/runVerifier.ts`. Term linking and the glossary service are M1.8. No IPC method exposes content yet; builder-shell wires `ContentLoader` into the contract. The examples' C++ has not been compiled (A103). Windows path handling is written for both platforms (forward slashes in every reported path) but unverified on Windows.

### Fix round 1
- What the reviewer asked for: (1) files and entries flagged for a duplicate id or a repeated order were reported but still loaded; (2) `--quest` on a duplicated id showed only the first file, which looked clean; (3) the blank-level proximity lantern's test could never pass, because the sandbox test actor has no collision shape; (4) question ids inside a pattern card were not checked for repeats; (5) two wording slips in the examples; (6) the question rules should match M0.5's stricter authoring rules; (7) two stale lines in the app-shell spec.
- What changed: a later file or entry that reuses an id or an order is now flagged and left out, and the first one keeps it; files in a world are read in name order so "first" is the same on every machine. `--quest` now also keeps every file whose problems quote that quest id. The proximity lantern test gives each visitor a small sphere set to overlap and starts it far from the lantern; the brief now names what the test uses (`IsLit()`, `Radius` defaulting to 300, the `OverlapAllDynamic` profile) and talks about "any actor with collision" instead of pawns. Pattern cards with a repeated question id are reported and left out. The UPROPERTY spot-the-bug now describes a destroyed object and a dangling pointer, and the lighthouse rubric no longer calls the beam a timer. Questions now need at least two choices, a fill-blank prompt needs exactly one `___`, spot-the-bug code is trimmed before its lines are counted, and which-pattern questions must have distractor notes. The M1.8 check list gained four content rules (3 or more distinct choices, which-pattern choices are pattern ids with a note per wrong choice, glossary `related` ids resolve, docs links pinned to 5.8). The app-shell spec lists `tools/verifier/` and no longer says the parser uses remark-parse.
- Item 8 (from the M0.5 review): glossary entries can now carry `linkMode: "code-only"`, meaning a term that is also a plain English word (such as check or ensure) only links inside inline code; any other value is reported. The rule is written into the term linking section of the content-engine spec for M1.8.
- Proof: typecheck passes; `npm test` 4 files, 48 tests passed (new: `linkMode` accepted and a wrong value reported, duplicate quest and repeated order left out of loaded content, duplicate glossary and pattern entries left out, a pattern card with a repeated question id, `--quest` on a duplicated id keeps both files, two choices and one gap, trimmed bugLine counting); build passes; the verifier prints 8 `ok` lines and exits 0; M0.5's glossary and patterns (commit f30b857) still parse with no problems under the stricter rules. 300 quests: about 50 ms to parse, 0.30 seconds for the whole command (three runs).

## M0.5 Glossary and pattern cards (content-foundations, author-foundations)
- What changed: the app now has its two shared reference files. `content/glossary.json` holds 191 Unreal terms in 19 categories, each with a one-line hover definition, a short explanation, related terms, and a link to Epic's UE 5.8 documentation. `content/patterns.json` holds 22 pattern cards (the 19 from Game Programming Patterns plus Strategy, Factory Method, and Facade), each with its intent, the problem it solves, how it looks in Unreal, when not to use it, and 5 practice questions (3 recall, 2 scenarios), 110 questions in all. All wording is original and Unreal-flavored.
- How to see it: open the two files under `content/`. There is no screen for them yet; the hover cards and drills come in later tasks.
- Proof: a stand-in checker (kept outside the repo until the M0.4 verifier exists) checked both files against the shapes, unique ids, related terms that resolve, every seed term and every inventory pattern present, the question rules per type, and no em or en dashes. It also fetched all 125 docs links and confirmed each is a real 5.8 page. Output:
  ```
  glossary: 191 terms, 19 categories, 125 distinct docs links
  live check: 125 docs pages fetched, each with a 5.8 title
  patterns: 22 cards, 110 drill items {'explain-in-one-sentence': 17, 'fill-blank': 17, 'multiple-choice': 26, 'spot-the-bug': 10, 'which-pattern': 40}
  result: PASS (0 errors, 0 warnings)
  ```
  A broken copy (an em dash, a missing related term, an out-of-range answer, a missing pattern) made it fail with 10 errors, so the checks really run.
- Not done: `firstQuestId` and `useCaseQuestIds` stay empty until quests exist. The question shape is a proposal (A20) that the M0.4 types still have to adopt. The real verifier check waits for M0.4. Seven seed docs links were broken for 5.8 and were remapped (A21). Glossary text came from the research seed with only the links changed. A fresh reviewer should still check it for accuracy and originality.

### Fix round 1
- What the reviewer asked for and what changed:
  - Originality (D13): four card intents echoed the book's or the Gang of Four's intent lines. All 22 intents were rewritten from scratch around a concrete Unreal example (a locked door, a turret picking targets, a mailbox drained at end of frame), not only the four flagged, because several others followed the same sentence shapes.
  - Four spot-the-bug items had no single wrong line. Each now has exactly one wrong line: the delegate is removed with the wrong owner, the undo history keeps one entry too many, a pooled projectile comes back with collision still off, and adding a buff clears the dirty flag instead of setting it.
  - The lantern scenario for Update Method was a when-not item written as which-pattern. It is now multiple-choice: "what should the lanterns do instead".
  - Multiple-choice answers were almost all in the second position. The 27 answers are now spread evenly (7, 7, 7, 6 across the four positions). The drill runner also shuffles choices (A61).
  - Glossary: generic aliases that would link ordinary prose were removed (override, virtual, verify, assert, meta, Remove, dictionary, and the wrong "physics asset"). Six entries whose term is also an everyday word (check, ensure, Cast, Destroy, Category, Super) now link only inside inline code through `linkMode: "code-only"` (A62, A24). The GEngine link now points at the UEngine class page and IsA at its own 5.8 API page. No better 5.8 page than the actor lifecycle page was found for Super.
  - The Strategy card now names `UCLASS(Abstract, EditInlineNew)` and says the Instanced property must be the abstract UObject base, not a UINTERFACE.
  - `docs/systems/content-authoring.md`: the category wording now allows AI and UI, question ids only need to be unique within their quest or pattern card (agreed with M0.4), and the new authoring rules from this round (code-only terms, specific aliases, one wrong line, spread answers, intents from scratch) are written down.
- Proof: the checker now also allows `linkMode`, checks question ids per card, and retries when Epic rate limits instead of reporting a broken link. Output:
  ```
  glossary: 191 terms, 19 categories, 126 distinct docs links
  live check: 126 docs pages fetched, each with a 5.8 title
  patterns: 22 cards, 110 drill items {'explain-in-one-sentence': 17, 'fill-blank': 17, 'multiple-choice': 27, 'spot-the-bug': 10, 'which-pattern': 39}
  result: PASS (0 errors, 0 warnings)
  ```

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

### Fix round 1
- What the reviewer and the Lead asked for: rebase onto main; make the sample quest look like real quest code (no module export macro, forward declarations, a comment on the delegate); a test-world teardown that does not rely on a 5.8-only engine call; a Mac runner rule that accounts for the editor keeping old code; the verified headless command and exit codes in the spec; tidier problems; and the map renamed to `L_Sandbox`.
- What changed: all of the above. The teardown now ends play on each actor by hand, so 5.8 runs the same path older engines will. The map was regenerated with the same Python script under its new name. Decisions A43 and A45 are updated and A46 records the naming call.
- Proof (fresh copy of the template, UE 5.8.3, stdin from `/dev/null`): full editor build `Result: Succeeded` in 19 s; headless test with the per-quest filter `Dojo.Sample.Health` found 1 test, `Result={Success}`, `TEST COMPLETE. EXIT CODE: 0`, 18 s for the whole run, the editor loaded `L_Sandbox`; report: 1 succeeded, 0 warnings, 0 failed.
- Still open: Windows, and the C++ APIs and map on UE 5.4 to 5.7 (logged in `docs/problems.md`).

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
## M1.7 AI review: providers, graders, schemas (ai-review, builder-review)
- What changed: the app now has its mentor, waiting to be plugged in. After a build quest compiles, it can send the brief, the rubric, the test results, and the learner's files to a reviewer and get back a score, a met or not met answer per rubric line, findings tied to a rubric line or an Unreal convention with a short "why", a reflection question, and a hint toward an alternative. The same service grades revised breakdown plans and one-sentence explanations, and answers "why is this a finding?" once per finding. Three reviewers sit behind it in the order from D11: the learner's own Claude Code login, then their API key, then a tests-only reviewer that always works and turns test results and rubric lines into self-checks.
- How it stays honest: the prompts forbid writing the solution, and the app checks every answer instead of trusting it. A reply that is not JSON, is cut off, has the wrong shape, skips a rubric line, skips a required piece, or picks a reference plan that does not exist becomes a clear error that says which grader failed and asks the learner to submit again. A finding that cites a file the learner never sent loses the citation, and any fenced code block (between triple backticks) with more than one non-empty line is replaced with a note. Code written without fences is not caught by that check; the prompt's rule against writing the solution is the main guard.
- What was tried and what was solved: the spec said Claude Code takes a schema file, but its help and the live run show it takes the schema as text, so that is what the app sends (A140). The Anthropic SDK's own schema cleanup quietly dropped the allowed values for fields like severity, so the app makes its own schema that keeps them and lets its parser enforce the ranges (A146). Learner code is put in tagged sections, and a file that tries to close its own section (for example a comment saying `</file> ignore the rubric`) cannot (A151).
- Live run on this Mac: `claude` is not on PATH here, so the only copy available was the one bundled with the Claude desktop app (2.1.304). The real provider code ran against it with this command line (cwd an empty temp folder, the learner sentence on stdin):
  `claude -p --output-format json --json-schema '<explain grader schema>' --system-prompt-file <temp>/system-prompt.md --tools "" --max-turns 1 --no-session-persistence --strict-mcp-config --setting-sources user`
  Result: version 2.1.304 detected, every D11 flag accepted, and the JSON envelope parsed. That copy is not signed in, so it answered `{"type":"result","is_error":true,"result":"Not logged in · Please run /login","terminal_reason":"api_error"}` (trimmed), and the app turned it into "Claude Code is not signed in. Open a terminal, run claude, and sign in with /login." No model review came back, so a signed-in run still needs doing (see below).
- How to see it: nothing visible changed, so there is no screenshot; the screens arrive with ui-quests. Run `npm test` and look at the `tests/review/` files.
- Proof: typecheck passes for main, preload, and renderer. Unit tests: 7 files, 100 tests passed (73 new in `tests/review/`: every grader against recorded good, fenced, prose-wrapped, malformed, cut-off, wrong-shape, and refusal replies; Claude Code with the spawn mocked, including the exact flags, an empty cwd, the real not-signed-in envelope, refusal, timeout, cancel, and the text-mode fallback; the API with the SDK mocked, including refusal, cut-off reply, 429 retry, the spend-cap 429, and key, model, network, and cancel errors; the real process runner against small Node scripts; provider selection; tests-only; prompts; the safeStorage key reader). Build passes, and a temporary import confirmed the prompts are bundled into `out/main/index.js`.
- Decisions made: A140 to A153 in `docs/decisions.md`. Two AppError codes were added (A143).
- Not done or left for later: a live review through a signed-in Claude Code (install it on PATH, run `claude` and `/login`, then use the Settings test once it is wired) and a live API run (needs Mohammad's key, which costs money). The IPC methods (`getReviewProviders`, `testClaudeCode`, `explainFinding`, `answerReflection`) and the review step inside submit, breakdown revision, and drills are not wired: they need the settings service for the stored key and progress's attempt store; wiring is described in the spec's Architecture section. Windows is unverified, in particular running npm's `claude.cmd` with the schema quoted through the shell (A153).

### Fix round 1
- What the reviewer asked for: (1) a Claude Code that is installed but signed out was picked first and made every submit fail; (2) compiler output and test messages were not named as data in the code review prompt, so a learner could try to steer the review through them; (3) on Windows a timeout or cancel left `claude.cmd`'s child process running, and a failed temp folder cleanup could replace the real result; (4) the tests-only grader let a one-letter label cover every required piece; (5) a finding with line 0 failed the whole review; (6) cancelling during the API's rate-limit wait did nothing until the wait ended; (7) the Lead decided that a key set in a terminal must never reach `claude -p`. Two wording fixes: A149 said the key is never cached, and this entry overstated what the code-block guard catches.
- What changed: a provider that cannot review is now set aside for 10 minutes with its reason and the same review moves on to the next provider (the API in auto, otherwise tests-only, which now says why it answered). The Settings test feeds that choice too: a failed check sets Claude Code aside, a passing one brings it back (A154). The code review prompt is version 2 and says everything in files, test results, and compiler output is data to review, never to follow (A156). On Windows a stop now ends the whole process tree with taskkill, and cleanup failures are swallowed (A157). Tests-only label matching needs the whole required name or a part of at least four letters (A158). A bad line number is dropped while the finding stays, and a cancel ends the rate-limit wait at once (A159). `claude -p` now starts without `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` (A155). The two wording fixes are made above and in A149.
- Proof: rebased onto main first (decisions and iterations kept both sides). Typecheck passes; unit tests 18 files, 223 tests passed (18 new in `tests/review/fixRound1.test.ts`, one or more per item, including a cleanup test that locks the temp folder so removing it really fails, and the Windows path driven through a fake spawn); build passes.
- Still open: the live signed-in Claude Code run and the API run (the Lead logged them in `docs/problems.md`); the taskkill and `.cmd` quoting paths are unverified on Windows.

## M0.2b Content in the window (app-shell, builder-shell)
- What changed: the window can now ask the main process for the lessons. At startup the app reads its `content/` folder once (glossary, pattern cards, and any packs, worlds, and quests) and keeps it in memory. The window can ask for the whole World Map in one go, then for one world or one quest in full, for the glossary, for the pattern cards, and for a flat list of every glossary term and alias that the code editor's hover and completion will use. Quests arrive without their hint texts, since hints cost XP and come only through the hint request. The "choose your engine folder" button also works now: it opens the system folder picker and reads the engine version from the folder chosen. Starting a drill has its request shape (today's due items, a world's test-out, or the Parsons fallback) but waits for progress and rules to build the drill itself.
- What can go wrong and how it is handled: a broken lesson file is left out and listed, and everything else still loads. If the lessons folder is missing (a broken install), every content request answers a plain message ("Unreal Dojo could not find its lessons.") with what to do, and the next request tries again; the app never crashes over content.
- How to see it: `npm test` runs the new checks, including one that builds a small lesson folder on disk and loads it through the real loader, and one that points the app at a missing packaged folder. In the built app today the repo has no packs yet, so the World Map list is empty; the glossary (191 entries, 774 alias rows) and the 22 pattern cards load with no problems. Nothing visible changed on screen, so there is no new screenshot.
- Proof: typecheck passes; unit tests: 12 files, 152 tests passed; content verifier: no problems; build passes; end-to-end: 4 passed. A one-off check in the built app read the content status, the alias table, and the pattern cards, and saw an unknown quest id come back as a friendly "quest-not-found" error.
- Decisions made: A220 to A225 in `docs/decisions.md` (load once at startup, outlines plus full calls, hints left out, the alias table rule, the engine folder picker, where the drill types live).
- Not done or left for later: `startDrill` is a stub until progress and rules (M1.6) builds drill scheduling. `getEnvironmentStatus` waits for the settings service. There is no "reload content" request; authors use the verifier.

## M1.7b Review edge cases (ai-review, builder-review)
- What changed: three edges the M1.7 reviewer found, decided by the Lead. First, when Claude Code takes too long, the review no longer moves on to the API key, which costs money; the learner gets the tests-only review with the reason and a "Retry review" hint instead, and the next try goes to Claude Code again. Not installed or not signed in still moves on to the API as before. Second, when the computer's secure storage cannot read the stored API key, the submit no longer fails: the API is set aside with that reason (Settings shows it) and the tests-only review answers. Third, the tests-only breakdown check no longer lets a plain kind word like "Component" or "Manager" count as a required piece, and a partial name must be at least half of the required piece's real name ("Health" still counts for "HealthComponent", "Wave" no longer counts for "WaveSpawnerSubsystem").
- How it was done: timeouts now have their own error code, so they can be told apart from "not signed in" and tested; reviews answered by tests-only after a timeout carry a retry flag the loot screen can use. Label matching splits names into words and drops the kind words before comparing.
- How to see it: nothing visible changed, so there is no screenshot. Run `npm test` and look at `tests/review/edgeCases.test.ts`.
- Proof: typecheck passes; unit tests 19 files, 235 tests passed; build passes. 12 new tests cover all three decisions, including a real API provider whose key sits in locked secure storage, and an API connection timeout.
- Decisions made: A300 to A302 in `docs/decisions.md`. A302 notes one interpretation: "half the length" is measured on the name without its kind words.
- Not done or left for later: the screens still need to show `fallbackReason` and a Retry review button when `retryReviewSuggested` is set (ui-quests). The live Claude Code and API runs stay open in `docs/problems.md`.

### Fix round 1
- What the reviewer asked for: the kind-word list missed plurals, so a plan piece named "Steps" still counted for "SetupSteps", and the same for "Systems", "Classes", "Managers", "Widgets", "Assets", and "Delegates". The Lead also confirmed that the half-length rule is measured on the name without its kind words.
- What changed: a word now counts as a kind word when it is one, or when removing a trailing "s" or "es" makes it one, so the plural forms no longer cover anything. "Setup" still counts for "SetupSteps". A302 now says the half-length reading was confirmed by the Lead.
- Proof: typecheck passes; unit tests 19 files, 236 tests passed (one new test with seven plural pairs); build passes.
- Also asked by the Lead: the review tests left about 300 temp folders behind on this Mac (`dojo-claude-code-test-*`, `dojo-env-test-*`, `dojo-cleanup-test-*`), because three tests made a folder and never removed it. Every review test now makes its temp folders through one helper that remembers them, and an afterEach step removes them, also after a failed test, first making writable the one folder a test locks on purpose. The old leftover folders were deleted. Two full `npm test` runs afterwards left none of them behind (and none of the reviewer's own `unreal-dojo-review-*` folders).

## M1.6 Progress and rules (progress-and-rules, builder-rules)
- What changed: the app now has its game rules and a memory. Every rule in the progress spec is written down once: how a quest passes, how much XP it pays (harder quests pay more, repeats pay nothing, rematches pay half, hints and viewed solutions cost), levels and the ten roles, pattern cards from bronze to gold, skill points, the mastery meter that can fall back to "due for review", the sharpshooter spree with armor, the 3-day streak with freezes and milestones, the Seer Stone, the daily quest with its chest and month badge, the spaced-repetition scheduler with a daily cap of 20, drill building (6 to 10 mixed items with a pattern pick, a reorder, and an explain item), test-out, rematches, and the World Map's locks with a plain-English reason. The learner's save is kept by the main process and written so a crash or power cut can never leave a half-written file; a damaged file is set aside and the last good copy is used.
- How to see it: nothing new on screen yet (the screens come in M2). Run `npm test` to see 149 new checks across the rule areas pass. The app now creates `progress.json` in its user data folder the first time progress changes.
- Proof: typecheck passes for main, preload, and renderer. Unit tests: 15 files, 176 passed (27 existing IPC checks plus 149 new). Per rule area: pass rules 6, XP and bands 16, levels and roles 12, pattern cards 9, mastery and skills 9, spree 8, streak 13, SM-2 scheduler 15, drill scheduler 11, unlock graph, test-out, and rematch 12, daily quest and chest 8, save file 12 (including a crash halfway through writing and a crash before the final rename), the service end to end 16, IPC wiring 2. Build passes; the end-to-end smoke test still passes with the save service starting up.
- What was tried and solved: the first run of the service tests showed that a brand-new learner would get no daily offers on day one (the new save was stamped with today's date, so it looked already offered); a new save now starts with an empty date.
- Decisions made: A120 to A138 in `docs/decisions.md` (type additions, rematch and solution pricing, drill answer quality, SM-2 ease, armor cap, spree and streak details, item-level mastery, skill points, XP modifier order, test-out timing, pack gates, daily quest details, save backups, rematch selection, IPC wiring scope, the narrow quest shape, studio modules).
- Not done or left for later: eight progress and drill methods (World Map availability, hints, concept and breakdown submits, daily offers, drill answers and finish) still answer "not built yet" because they need the loaded quests, hints, and drill items from the content loader; the service code behind them is done and tested (A135). The drill session itself (`startDrill`) arrives with M0.2b. The mapper from content quests to the rules' quest shape waits for M0.4 to merge (A136).

### Fix round 1
- What the reviewer asked for: (1) two requests arriving at once could wipe each other out (a term hover during a quest save erased the quest's XP); (2) a rematch could be replayed for half XP over and over, because the due item behind it was never moved on; (3) three reviews in a row at the same moment counted as three spaced recalls and reached Proficient; (4) a save from a newer version, or one another program was holding, stopped the app from opening, and a locked file would have been treated as corrupt; (5) Windows can briefly refuse a rename or copy while antivirus holds the file; (6) the map flagged a rematch before it was due; (7) the "short build" rule for the daily quest was missing; (8) the Lead decided effort XP is only for code quests; (9) tests for the potion running out and each chest reward, and the month badge should reach the loot screen. Also four rule constants were missing from what the screens read, and the iterations line named the wrong decision range.
- What changed: the app was first rebased onto the latest main (keeping everyone's decisions and iterations entries). Requests that change the save now wait in line, each starting from what the previous one saved. Passing a rematch now reviews the terms and patterns it exercised, so the same rematch disappears for the day and a second replay pays nothing. A correct answer before an item is due is still written in the history but does not move it forward. A save the app cannot open no longer blocks it: the window opens and every progress request explains the problem, and nothing is written over the file. A held file is never mistaken for a broken one. On Windows the save retries for about a second and a half when a file is briefly held. The map waits for a rematch's due time. Short builds need a worked scaffold and no new class. Failed concept and breakdown attempts pay no effort XP (A139). The loot result now carries a month badge when one is earned, and the screens can read the mastery thresholds, the hover count that pulls a term into a drill, the effort share, and the cosmetics list.
- Proof: typecheck passes. Unit tests: 26 files, 305 passed; the progress tests are 173 of them (151 from the first round plus 22 new), the rest come from the merged tasks. New tests cover the overlapping calls (checked to fail with the waiting line switched off), the full rematch flow and a second replay, unspaced and spaced recalls, refused and locked saves, the Windows retries, the rematch due time, short builds, effort by quest kind, every chest reward, the potion's 30 minutes, and the month badge in both results. Build passes; end-to-end 4 of 4 passed (smoke plus ui-core's three); the content verifier reports no problems.
- Not done or left for later: the Windows retries are tested with a simulated Windows only and are unverified on Windows. The content front matter has no "adds a new class" field yet, so content-engine needs to add one (A132). The eight content-backed methods, plus the new `getTestOutStatus`, are still waiting for the content mapper (A135).

### Fix round 2
- What the reviewer asked for: rematches could still be farmed two ways. A term the learner asked to drill ("Drill me"), or a missed term pulled into the drill by hovering, counted as "due" for rematches too. Those items stay due after the replay, so the same quest paid half XP again and again on one day.
- What changed: rematches now come only from items whose scheduled review time has arrived today. "Drill me" and hovered terms still go into the next drill as before, but they never turn a quest into a rematch. Passing a rematch moves on only those scheduled items.
- Proof: typecheck passes. Unit tests: 27 files, 308 passed, including three new ones: a "Drill me" item never creates a rematch, a missed and hovered term never creates a repeatable one, and 40 random sequences of hovers, "Drill me", misses, map loads, and replays on one day each pay at most one rematch per quest (the test also checks that the sequences do reach real rematches). All three fail on the round 1 code. Build passes; end-to-end 4 of 4 passed.
- Not done or left for later: nothing new; the round 1 list still stands.

## M2.1 Core screens (ui-core, builder-ui-core)
- What changed: the seven core screens are real now. The Title asks a new learner's name and sends them to setup, or greets a returning one and shows where the environment stands (engine, sandbox, reviewer, how builds run, editor). First-run setup walks through picking the engine (found automatically, or a folder by hand, with the compiler setup checked), choosing the sandbox folder (with the short path warning), the first full build (which step it is on, the time so far, a bar, the latest build line, cancel), opening the editor once, and a summary. The Studio shows the lead programmer with role, level, XP, and a few totals, what is due today with the streak and freezes, the three daily offers (pick one), what to continue, and the engine room with the shipped titles. The World Map shows each pack as a region and each world as a client's contract with its brief, with quests as stages on a path: locked ones say why on hover, passed ones are filled with a check, the one in progress has a thick ring, a due rematch glows in a warm color, the boss is larger, and a world that can be tested out says so. Character shows level and role, the spree, the streak with milestones, Seer Stones, armor, and freezes, the skill tree, every pattern card (earned ones in their tier frame and turn over on click, the rest as silhouettes), and recent attempts. The Codex lists all 191 glossary terms with a filter and categories; each entry shows both definitions, where you meet it, when it is due for review, related terms, Epic's docs, and "Drill me". Cmd+K (Ctrl+K on Windows) searches it from anywhere. Settings changes the engine, rebuilds the sandbox with live progress, sets the loop mode, picks the reviewer and shows which are available, tests Claude Code, stores the API key (shown masked), sets the model, and resets progress after a confirmation.
- What was tried and what was solved: most services behind the screens are still being built, so every screen reads through one data layer, and a typed stand-in for the main process answers with realistic data when asked to (A240). It uses the real glossary and pattern cards and pretends to run a first build, including one that fails once. Against the real main process today, the Title still works and the other screens show the plain-English error view until their services land. On the Mac the app never promises the fast loop, because Live Coding does not exist there (A243): the loop chip says "Headless loop" and Settings shows "Fast (Windows only)" turned off. Two files whose names differ only in capital letters overwrote each other on the Mac's file system; one was renamed.
- How to see it: start the app in development with the fake data flag from A240 to see a learner a month in. A stored setting in the window, also described in A240, picks the brand new learner or the build that fails once instead; a packaged app ignores it (A251). Without either, the app talks to the real main process.
- Checks: see Fix round 1 below for the current numbers.
- Decisions made: A240 to A251 in `docs/decisions.md` (A241 is superseded by M0.2b).
- Not done or left for later: hover definitions in text (`TermText`, `HoverCard`) wait for the TermLinker (M1.8). "Start drill", "Test out", and opening a quest wait for the drill and quest screens (M2.2); they are shown turned off and say why on hover or focus, and Continue opens the World Map (A245). Codex entries have no example section because the glossary has no example field (A246). Unverified on Windows: Ctrl+K, the Windows paths and short path warning in the stand-in, and the fast loop wording for 5.8.

### Fix round 1
- What the reviewer and the Lead asked for: move onto the merged content contract (packs now arrive as outlines); take the drill size and the rematch share from the rules instead of writing them in the screens; turn "Start drill" off and make the reason for both disabled buttons visible on hover and keyboard focus; store the engine choice during setup, with the sandbox path stored by the sandbox service itself; keep the stand-in out of packaged builds; word a failed Settings rebuild differently from a failed first build; refresh data in the background when a screen opens and when the window regains focus; never show Continue on the Title before the settings are known, and prefill the name once it loads; tidy the pattern card layout; give each mastery level its own shape and readable names; split two small components into their own files; wait for every piece of data before the proof pictures; embed the pictures here as JPGs; and the polish list (step count wording, "September 2026", one source for the role, failed and cancelled builds shown as such, region names not cut at 1100 wide, distinct rematch and in-progress stages).
- What changed: all of the above. The main process now tells the window whether it is a packaged build, and a packaged build always uses the real main process (A251). The engine is saved the moment the learner confirms it; the sandbox path is saved by the sandbox service after a passing build, which the contract now says. A failed build's bar turns red and says "Failed"; a cancelled one goes quiet, says "Cancelled", and offers to start again without an error box. Mastery reads as an empty ring (attempted), a half-filled circle (familiar), a full circle (proficient), and a full circle with a check (mastered), with names such as "Objects" and "Soft refs" instead of ids (A250). The rematch stage is now a warm glowing ring with a replay mark, and the stage in progress is a thick ring with a dot, so neither can be mistaken for passed or open. The Title and the Studio both take the role from the rules. Proof pictures are JPGs at one pixel per screen point and replace the earlier PNGs.
- Checks: `npm run typecheck` passes; `npm test` 271 passed; `npm run build` passes; `npm run test:e2e` all passed, 10 of them the screen tests (new in this round: a cancelled build, the engine and sandbox stored after setup, both disabled buttons' reasons, the provider list, the in-progress and rematch stages).
- Proof (all in `docs/iterations/`, every screen at 1100x700 and 1440x900, plus full-length pictures at 1440): `m2-1-title-*.jpg`, `m2-1-title-fresh-1100x700.jpg`, `m2-1-first-run-engine-1100x700.jpg`, `m2-1-first-run-sandbox-1100x700.jpg`, `m2-1-first-run-build-progress-1100x700.jpg`, `m2-1-first-run-build-done-1100x700.jpg`, `m2-1-first-run-build-failed-1100x700.jpg`, `m2-1-first-run-done-1100x700.jpg`, `m2-1-studio-*.jpg`, `m2-1-studio-fresh-1100x700.jpg`, `m2-1-studio-bridge-1100x700.jpg`, `m2-1-world-map-*.jpg`, `m2-1-world-map-locked-reason-1440x900.jpg`, `m2-1-character-*.jpg`, `m2-1-codex-*.jpg`, `m2-1-codex-search-1100x700.jpg`, `m2-1-settings-*.jpg`, `m2-1-settings-reset-confirm-1100x700.jpg`.

![[m2-1-title-1100x700.jpg|800]]
*Title for a returning learner at the minimum size: Continue, the greeting with the role from the rules, and the environment chips. On the Mac the loop chip says headless.*

![[m2-1-title-fresh-1100x700.jpg|800]]
*Title for a brand new learner: the name field and "Set up your studio".*

![[m2-1-first-run-engine-1100x700.jpg|800]]
*First-run step 1: the detected installs with how builds will run on each, a folder picker, and the toolchain check.*

![[m2-1-first-run-build-progress-1100x700.jpg|800]]
*First-run step 3: the first full build with its phase, elapsed time, bar, and latest build line.*

![[m2-1-first-run-build-failed-1100x700.jpg|800]]
*A first build that failed: the bar turns red, a plain-English reason, the compiler's lines behind a toggle, and Build again.*

![[m2-1-studio-full-1440.jpg|800]]
*Studio: lead programmer, today's reviews and streak, the daily quest, what to continue, and the engine room with shipped titles.*

![[m2-1-world-map-full-1440.jpg|800]]
*World Map: regions, client contracts, and stage states (locked, open, in progress, passed, rematch due), with Test out on the second contract.*

![[m2-1-world-map-locked-reason-1440x900.jpg|800]]
*Hovering a locked stage says what unlocks it.*

![[m2-1-character-full-1440.jpg|600]]
*Character: level, spree, streak, held items, the skill tree with mastery shapes, all 22 pattern cards, and recent attempts.*

![[m2-1-codex-search-1100x700.jpg|800]]
*Cmd/Ctrl+K searches the glossary from any screen; Enter opens the term in the Codex.*

![[m2-1-codex-1440x900.jpg|800]]
*Codex: filter, categories, and one entry with where you meet it, its review date, related terms, Epic's docs, and Drill me.*

![[m2-1-settings-full-1440.jpg|600]]
*Settings: engine and sandbox with rebuild, loop mode with "Fast (Windows only)" off on the Mac, reviewer availability, the masked key, the model, and reset.*

![[m2-1-studio-bridge-1100x700.jpg|800]]
*Against the real main process: the Studio shows the plain-English error view, with a retry, for any service not built yet.*

### Fix round 2 (rebase onto M1.6)
- What changed: the progress and rules task added fields to the shared save, availability, daily quest, and rules types, so the typed stand-in stopped compiling, as intended. Its fixtures now carry them with that task's real values: per-quest Seer Stone and effort flags, the daily quest's completed days, studio cosmetics, scheduler memory, the drill queue, rematch dates, tested-out worlds, the XP potion, availability's "skippable", and the eight new rule constants. No new screen elements this round. Two are noted for later: "skippable" belongs on the World Map's stages once test-outs can be taken, and the Studio's engine room can show the cosmetics. Progress, rules, and due counts are real in the main process now, so the real-bridge test accepts either real panels or the error view on the Studio.
- Checks: `npm run typecheck` passes; `npm test` 460 passed; `npx tsx tools/verify-content.ts` no problems; `npm run build` passes; `npm run test:e2e` 14 passed.

## M2.3 Pack 1 World 1: objects and reflection (content-authoring, author-foundations)
- What changed: the first real content pack exists. Pack 1 (Unreal C++ Foundations) now has World 1, "Objects and reflection", framed as a training yard whose designers want targets they can tune without a programmer. It holds 12 quests: six concept quests (each opens with a no-penalty guess, then a card, an example, and four or five recall questions including one explain-in-one-sentence item), four build quests that fade from worked to blank, the "dash with cooldown" breakdown with two reference plans, and a boss. Every build quest has a reference solution in `tools/solutions/<quest-id>/`, automation tests, three hints with no code, a rubric of 5 or 6 bullets, and one alternative with its tradeoff. Two build quests carry Parsons blocks (four functions in all). One glossary entry was added (LaunchCharacter) and 31 entries now point to their first quest.
- The quests, in order, with what the learner sees:
  1. Concept: UObjects, actors, and the class default object.
  2. Concept: reflection, UCLASS, and the generated header.
  3. Concept: UPROPERTY specifiers.
  4. Concept: UFUNCTION specifiers, including the two Blueprint event kinds.
  5. Build, worked: a training dummy. `ke * Strike` three times in the console counts the floating number down 3, 2, 1, then DOWN. The learner adds the UFUNCTION macro and the Strike body, after explaining five marked lines.
  6. Concept: UENUM and USTRUCT.
  7. Build, faded: a pop-up target whose label reads Down, Up, or Broken, taken from the enum's display names through reflection.
  8. Concept: Cast and IsA.
  9. Build, stub: a score keeper that totals dummies and targets from a designer-filled list; the label reads 35 after two strikes and one broken target. This is the world's deliberate failure: the test list holds an empty slot and a plain actor, so an unchecked cast crashes the first try.
  10. Build, blank: a practice bell. `ke * Strike 50` shows DONG 50% and logs the volume; a Blueprint child can replace the reaction because Ring is a BlueprintNativeEvent, while the counting rule stays in C++.
  11. Breakdown: dash with cooldown (600 units, 0.15 second input lock, 1.2 second cooldown, wall stop, HUD wedge), two reference plans.
  12. Boss: the training yard (6 targets, 2 dummies, 45 second round, a rise every 3 seconds, 2 seconds up, at most 2 up, bell at 150 points), the four build quests as pieces, two reference plans, an 8 bullet integration rubric, three ordered extensions, and a feel criterion.
- How to see it: `npx tsx tools/verify-content.ts --pack foundations`. To compile the reference solutions until `--engine` lands: copy `resources/sandbox-template` to a temp folder, put each solution in `Source/Dojo/Quests/<quest-id>/` and each quest's Tests block in `Source/Dojo/Tests/<quest-id>.Test.cpp`, then run the build and headless test commands from `docs/systems/unreal-pipeline.md`.
- Proof (MacBook Air M5, UE 5.8.3, fresh copy of the sandbox template, every command with stdin from `/dev/null`):
  - `npx tsx tools/verify-content.ts --pack foundations`: 24 files parsed (1 pack, 1 world, 12 quests, 8 examples, 192 glossary entries, 22 pattern cards), no problems.
  - Reference solutions plus the Tests block of each quest file, written into the sandbox the way QuestFileWriter will: editor build `Result: Succeeded`; headless `Automation RunTests Dojo`: 8 succeeded, 0 with warnings, 0 failed (Dojo.F1.TrainingDummy.StrikeIsReflected, Dojo.F1.TrainingDummy.KnockedDownAfterThree, Dojo.F1.PopupTarget.EnumIsReflected, Dojo.F1.PopupTarget.RaiseHitBreakRepair, Dojo.F1.ScoreKeeper.ScoresMixedTargets, Dojo.F1.PracticeBell.RingIsNativeEvent, Dojo.F1.PracticeBell.RingsAboveMinimum, plus the template's Dojo.Sample.Health.TakesDamage). Each F1 test took 8 to 13 ms.
  - Starters do not pass (each starter swapped in alone, the other quests on their solutions): training dummy builds and fails both its tests ("Strike is a UFUNCTION" is null); pop-up target fails to compile (the enum is the learner's to declare); score keeper builds and fails its test; practice bell fails to compile (the files are empty).
  - `npm run typecheck` passes; `npm test` 11 files, 132 tests passed.
- Screenshots: nothing visible in the app changed (this is content only), so there are none. The build logs and test reports were written to this session's scratch folder and are not kept; the counts above are copied from them.
- Commit: 8af0ed8 (after rebasing onto main).
- Decisions made: A260 to A266 in `docs/decisions.md`. The one with reach beyond this world is A260: quest tests include quest headers as `Quests/<quest-id>/<File>.h`, because a bare include from `Tests/` does not build; the format examples still use bare includes.
- Not done or left for later: `--engine` in the verifier (M1.8) has not run on this content; the proof above is the same build and test by hand. Unverified on Windows. Term coverage: USTRUCT, the class default object, and BlueprintImplementableEvent have concept quests but no World 1 build quest (A262). The boss has no automated integration test, as the boss format has none.

### Fix round 1
- What the reviewer and the Lead asked for: the score keeper's editor steps gave the wrong numbers (`ke *` strikes every dummy in the level); the boss could not drop an unhit target, its rhythm made the "2 up at once" rule impossible to reach, it never said how the player hits anything, and its golden extension misused the state enum; the dummy and bell tests did not check what the learner sees on the label; the score keeper's count should be a pure node; the LaunchCharacter entry and the dash breakdown described wall behavior wrongly; the bell brief did not mention its clamps; enum values must carry the enum's initials (A66); each quest must say which earlier quests it compiles against (A65); and this entry had the wrong marked-line count and no proof location or commit.
- What changed: the score keeper's editor steps now use one dummy and one target, which gives 35 and then 45, and warn why. The boss now has a rise every second with 2.5 seconds up (with 1.5 and 2.5, the limit still never applied), keys 1 to 6 and Q and E as the player's input, two named additions to the earlier classes (Lower on the target, ResetHits on the dummy, so a second round starts like the first), a reachable bell (the best round scores 180), a separate kind enum for golden targets, and both reference plans cover all of it (A269). The dummy test now reads the label (3, then 1, then DOWN) and the bell test reads DONG 50%, with the bell's label named in the brief. CountScore is pure. The glossary and the breakdown now say the movement component never passes through walls; the problem is sliding along one at dash speed. Enum values are now ETS_Lowered and so on, and the gate example uses EGS_ (A267). The score keeper's brief names its two earlier quests in a fixed sentence the pipeline can find (A268); no other World 1 build quest compiles against an earlier one.
- Proof (rebased onto main, UE 5.8.3 on the Mac, under the shared engine lock): verifier on the foundations pack, no problems. Reference solutions: build `Result: Succeeded`, headless run 8 succeeded, 0 failed. Starters, each alone: the training dummy builds and fails both its tests; the pop-up target and bell fail to compile; the score keeper builds and fails its test. Typecheck and unit tests pass. Nothing visible in the app changed, so no screenshots; logs were in this session's scratch folder and are not kept.
- Decisions made: A267 to A269.

## M1.2 and M1.3 Sandbox setup and the headless loop (unreal-pipeline, builder-unreal)
- What changed: the app can now create the learner's sandbox Unreal project and run a quest in it from start to finish without the editor open. Creating the sandbox copies the shipped template into a new `DojoSandbox` folder, tells the project which engine it belongs to, drops the three 5.8-only plugins for older engines, remembers where the sandbox is, and runs the first full build while reporting progress. Running a quest writes the learner's files into the sandbox, builds, starts a headless editor that runs only that quest's tests, reads the engine's test report, and returns a verdict: did it compile, which tests passed, and the failed assertion's text. A run can be cancelled at any point, and the build or editor is killed with every helper it started. Every piece is behind an interface, so the Windows paths and commands are unit tested on the Mac.
- What was tried and what was solved: the first real run failed its very first build with missing precompiled header and object files. The sandbox was in the Mac temp folder, which is reached through a link (`/var` to `/private/var`), and the build tool lost track of its files across that link; the sandbox path is now always stored with links resolved (A190), and the next three runs built cleanly. A cancel that arrived while a process was still starting was missed; the supervisor now checks for it right after start. Content tests include quest headers by bare name and later quests include earlier quests' headers, so every quest folder is now an include path, and the template's sample quest moved to the same layout the writer uses (A181); a brand new quest folder was proven to build. Windows needs different handling for the build script and for quoting, decided but not yet run there (A182, A183). Content-engine found that the test world's `Tick` only fired timers on the first frame; that one-line fix is in this branch too.
- How to see it: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration` creates a sandbox in a temp folder and runs the sample quest passing, with a failed assertion, with a compile error, a new quest, and cancelled mid-build and mid-test. In the app, `createSandbox` and `cancelRun` now answer; there is no screen for it yet (M2.1), so there is no screenshot.
- Proof: the real-engine run on this Mac (UE 5.8.3), 7 of 7 passed, trimmed output in `docs/iterations/m1-3-integration-run.txt`. Timings are in `docs/systems/unreal-pipeline.md`. Typecheck passes; unit tests, build, and end-to-end results are in the report to the Lead.
- Decisions made: A180 to A190 in `docs/decisions.md`.
- Not done or left for later: `runQuest`, `rebuildSandbox`, and `pickSandboxFolder` are not wired to IPC yet, because they need the settings service, the content lookup, and the folder dialog (A189). The services behind them are ready. Opening the editor after setup arrives with `EditorLauncher` in M1.4. Nothing has run on Windows (problems.md). Also new in problems.md: a compile error left in one quest breaks every quest's build, because all quests share one module.

### Fix round 1
- What the reviewer asked for: (1) a quest's test filter matched any test whose name merely contained it, so a correct quest failed because another quest's test ran; (2) on Windows the program path would split at the spaces in `C:\Program Files\...`, and nothing was killed once the root process had exited; (3) quitting the app left a build or editor running, which would block the next build on UBT's lock; (4) the long-path warning never reached the learner during setup. Also: rebase onto main twice (content catalog, folder picker, progress service).
- What changed: a quest now runs exactly the tests it declares, each name anchored, and any other test in the report is ignored. The first engine run with `^Name$` hung every test run for 10 minutes. The engine's macOS start-up code turns every `$` on its command line into a quote, which broke the quoting and swallowed `-NullRHI`. So on the Mac the names are anchored at the start only, and the report filter keeps the verdict exact; Windows keeps both anchors (A180). On Windows the program path is now passed quoted. A kill after the root exits is still skipped there, now documented: the process id may already belong to another program (A183, A188). Quitting cancels every running build and test first and waits up to 5 seconds. The warning is sent as a progress line during setup, and `pickSandboxFolder` now answers with the folder and its warnings, using the folder picker from main (A189).
- Proof: the real-engine run on UE 5.8.3, after both rebases and under the shared engine lock, passed 7 of 7 in 105 s. In the new-quest case a second quest with a failing test named `Dojo.Probe.Value.SevenOther` sat in the sandbox, and the probe quest's verdict held only its own passing test. Trimmed output: `docs/iterations/m1-3-integration-run.txt`. Unit and IPC tests cover overlapping names, argv0 quoting, `cancelAll` (all runs end, and a stuck run stops the wait at its limit), and the setup warning.
- Still open: everything Windows (problems.md), including the quoted program path and the two-ended anchors.
## M1.8 GlossaryService, TermLinker, full verifier, --engine (content-engine, builder-content-engine)
- What changed: glossary words now become hover links. A shared matcher finds glossary terms in lesson text (the longest one first, code names in their exact case, ordinary words in any case) and skips headings, code blocks, and links. Words that are also everyday English, such as check or cast, link only when written as code. The same list of spellings is ready for the code editor's hover and completion. The content checker now enforces the curriculum rules too:
  - rubric sizes
  - every id a quest points at exists
  - prerequisites form no loops and every quest can be reached from its pack's first quest
  - each world's build quests fade from worked to blank
  - later worlds reuse earlier ideas
  - breakdown plans cover every required piece
  - choice questions have enough real choices, with a note on every wrong answer
  - glossary links are pinned to 5.8
  - every code quest has a reference solution

  Coverage of the whole glossary and of the patterns is shown as a short warning until release. With `--engine` it copies the sandbox project, builds every reference solution with the real Unreal Engine, runs their tests, and then checks each quest's starter code does not already pass.
- How to see it: run `npx tsx tools/verify-content.ts` (add `--release` to turn the coverage warnings into errors), and `npx tsx tools/verify-content.ts --engine ~/Applications/UE_5.8` to build and test the examples (about three to four minutes).
- What went wrong and how it was solved: the first engine build failed on every file because the Mac's temp folder is reached through a link and Unreal's build accelerator refused the two spellings of one folder; the sandbox now uses the real path. A starter check put a solution back in the same second the build had just compiled the starter, so the build tool skipped it; the sandbox now waits more than a second after each build before writing. The two examples that use timers failed even with correct code: the sandbox's test world advances timers only on its first frame. Adding one line to that helper made every example test pass in a test copy; the fix was sent to builder-unreal, who owns the file (`docs/problems.md`).
- Proof:
  - `npm run typecheck` passes.
  - `npm test`: 14 files, 158 tests passed. The content tests cover term linking (identifier versus word, code blocks, headings, inline code, code-only terms, links), every content check, and the engine stage with a fake sandbox.
  - `npm run build` passes.
  - The verifier on the repo: all 8 examples ok, 3 coverage warnings, exit 0.
  - `--engine` on the 5 code examples with UE 5.8.3: the worked lantern, the switch, and the proximity lantern pass (solution passes, starter fails). This answers the queued question: the proximity sphere is registered before it is attached and works. The two timer examples fail only because of the helper bug.
  - Timings: 300 quests with every check in 0.47 to 0.55 seconds; `--engine` on the examples in 195 to 258 seconds. Details are in `docs/systems/content-engine.md`.
- Decisions made: A200 to A210 (inline code linking, the identifier rule, shared folder for the linker, reachability meaning, fade ladder details, coverage warnings and `--release`, `--pack` narrowing only the report, solutions for the examples, how `--engine` builds and judges, duplicate spellings, solutions checked on every run).
- Not done or left for later:
  - the `FDojoTestWorld::Tick` fix (builder-unreal), after which `--engine` on the examples should be fully green
  - wiring `GlossaryService.aliasTable()` to IPC (app-shell) and the HoverCard and Monaco providers (ui-core and ui-quests)
  - `--engine` has not been run on the Windows desktop the plan names
  - starter checks take about 30 to 40 seconds per quest, which will be slow for a full pack (see A208)

### Fix round 1
- What the reviewer asked for and what changed:
  - A starter that fails to build now counts as "does not pass" only when the errors are in its own files; a failure in other quests' code is an inconclusive warning.
  - The starter check is skipped, with an inconclusive warning, when the solution itself failed.
  - The report indents the second and later lines of long messages, such as quoted build errors.
  - The `--pack` option's description now says it only narrows the report.
  - New unit tests cover a boss with the wrong integration rubric size, a glossary entry listing itself as related, a boss plan missing a piece, a starter that builds but whose tests do not run, the two inconclusive cases, and the indented report lines.
  - Every class and function in the example starters and the reference solutions now has a one-line comment.
  - The Lead decided the verifier must run Unreal through M1.3's builder and test runner instead of its own process code (A211); that is round 2, after M1.3 merges.
- Proof:
  - typecheck passes.
  - `npm test`: 14 files, 163 tests passed.
  - build passes.
  - The verifier on the repo: 8 examples ok, exit 0.
  - `--engine` reran with the commented examples: the same three pass, and the two timer examples still fail only on the helper bug, now each with an "inconclusive: the reference solution fails" warning instead of a starter verdict. The run took 1215 s of wall time but only 235 s of CPU, because it waited on Unreal's build mutex while other sessions built.

### Fix round 2, part 1 (new checks; the move onto M1.3's runners waits for M1.3)
- What the Lead asked for: three new checks. A quest that compiles against another quest's files must say so on its "Compiles against earlier quests:" brief line, and those quests must be prerequisites. A concept quest needs at least one question that can be marked without AI. Each breakdown piece label must keep at least 4 meaningful characters once words like "component" or "event" are removed.
- What changed:
  - All three checks are in, with tests.
  - The branch is rebased onto main, so the verifier now also checks Pack 1 World 1. It passes every rule: 12 quests, 24 files checked, only the coverage warnings.
  - The check found that my own switch example included the lantern quest's header without declaring it; the example now declares it and lists the lantern as a prerequisite.
  - On rebasing, the app's content screen had its own copy of the glossary spelling list with a slightly different rule. The verifier, the linker, and the glossary service now all use that one list (A213).
- Proof:
  - typecheck passes.
  - `npm test`: 42 files, 496 tests passed.
  - build passes.
  - The verifier on main's content: 24 files, no problems, 3 coverage warnings.

### Fix round 2, part 2 (M1.3's runners, bosses)
- What the Lead asked for: run Unreal only through the app's own builder and test runner from M1.3 (A211). Build and test every boss's reference integration, and warn when a boss has none (A67).
- What changed:
  - The verifier's own process code is deleted. It writes quest files with the app's file writer, builds with the app's builder, and runs tests with the app's test runner, so the verifier and the Build screen now drive Unreal in exactly the same way.
  - A boss's folder in `tools/solutions/` holds its integration code, its test files, and, as author-foundations proposed, extended versions of piece quests' files that replace them while the boss is built.
  - Before checking the piece quests' starters, the verifier takes the boss out again, so a piece starter is judged on its own.
  - A boss with no folder is a warning until the Pack 1 World 1 boss's integration lands (A215).
- Proof:
  - `--engine ~/Applications/UE_5.8`, run when nothing else was using the engine: all 9 reference solutions (5 examples, 4 Pack 1 World 1 build quests) build and pass their tests, and all 9 starters fail. Total 472 s.
  - The two timer examples now pass with M1.3's test world fix.
  - typecheck passes and the content tests pass. The new tests cover bosses with no starter check, a boss folder with no tests, piece overrides being written and then removed, and the override folder rules.
- Not done or left for later:
  - neither boss has an integration yet (the World 1 one is being written by author-foundations; the example lighthouse has none)
  - `--engine` has not been run on Windows

## M2.1c World Map overflow with the real World 1 (ui-core, builder-ui-core)
- What changed: with the real first world (12 quests) on the map, its path was wider than the screen at 1100x700 and the World Map scrolled sideways; the stand-in's shorter worlds never showed it. A world's path now wraps into even rows that fit the card: at 1100 wide the 12 stages sit in two rows of six, at 1440 they fit in one. Each row keeps its own connecting line and the boss stays last (A390). The stand-in's first world is now shaped like the real one, with its 12 stages and real titles, so the screen tests would catch this again.
- How it was checked: the failure was reproduced in a throwaway copy of main with the progress wiring task (M1.6b) merged in: the M0.3 frame test failed with "world-map at 1100x700". With this fix copied in, that test and the smoke test passed; with it removed again, the test failed again. The throwaway copy was deleted; nothing from M1.6b is in this branch.
- Checks: `npm run typecheck` passes; `npm test` 462 passed (new: rows per width and balanced splitting); `npx tsx tools/verify-content.ts` no problems; `npm run build` passes; `npm run test:e2e` 14 passed (the screen test now also checks the 12-stage world wraps at 1100 and never scrolls sideways). The `m2-1-*.jpg` proofs were saved again because the stand-in's first world changed.

![[m2-1-world-map-1100x700.jpg|800]]
*The 12-stage first world at the minimum size: two rows of six, no sideways scroll.*

- Decisions made: A390 in `docs/decisions.md`.

## M1.6b Progress wiring (progress-and-rules, builder-rules)
- What changed: the World Map, hints, concept quests, breakdowns, the daily quest, and drills now answer for real instead of saying "not built yet". The app reads the lessons it loaded at startup to know each quest's place, price, and prerequisites, and to find every question that can quiz each term, pattern, and code-reordering exercise. Answers are marked in the main process, terms enter the review schedule when a concept quest is finished, a breakdown keeps the first plan and shows the closest reference plan before grading the revision, and drills come in three kinds: today's review, a world's test-out, and the reorder exercise offered after two failed submits.
- What was found and solved: taken literally, the unlock rule would have locked every concept quest forever, because it asks for a quest's terms to be familiar before the quest that teaches them; now only terms some concept quest teaches can lock a quest, and never the quest that teaches them (A312). A world's test-out now happens only in that world's test-out drill, not after any drill (A313).
- How to see it: no new screen yet (the quest screens are M2.2). Run `npm test`; `tests/progress/progressContentHandlers.test.ts` walks through every method on a small set of lessons, from a locked World Map to a passed test-out.
- Proof: typecheck passes. Unit tests: 37 files, 454 passed; the progress tests are 198 of them (21 new for the mapper, the item bank, and the ten methods, including a full due drill, a test-out, and the reorder fallback). Build passes. End-to-end: 4 of 4 passed. Content verifier: no problems.
- Decisions made: A310 to A319 in `docs/decisions.md`.
- Not done or left for later: AI grading of explain items and breakdowns uses the self-check fallback until the review service is connected (it needs the settings service); the swap is one line (A318). The daily quest offers no short build until content can say a build adds no new class (A311, a content-engine follow-up). Drill sessions are not saved across a restart (answers are).

### Fix round 1
- What the reviewer asked for: (1) a drill with nothing due was filled with practice items and still paid 10 XP, so it could be repeated for XP; (2) the daily limit of 20 reviews applied per drill, so a large backlog could be cleared in one day; (3) a world whose quests named a term no concept quest teaches could never be tested out; (4) the test-out asked about patterns the learner had not built yet; (5) one concept question could appear twice in a drill when it quizzed two due terms; (6) mark the progress and drill rows done in the app-shell IPC table.
- What changed: the branch was first rebased onto main (keeping both sides of the decisions and iterations). Practice drills still run, but XP, the streak, and the daily drill offer count only when the drill held at least one item that was actually due (A320). The daily limit now counts every item reviewed since midnight, across all drills (A321). A world's test-out uses only the terms some concept quest teaches, and only the patterns whose card is already unlocked (A322). A question already in a drill is not shown again for another term (A323). The IPC table rows are marked done.
- Proof: typecheck passes. Unit tests: 40 files, 489 passed (482 after the rebase plus 7 new: practice drills pay nothing four times in a row and a real due drill the next day pays 10; a backlog of 25 spreads over two drills and leaves 5 for tomorrow; the cap counts distinct reviews since midnight; one question never repeats; a world with an untaught term tests out; patterns join a test-out only once their card is unlocked). The practice-drill test and the repeat-question test fail when their fixes are switched off. Build passes. End-to-end: 14 of 14 passed (with M2.1's screens now on main). Content verifier: no problems.
- Not done or left for later: nothing new; the M1.6b list still stands.

### Fix round 2
- What the reviewer asked for: the daily limit still leaked. When a drill had room left, it filled up with other items the learner had met, and those could include items due today beyond the limit of 20, so they were reviewed early and moved past today.
- What changed: the filler now skips every item due by the end of today. Items within the limit come in as due items; the rest wait for tomorrow.
- Proof: typecheck passes. Unit tests: 40 files, 490 passed, including a new one: 30 items due, twelve drills in a row, and only the first 20 had their schedule moved today, with 10 still waiting for tomorrow. It fails on the round 1 code. Build passes. End-to-end: 14 of 14 passed.
- Not done or left for later: nothing new; the M1.6b list still stands.

## M0.2c Settings service (app-shell, builder-shell)
- What changed: the Settings and first-run screens now talk to real settings. The app remembers the engine folder, the sandbox folder, the loop mode, the review choice, the model, the theme, and a new editor port setting in one small settings file, and reads it once at startup. The API key is locked with the computer's own keychain before it is saved; the window is only ever told whether a key is stored, never the key. Finishing first-run setup is remembered, so the next launch skips it. The Title screen's status chips now come from real checks: the engine in settings, whether the sandbox has been built, which reviewer would be used right now, and the loop mode.
- What can go wrong and how it is handled: if the keychain is locked or unavailable, saving a key answers a plain message with what to do, and nothing is stored. A setting that was hand-edited into something invalid resets to its default on its own, without touching the others. If one status check fails (the engine folder was moved, say), only that chip shows as missing.
- What was tried and what was solved: the full end-to-end run failed once on the window-size check (853 high instead of 858). The same check also fails on main from time to time (2 of 8 runs in a side-by-side try): the screen's usable height moves by a few points while the app starts, most likely the Dock resizing as Electron windows open and close. It is not caused by this change; reported to the Lead, no test edited.
- How to see it: `npm run dev`, open Settings, change the loop mode or the reviewer, quit and relaunch, and the choice is still there. Paste any text as an API key and the screen shows it as stored; the settings file holds only scrambled bytes.
- Proof: typecheck passes; unit tests: 48 files, 539 passed (7 skipped, as on main), including a settings round trip, the key stored and cleared through a fake keychain, and a locked keychain giving the clear error; content verifier: no problems; build passes; end-to-end: 14 passed. Nothing new on screen beyond real values, so there is no new screenshot.
- Decisions made: A420 to A426 in `docs/decisions.md`.
- Not done or left for later: `editorConnected` stays false until the fast loop (M1.4). The review handlers (provider list, Claude Code test, review steps) are ai-review's to wire against the review service the composition root now builds. The old sandbox path store in the unreal folder is unused and can be deleted by its owner. The Settings screen has no field for the editor port yet.
- Proof paths: `tests/settings/settingsService.test.ts` (settings, key, first run, environment status), `tests/ipcHandlers.test.ts` (the settings channels through the real handler table).

### Fix round 1
- What the reviewer asked for: (1) the settings took any folder the window sent: a made-up sandbox folder and `/tmp` as the engine were both kept, and setup could be marked finished with them; (2) a damaged settings file stopped the app from starting at all; (3) the entry needed the paths of its test files.
- What changed: the window can no longer set the sandbox folder (only clear it); the sandbox setup sets it after creating the folder. An engine folder is checked with the engine finder before it is kept, and a folder that is not an engine gets the finder's own plain message. Finishing setup checks both again: the engine must still be an engine and the sandbox folder must hold the Dojo project. A damaged settings file is renamed to `config.invalid-<time>.json` next to it, a fresh one starts from the defaults, and one line goes to the log (A427 to A429).
- What was tried and what was solved: checked in the built app with a deliberately broken settings file in a throwaway user data folder: the app opened, the broken file sat beside a fresh one, `/tmp` as the engine was refused with "That folder does not look like an Unreal Engine install.", a sandbox path was refused at the door, the real engine at `~/Applications/UE_5.8` was kept, and finishing setup was refused because no sandbox exists yet. One end-to-end run failed on a hover tooltip in the World Map test, which runs only against the window's fake data; it passed 3 of 3 alone and the whole suite passed on the rerun.
- Proof: typecheck passes; unit tests: 52 files, 619 passed (7 skipped, as on main), with the new refusals and the damaged-file recovery in `tests/settings/settingsService.test.ts` and the refusals through IPC in `tests/ipcHandlers.test.ts`; content verifier: no problems; build passes; end-to-end: 14 passed.

## M3.1 Pack 2 lesson zero and the Observer arc (content-patterns, author-patterns)
- What changed: Pack 2, Patterns in Unreal, now exists with its first world, "The lens, then the first payoff" (seven quests). Lesson zero teaches how to judge a design by the price of the next change. Then the arc for the pattern Unreal hands over most completely: a concept quest on the engine's delegates that never names the pattern, a worked build, a concept quest that names what was just built (Observer), a stub build in a different mechanic, a refactor of tightly wired code into it, and a "when not to use it" quest. The world also holds Observer, ahead of the Time world, so lesson zero has a payoff in the same sitting (A370).
- The quests and their observables:
  - Judge a design by the price of the next change (concept): predict, card, six questions.
  - Announce it once, let anyone listen (concept): native and dynamic multicast delegates, binding, unbinding in EndPlay, dependency direction.
  - A bounty board that hears every fall (build, worked): three foes with 1, 2, and 3 hits to defeat; each `ke * TakeHit` in the console moves the board from 0 / 3 to 1 / 3, 2 / 3, then BOUNTY DONE. The foes never know the board exists.
  - What you just built has a name (concept): the Observer card, plus recognize items such as spotting engine overlap events as a subject.
  - A tutorial sign that stops listening when it is done (build, stub): two `ke * Pull` runs take the sign from "Pull the lever: 2 left" to "Well done", after which the sign has unbound itself. The Level Blueprint can also listen to the lever's On Pulled event. Its one deliberate failure: a sign wired twice hears every pull twice (A376).
  - Unplug the generator from its devices (refactor): `ke * Toggle` twice still lights and darkens the lamps and sounds the alarm once, but the generator no longer knows lamps or alarms exist.
  - When a plain call beats a delegate (concept): five cases, with the binding-order trap as the example.
- The Observer card in the pattern list now lists the two build quests as use cases, with one new recall item and one new when-not scenario. No new glossary terms were needed; six delegate terms now point to the delegates concept quest as their first quest (A379).
- Proof, all on UE 5.8.3 on the MacBook Air, each sandbox a fresh copy of the template, built and tested with the commands in the unreal-pipeline spec under the shared engine lock:
  - Reference solutions: build succeeded, 9 of 9 tests passed.
  - Starters: all three compile; 7 of 9 tests fail. The refactor's behavior test passes on its working starter by design, and so does the sign's reflection test (its declarations are given). Each quest has at least one failing test.
  - The deliberate failure, checked on its own: the reference sign with plain `AddDynamic` fails only `WiredTwiceHearsOnce` (heard 2, expected 1, plus the engine's duplicate-binding ensure).
  - Content verifier `--pack patterns` on main: no problems. The full M1.8 checks, run from the unreleased verifier branch on a copy of this content, also report no problems (fade ladder, unlock graph, cross-quest dependencies, solution files).
- Not done: World 1 has no breakdown or boss yet (A380). No screenshots: nothing ran in the editor's viewport, because this Mac's editor runs with `-NullRHI`. Windows is unverified. Decisions A370 to A381.

### Fix round 1
- Rebased on main. The full verifier now on main reports no problems for `--pack patterns`.
- The delegates quest now says what really happens when an `AddDynamic` handler lacks UFUNCTION. The engine logs an ensure when you bind, the binding still counts as bound, and every broadcast silently skips the handler; nothing crashes. The old spot-the-bug item, whose bug was a missing line, is now a multiple-choice "what happens" question.
- Originality (D13): lesson zero no longer echoes the source's definition of coupling. It now counts a dependency as the files a reader has to open (the gate depends on the alarm), and the fill-blank asks for "depends". The Observer card's intent, problem, and two items no longer use an achievements system or coin milestones; they use this world's foes, bounty boards, crowd, and scoreboard. The lapsed-listener example on the card and its spot-the-bug item now use a round bounty board that the arena respawns every round, instead of a UI screen. The when-not quest's choice about achievements is rewritten the same way.
- Rubrics now only ask for what the briefs say: the tutorial sign's brief now states what Watch does with an empty lever, a finished step, or a different lever. The refactor's rubric drops "reconnecting to another generator", which the working starter never did, and its brief now states that connecting twice must leave one binding, which the tests check.
- Lesson zero no longer lists `coding-standard`. `endplay` now points to the delegates quest as its first quest. A379 and A381 are corrected (A381 now says the unlock also needs Pack 1 World 1 terms at Familiar).
- Engine, UE 5.8.3 on the Mac, fresh sandboxes from the rebased template under the engine lock: reference solutions 9 of 9 pass; starters all compile and 7 of 9 fail, the same split as before (the refactor's behavior test and the sign's reflection test pass on their starters by design).

### Fix round 2
- The Observer card's lapsed-listener sentence is corrected: a plain `AddLambda` capturing the board does not keep it alive. Garbage collection never sees the binding, so the retired board keeps counting until it is freed, and the next broadcast then calls into freed memory.
- The `multicast-delegate` glossary entry's example now uses this world's bounty board, crowd audio, and scoreboard instead of an achievement tracker (D13). Verifier `--pack patterns`: no problems. No code or tests changed, so the engine results from fix round 1 stand.

## M2.1d Codex search keeps the keyboard's choice (ui-core, builder-ui-core)
- What changed: in the Cmd+K search, a result row that appeared under a pointer resting over the panel took the highlight, so Enter opened that row instead of the top match (the tester saw "Save Game" open instead of "UPROPERTY" in 2 of 5 runs). The highlight now follows the pointer only when the pointer itself moves; rows that appear or slide under a still pointer (while typing, or while the panel rises into place) leave the keyboard's choice alone. The arrow keys and typing stay in charge. Each time the panel opens, the pointer's resting place is forgotten, so a pointer moved while the panel was closed does not count either. Two small World Map touches from the last review: a boss stage reads "The training yard" with a capital once its "Boss:" prefix is dropped (also on the Studio's shipped titles), and a small turn mark shows where a wrapped path continues on the next row.
- How it was checked: a new screen test, which runs on every e2e run, turns animation on (the panel's rise is what slides rows under the pointer) and opens the search five times. Each time it rests the pointer just inside where the second result row will land (then the fourth, in turn), types, presses Enter, and expects the top match to open. On the old code it failed on the first or second opening in every try, on the second row as well as the fourth; with the fix it passed three runs in a row (15 openings). The same test checks that moving the pointer onto a row still highlights it. The QA harness's stopgap of parking the pointer in the corner can stay.
- Checks: `npm run typecheck` passes; `npm test` 596 passed, 7 skipped by their own suites (new: the pointer-moved rule and the boss title wording); `npx tsx tools/verify-content.ts` no problems; `npm run build` passes; `npm run test:e2e` 15 passed. The `m2-1-*.jpg` proofs were saved again.

![[m2-1-world-map-1100x700.jpg|800]]
*At the minimum size the 12-stage world wraps after six stages; the small turn mark under the end of the first row shows the path continues below.*

![[m2-1-codex-search-1100x700.jpg|800]]
*Codex search: the top match stays highlighted until the keyboard or a real pointer movement changes it.*

- Decisions made: none new; the pointer rule is a bug fix under A240's data layer and A390's path layout.

## M1.8b Verifier follow-ups (content-engine, builder-content-engine)
- What changed:
  - **Bare-name includes:** a quest that includes another quest's header by its bare file name, which compiles because every quest folder is on the include path, must now declare that quest on its "Compiles against earlier quests:" line just like a path include. Two quests sharing a file name is reported, since such an include would pick one of them silently.
  - **Ctrl+C:** stopping an engine run with Ctrl+C or SIGTERM now kills the running build or editor and keeps the sandbox copy for inspection.
  - **Template copy:** build products in the sandbox template are no longer copied.
  - **Starter checks:** each starter is now checked in the sandbox a learner would have at that quest. It holds that quest's starter, everything the quest builds on (including a boss's extended pieces when the quest comes after the boss), and nothing later. This lets a World 2 quest rely on the World 1 boss's additions.
- How to see it: `npx tsx tools/verify-content.ts --engine ~/Applications/UE_5.8`, then press Ctrl+C during the build. It prints where it stopped and where the sandbox is kept, and exits with code 130.
- Proof:
  - typecheck passes.
  - `npm test`: 51 files, 601 tests passed.
  - The verifier on main's content reports no problems and 5 warnings: coverage, plus two bosses without integrations.
  - Ctrl+C on the real engine 25 s into the first build: the verifier reported "cancelled during the first build" and exited 130. The sandbox's `Build.sh`, UnrealBuildTool, and clang processes, alive before the interrupt, were gone 5 s after it. The only Unreal process left was another session's editor.
  - `--engine` with the new per-check sandbox, started once no other Unreal work had run for 30 s: all 9 reference solutions pass and all 9 starters fail, in 515 s (first build 50 s, tests 42 s, starter checks 422 s).
- Decisions made: A440 (Ctrl+C and exit code 130), A441 (bare includes are dependencies), A442 (no shared file names), A443 (per-check sandbox).
- Not done or left for later:
  - no boss integration is on main yet, so the boss override path has only been tested with the fake sandbox
  - the run has not been done on Windows

### Follow-up: clearer inconclusive starter checks
- What changed: author-foundations saw five "inconclusive" starter checks on World 2 and could not see why, because the sandbox had been deleted. An inconclusive check now quotes its first three build errors in the report, and the sandbox and its build logs are kept whenever any check is inconclusive.
- Proof: 106 content tests pass, including the quoted errors and the kept sandbox.

## QA harness and engine smoke (qa-and-ci, tester)
- What changed: every end-to-end test now starts its own copy of the app with an empty, throwaway settings folder, so no test can see what another one saved and none touch the real settings. Tests can now answer the app's folder pickers and message boxes without a real dialog popping up. Any failing test leaves a picture of the window as it was, and proof pictures for this file are only refreshed by tests that passed. The two existing test files were moved onto this shared setup without changing what they check. A new engine check copies the sandbox template, builds it with Unreal, runs its sample test with no editor window, and prints how long each step took.
- How to see it: `npm run build` then `npm run test:e2e` (add `SAVE_PROOF=1` to refresh the proof pictures). For the engine check: `npx tsx tools/qa/engine-smoke.ts` (add `--keep` to keep the build and test logs, `--engine <folder>` to pick an engine).
- What went wrong and how it was solved: the first harness check failed because macOS reports the temp folder through its real path (`/private/var/...`) while the test expected the short one; the harness now resolves the real path first (A280). The first failure-picture version only fired for tests that used the screenshot helper; it moved into the app fixture so every failing test gets one (A282).
- Proof: typecheck passes; unit tests 11 files, 132 tests passed; content verifier exit 0 (10 files, no problems); build passes; end-to-end 8 passed in 4.8 s (4 harness checks, the smoke test, the 3 ui-core tests). Failure path: a copy of the smoke test with a wrong expected version, run with `SAVE_PROOF=1`, failed as intended, wrote `test-results/.../failure.png`, and left `docs/iterations/m0-1-window.png` untouched; the same smoke test passing with `SAVE_PROOF=1` copied its picture into `docs/iterations/` (that refresh was then reverted, as the picture had not changed).
- Engine smoke on the MacBook Air M5, UE 5.8.3 (launcher install), from `main` plus this branch (the template is unchanged from `main`):

```
step                          seconds  result
copy template                       0  ok
build DojoEditor                 19.1  exit 0
headless Dojo.Sample.Health      21.2  exit 0
total                            40.3  PASSED

report: 1 passed (0 with warnings), 0 failed, 0 not run, engine-reported test time 0.012 s
  Success                Dojo.Sample.Health.TakesDamage (0.012 s, 0 errors, 0 warnings)
```

  An earlier run the same hour (before a small cleanup of the report reader) also passed: build 22.5 s, headless run 34.7 s, total 57.2 s, while other sessions were busy on the machine. Both match the cold-build and headless timings in `docs/systems/unreal-pipeline.md`.
- Decisions made: A280 to A285 in `docs/decisions.md`.
- Not done or left for later: save dialogs are not stubbed yet (no screen uses one). I ran the engine check only against the passing template; the reviewer later exercised its failure path (see Fix round 1). Unverified on Windows: the `--user-data-dir` switch, the dialog stubs, and the engine check's `Build.bat` call through `cmd.exe`. The engine check now uses SandboxProjectService (see "Moved onto M1.3" below).

### Fix round 1
- What the reviewer asked for: (1) on Windows, the engine check would break on any folder with a space in it, such as the default `C:\Program Files\Epic Games`, because of how the command was handed to the Windows command prompt; (2) when a Windows build timed out, only the command prompt was stopped, not the build it started; (3) leftovers: the engine check did not say where its temp folder was when it stopped with an error, a failed app launch in the harness left its temp folder behind, and the second harness check only worked if it ran right after the first. The reviewer also corrected this entry: they did run the engine check's failure path (a failing test gave exit code 3 from the editor, FAILED in the table, and exit 1 from the check).
- What changed: the engine check now writes the whole Windows command line itself, with every path in quotes, the way Node does it for its own shell mode (A286), and a unit test checks the line for an engine and a project that both live in folders with spaces. A timeout on Windows now stops the build and everything it started. The engine check prints its temp folder if it stops with an error; a failed app launch deletes its temp folder; and the folder-isolation check now launches the app twice inside one test, so it passes on its own or in any order.
- Proof: typecheck passes; unit tests 12 files, 134 tests passed (2 new, for the Windows command line); content verifier exit 0; build passes; end-to-end 8 passed, and the folder-isolation check also passed run alone; no harness temp folders were left behind. Engine check rerun on the Mac, UE 5.8.3: build 22.2 s, headless run 36 s, total 58.2 s, PASSED, `Dojo.Sample.Health.TakesDamage` Success.
- Not verified here: the Windows command line and the tree kill on a real Windows machine; the "print the temp folder on an error" path and the failed-launch cleanup were not forced to happen.
- Follow-up decided by the Lead after this round: only the app's Unreal services may start Unreal, so the Windows command line and tree kill written here are temporary. When M1.3 merges, the engine check moves onto those services, reruns under the engine lock, and this code is removed.

### Moved onto M1.3
- What changed: after M1.3 merged, the engine check stopped starting Unreal itself. It now asks the app's own sandbox service to copy and build the sandbox and the app's own test runner to run the sample test, so the Windows command line, timeouts, and stopping a stuck build are handled in one place for the whole project (A63). The Windows quoting code and its test from fix round 1 are deleted (A286 and A284 marked superseded). The branch was rebased onto `main`, and the newer ui-core tokens test from `main` was moved onto the harness again.
- Proof: typecheck passes; unit tests 47 files passed and 1 skipped, 522 tests passed and 7 skipped; content verifier: 24 files (1 pack, 1 world, 12 quests), no problems; build passes; end-to-end 18 passed. Engine check on the MacBook Air M5, UE 5.8.3, run under the shared engine lock:

```
step                                     seconds  result
create and build sandbox                    20.0  ok
headless Dojo.Sample.Health.TakesDamage     19.2  exit 0
total                                       39.2  PASSED

  passed  Dojo.Sample.Health.TakesDamage (0.012 s in the engine)
```

  An earlier run under the lock, before the table's column width was fixed, also passed: 27.5 s, 28.5 s, 56.0 s total.
- Not done or left for later: `e2e/ui-core-screens.spec.ts` arrived on `main` after the harness and still launches the app its own way; ui-core is changing it right now, so moving it onto the harness is left as a follow-up. The engine check's failure path was not rerun after the switch. Unverified on Windows.

### Fix round 2
- What the reviewer asked for: (1) the smoke test's exact window-height check failed about a third of runs on this MacBook Air, because macOS reports the usable screen height as 858 or 859 between launches and can fit the window to the other value; (2) with real settings coming (M0.2c), every test file still launching the app its own way must move onto the shared setup, so no test run uses the learner's real settings.
- What changed: when the screen is what limits the window's height, the check now allows 1 point either way; a window that gets its full 1440x900 is still checked exactly (A118). The ui-core screens test file moved onto the shared setup, so now every test file uses it and every test gets its own empty settings folder. Moving it exposed one test that failed about 2 runs in 5: a fresh window opens under the mouse pointer, and the Codex search highlights whichever result appears under the pointer, so Enter opened Save Game instead of UPROPERTY. The test now moves the mouse to the corner first; the real fix (highlight only when the mouse actually moves) belongs to ui-core, because a learner resting the pointer there would hit it too. The screenshot helper learned to save ui-core's smaller JPG proof pictures.
- Proof: the smoke test run 20 times: 18 passed and 2 failed in the first batch, whose error text I did not capture; then 15 of 15 and a second batch of 20 of 20, recording errors, with the machine heavily loaded by other sessions. The Codex search test alone: 2 of 5 failed before the pointer fix, 10 of 10 passed after. Full checks after rebasing onto `main`: typecheck passes; unit tests 51 files passed and 1 skipped, 593 passed and 7 skipped; content verifier no problems (5 warnings, all in content); build passes; end-to-end 18 passed.
- Not done or left for later: the cause of the 2 smoke failures in the first batch is unknown (no error text was kept); the 35 runs after them all passed. The Codex palette's mouse-enter highlight is for ui-core to fix in `src/`.

### Fix round 3
- What the reviewer asked for: the 1 point allowance on the window height was not enough. In 5 of 25 launches the usable screen height was 853 when macOS sized the window and 858 a moment later, because the Dock grows and shrinks as other sessions' Electron icons come and go; the window stays 853.
- What changed: when the screen is what limits the height, the smoke test now only checks that the window fits: at least 700 and no taller than the screen allows (and never above 900). A window that gets its full 900 is still checked exactly, and the width is still exact (A118, now naming the Dock as the cause).
- Proof: the smoke test 30 times in a row: 30 passed, with the machine loaded by other sessions (load average about 13). Typecheck and build pass; unit tests 593 passed and 7 skipped; end-to-end 18 passed.
- Not done or left for later: the Codex palette's resting-pointer highlight is with ui-core (M2.1d).

### Fix round 4
- What the reviewer asked for: the height range from round 3 was too loose, so a window wrongly set to 1440x800 or 1440x720 would still pass. Also, `main` had new ui-core screen tests (two World Map checks and the resting-pointer test) that launched the app the old way.
- What changed: when the screen limits the height, the window must now be within 12 points of the screen's limit (and never below 700); 12 covers the 1 point rounding and the Dock's 5 point change, and nothing more (A118). The full 900 and the width are still checked exactly. After rebasing onto `main`, the ui-core screens file was moved onto the shared setup again with its new tests, and the mouse-parking workaround from round 2 is gone because ui-core fixed the palette.
- Proof: a temporary copy of the smoke test that forces the window to 1440x800 failed ("height 800 against a screen limit of 851", 51 points off), and one forced to 1440x720 failed (129 points off); the copy was then deleted. The real smoke test passed 30 of 30 with the machine heavily loaded (load average 15 to 20). Full end-to-end suite twice: 19 passed both times. Typecheck passes; unit tests 622 passed and 7 skipped; content verifier no problems (5 warnings, all in content).

## M1.6c Revealed hints persist (progress-and-rules, builder-rules)
- What changed: a hint spell the learner paid for now stays revealed. The save file remembers which hints of each quest were revealed, the quest comes back from the main process with those hint texts already filled in, and asking again for a hint already paid for shows it again for free instead of charging for another. Older save files are upgraded on load: their count of revealed hints becomes the list of the first hints, which is what they were.
- How to see it: no new screen in this task; the build quest screen can now show the revealed hints straight from the quest data. Run `npm test`; `tests/progress/revealedHints.test.ts` reveals two hints, restarts the app on the same save, and checks the hints are back, a repeat costs nothing, and the pass is charged for two hints, not three.
- Proof: typecheck passes. Unit tests: 53 files, 628 passed and 7 skipped (the skipped ones need Unreal); the progress tests are 212 of them, 6 new (restart round trip, the world view, reveal order and free repeats, the version 1 migration, loading and rewriting an old save, and saves the migration must leave alone). Build passes. End-to-end: 15 of 15 passed. Content verifier: no problems (5 warnings from the content packs, not this task).
- Decisions made: A500 to A503 in `docs/decisions.md` (indexes and save version 2, the optional hint index, hint texts with the quest, and the small edits outside this system: the renderer fake fixture, the IPC signature, the request schema, the quest type).
- Not done or left for later: the build quest screen (ui-quests) should read `revealedHints` from the quest and send the hint index when it asks for a hint; until it does, nothing breaks, it just asks for the next hint as before. builder-review's M1.7c adds fields to the attempt record and the save schema; expect a small rebase there.

### Fix round 1
- What the reviewer asked for: when the save file could not be opened (for example one made by a newer version), opening a build or refactor quest now failed, because adding its revealed hints read the whole save, which is refused in that state. It also copied the whole save once per quest.
- What changed: the branch was first rebased onto main. The revealed hints of one quest are now read through a small accessor that answers "none" when the save is refused, so quests and worlds load as before, just without revealed hints.
- Proof: typecheck passes. Unit tests: 637 passed and 7 skipped, including a new one where the save is refused and both the quest and the world still load with no revealed hints; it fails on the first round's code. Build passes. End-to-end: 19 of 19 passed on two runs in a row; one earlier run had a single text check fail that did not repeat (logged as flaky, not traced to this change).

## M2.3b World 1 follow-ups: miss penalty in the boss, enum names in the State card (content-authoring, author-foundations)
- What was asked: in the training yard boss, pressing keys on lowered targets cost nothing, so mashing 1 to 6 broke every target as it rose; the Lead decided a hit on a lowered or broken target is a miss that costs 5 points (A330). Separately, one State pattern card question still used enum values without the enum's initials (A66).
- What changed: the boss spec now says a refused hit is a miss: the target's label reads MISS, the score drops by 5 and never below 0. The fixed numbers, the "additions" piece and both reference plans, the integration rubric, and the feel criterion all carry it. The miss count and the penalty are listed as boss additions next to Lower and ResetHits, so the World 1 build quests stay one idea each (A331). The door example in the State card now uses EDS_Closed and friends (A332).
- Proof: the verifier on the foundations pack reports no problems. Under the shared engine lock on the Mac (UE 5.8.3), the four World 1 reference solutions, which the boss uses as its pieces, rebuilt (`Result: Succeeded`) and passed 8 of 8 headless tests; the pieces' code did not change in this task. Nothing visible in the app changed, so no screenshots; the build log and report were in this session's scratch folder and are not kept.
- Decisions made: A330 (the Lead's), A331, A332.
- Still open: Windows, and the verifier's `--engine` mode on this content.

### Fix round 1
- What the reviewer asked for: the boss reset its targets with Repair, which only acts on a broken target, so a target that ended the round lowered kept its hits, its misses, and its MISS label into the next round. Also: say plainly that misses made while the score is 0 still count against points earned later.
- What changed: the boss now lists a fifth addition, `ResetForRound` on the pop-up target, which lowers it from any state, clears hits and misses, and refreshes the label. Both reference plans' reset steps, the "additions" piece, the round-reset piece, and the integration rubric use it, and the line saying Repair clears misses is gone. The spec now says the keeper subtracts every miss from the points earned and only then clamps at 0 (A338).
- Proof: the verifier reports no problems for the boss quest. Spec text only; no code changed, so nothing was rebuilt. Nothing visible in the app changed.
- Decisions made: A338.

### Fix round 2
- What the reviewer asked for: the Blueprint plan's auto lower used a Delay, which ignores new calls while it counts, so with a rise every second only the first target would ever drop; and the bell rang "once" with nothing clearing that, so round 2 never rang. The Lead also asked for a full read of the boss as a learner building round 1 and then round 2.
- What changed: both plans now remember each target's rise time and lower every target up for 2.5 seconds or longer on a 0.1 second looping timer, and the spec says why a Delay does not work. The bell step names a "bell rung this round" flag, and the rubric says it is cleared for round 2. The read-through found two more gaps of the same kind: keys pressed between rounds would have added misses to the next round, and a C++ director never receives keys unless it calls EnableInput. So the round now ends by stopping timers and keys and showing the score, and starts by resetting targets, dummies, the bell flag, and the rise times before anything runs; keys only work while a round runs (A339).
- Proof: the verifier on the foundations pack reports no problems. Spec text only; no code changed. Nothing visible in the app changed.
- Decisions made: A339.

### Fix round 3
- What the reviewer and the Lead asked for: nothing in the boss started a round, and the C++ plan had no round timer to end one. The Lead also decided (A67) that every boss ships a compiled C++ reference integration of one plan, with automation tests that play two rounds, because reading boss text kept missing gaps.
- What changed: round 1 starts when play begins, R starts the next round only between rounds (the one key that works then), and both plans name a non-looping 45 second round timer that ends the round. The boss now ships `tools/solutions/f1-boss-training-yard/`: a yard director that follows the C++ plan, extended copies of the pop-up target, dummy, and score keeper with the five additions, and two tests. One test leaves the yard alone for a whole round and checks that at most 2 targets are up (and that the limit is reached), that no target stays up much past 2.5 seconds, that the round ends at 45 seconds, and that keys do nothing afterwards. The other plays two strong rounds with one deliberate miss each and checks the miss floor at 0, the MISS label, 145 after six broken targets, the bell ringing once at 150 and not again, 165 at the end on the keeper's label, R ignored during a round, and a full reset before round 2. The spec gained the "Compiles against earlier quests" line for its four pieces. The build found no further text errors (A340).
- Proof (UE 5.8.3 on the Mac, fresh copy of main's sandbox template, under the shared engine lock): build `Result: Succeeded`; headless run 10 succeeded, 0 failed: Dojo.F1.TrainingYard.RhythmAndLimits and Dojo.F1.TrainingYard.TwoRoundsPlayAlike, plus the seven World 1 piece tests running against the extended piece files, plus the sample. To check the test can fail, the director was rebuilt once with the bell flag never cleared: Dojo.F1.TrainingYard.TwoRoundsPlayAlike then failed on "Round 2: the bell rings once at 150" (1 instead of 2), and the real code was put back. The verifier on the pack reports no problems. Nothing visible in the app changed; logs were in this session's scratch folder.
- Decisions made: A340.

### Fix round 4
- What the reviewer asked for: no test proved that round 2 starts with every target's hits cleared, because every target ends round 1 broken whether or not the hits were reset; and the content-authoring spec did not describe the boss solution layout.
- What changed: after R starts round 2, the test now waits for a target to rise, hits it once, and checks it drops to lowered with its label reading Down instead of breaking, and that both dummies' labels read 3 again. `docs/systems/content-authoring.md` now describes the boss solution layout (A67, A340).
- Proof (UE 5.8.3, main's template, engine lock): with every solution and both boss integrations, the build succeeded and the headless run passed 22 of 22, including Dojo.F1.TrainingYard.TwoRoundsPlayAlike with the new checks. Mutation: with ResetForRound changed to keep hits, TwoRoundsPlayAlike now fails ("One hit in round 2 drops the target instead of breaking it"; the label read Broken), and so does Dojo.F2.TargetRack.RecallForgetsLastUse; the real code was put back. Nothing visible in the app changed.

## M4.x Pack 1 World 2: memory and ownership (content-authoring, author-foundations)
- What was asked: write Pack 1 World 2 the way World 1 was written, reusing World 1 on purpose.
- What changed: World 2, "Memory and ownership", continues the training yard: the client now wants targets that come and go. It holds 12 quests: six concept quests (garbage collection; TSubclassOf and SpawnActor; Destroy, IsValid, and EndPlay; weak and soft references; the three ways to create objects; TSharedPtr and TUniquePtr), four build quests from worked to blank, a breakdown, and a boss. Two build quests reuse World 1 classes unchanged and name them in a "Compiles against earlier quests" line (A268). Each build quest has a reference solution in `tools/solutions/f2-*/`, automation tests, three hints, a rubric, and an alternative; the worked, faded, and stub quests carry Parsons blocks. No new glossary terms were needed (SetLifeSpan is an alias of Destroy); 14 entries now point to their first quest.
- The build quests, with what the learner sees:
  1. Worked: a dummy spawner. `ke * SpawnDummy` places World 1 training dummies in a line; picking a Blueprint child in its class picker spawns that instead. Five marked lines to explain.
  2. Faded: a clay disc that removes itself after 3 seconds (SetLifeSpan) or at once when shattered, and logs which in EndPlay.
  3. Stub: a spotter whose label reads TRACKING and the disc's name, then LOST once the disc is gone. The world's deliberate failure: the usual first try, a strong pointer checked against nullptr, still reports a destroyed disc, because the pointer is not null until garbage collection.
  4. Blank: a target rack that spawns 3 World 1 pop-up targets once and lends them out and takes them back, never making more. Its alternative names the pattern: Object Pool.
- Breakdown: a clay disc thrower (arc, air limit of 3, spotter on the newest disc, hit and miss counter), with a spawn-per-throw plan and a reuse plan.
- Boss: the clay range (10 discs, a throw every 2 seconds, Space shatters the spotted disc, a fallen disc spawns a penalty dummy that pauses throwing until struck down, every third shatter in a row lends a bonus target for 4 seconds; best round 175; reference game Duck Hunt's clay shooting).
- What went wrong and how it was solved: the clay disc's lifespan never ran out in the test world. The engine's timer manager only ticks once per engine frame number, and the test helper did not advance it, so every timer in a quest test fired at most once. The fix (one line in the helper, unreal-pipeline's file) was reported to the Lead and landed on main with M1.3 (A336).
- Proof (MacBook Air M5, UE 5.8.3, under the shared engine lock):
  - Verifier on the foundations pack: 37 files, 24 quests in 2 worlds, no problems.
  - A fresh copy of main's sandbox template with every World 1 and World 2 reference solution and quest test: build `Result: Succeeded`; headless run 17 succeeded, 0 failed. The nine World 2 tests are Dojo.F2.DummySpawner.SpawnsInALine and .NoClassNoDummy, Dojo.F2.ClayDisc.FallsAfterFlight and .ShatterIsImmediate, Dojo.F2.Spotter.LosesDestroyedTarget and .WatchedFieldIsWeak, and Dojo.F2.TargetRack.LendsAFixedSet, .RecallsAndReuses, and .CleansUpOnEndPlay.
  - Starters, each swapped in alone with every other quest on its solution: the dummy spawner builds and fails both its tests; the clay disc builds and fails both its tests; the spotter builds and fails its main test (its reflection test passes on the empty starter, since there is no field yet to check); the target rack fails to compile.
  - Typecheck and unit tests pass.
  - Nothing visible in the app changed, so no screenshots; logs and reports were in this session's scratch folder and are not kept.
- Decisions made: A333 to A337.
- Still open: Windows; the verifier's `--engine` mode on this content; NewObject, soft references, smart pointers, and ConstructorHelpers have concept quests but no World 2 build quest (A333).

### Fix round 1
- What the reviewer asked for: UE 5.8 runs garbage elimination by default, so when an actor is destroyed the next garbage collection sets every reflected reference to it to null. Several World 2 texts claimed a strong reference keeps a destroyed actor alive, and the thrower breakdown read a fate from destroyed discs. Also: the target rack's Recall let a half-hit or raised target carry that into its next use; the breakdown's arc needs a gravity scale to fit all three numbers; registration of constructor-made components happens when the actor enters the world; the rack brief lacked its SlotSpacing default; one clay disc assertion name claimed more than it tested; and one destructor question had more than one wrong line.
- What changed: the destroy card now says collection nulls reflected pointers and leaves raw ones dangling, the second reason for UPROPERTY. The weak-reference card, its spot-the-bug item, the spotter's alternative and test wording, and decision A335 now describe the ghost a strong reference shows until collection, and the ownership a weak pointer states in its type (A342). The thrower breakdown records a hit when the shot goes through the thrower and counts a disc that turns invalid without one as a miss, and its arc works out launch velocity and gravity scale. The rack now calls `ResetForRound`, added by the World 1 boss, on every recalled target; the rack lists that boss in its prerequisites and its "Compiles against earlier quests" line, and a new test (Dojo.F2.TargetRack.RecallForgetsLastUse) checks that a half-hit target lent again needs two fresh hits and rests lowered (A341, the Lead's decision). The registration wording, the SlotSpacing default, the assertion name, and the destructor question (now "which function should hold the cleanup") are fixed.
- Proof (UE 5.8.3 on the Mac, main's sandbox template, under the shared engine lock): the verifier on the pack reports no problems. All World 1 and World 2 solutions, with the World 1 boss's extended pieces in place: build `Result: Succeeded`, headless run 20 succeeded, 0 failed (including the new rack test). Starters, each alone: the dummy spawner and the clay disc build and fail both their tests; the spotter builds and fails its main test; the target rack fails to compile. Nothing visible in the app changed.
- Decisions made: A341 (the Lead's), A342.

### Fix round 2
- What the reviewer asked for: the target rack's last rubric bullet still said the pop-up target is reused without changes.
- What changed: it now says the pop-up target is reused as the training yard boss extended it, with no further changes. Text only; committed together with M2.3b fix round 4.

### Boss reference integration (A67)
- What was asked: the clay range boss was held back from review until it shipped a compiled C++ reference integration with tests that play two rounds.
- What changed: `tools/solutions/f2-boss-clay-range/` now holds a clay range actor that follows the C++ plan, the dummy spawner extended with DestroyAll, and two tests. One plays two perfect rounds (every disc shot the moment the spotter has it, every bonus target broken) and checks R is ignored during a round, the spotter only ever watches clay discs, three bonuses, 175 on the label, every bonus target back in the rack, keys ignored after the round, and round 2 starting from 0. The other lets discs fall and checks the broken streak, one penalty dummy per fallen disc, no throws while one stands, oldest-first strikes, throwing resuming, and every penalty dummy gone at the round end. Building it found four gaps in the spec, all fixed in the text, both plans, and the rubric: no round start, reading a destroyed disc's fate, a bonus target that could never take its second hit, and a round that could end while a bonus was still lent (A343).
- Proof (UE 5.8.3, main's template, engine lock): every solution and both boss integrations built and passed 22 of 22 headless, including Dojo.F2.ClayRange.PerfectRoundsPlayAlike and Dojo.F2.ClayRange.FallenDiscsCostTime. The first run failed one assertion because the test pressed Space one frame before the first disc existed; the test now waits for the disc. The verifier on the pack reports no problems. Nothing visible in the app changed.
- Decisions made: A343.

### Rebase onto main
- What happened: the branch was rebased onto main (e2e746a), keeping both sides in the docs. The glossary merged badly where the patterns pack had also set `endplay`'s first quest, so it was rebuilt from main's file with this branch's first-quest links added; `endplay` keeps main's `p1-multicast-delegates`. Main's newer verifier requires every quest named in a "Compiles against earlier quests" line to be a prerequisite, so the dummy spawner now lists f1-training-dummy and the target rack lists f1-popup-target.
- Proof: the full verifier reports no problems (4 warnings that are release-time coverage checks and the format example's missing integration); typecheck passes; unit tests 622 passed, 7 skipped.

### Boss fix round 1
- What the reviewer asked for: a mutation run showed three spec promises could break with no test failing: the spotter watching the newest disc, a fallen disc resetting the streak, and the round waiting for a lent bonus target. Also three wording fixes in the spec and plans: who removes the penalty dummies, no "fate" read from a destroyed disc, and where the Blueprint plan shows the score, plus the oldest-first penalty list and "Watch with nothing" in the plans.
- What changed: two new tests. Dojo.F2.ClayRange.SpotterAndStreak checks the spotter watches the newer of two discs and moves to the older after a shot, then shoots two discs, lets one fall, shoots one more, and checks no bonus is lent. Dojo.F2.ClayRange.BonusGetsItsTime earns the last bonus on the ninth disc, leaves it unbroken, shoots the tenth, and checks the bonus is still out and the round still running at 3.8 seconds, then hidden, back in the rack, and the round over after 4. The spec says DestroyAll is the spawner's and the range calls it; both plans' penalty steps say a disc found invalid without a recorded hit calls SpawnDummy and keep an oldest-first penalty list; the Blueprint plan shows the score on a Text Render actor and calls Watch with nothing at the end.
- Proof (UE 5.8.3, main's template, engine lock): every solution and both boss integrations built and passed 24 of 24 headless (one logged an unrelated engine warning about a missing iOS device tool). Mutations, each rebuilt and run on its own, then restored: watching the oldest disc fails SpotterAndStreak ("With two discs in play the spotter watches the newer one"); a fall that does not reset the streak fails SpotterAndStreak ("The fall reset the streak, so the third shot in all earns no bonus"); ending the round while a bonus is lent fails BonusGetsItsTime ("The round keeps running while the bonus is still lent"). The verifier on the pack reports no problems. Nothing visible in the app changed.

## M1.8c Missing boss integration is an error (content-engine, builder-content-engine)
- What changed: now that both Pack 1 bosses ship a compiled reference integration, a pack boss without one fails the verifier instead of only warning. The format example boss in `content/examples/` still only warns, and says it is a format example, until it gets an integration of its own (A520).
- How to see it: `npx tsx tools/verify-content.ts`. Delete or rename a Pack 1 boss's folder in `tools/solutions/` and it fails with "no reference integration".
- Proof:
  - typecheck passes; 107 content tests pass, including a pack boss without an integration (error) next to the example boss (warning).
  - The verifier on main's content: 46 files, no problems, 4 warnings (coverage, plus the example boss).
  - `--engine ~/Applications/UE_5.8` under the shared engine lock (taken 15:12, released 15:21): all 18 reference solutions pass, namely 16 build and refactor quests across the two Pack 1 worlds and the examples, plus both Pack 1 boss integrations. All 16 starters fail. 536 s in all (first build 50 s, tests 23 s, starter checks 463 s).
- Decisions made: A520.
- Not done or left for later: a reference integration for the example lighthouse boss (about 500 to 700 lines, like the Pack 1 bosses). The A68 gate check comes from builder-rules in M1.6d.

## M1.6d Pack 4 gate by world id (progress-and-rules, builder-rules)
- What changed: the last pack (Systems Lab) used to wait for "world 5 of Pack 1 and world 4 of Pack 2", which broke as soon as Pack 2 switched to one world per pattern. It now waits for two named worlds, Pack 1's Communication world and Pack 2's Component world, wherever they end up in the list. Neither world is written yet, so the pack stays locked and says so ("the component world's boss (not released yet)") instead of opening by accident. The content checker now warns whenever the gate names a world that is missing or has no boss, and treats it as an error in the release check.
- How to see it: `npx tsx tools/verify-content.ts` prints two "pack gate" warnings today, one for each world not written yet. `npm test` runs the gate and check tests.
- Proof: typecheck passes. Unit tests: 645 passed and 7 skipped (they need Unreal); 9 new: the gate found by id with the Component world at any position and a decoy world 4 boss that no longer counts, the pack staying locked while either world is missing, other packs not gated, and the checker's warnings for a missing pack, a missing world, and a world with no boss, quiet when both exist, errors with `--release`, and quiet on an empty content folder. Build passes. Content verifier: no problems, 7 warnings (the 2 new gate warnings plus 5 from the packs). End-to-end: 19 of 19 passed.
- Decisions made: A510 (the world ids and how a missing world keeps the pack closed) and A511 (the checker warning, added as one new verifier check).
- Not done or left for later: the authors of Pack 1 world 5 and the Pack 2 Component world must use the ids `communication` and `component` (A510). content-engine may want to mention the new check in its spec.

## M2.2 Quest screens (ui-quests, builder-ui-quests)
- What changed: every quest can now be played. Clicking an open stage on the World Map, Studio's Continue, Start drill, or a world's Test out opens the matching screen. All of it runs on built-in sample data for now, and that sample data is the real Pack 1 World 1 (the training yard), so what you see is the actual content.
  - Concept: a no-penalty guess first, then the card with underlined terms that show a short definition on hover (with Read more and Drill me), the example in a real code editor with Check syntax, then the questions. Answers are graded together; each question then shows whether it was right, the explanation, and for the one-sentence question the model answer.
  - Drill: one item at a time, mixing recall, pattern discrimination, fill the blank, spot the bug, a Parsons reorder (put shuffled lines in order; the decoy lines are marked with what is wrong about them after you check), and a one-sentence explanation. A miss says "due for review" and when it comes back, never "lost". The finish card shows the score, XP, the streak kept, and the next due date.
  - Breakdown: the spec on the left, a board in the middle where pieces (class, component, data, event, step) each need a name and a purpose, with arrows for owns, listens to, spawns, and then. Everything can also be done from the side panel with the keyboard. Submit shows your plan beside a reference plan, names the patterns for the first time, and asks for a revision note; the grade follows.
  - Build: brief, editor, and runs in three columns. On a worked quest you first say in a sentence why each marked line is there; then the editor unlocks and the model reasons show. Run is free (Cmd/Ctrl+Enter), Submit records the attempt (Cmd/Ctrl+Shift+Enter), Cmd/Ctrl+S saves (it also saves by itself every few seconds). The right column shows the build's progress with Cancel, the tests, the build log, the hint spells with their XP cost, and after two failed submits the "rebuild it from shuffled lines" offer.
  - Loot: the score counts up, XP is itemized, then what changed (level, cards flipping in, skills, spree, streak, chest, what unlocked, next reviews), the review with every rubric line, findings grouped by severity with a free "Why?", a reflection question, and after a pass an alternative solution. Improve, See it run, and Next close it. When the reviewer timed out, the review says so and offers Retry review.
- How to see it: in the project folder on the Mac, `VITE_DOJO_FAKE=quests npm run dev`, then open the World Map. The first world is the real training yard.
- Proof (MacBook Air M5): `npm run typecheck` passes; `npm test` 41 files, 485 tests passed; `npm run build` passes; `npx tsx tools/verify-content.ts` no problems; `npm run test:e2e` 20 passed, including the new quest flow (6 tests) and ui-core's screens.
- Screenshots (1280 wide unless named otherwise):

![[m2-2-concept-predict.jpg|800]]
*Concept: a guess before the card. Wrong guesses cost nothing.*

![[m2-2-concept-card-hover-term.jpg|800]]
*The card with a glossary term's hover card open, and the example in the editor below.*

![[m2-2-concept-results.jpg|800]]
*Questions graded together: each shows its explanation; the one-sentence question shows the model answer.*

![[m2-2-concept-loot.jpg|800]]
*Concept loot: score, XP, what changed.*

![[m2-2-drill-pattern-discrimination.jpg|800]]
*Drill: which pattern fits, answered wrong on purpose: the right pattern is marked and the note says why the pick does not fit.*

![[m2-2-drill-parsons-marked.jpg|800]]
*Drill: Parsons reorder after checking. The decoy line is marked with its mistake and the working order is shown.*

![[m2-2-drill-spot-the-bug.jpg|800]]
*Drill: spot the bug, with the fix.*

![[m2-2-drill-explain-graded.jpg|800]]
*Drill: one-sentence explanation, graded, with the model answer.*

![[m2-2-drill-summary.jpg|800]]
*Drill finish: right count, XP, streak kept, next due date.*

![[m2-2-breakdown-plan.jpg|800]]
*Breakdown: the spec, the board, and the side panel (pieces, purposes, arrows).*

![[m2-2-breakdown-compare.jpg|800]]
*Breakdown after Submit: your plan beside the reference, the patterns named, and the revision note.*

![[m2-2-breakdown-loot-grade.jpg|800]]
*Breakdown grade: required pieces covered or missing, concerns, strengths.*

![[m2-2-build-gate.jpg|800]]
*Build, worked level: explain each marked line before the gaps open.*

![[m2-2-build-run-fails.jpg|800]]
*Run on the starter: it builds, both tests fail with their messages.*

![[m2-2-build-hint.jpg|800]]
*A hint spell revealed, with the cost of the next one.*

![[m2-2-build-run-passes.jpg|800]]
*After filling both gaps: Run passes every test.*

![[m2-2-build-loot.jpg|800]]
*Build loot after Retry review: the pass keeps its XP.*

![[m2-2-build-loot-review.jpg|800]]
*The review: rubric lines, a finding explained with Why?, the reflection answered.*

![[m2-2-build-failed-submit-offers.jpg|800]]
*Two failed submits: the Parsons fallback, and the Seer Stone offer explaining that it arrives later.*

![[m2-2-build-1100x700.jpg|800]]
*Build at the smallest window (1100x700): the brief is folded to a strip so the editor has room.*

![[m2-2-breakdown-1100x700.jpg|800]]
*Breakdown at 1100x700.*

- Decisions made: A350 to A364 in `docs/decisions.md`. The ones that need another system: A356 (Retry review submits again; a `retryReview(attemptId)` method would avoid a new attempt), A357 (bought hint texts are forgotten on restart; `getQuest` should return them), A358 (no method yet to view the reference solution), A352 (hover terms use a temporary linker until M1.8's TermLinker merges).
- Not done or left for later: the boss's piece picker and integration build (a boss opens on its breakdown only); the Seer Stone flow (M3.3); everything here runs on the sample data until the run, review, and drill services are wired; unverified on Windows.

### Fix round 1
- What the reviewer and the Lead asked for: merge main (where the sample map's first world became the real World 1, already passed), make the quest flow start that world fresh again, steady a flaky editor step in the test, stop the build's right column scrolling sideways, give the breakdown board room at the smallest window, mark Parsons answers fairly, use the merged term linker, make the sample breakdown grader honest, keep the first pass's score after Retry review, and some polish.
- What changed:
  - The sample data for the quest screens starts Pack 1 World 1 untouched again (no passes, attempts, or rematches for it), so first passes pay XP, hints cost XP, and failed submits count.
  - Hover terms now come from content-engine's term linker, so plain words in prose link too, the same way the Codex and the verifier see them.
  - Build: the brief starts folded below 1600 wide and folds itself when the gaps open, so the editor has room while you write; a newly bought hint scrolls into view; the right column's buttons wrap instead of pushing the column wider.
  - Breakdown: below 1300 wide the spec folds to a strip (a button opens it), so the board is at least 450 pixels wide at 1100x700; in the compare step the two boards stack at that size.
  - Parsons: after checking, a decoy line is marked, but it no longer turns every line after it red: only the lines out of order are marked, and identical lines (two closing braces) count as interchangeable.
  - The sample breakdown grader no longer lets one big piece cover seven required pieces: each of your pieces counts for at most one.
  - After Retry review, the loot keeps the first pass's score, pass label, and XP; the new review shows its own score.
- Proof (merged with main at e2e746a): `npm run typecheck` passes; `npm test` 54 files, 651 passed, 7 skipped; `npm run build` passes; `npx tsx tools/verify-content.ts` no problems (5 warnings from content); `npm run test:e2e` 21 passed, three runs in a row.
- Screenshots: every picture above was taken again from this version.

![[m2-2-breakdown-1100x700.jpg|800]]
*Breakdown at 1100x700 with the spec folded: the board keeps its room.*

![[m2-2-build-failed-submit-offers.jpg|800]]
*Build at 1280 wide after two failed submits: the right column's buttons wrap, nothing scrolls sideways.*

- Decisions made: fix round notes under A351, A352, A355, A356, and A360.

### Fix round 2
- What the reviewer and the Lead asked for: the breakdown compare step was unreadable below 1300 wide (the stacked boards drew their cards 4 to 5 pixels tall), and World 1's Test out reason in the quest sample data still said every quest was passed.
- What changed: below 1300 wide each board now takes the full width, one above the other, and the revise panel follows (the page scrolls). Each board picks its columns from its own shape, so eight pieces lay out four by two in a wide box. The revise panel lists the reference plan as text: every piece with its kind, and every arrow in words, so it can be read at any size and by a screen reader. The Test out reason now follows the world's real standing in the sample data. The quest flow tests now run on the QA harness: each test gets a freshly launched app with its own settings folder.
- Proof (merged with main at 55a2b80): `npm run typecheck` passes; `npm test` 54 files, 660 passed, 7 skipped; `npm run build` passes; `npx tsx tools/verify-content.ts` no problems (5 warnings from content); `npm run test:e2e` 26 passed, three runs in a row.

![[m2-2-breakdown-compare-1100x700.jpg|800]]
*Breakdown compare at 1100x700: both boards full width and readable.*

![[m2-2-breakdown-compare-text-1100x700.jpg|800]]
*The reference plan as text in the revise panel.*

- Decisions made: fix round 2 note under A355.

### Fix round 3 (revealed hints persist)
- What changed: with M1.6c merged, the build screen shows the hints you already paid for from the quest itself, so they are there after leaving and coming back (and, in the real app, after a restart). Revealing asks for a specific hint by number: if that hint was already paid for (a stale screen, a double click), it comes back free instead of charging for the next one. The sample data keeps revealed hints the same way.
- Proof (merged with main): `npm run typecheck` passes; `npm test` 55 files, 668 passed, 7 skipped; `npm run build` passes; `npx tsx tools/verify-content.ts` no problems (5 warnings from content); `npm run test:e2e` 26 passed, three runs in a row. The build flow now leaves the quest after buying a hint, comes back, and checks the hint is still shown and the button offers hint 2.
- Decisions made: A357 marked superseded by A500 to A502.

### Fix round 4
- What the reviewer and the Lead asked for: right after Submit plan the page jumped down to the piece form (1100x700) or past the revision note (1440x900); and main's unit tests must not fail just because an author edited World 1.
- What changed: the piece name box only takes focus for a piece you just added, and the compare step opens at its top with the reference heading in view; at 1440 the revision note and Grade come before the reference plan as text, so they are on screen at once. The sample data's copy of World 1 is no longer committed: it is built from the content folder whenever the app or the tests are built, so there is nothing to drift.
- Proof (merged with main): `npm run typecheck` passes; `npm test` 56 files, 677 passed, 7 skipped; `npm run build` passes; `npx tsx tools/verify-content.ts` no problems (6 warnings from content); `npm run test:e2e` 27 passed, three runs in a row. Two compare-step checks now run, at 1100x700 and 1440x900.

![[m2-2-breakdown-compare.jpg|800]]
*Breakdown compare at 1280x800 right after Submit plan: it opens at the top.*

- Decisions made: A365 (the fake's World 1 built from content); fix round 4 notes under A351 and A355.

## M1.3b Run wiring, skipped prerequisites, and the syntax check (unreal-pipeline, builder-unreal)
- What changed: the window can now run a build quest for real. Pressing Run sends the learner's files to the app, which finds the quest and the sandbox, builds, runs the quest's tests in a headless editor, and streams progress under the run's id; Cancel stops it by id. When a quest builds on code from earlier quests (the score keeper uses the training dummy and the pop-up target), the app checks those earlier quests first. Any the learner skipped or has no files for is filled with its reference solution, and the progress stream names the files and says why. A concept quest's scratch buffer can now be checked by the real compiler in about half a second, with errors on the right line. Rebuild sandbox works from Settings.
- What was tried and what was solved: the syntax check reuses the exact compile settings Unreal's build tool wrote for a sandbox file, so it sees the same headers and precompiled header as a real build. The first engine run showed two false reports in a clean snippet: `#pragma once` warns in a scratch buffer, and without Unreal's code generator `Super::BeginPlay()` pointed at the wrong class. Both are handled now (A403). The engine folder is now saved with the sandbox, because a run only carries a quest id and files (A400).
- How to see it: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/runQuest.test.ts` creates a sandbox through the real handler, runs `f1-score-keeper` through `runQuest` with its two earlier quests filled from their reference solutions, and checks a clean and a broken scratch buffer. In the window, the Build screen (M2.2) is the first screen that calls these.
- Proof: the real-engine run on UE 5.8.3 under the engine lock, 3 of 3 passed: sandbox created; the score keeper built and its test `Dojo.F1.ScoreKeeper.ScoresMixedTargets` passed in 35 s, with both reference fills reported; two syntax checks in 0.6 s, the clean one with no diagnostics and the broken one with "unknown type name 'flot'" on line 10. The M1.3 headless loop test also passed 7 of 7 in the same session. Trimmed output: `docs/iterations/m1-3b-runquest-run.txt`.
- Decisions made: A400 to A405 in `docs/decisions.md`.
- Not done or left for later: (packaging of the solutions was done in the follow-up below, A406.) No Windows syntax check yet (A402). `openEditor` waits for M1.4 (A405). `submitQuest` (review and rules on top of a run) is not part of this task.

### Follow-up: reference solutions in the packaged app
- What changed: with the Lead's permission, the installer now ships the reference solutions as `solutions/` next to the content, and the app reads them from there when installed (A406). A packaged app can now fill skipped earlier quests too.
- Proof: `npx electron-builder --mac dir` built `dist/mac-arm64/Unreal Dojo.app`, whose `Contents/Resources/solutions/` holds the four World 1 solutions (`f1-practice-bell`, `f1-popup-target`, `f1-score-keeper`, `f1-training-dummy`, header and `.cpp` each).

### Fix round 1
- What the reviewer asked for: (1) the syntax check called a snippet clean whenever no error pointed into the snippet itself, so errors inside engine headers, a stale precompiled header, and a timeout all passed; (2) a quest that builds on a boss, or on a piece "as extended by" a boss, was not handled; (3) a passed quest whose sandbox files were missing got the reference even when the learner's own code was saved; (4) two quick syntax checks shared one file; plus a rebase onto main and removing the old settings adapter.
- What changed: the syntax check now fails whenever the compiler fails. An error inside an engine header is shown on the line of the learner's code that caused it; when the compiler gives no such line, it appears on line 1 with the header's own message. A timeout says so. Each check writes its own files and deletes them afterwards (A410, A411). Earlier quests are now found by every known quest id on the "Compiles against earlier quests:" line (A407). A passed quest's missing files come back from the learner's saved code first, and files already in the sandbox are never touched (A408). A boss the later quest builds on comes back with its own code (never its tests) and its extended versions of piece files, which win over the plain piece files (A409). One routine that reads a boss's reference folder is now shared by the content verifier and the app. Main now has a settings service, so the pipeline reads and saves the engine and sandbox folders through it, and the temporary storage classes are deleted (A426).
- Found on the engine: clang lists the chain of template steps only for the first of two errors a bad `MakeShared` causes, so the second error first landed on the forward declaration's line. It now reuses the line of the error before it, and both land on the line that calls `MakeShared`.
- Proof: real-engine runs on UE 5.8.3 under the engine lock. The headless loop passed 7 of 7, and `runQuest` passed 4 of 4: the score keeper with both prerequisites filled; a fixture boss after a reset, whose extended pop-up target header replaced the plain one, whose tests were not written, and whose later quest passed (`Dojo.Fx.AfterYard.Bonus`); a typo on line 10; and a MakeShared of an incomplete type now failing with both errors on line 5. Trimmed output: `docs/iterations/m1-3b-runquest-run.txt`. No real boss solution exists yet, so the boss case uses a fixture until World 2's boss lands.

### Fix round 2
- What the reviewer asked for: (1) a syntax check that never ends (a snippet that includes a named pipe) never answered and left the compiler running, because only the outer `xcrun` was killed; (2) a boss or piece filled from its reference did not bring its own earlier quests, so in a recreated sandbox the World 2 target rack failed on the World 1 boss's practice bell; plus three small wording fixes.
- What changed: short commands now start in their own process group. On the time limit the whole group is killed and the check answers at once that it took too long (A412). The run now follows each earlier quest's own "Compiles against earlier quests:" line, the brief for a build quest and the spec for a boss, all the way down, by the same rules (A413). When the compiler fails without a message about the snippet, the line-1 error now quotes its first error line. The fill reason says "missing from the sandbox", since a quest reset does not delete sandbox files. A400 no longer names the deleted adapter.
- Proof: a unit test runs a real child process that leaves a blocking grandchild on stderr. With a 0.5 s limit it answers within 3 s, and the grandchild is gone. A unit test covers the bell case: a target rack built on a boss whose spec names the bell. On UE 5.8.3 under the engine lock, 11 of 11 passed. The fixture boss now also includes the practice bell, and the run reported "Filled f1-practice-bell ... from the reference solution", built, and passed `Dojo.Fx.AfterYard.Bonus`. Trimmed output: `docs/iterations/m1-3b-runquest-run.txt`.

## M4.P2.2 Pack 2 World 2, Time: the Game Loop arc (content-patterns, author-patterns)
- What changed: the Patterns pack has a second world, "Time", with the full mini-arc for Game Loop (six quests). Unreal runs the outer loop itself, so the learner builds the part an Unreal programmer still writes by hand: a bank that spends each frame's real time in whole fixed steps, so a trap, a replay, or a rolling hazard plays the same at any frame rate. The pattern is named only after the first build (A473).
- The quests and their observables:
  - Every frame is a different length (concept): Tick, DeltaSeconds, tick groups, `stat fps` and `t.MaxFPS`, and why a "keep 98 percent" rule cannot be fixed by scaling.
  - A blade that swings the same on every machine (build, worked): a damped swinging blade stepped 32 times a second. In the editor it swings and settles in the same time under `t.MaxFPS 20` as uncapped; in the tests, one second fed at 64, 8, and 4 frames per second leaves exactly the same angle, and the drawing sits halfway between steps when half a step is banked.
  - The loop you never write, and the clock you do (concept): the Game Loop card and recognize items.
  - A replay ghost that keeps its own clock (build, stub): a recorded four-second dash replayed by fixed steps. The label counts Step 0 / 64 up to DONE, double speed finishes in half the time at the same spot, and 0 pauses. Its deliberate failure: one Advance carrying three seconds must not turn into a sprint (A474).
  - Take the boulder's drag off the frame rate (refactor): a boulder whose drag was applied per frame now stops at the same spot at 30, 60, and 120 frames per second, and rolls exactly as tuned at 60.
  - When to leave the clock alone (concept): no second loop or sleeping on the game thread, DeltaSeconds for ordinary rates, timers and physics substepping first, and always cap a bank.
- Also: a new `physics-substepping` glossary entry, the game-loop card's two use cases and two new items, `firstQuestId` on `tick`, `deltatime`, and `tick-groups` (A476).
- Proof, UE 5.8.3 on the MacBook Air, fresh copies of the sandbox template, commands from the unreal-pipeline spec, under the shared engine lock:
  - Reference solutions for both patterns worlds: build succeeded, 18 of 18 tests passed (9 new).
  - Starters: all compile; 15 of 18 fail. On the World 2 side, every test fails except the boulder's 60 frames per second test, which passes on the working starter by design.
  - The obvious replay ghost (no cap): only `HitchDoesNotTurnIntoASprint` fails, with "expected 4, was 32".
  - Content verifier `--pack patterns` (full M1.8 checks on main): no problems.
- Not done: no breakdown or boss for Time yet (A470); Update Method and Double Buffer come next in this world. No screenshots: the Mac's editor runs with `-NullRHI`. Windows unverified. Decisions A470 to A477.

### Fix round 1
- The frame-time card now says how DeltaSeconds is shaped before Tick sees it: time dilation scales it, and World Settings' Max Undilated Frame Time (0.4 seconds by default) caps it, so a long stall reaches Tick as 0.4 seconds. The replay ghost brief, the game-loop card's recall item 4, and A474 now describe the three-second hitch as one direct `Advance` call (or a project that raised the cap), not a frame.
- A lone per-update decay is now taught as frame-rate independent with a power of DeltaSeconds. Fixed steps are kept for rules that interact within an update and for results that must repeat; the blade brief, the card, and the when-not quest say the same.
- Originality (D13): the when-not quest's runaway-bank question now uses this world's own numbers (a 1/32 second step that costs 40 milliseconds).
- Replay ghost: the brief's first line now starts at Step 0 / 64. The brief and the rubric agree that a negative playback rate is treated as 0 (the reference already clamps), and the playback test now checks it.
- Engine, UE 5.8.3 on the Mac, fresh sandboxes under the engine lock: reference solutions 18 of 18 pass (World 1 and World 2); starters compile and 15 of 18 fail, the same split as before (the boulder's 60 frames per second test passes on its working starter by design).

## M4.P2.3 Pack 2 World 3, Update Method (content-patterns, author-patterns)
- What changed: a third Patterns world, "Things that act on their own", with the full mini-arc for Update Method (six quests). Each thing that behaves over time owns a function for one frame of that behavior, and the engine calls it every frame. The learner meets it as an actor's own Tick, then as one manager walking a plain struct array, then refactors a central director into it. Per the Lead, this pattern is its own world, which changes the plan in A472 (A491).
- The quests and their observables:
  - Whose job is this frame? (concept): slicing behavior into frames, storing where you left off, update order inside a frame, tick prerequisites, and idling.
  - A drone that patrols on its own (build, worked): the >> label glides 400 centimeters, turns into <<, and comes back, even under `t.MaxFPS 2`. In the tests, three seconds in frames of 0.01, 0.1, and 1 second all end 100 centimeters out, and a single five-second frame that passes both ends still lands inside.
  - Each thing owns its frame (concept): the Update Method card and recognize items.
  - A spark swarm with one walk per frame (build, stub): `ke * Launch` sends an orange spark out that bursts into 2, then 4, then fades, while the label counts 1, 2, 4, 0, all from one actor. Its deliberate failure: sparks born mid-walk must wait a step (A494).
  - Hand the arena's behavior back to its things (refactor): braziers and sweepers waver and turn as before, but each from its own Tick, and they still move with no director in the level.
  - When nothing needs to happen every frame (concept): listen instead of polling, timers for schedules, stop idle ticking, and one walk for thousands of tiny things.
- Also: a new `tick-prerequisite` glossary entry, and the update-method card's two use cases and two new items (A495).
- Proof, UE 5.8.3 on the MacBook Air, fresh copies of the sandbox template, commands from the unreal-pipeline spec, under the shared engine lock:
  - Reference solutions for all three patterns worlds: build succeeded, 27 of 27 tests passed (9 new).
  - Starters: all compile; 22 of 27 fail. On the World 3 side, only the arena's look test (working starter) and the drone's engine-drives-it test pass, by design.
  - The obvious swarm walk (loop to the live count): fails `NewSparksWaitAStep` and `LaunchBurstsToTheEnd`, both from children moving in the step they were born.
  - Content verifier `--pack patterns`: no problems.
- Not done: no boss for this world yet (A490). No screenshots (editor runs with `-NullRHI` on this Mac). Windows unverified. Decisions A490 to A496.

### Fix round 1
- Rebased on World 2's fix round.
- Originality (D13): the world no longer echoes the source's crypt setting. It now takes place on the arena's training floor, and the refactor is `p3-arena-refactor` with `ADojoP3ArenaBrazier`, `ADojoP3ArenaSweeper`, and `ADojoP3ArenaDirector`. Two blocking examples are new: a scoreboard rolling its number up in one for loop, and a winner's banner fading in inside one loop. They replace the patrol written as loops. The card's prompts and its which-pattern item are rewritten (the item is now a pit lane in a racing game). The when-not quest's board game is now an armory shop whose prices change only on a sale. The patrol drone build stays.
- The drone brief now says its five-second update is a direct Tick call in the tests, since real frames reach Tick capped at 0.4 seconds by default. Its editor step uses Speed 900 under `t.MaxFPS 2` so each frame really carries it most of a corridor.
- `docs/product.md` lists Pack 2's worlds as one ordered list, and A370 carries a dated note that A491 supersedes it in part. A491 now records that the Lead's A68 re-pointed the Pack 4 gate.
- Engine, UE 5.8.3 on the Mac, fresh sandboxes under the engine lock: reference solutions 27 of 27 pass across the three patterns worlds; starters compile and 22 of 27 fail, the same split as before. The obvious swarm walk still fails only `NewSparksWaitAStep` and `LaunchBurstsToTheEnd`.

## M1.4 Fast loop over the editor's MCP server (unreal-pipeline, builder-unreal)
- What changed: when the Unreal editor is open on the sandbox, a run can now go through the editor itself instead of a full build plus a fresh headless editor. Unreal Dojo opens the editor with its built-in MCP server on the port from Settings, talks to it one request at a time, and closes it cleanly (asks it to quit, and only kills it if it is still there after 15 seconds). At the start of every run it picks the loop and says why in the progress line. On Windows a code change goes through Live Coding inside the open editor unless a header with Unreal reflection macros changed or files were added, which need a full build. On the Mac, where Live Coding does not exist, the editor is used only to re-run tests on code it already loaded; after a full build the open editor is marked stale and the reason tells the learner to restart it. Any editor trouble (it stops answering, a tool errors, it does not know the quest's tests) falls back to the full build, so the learner always gets an answer.
- What was tried and what was solved: the client's own tests against a fake MCP server (built from the same SDK, over real HTTP) caught that after a reconnect the client skipped test discovery, because it checked "already discovered" before reconnecting; it now reconnects first. The loop choice needs a network check, but the existing factory call is synchronous and M1.3b depends on it, so the factory now hands out a runner that makes the choice when the run starts. After a clean editor quit nothing else is killed, because the storage helper the editor starts is shared with other editors on the machine.
- How to see it: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/fastLoop.test.ts` (take the shared engine lock first). In the app nothing changes yet: the wiring into the app's services and the "open editor" request wait for M1.3b to merge (A489).
- Proof, the real run on this Mac (UE 5.8.3, editor windowless with the MCP server on a free port), all 5 steps passed in 162 s:
  - Create sandbox and cold build 21 s; run with no editor open: headless, 26 s, "Full build: the editor is not open".
  - Editor launch to answering 10.5 s; first fast run 4.4 s (includes test discovery), next fast run 32 ms; both passed 1 of 1.
  - Run after a code change: headless, 28 s, "the code changed, and Live Coding is not available on the Mac"; next run: headless, "the open editor still has older code. Restart the editor"; after restarting (26 s) the fast loop answered in 3.5 s.
  - Editor closed in 1.7 s with a clean quit; no process left on the sandbox. Full table in `docs/systems/unreal-pipeline.md`, "Measured timings".
- Checks: `npm run typecheck` passes; `npm test` 56 files, 675 passed (42 new: the MCP client against the fake server, answer parsing, every loop rule on both platforms, Live Coding answers, the editor launcher's command lines, waiting and two-step close, the fast and selecting runners with every fallback, and the new exit request); `npm run build` passes; `npm run test:e2e` 15 passed.
- Decisions made: A480 to A490 in `docs/decisions.md`.
- Not done or left for later: wiring into `createUnrealServices`, the `openEditor` request, the editor chip in `getEnvironmentStatus`, and recording sandbox builds (A489, after M1.3b). Windows is unit tested only: Live Coding's answer format (A485), closing the editor for a full build (A483), and the Windows close request (A487) are unverified on a real Windows machine. Cancel waits for the editor call in flight (A488).

### Fix round 1
- What the reviewer asked for and what changed:
  - Another program on the MCP port: Unreal's server does not complain when its port is taken, so the app could have talked to a different editor and shown another sandbox's result. The app now checks the port before opening the editor and, if anything answers there, refuses with "Port N is already in use ... change the MCP port in Settings" and opens nothing (A491).
  - Closing while the editor is busy: closing used to wait behind a running request for up to 10 minutes. It now asks the editor to quit and sets the 15 second kill first, then drops the connection so the waiting request ends at once (A487).
  - Quitting the app: a new quit hook holds the quit while the editor closes and marks the launcher as finished, so the background "reopen the editor after a full build" cannot start one during quit. It is ready for the wiring step in `src/main/index.ts` (A489).
  - Other quests' files: filling in an earlier quest's reference solution or resetting a quest changes files the editor may have loaded. The build record now remembers every quest's files as written and as last built; any real difference forces a full build on both platforms until the next one (a rewrite with the same content does not). On the Mac the quest's record must also come from the latest full build (A481, A489).
- Rebase: M1.3b is not on main yet, so this round stays on the M1.4 branch; whichever merges second fixes `tests/integration/fastLoop.test.ts` for M1.3b's new `createUnrealServices` inputs.
- Proof: the real-editor run under the engine lock passed all 6 steps in 227 s, including the new one, where a second editor on the port the first one holds is refused without starting a process. Fast runs were 3.8 s with test discovery, then 32 ms, and 4.1 s after a restart; builds were slower than in the first round (cold 52 s), with the machine busier. Full output: `docs/iterations/2026-10-21-m1-4-fast-loop-run-fix1.txt`.
- Checks: `npm run typecheck` passes; `npm test` 57 files, 689 passed (14 new: the port refusal with a fake and with the fake MCP server holding the port, close not waiting on a slow call, dispose including a reopen already on its way, the quit hook, the sandbox-change rule, the latest-build rule on the Mac, and the ledger); `npm run build` passes; `npm run test:e2e` 15 passed on the third run. The first two runs each failed a different screen test (smoke, then ui-core-screens) that passed alone; nothing in this round is wired into the app.

### Fix round 2 (rebase onto M1.3b and the re-review's Windows gap)
- What the reviewer asked for and what changed:
  - Rebased onto main after M1.3b merged. The fast-loop integration test now builds the services from M1.3b's new inputs (settings, quests, learner, reference solutions folder).
  - The prerequisite filler now reports every folder it writes, whole or in part, into the one build record, which the app's services create and hand out for the fast-loop wiring (A489).
  - Windows gap: Windows compared the learner's draft against the quest's own last build, even when a later build of another quest had compiled different files for it (for example its reference with a new reflected property). Windows now also requires the quest's last build to be the latest build, like the Mac (A481). A test covers that exact sequence.
- Proof: the real-editor run after the rebase passed all 6 steps in 156 s: cold build 27 s, headless with no editor 31 s, editor ready in 14 s, fast runs 4.3 s then 31 ms, a second editor on the same port refused, the stale-editor fallback and restart working (4.3 s after the restart), and a clean close in 1.7 s. Full output: `docs/iterations/2026-10-21-m1-4-fast-loop-run-rebased.txt`.
- Checks: `npm run typecheck` passes; `npm test` 63 files, 776 passed (3 new: the filler's write reports, a partial write in the build record, and the Windows sequence); `npm run build` passes; `npm run test:e2e` 27 passed.

## M1.4b Fast loop wired into the app (unreal-pipeline, builder-unreal)
- What changed: the fast loop from M1.4 now runs inside the app. "Open editor" opens the Unreal editor on the sandbox with its MCP server on the port from Settings and waits until it answers; asking again keeps an editor that is current, and restarts one that is stale. On this Mac, where the editor window cannot open without the Metal toolchain, it opens without a window and the fast loop still works. Every quest run now picks its loop by itself (fast when the editor already has the code, otherwise a full build), using the loop mode from Settings. Creating or rebuilding the sandbox closes an editor on that sandbox first and is remembered as a full build. Resetting a quest now also removes its files from the sandbox, as the contract always said. Quitting the app runs one sequence: cancel running builds and tests, then close the editor, holding the quit until both are done; after that no editor can be started. The Title screen's editor chip now reports a real connection.
- What was tried and what was solved: the app had two quit hooks (runs and editor), and each one's quit call let the other's quit through early, so they became one sequence (A530). The existing fast-loop engine test built its own second loop chooser around the services; now that the services choose the loop themselves, it uses theirs. Two of the new unit tests failed at first because of how the tests were written: the editor's connection is closed twice (by the close and again when the process exits), and the "never answers" case turned answering off too late. Both tests were corrected; the code was right.
- How to see it: `DOJO_ENGINE_ROOT=~/Applications/UE_5.8 npx vitest run tests/integration/fastLoopWiring.test.ts` under the engine lock. In the app, the renderer's Open editor button calls `openEditor`.
- Proof, the real run on this Mac (both engine tests in one lock hold, 11 of 11 passed, 229 s; full output in `docs/iterations/2026-10-21-m1-4b-fast-loop-wiring-run.txt`):
  - Through the app's handlers: sandbox created in 24 s; `runQuest` of World 1's training dummy with no editor open went headless, 2 of 2 tests passed in 31 s; `openEditor` had the editor answering on the settings port in 13.9 s (a second `openEditor` kept it); the second `runQuest` went through the fast loop, 2 of 2 in 4.5 s; quitting held the quit, closed the editor in 2.7 s, refused a later reopen, and left nothing running on the sandbox.
  - The M1.4 engine test, now on the services' own loop chooser, passed all 6 steps again (fast runs 4.0 s then 65 ms).
- Checks: `npm run typecheck` passes; `npm test` 66 files, 790 passed (new: the quit sequence, the editor service, the sandbox build hooks, reset removal, the settings getters, and the openEditor and reset handlers); `npm run build` passes; `npm run test:e2e` 27 passed.
- Decisions made: A530 to A535 in `docs/decisions.md`; A489 marked as wired.
- Not done or left for later: the quit is tested with a stand-in for Electron's app object, not by quitting the real app against an engine (A535). The quest id passed to `openEditor` is ignored until quests ship maps (A533). Windows is still unverified for everything editor-related (A483, A485, A487). A rebase onto main is due when M1.7c (submitQuest) merges, since both change the composition root and the handlers.
