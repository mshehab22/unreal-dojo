# Decisions

Newest first inside each section. A decision names the options considered, the choice, and the reason. The Lead adds entries as it decides; Mohammad reverses any entry by adding a dated line under it.

## Awaiting Mohammad's review

(The Lead appends here. Each entry: date, decision, options considered, why, what it would cost to reverse.)

### A19 2026-10-21 npm install scripts left unapproved; Electron downloads its binary on first use (M0.1, builder-shell)
npm 11.19 blocks package install scripts until they are approved. Options: approve them in `package.json`; leave them. Chosen: leave them. Electron 44 fetches its binary on first run when it is missing, esbuild and fsevents ship prebuilt binaries, and electron-winstaller is only for Squirrel (not used). Everything passed without them. Reverse cost: one `npm install-scripts approve` line if a later package needs it.

### A18 2026-10-21 `npm run test:e2e` does not build first (M0.1, builder-shell)
Options: make `test:e2e` run `electron-vite build` itself; keep it as plain `playwright test` against `out/`. Chosen: plain. CI already runs `npm run build` before it (research section 8), and rebuilding inside every e2e run doubles the time. The smoke test launches the project folder (not `out/main/index.js`) so Electron reads `package.json` like the packaged app does. Reverse cost: one script line.

### A17 2026-10-21 Smoke test checks the window size against the screen (M0.1, builder-shell)
On this MacBook Air the usable screen is 853 points tall, so macOS shrinks a 1440x900 window to 1440x853. Options: shrink the default size; assert exact 1440x900; assert 1440x900 capped by the work area plus the 1100x700 minimum. Chosen: the third. The spec's size stays and the test still catches a wrong size on a large screen. Reverse cost: none.

### A16 2026-10-21 React Fast Refresh loaded as a module so the CSP stays `script-src 'self'` in dev (M0.1, builder-shell)
The React Vite plugin normally adds an inline script in dev, which the CSP blocks. Options: loosen the CSP in dev with `'unsafe-inline'`; import the plugin's `@vitejs/plugin-react/preamble` module at the top of `main.tsx`. Chosen: the import; it is empty in production. The dev renderer was checked in Electron with no CSP errors. Reverse cost: one line.

### A15 2026-10-21 CSP string (M0.1, builder-shell)
Chosen: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'`, as a meta tag in `src/renderer/index.html`. Inline styles are needed by Tailwind, Motion, and React Flow; `worker-src blob:` is for Monaco's workers. Rejected: a response header set from main (does not cover `file://` loads as simply). The renderer never calls the network; the AI and MCP calls run in main. Reverse cost: none.

### A14 2026-10-21 Window code lives in `src/main/window/createMainWindow.ts` (M0.1, builder-shell)
The spec layout put the window in `main/index.ts`. Options: keep it there; give it its own file. Chosen: own file, so `index.ts` stays a short composition root and the window rules (size, security, link handling) are in one readable place. Spec layout and architecture updated. Reverse cost: none.

### A13 2026-10-21 `content/` and `resources/` ship as extraResources, outside the asar (M0.1, builder-shell)
The spec said `files` should include `out/`, `content/`, `resources/`. Options: put all three inside the asar; put `out/` in the asar and copy `content/` and `resources/` next to it. Chosen: the second. The sandbox template must be copied to disk as real files, and the UE build tools cannot read inside an asar. Code reads them through `process.resourcesPath` when packaged and the project folder in dev. Reverse cost: low.

### A12 2026-10-21 Renderer libraries are devDependencies (M0.1, builder-shell)
Options: everything in `dependencies`; only main-process runtime packages in `dependencies`. Chosen: the second. Vite bundles React, Monaco, React Flow, Motion, and the rest into the renderer, so shipping their `node_modules` copies again is waste; `externalizeDeps` keeps `dependencies` external for main and preload. Result: the dmg went from 153 MB to 129 MB. unified, remark-parse, remark-gfm, and unist-util-visit are not imported by any code yet; they stay in `dependencies` because the content parser in `src/main/services/content/` (M0.4, content-engine spec) parses quest markdown into sections in the main process. The renderer's TermLinker uses the same packages, and Vite bundles them there anyway. If M0.4 ends up parsing only in the renderer or in tools/, they move to `devDependencies`. Fix round 1 added `radix-ui` (renderer, devDependencies) and `gray-matter`, `zod`, `fast-xml-parser`, `remark-parse` (main, dependencies), pinned by the A08 rule: radix-ui 1.7.0, gray-matter 4.0.3, zod 4.6.5, fast-xml-parser 5.11.2, remark-parse 11.0.0. Rule for later tasks: a package the main process imports goes in `dependencies`, a package only the renderer imports goes in `devDependencies`. Reverse cost: none.

### A11 2026-10-21 Sandbox on from the start (M0.1, builder-shell)
The spec said sandbox on "where Monaco workers allow it". Monaco's workers are ordinary web workers and do not need Node, so sandbox is on for the only window. If Monaco ever fails under it, the build-editor task logs it and turns it off for that window only. Reverse cost: one flag.

### A10 2026-10-21 ESM app with a CommonJS preload (M0.1, builder-shell)
Options: CommonJS everywhere and `await import('electron-store')`; `"type": "module"` for the whole package. Chosen: ESM (electron-store and many current packages are ESM only, as the research recommends). Sandboxed preload scripts must be CommonJS, so the preload alone is built as `out/preload/index.cjs`. Reverse cost: low.

### A09 2026-10-21 electron-store 11.0.2 instead of 12.0.0 (M0.1, builder-shell)
12.0.0 came out on 2026-10-12, under the two-week rule. 11.0.2 (2025-10-05) is also ESM, supports Electron 30+, and has the same API the settings service needs. Options: 12.0.0 now; 11.0.2 now and bump later. Chosen: 11.0.2; bump when the settings task starts after 2026-10-26. Reverse cost: a version bump.

### A08 2026-10-21 Exact version pins, newest release that is at least 14 days old (M0.1, builder-shell)
Options: caret ranges; exact pins. Chosen: exact pins (`--save-exact`) so every worktree and CI runner installs the same tree, choosing the newest release in the decided major line published on or before 2026-10-07. Versions: electron 44.7.0, vite 8.3.3, @vitejs/plugin-react 6.1.2, react and react-dom 19.3.0, typescript 5.9.3, tailwindcss and @tailwindcss/vite 4.3.3, motion 14.0.0, lucide-react 1.52.0, zustand 5.0.15, vitest 5.0.3, @playwright/test 1.63.0, electron-builder 26.17.0, tsx 4.23.15, monaco-editor 0.57.0, @monaco-editor/react 4.7.0, @xyflow/react 12.12.0, react-markdown 10.1.0, unified 11.0.5, unist-util-visit 5.1.0, remark-gfm 4.0.1, @modelcontextprotocol/sdk 1.32.1, @anthropic-ai/sdk 0.131.0, @types/node 24.19.1, @types/react and @types/react-dom 19.3.0, clsx 2.1.1, tailwind-merge 3.7.0, class-variance-authority 0.7.1. Several are older than the research's numbers (which were "latest" on 2026-10-21). Reverse cost: bump when needed.

### A07 2026-10-21 electron-vite 6.0.0 pinned although it is only 7 days old (M0.1, builder-shell)
D01 requires electron-vite 6 with Vite 8, and 6.0.0 (2026-10-14) is the only release that supports Vite 8; 5.0.0 supports Vite 5 to 7 only. Options: electron-vite 5 with Vite 7 (breaks D01 and the Vite 8 pin); 6.0.0 now. Chosen: 6.0.0, the one exception to the two-week rule. typecheck, test, build, e2e, and package all pass with it. Reverse cost: low; drop to 5.0.0 plus Vite 7 if a 6.0.0 bug appears.

### A62 2026-10-21 Ordinary-word glossary terms link only inside inline code
From the M0.5 review: terms such as `check` and `ensure` are also everyday words ("check the flags"), and the TermLinker matches plain words case-insensitively, so prose would fill with wrong hover links. Options: drop those terms from linking; link them only in code spans; keep them linked everywhere. Chosen: an optional `linkMode: "code-only"` field on GlossaryEntry, honored by the M1.8 TermLinker; generic aliases (override, virtual, verify, assert, meta, Remove, dictionary) are removed. Reverse cost: low.

### A61 2026-10-21 The drill runner shuffles multiple-choice and which-pattern choices
From the M0.5 review: 23 of 26 authored answers sat at index 1, so position gave the answer away. Options: rely on authors spreading answers; shuffle at runtime; both. Chosen: both. Authors spread `answerIndex`, and the drill and concept screens shuffle choice order per presentation (the stored answer index refers to the authored order). Recorded in `docs/systems/ui-quests.md`. Reverse cost: none.

### A60 2026-10-21 The M0.1 scaffold from the background agent was merged; the duplicate session run is parked
When the repository was not yet trusted, M0.1, M0.5, and M1.2a ran as background agents; after trust, the original sessions also ran. For M0.1 the agent's branch was already reviewed and merged; the session branch `claude/m0-1-scaffold-de80f2` is kept unmerged for reference. For M0.5 and M1.2a the agents were stopped and the sessions kept. Reverse cost: none.
### A24 2026-10-21 Which glossary entries are code-only, and which aliases were cut (author-foundations, M0.5 fix round 1)
A62 named `check` and `ensure` and asked for any similar entries. Options: only those two; every entry whose term is an English word (Actor, Level, World, Tick); only entries whose term is a common verb or word that prose uses in a different sense. Chosen: the third, `linkMode: "code-only"` on `check-macro`, `ensure-macro`, `cast` ("cast a spell"), `destroy` ("destroy the crate"), `category-specifier` ("a category of"), and `super`. Actor, Pawn, Level, World, Tick, and similar stay linked in prose because prose in this app uses them in the Unreal sense. Aliases removed: `override` and `virtual` (super), `verify` and `assert` (check), `meta`, `Remove`, `dictionary`, `physics asset` (it named a different thing than physics simulation). Reverse cost: one field per entry.

### A23 2026-10-21 Glossary `category` stays a free display label (author-foundations, M0.5)
Options: a fixed enum in the types; a free string with a documented set. Chosen: a free string, keeping the 19 labels from the seed (`framework`, `reflection`, `collision`, `components`, `networking`, `memory`, `input`, `object model`, `build`, `debugging`, `editor workflow`, `animation`, `math`, `AI`, `containers`, `strings`, `UI`, `cpp idiom`, `physics`). Authors reuse one before adding a new one (`docs/systems/content-authoring.md`). Why: the UI only shows it as a chip and filter today, and later packs will need new labels without a type change. Reverse cost: low; the M0.4 verifier can turn the current set into an enum.

### A22 2026-10-21 Pattern card ids, order, and the three extra patterns (author-foundations, M0.5)
Options for ids: book chapter titles as written, kebab-case. Chosen: kebab-case (`game-loop`, `subclass-sandbox`), with Factory named `factory-method` because that is the variant the cards teach (a creation function plus `TSubclassOf`), not Abstract Factory. Order in `content/patterns.json` follows Part 3 of `research/patterns-inventory.md`, then Strategy, Factory Method, Facade. The inventory has no sections for those three, so their cards were written from scratch in the same Unreal-flavored form. Why: ids appear in quest front matter and drill item ids, so they must be stable and typeable. Reverse cost: low now, rising once quests reference them.

### A21 2026-10-21 Glossary docs links are locale-free and pinned to 5.8 (author-foundations, M0.5)
Options: keep the seed's mix of `/en-us/` and locale-free links with no version; pin each link with `?application_version=5.8`. Chosen: locale-free and pinned. Every one of the 125 distinct links was fetched and returns a page titled "Unreal Engine 5.8 Documentation". Seven seed API links pointed at paths that do not exist in 5.8 (5.8 flattened API paths to `API/Runtime/<Module>/<Symbol>`); they were remapped: `TSubclassOf`, `TTransform`, `TQuat`, `TRotator`, `TVector` to `API/Runtime/Core/...`, `AddOnScreenDebugMessage` to `API/Runtime/Engine/UEngine/AddOnScreenDebugMessage`, and `OpenLevel` (no member page in 5.8) to the `UGameplayStatics` class page. Why: a locale-free link lets Epic's site pick the reader's language; the version pin stops links drifting to 5.9 pages when the target engine is 5.8. Reverse cost: one find-and-replace when the target engine changes.

### A20 2026-10-21 Drill item shape for `recall[]`, `scenarios[]`, and concept `questions[]` (author-foundations, M0.5)
The content-engine spec names five item types but not their fields. Options: one loose shape with optional fields for every type; a discriminated union on `type`. Chosen: a discriminated union. Common fields `id`, `type`, `prompt`, `explanation`; then `multiple-choice` has `choices[]` and `answerIndex`, `fill-blank` has `acceptedAnswers[]` with exactly one `___` in the prompt, `which-pattern` has `choices[]` (pattern ids), `answer`, and `distractorNotes[]` of `{ choice, why }` for every wrong choice, `spot-the-bug` has `code`, `bugLine` (1-based), and `fix`, and `explain-in-one-sentence` has `modelAnswer` and `rubric[]`. Item ids are `<pattern-id>-recall-<n>` and `<pattern-id>-scenario-<n>`. Full rules in `docs/systems/content-authoring.md`. Amended in M0.5 fix round 1, as agreed with M0.4: item ids only need to be unique within their quest or pattern card. Why: it matches the `kind` union already used for quests, each type's grader needs different fields, and distractor notes come straight from the research (each wrong answer explains why it looked right). Reverse cost: medium once M0.4 types it; builder-content-engine should adopt or amend this before writing `src/shared/types/content.ts`.

### A06 2026-10-21 The Lead owns the board; builders own their iterations entry and spec
Options: every session edits `docs/plan.md`; only the Lead edits it. Chosen: only the Lead edits `docs/plan.md`. Builders append their own entry to `docs/iterations.md` and update their own `docs/systems/<system>.md` on their branch. Why: several worktrees editing one board table conflict on every merge. Reverse cost: none.

### A05 2026-10-21 M0.6 CI: workflow written and run locally now; the green GitHub run waits for a private repo
Options: create a private GitHub repo now; write the workflow and prove each step locally, push later. Chosen: the second. There is no `gh` CLI or GitHub login on this Mac, and creating the repo needs your account. A private repo is not publishing, so once you log in (`gh auth login`) the Lead creates it as private and pushes. Reverse cost: none.

### A04 2026-10-21 Start the sandbox template (part of M1.2) during M0, on the Mac
Options: wait for M0 to finish; start now. Chosen: start now as task M1.2a. It only touches `resources/sandbox-template/` and needs no Node code, and it proves the riskiest unknown (does the template build with UE 5.8 and the MCP toolset plugins) early. Reverse cost: none.

### A03 2026-10-21 UE 5.8.3 found on the Mac; the Mac becomes the first engine verification machine
Found at `~/Applications/UE_5.8` (launcher install, 5.8.3, with `ModelContextProtocol`, `AutomationTestToolset`, `LiveCodingToolset` under `Engine/Plugins/Experimental/`). Xcode 27.1 is selected. Options: keep Windows first (D16); verify on the Mac first because the Lead and builders run here. Chosen: Mac first, Windows second, logged as "unverified on Windows" until run there. Reverse cost: none; both stay required.

### A02 2026-10-21 Git repository created on `main`; `PLAN.md` deleted
The folder was not a repository. Initialized with `main`, a `.gitignore` for node, build, and Unreal output, and repo-local author Mohammad. `PLAN.md` said it could be deleted, so it was. Reverse cost: none.

### A01 2026-10-21 Node.js 24.22.1 LTS installed in your home folder
Options: Homebrew (not installed, needs admin), the official `.pkg` (needs admin), nvm, the official tarball unpacked to `~/.local/node`. Chosen: the official arm64 tarball from nodejs.org, SHA-256 checked against `SHASUMS256.txt`, unpacked to `~/.local/node`, with one PATH line added to `~/.zprofile`. Node 24 is the current LTS (26 is not LTS yet). Reverse cost: delete the folder and the line.

## Decided during planning (2026-10-21)

### D01 App shell: Electron 44 + electron-vite 6
Options: Electron, Tauri 2. Chosen Electron: process spawning and log streaming are plain Node, one language end to end, the most reliable AI-generated code, no capability allow-lists. Startup is on par with Tauri; only installer size is worse. Source: `research/tooling-and-stack.md` section 1. Reverse cost: high after the pipeline is built.

### D02 Editor: Monaco via @monaco-editor/react
Options: Monaco, CodeMirror 6. Chosen Monaco: built-in C++ tokenizer, `registerHoverProvider` and `registerCompletionItemProvider` are exactly what the glossary needs. Bundled locally with the worker setup. Reverse cost: medium.

### D03 UI: React 19, TypeScript strict, Tailwind v4, shadcn/ui on radix-ui, Motion, lucide-react
One styling system, components copied into the repo, one animation library covering counters, flips, presence, layout. No chart library; XP bar and skill tree are inline SVG. TypeScript pinned to 5.9.x; try 7.x only if everything in the chain accepts it.

### D04 Breakdown board: React Flow (@xyflow/react 12)
Options: React Flow, dnd-kit, tldraw, hand-rolled. Chosen React Flow: custom nodes as piece cards, edges as events and dependencies, group nodes, pan and zoom, MIT. Attribution link stays visible (Pro removal is paid; that is Mohammad's call later).

### D05 Markdown with hover terms: react-markdown + a small remark plugin
Renders to React elements, no `dangerouslySetInnerHTML`; a glossary term becomes a real `<HoverCard>` component. `marked` is removed from the dependencies.

### D06 State and persistence: Zustand; progress as atomically written JSON owned by the main process; electron-store for settings; API key in Electron safeStorage
Options: better-sqlite3 (rebuild per Electron major), node:sqlite (not stable), electron-store. JSON is diffable, backup-able, and survives Electron upgrades. A per-item review log is stored so FSRS can replace SM-2 later without migration.

### D07 Testing: vitest for services and rules; Playwright `_electron` for end-to-end with screenshots in CI
Native dialogs are stubbed through `electronApp.evaluate`.

### D08 Packaging: electron-builder; nsis on Windows, dmg on macOS; unsigned first
Signing and notarization documented in `docs/systems/packaging.md`; they cost money and wait for Mohammad. electron-updater through the GitHub provider later.

### D09 Unreal loop: fast loop over UE 5.8's built-in MCP server, headless loop as fallback
Verified against Epic's API docs: UE 5.8 ships `UAutomationTestToolset` (DiscoverTests, ListTests, RunTests, RunTestsByFilter, GetTestStatus, GetTestResults, StopTests) and `ULiveCodingToolset::CompileLiveCoding()` behind the editor's local MCP server at `http://127.0.0.1:8000/mcp`. The app calls these directly as an MCP client; no LLM in the loop. Live Coding does not pick up new UFUNCTION declarations or new classes, so the first build of a quest (or any header change to reflected types) goes through UnrealBuildTool; later iterations are seconds. For UE 5.4 to 5.7, the headless loop (Build.bat or Build.sh, then UnrealEditor-Cmd with `-ExecCmds="Automation RunTests ..."` and `-ReportExportPath`) is used. Both sit behind one `IRunner` interface.

### D10 Target engine: UE 5.8 on Mohammad's machines; UE 5.4+ supported through the fallback loop
Reason: D09. Epic's docs now default to 5.8.

### D11 AI review provider order: Claude Code CLI, Anthropic API key, tests-only
Claude Code is run as `claude -p` with `--output-format json --json-schema <schema> --system-prompt-file <file> --tools "" --max-turns 1 --no-session-persistence --strict-mcp-config --setting-sources user`, with `cwd` set to a clean temp folder so no project hooks or `.mcp.json` are picked up. `--bare` is not used because it cannot bill to the subscription login; if Mohammad later prefers an API key, switch to `--bare`. The API provider uses the Anthropic TypeScript SDK with the learner's key. Tests-only always works.

### D12 Game rules from the research (see `docs/product.md` and `docs/systems/progress-and-rules.md`)
Difficulty-weighted first-pass XP (repeats 0, rematches 50%, drills flat small); explanations free, hints and solutions priced; Seer Stone schedules a rematch; two meters (XP rises, mastery can fall); generous streak with two freezes and no repairs; daily quest with a monthly badge; no leagues, hearts, flat XP, or guilt copy in v1.

### D13 Content originality
The GameDev.tv exercises are used for structure, concept coverage, and the expansion proposal only. Nystrom's book is used for concepts, design decisions, and teaching order only. No sentence, exercise text, number, example message, or code from either is reproduced. Reason: publishing and possible monetization.

### D14 Quest kinds and scaffold levels
Six kinds: concept, drill, breakdown, build, refactor, boss. Build quests carry a `scaffold` level (worked, faded, stub, blank) and each world fades from worked to blank; the verifier checks it.

### D15 Lead autonomy
The Lead decides every open question itself, logs it under "Awaiting Mohammad's review", and continues. Only spending money and publishing publicly wait for Mohammad.

### D16 Platforms: Windows and macOS both first-class
All platform differences live in `src/main/services/unreal/PlatformPaths.ts`. The engine pipeline is verified on the Windows desktop first (where Unreal lives) and on the Mac second. Anything unverifiable on the current machine is logged in `docs/problems.md` as unverified, not blocked on.

### D17 Sandbox project template shipped with the app
`resources/sandbox-template/` holds a minimal C++ project (module `Dojo`, log category `LogDojo`, `Quests/`, `Tests/`, `Support/` with a test-world helper, a sandbox map, and the UE 5.8 plugins `ModelContextProtocol`, `AutomationTestToolset`, `LiveCodingToolset` enabled). First run copies it, sets `EngineAssociation`, does one full build, opens the editor once.

### D18 Docs layout
`docs/` with `plan.md`, `decisions.md`, `problems.md`, `iterations.md`, `product.md`, `systems/`. Research in `research/`. The old single `PLAN.md` is retired; its content lives in `product.md` and the system specs.

### D19 Monetization is not built in v1 but not blocked by the architecture
Packs load from folders; review providers are pluggable. Accounts are out of v1.

### D20 Session limit for the Fable model
Research agents reading whole books run on Opus when Fable's session limit is reached. The Lead follows the `/project-lead` model guidance (plan with Fable, build with Opus).
