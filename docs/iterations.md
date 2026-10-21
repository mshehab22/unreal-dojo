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

## M0.3 Design tokens, app frame, navigation (ui-core, builder-ui-core)
- The app now has its look and its frame. A dark "ink and paper" theme with one accent color per pack (amber Foundations, violet Patterns, cyan Mechanics, green Systems) replaces the placeholder, with three bundled fonts: a characterful display face for headings, a calm reading face, and a code face. A rail on the left moves between the six screens (Title, Studio, World Map, Character, Codex, Settings); each unbuilt screen shows its name, what it is for, and what a later task will put there. Cmd+K (Ctrl+K on Windows) opens a Codex search panel from anywhere and Esc closes it. A hidden page lists every token and base component for anyone building a screen.
- How to see it: `npm run dev`, then click through the rail, press Cmd+K and Esc. For the token gallery, open the dev tools console and run `location.hash = "#/dev/tokens"`. To regenerate the pictures: `npm run build`, then `npm run test:e2e`.
- What went wrong and how it was solved: the OS will not open a 1440x900 window on this MacBook Air, so the test renders the page at exact sizes instead of resizing the window (A90). The first pictures caught the rail highlight and the search panel halfway through their fade; the test now runs with reduced motion, which zeroes every animation token. The Foundations name overflowed its gallery card at 1100 wide and the World Map region names sat at different heights; both fixed.
- Proof: typecheck passes (node and web). Unit tests: 3 files, 8 tests passed (new: hash routes, and a check that the gallery's token list and `tokens.css` agree). Build passes. End-to-end: 4 passed (the M0.1 smoke test plus three new ones: every screen at both sizes with no sideways scroll, gallery shows all four accents with live values, rail navigation plus Cmd/Ctrl+K and Esc).
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
