# Decisions

Newest first inside each section. A decision names the options considered, the choice, and the reason. The Lead adds entries as it decides; Mohammad reverses any entry by adding a dated line under it.

## Awaiting Mohammad's review

(The Lead appends here. Each entry: date, decision, options considered, why, what it would cost to reverse.)

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
