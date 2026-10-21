# Decisions

Newest first inside each section. A decision names the options considered, the choice, and the reason. The Lead adds entries as it decides; Mohammad reverses any entry by adding a dated line under it.

## Awaiting Mohammad's review

(The Lead appends here. Each entry: date, decision, options considered, why, what it would cost to reverse.)

### A89 2026-10-21 What waits for M0.2b, and four renderer features placed (M0.2, builder-shell; fix round 1)
`src/shared/types/content.ts` is still empty on this branch (M0.4 is writing it). Options: invent placeholder content types in app-shell; leave content-shaped methods out. Chosen: leave them out and add them in M0.2b after M0.4 merges: `listPacks`, `getPack` or `getWorld`, `getQuest`, `getGlossary`, the flat glossary term list for Monaco, `getPatternCards`, and `startDrill` (its items carry content shapes such as questions and Parsons blocks). Fix round 1 placed four features the first version missed:
- Concept scratch buffer syntax check (`ui-quests.md`): contract method now, `checkSnippetSyntax({ questId, code })` answering `SyntaxCheckResult` (diagnostics with line, column, severity, message). A renderer-only check could only test brackets; a real check needs the platform compiler with the sandbox's include paths (for example `clang -fsyntax-only` on macOS, `cl /Zs` on Windows), so main owns it. Stub until unreal-pipeline builds it alongside M1.3; the exact command line is that task's decision.
- Test-out per world (`ui-core.md`, `product.md`): eligibility is a contract method now, `getTestOutStatus()` answering `{ eligible, testedOut, reason? }` by world id (no content shapes needed). Taking the test-out goes through `startDrill`, in M0.2b, with a request shaped `{ kind: "due" } | { kind: "test-out", worldId } | { kind: "parsons-fallback", questId }`; `DrillOutcome.testedOutWorldIds` already reports a pass.
- Parsons fallback after two failed submits (`ui-quests.md`, `product.md`): the offer itself is renderer-only (failed submits come from `PlayerProgress.attempts` for the quest, the threshold from `RulesSnapshot.failedSubmitsBeforeOffers`, the block from the quest content). Taking it is a one-item drill session through `startDrill({ kind: "parsons-fallback", questId })` in M0.2b, answered with `answerDrillItem` and `finishDrill`, so the Parsons block is scheduled like any other item. Whether that session grants drill XP is builder-rules' call.
- Worked-level self-explanations (`product.md`): stored, not graded. `QuestDraft` and `QuestProgress` gain optional `selfExplanations` (marked line key to sentence; the key format comes from the quest content in M0.4), saved through `saveQuestDraft`. The gate (every marked line explained before the gap unlocks) is renderer-only.
Reverse cost: low while only stubs exist.

### A88 2026-10-21 No "view reference solution" method yet (M0.2, builder-shell)
`docs/product.md` and ui-quests say a learner can view a reference solution (costs the quest's XP or a Seer Stone, schedules a rematch), but `docs/systems/content-engine.md` says `tools/solutions/` is "never loaded by the app". Options: add `viewSolution` reading `tools/solutions/`; add it reading a solution shipped inside the quest file; leave it out. Chosen: leave it out until the Lead settles where solutions live in the shipped app. The Seer Stone count is already in `PlayerProgress`. Reverse cost: one method.

### A87 2026-10-21 Breakdown is two calls: `submitBreakdown` then `reviseBreakdown` (M0.2, builder-shell)
The ui-quests flow shows a reference plan after Submit, asks for a revision note, then grades. Options: one call with the plan and the note; two calls. Chosen: two. `submitBreakdown(plan)` answers only which reference plan to show (the renderer already has the plans from the quest); `reviseBreakdown(revisedPlan, revisionNote)` is graded and recorded. Most of the score comes from the revision, so grading before it would waste a review. Reverse cost: low.

### A86 2026-10-21 Settings carry `hasApiKey` and `firstRunCompletedAt`; `completeFirstRun` method (M0.2, builder-shell)
The API key never leaves main, so the renderer needs a flag to show "key stored" in Settings. First run needs a durable "done" mark so the Title screen knows to skip it even if the engine later disappears (that case shows an error chip instead). Options: derive "first run done" from engine and sandbox paths; store a timestamp. Chosen: timestamp. Reverse cost: none.

### A85 2026-10-21 `BuildProgressEvent` gains `runId`, `loop`, `loopReason`, and two phases (M0.2, builder-shell)
The unreal-pipeline spec's event has no run id and five phases. Added: `runId` (the task asked for it), `loop` and `loopReason` (the spec says the loop choice and its reason go into the stream), and phases `preparing` (template copy, loop choice) and `reviewing` (AI review inside Submit), because sandbox setup and Submit stream on the same channel. Reverse cost: low while only stubs exist.

### A84 2026-10-21 Two extra shared type files and `src/main/errors/` (M0.2, builder-shell)
Options: put engine and error types inside `settings.ts` and `run.ts`; give them their own files. Chosen: `src/shared/types/errors.ts` (`AppError`, `AppErrorCode`, `isAppError`) and `src/shared/types/engine.ts` (engine installs, toolchain, sandbox folder, environment status), both re-exported from `index.ts`. `AppErrorException` (what services throw) lives in `src/main/errors/` because every service uses it, not just IPC. Spec layout updated. Reverse cost: none.

### A83 2026-10-21 Payload validation with zod schemas typed against the shared types (M0.2, builder-shell)
The Lead added zod (4.6.5, `dependencies`) in the M0.1 fix round and asked for it at the IPC boundary. Options considered first: hand-written checks (the first version of this branch); zod. Chosen: zod. `src/main/ipc/requestSchemas.ts` has one schema per request type, each declared as `z.ZodType<SharedType>`, so a schema that drifts from its shared type is a compile error; a mapped type forces one schema per method argument. Objects are strict (unknown fields rejected); ids allow only letters, digits, dot, underscore, and dash; learner file names must be plain names with a C++ or text extension (no folders, no `..`), at most 50 files of about 1 MB each; names and keys are trimmed. The handler receives zod's parsed copy, not the raw payload. Problem text (path plus zod's message, at most three issues) goes in `detail`; zod messages never include the value sent, so an API key is not echoed. Reverse cost: low.

### A82 2026-10-21 Long operations take a renderer-made run id (M0.2, builder-shell)
Options: the call returns a run id at once and the result arrives as a final event; the renderer makes the id (`crypto.randomUUID()`) and the call's promise resolves with the result. Chosen: the second. The renderer can match progress events and cancel before the call returns, and the result keeps its type on the promise instead of travelling as an untyped event. The run services must reject a run id already in use (`run-already-exists`). Reverse cost: low while only stubs exist.

### A81 2026-10-21 `DojoInvokeApi` plus `DojoApi`, channels typed as `dojo:<method>` (M0.2, builder-shell)
`onBuildProgress` is a subscription, not an invoke channel, so the request methods are `DojoInvokeApi` and `DojoApi` adds the subscription. `IPC_CHANNELS` is checked against `` `dojo:${method}` `` for every method, so a channel can never drift from its method name. The progress channel is `dojo:event:buildProgress`. The preload builds its forwarding functions from `IPC_CHANNELS`, so a new method needs no preload edit. Reverse cost: none.

### A80 2026-10-21 Failed calls reject with a plain `AppError`; methods keep `Promise<Value>` (M0.2, builder-shell)
Options: every method returns `Promise<Result<Value>>` and the renderer checks `ok` on each call; main answers an `{ ok, value | error }` envelope over IPC and the preload rejects with the plain `AppError`. Chosen: the second. Throwing straight from `ipcMain.handle` loses the code and suggested action (Electron rewrites it into "Error invoking remote method"), so the envelope stays on the wire, but the renderer API reads like normal async code and the M0.1 `getAppVersion` call and ui-core's work in progress need no change. Verified in the built app: the rejected value arrives in the page with `code`, `message`, `suggestedAction`, and `detail` intact (plain object, not an `Error`). Renderer rule: `catch (error) { if (isAppError(error)) show it }`. Reverse cost: medium once screens use it.

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
