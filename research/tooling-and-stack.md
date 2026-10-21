# Unreal Dojo: tooling and stack decisions

Researched 2026-10-21. Versions are the npm `latest` tag on that date unless noted. Engine facts come from Epic's docs, which now default to UE 5.8 (released 2026-06-17); where a 5.8 feature is not in 5.4 to 5.6, that is called out.

The repo already has a scaffold (electron-vite 4, Electron 38, React 19, Monaco, marked, Zustand, vitest, electron-builder). The recommendations below keep that direction and upgrade it; nothing here requires a rewrite.

## Decision table

| Area | Choice | Version | Why | Runner-up |
| --- | --- | --- | --- | --- |
| App shell | Electron + electron-vite | Electron 44.9.x (Node 24, Chromium 152), electron-vite 6.0.0, Vite 8.3.x | Process spawning and log streaming are plain Node (`child_process.spawn`), one language end to end, by far the most training data for AI-generated code, no Rust toolchain, no capability JSON to get wrong. Startup is on par with Tauri; only bundle size is worse. | Tauri 2 (2.12.x). Smaller installer, but every shell command must be allow-listed in capabilities with argument validators, and anything non-trivial needs Rust. |
| Code editor | Monaco via @monaco-editor/react | monaco-editor 0.57.0, @monaco-editor/react 4.7.0 | Built-in C++ tokenizer, `registerHoverProvider` and `registerCompletionItemProvider` are exactly the two APIs the glossary needs, VS Code look that learners expect. Bundle weight does not matter in a desktop app. | CodeMirror 6 (6.0.2 + @codemirror/lang-cpp 6.0.3). Much smaller, but hover and completion need more hand assembly. |
| UI | React 19 + TypeScript, Tailwind v4, shadcn/ui on radix-ui, Motion, lucide-react | React 19.3.x, TypeScript 5.9.x (7.0.x optional), tailwindcss 4.3.x, shadcn CLI 4.x, motion 14.4.x, lucide-react 1.60.x | One styling system, components copied into the repo (no runtime dependency beyond radix-ui), one animation library that covers counters, flips, presence and layout. | CSS modules + hand-rolled components (fewer deps, more code to generate); GSAP for animation (bigger, imperative). |
| Charts | None in v1; inline SVG for XP bar and skill tree | n/a | A progress bar and a tree do not need a chart library. | recharts 3.x if a real chart is ever needed. |
| Breakdown board | React Flow (@xyflow/react) | 12.12.0 | Cards as custom nodes, arrows as edges, groups as parent nodes, pan and zoom, connection validation, all built in and MIT. | dnd-kit (sortable lists only, no edges); tldraw (watermark unless you buy a business license); hand-rolled (weeks of work). |
| Markdown + hover terms | react-markdown + a small remark plugin | react-markdown 10.1.0, unified 11, unist-util-visit 5.x, remark-gfm 4.x | Renders to React elements, no `dangerouslySetInnerHTML`, the glossary term becomes a real `<HoverCard>` component instead of a string of HTML. | marked 18.x with an inline extension + DOMPurify (already in the repo; works, but produces HTML strings you then have to hydrate). |
| State | Zustand | 5.0.x | Smallest API, works in main and renderer, `persist` middleware with a custom storage adapter. | Jotai 3.x (atoms; fine but more pieces), Redux Toolkit 2.x (more ceremony than this app needs). |
| Persistence | JSON files written atomically from the main process (progress), electron-store for settings | electron-store 12.0.0 (ESM, Electron 30+) | No native module, no rebuild step, survives Electron upgrades, trivially diffable and backup-able. | better-sqlite3 13.x (needs electron-rebuild on every Electron bump); `node:sqlite` once Electron's Node exposes it as stable. |
| Testing | vitest + Playwright (`_electron`) | vitest 5.0.x, @playwright/test 1.64.x | Vitest for services and rules, Playwright drives the real Electron binary and takes screenshots in CI. | Jest (slower, extra config with ESM). |
| Packaging | electron-builder, GitHub Actions matrix | electron-builder 26.15.x | Already in the repo, NSIS and DMG out of the box, electron-updater later, Azure Trusted Signing and notarization supported. | Electron Forge 8.0.x (first-party, but its Vite plugin is still marked experimental). |
| Unreal loop (v1) | Build.bat / Build.sh + UnrealEditor-Cmd headless + index.json | UE 5.4 to 5.6 | Documented, deterministic, no editor state. 1 to 3 minutes per iteration. | n/a |
| Unreal loop (fast) | Unreal MCP (UE 5.8) AutomationTestToolset + LiveCodingToolset over HTTP | UE 5.8+ | Epic's own in-editor MCP server lists and runs automation tests and triggers Live Coding from a running editor; cuts the loop to seconds. For 5.4 to 5.6, Remote Control API + a tiny project plugin gets most of the way. | Third-party unreal-mcp projects (TCP 55557, MIT, experimental; no test or Live Coding tools). |
| AI review | `claude -p --bare` with `--output-format json --json-schema`, Anthropic TypeScript SDK as fallback | @anthropic-ai/claude-code 2.1.306, @anthropic-ai/sdk 0.137.x | Structured output straight from the CLI, no parsing of prose; the SDK path uses the same prompt with the learner's key. | Agent SDK (@anthropic-ai/claude-agent-sdk) if the review ever needs tools. |

## 1. App shell

**Choice: Electron 44 with electron-vite 6.**

Facts:

- Electron 44 (Chromium 152, Node 24) is the current major; 43 and 42 are still supported. Support for 42 ended on 2026-10-20, so pin `^44`. Source: https://endoflife.date/electron
- electron-vite 6.0.0 (2026-10-14) targets Vite 8 and declares compatibility targets for Electron 42, 43 and 44. v5 (2025-12-07) replaced `externalizeDepsPlugin` and `bytecodePlugin` with `build.externalizeDeps` and `build.bytecode` options; the repo's `electron.vite.config.ts` still uses the deprecated plugin form and should move to the options. Requirements: Node 20.19+ or 22.12+, Vite 5+. Sources: https://github.com/alex8088/electron-vite/blob/master/CHANGELOG.md and https://electron-vite.org/guide/
- Electron Forge 8.0.1 is the first-party pipeline, but its Vite plugin is still labelled experimental ("future minor releases may include breaking changes"). Source: https://www.electronforge.io/config/plugins/vite
- Startup and size: an independent measurement of the same app found Electron 273 ms to first window vs Tauri 311 ms, Electron 128 MB idle vs Tauri 109 MB, and bundle 323 MB vs 57 MB. Tauri wins on disk size only. Source: https://betterstack.com/community/guides/scaling-nodejs/tauri-vs-electron-vs-deno-vs-electrobun/
- Process spawning and log streaming in Electron is Node's `child_process.spawn` with `stdout.on('data')`, forwarded to the renderer over `webContents.send`. No framework API, no permission file. Electron also offers `utilityProcess.fork` for Node work you want off the main process (it uses Chromium's service API and exposes `pid`, `kill()`, `exit` and `error`). Source: https://www.electronjs.org/docs/latest/api/utility-process
- Tauri 2 process spawning: `Command.create(name, args).spawn()` returns a `Child` with `write`, `kill`, `pid`; `stdout`/`stderr` emit `'data'` line by line, with `encoding: 'raw'` for bytes. But every program must be declared in `capabilities/*.json` under `shell:allow-spawn` with a `name`, a fixed `cmd`, and `args` entries that are either literals or regex validators. A build tool whose arguments contain user paths needs `"args": true` or careful validators. Sources: https://v2.tauri.app/reference/javascript/shell/ and https://v2.tauri.app/plugin/shell/
- Tauri sidecars (bundled binaries) must be renamed with the target triple suffix and declared in `externalBin`. Not needed here (UE and `claude` are on the user's machine), but it shows the kind of config friction. Source: https://v2.tauri.app/develop/sidecar/
- Native dialogs: Electron's `dialog.showOpenDialog` runs in the main process; Playwright cannot intercept it but can stub it via `electronApp.evaluate`. Source: https://playwright.dev/docs/api/class-electron
- Security defaults to keep: `contextIsolation: true` (default since 12), `nodeIntegration: false`, sandbox on (default since 20), expose only narrow functions via `contextBridge.exposeInMainWorld`, never the raw `ipcRenderer`, and a CSP of `script-src 'self'`. Source: https://www.electronjs.org/docs/latest/tutorial/security

Why Electron for an AI-built app: the main process, preload and renderer are all TypeScript with Node and DOM APIs that have enormous public code volume; errors show up as type errors, not as a Tauri capability rejection at runtime or a Rust compile error. A Tauri app that spawns UBT, the headless editor and `claude` with user-supplied paths would need either loose `"args": true` scopes or Rust commands, and every change to the spawn surface touches a JSON file the agent has to keep consistent with the TypeScript.

Code signing pain is identical for both shells (it is an OS problem), see section 8.

## 2. Code editor

**Choice: Monaco 0.57.0 through @monaco-editor/react 4.7.0, bundled locally (no CDN).**

- @monaco-editor/react 4.7.0 declares React 16.8 to 19 as peers and `monaco-editor >= 0.25 < 1`. Use `loader.config({ monaco })` to load from `node_modules` instead of the CDN (required in a packaged desktop app). With Vite you must import the editor worker with `?worker` and set `self.MonacoEnvironment.getWorker` before `loader.init()`. Source: https://cdn.jsdelivr.net/npm/@monaco-editor/react@4.7.0/README.md
- C++ highlighting ships in Monaco's basic-languages set (`language="cpp"`); hover and completion are `monaco.languages.registerHoverProvider('cpp', ...)` and `registerCompletionItemProvider('cpp', ...)`, obtained from the `monaco` instance passed to `beforeMount` or `onMount`. Both return disposables; register once per app, not per editor mount. Reference: https://www.checklyhq.com/blog/customizing-monaco/ (worked example of custom completion) and the Monaco API surface described at https://www.pistack.xyz/posts/2026-08-22-browser-code-editors-monaco-codemirror-ace-comparison/
- Size: Monaco is about 2.9 MB min+gzip full, about 800 kB core; CodeMirror 6 core is about 200 kB plus roughly 50 kB per language. Irrelevant for a desktop app where the bundle sits on disk, but it does mean you should load Monaco only on the Build screen (lazy `React.lazy`) so the Title and Studio screens stay instant. Source: https://www.pistack.xyz/posts/2026-08-22-browser-code-editors-monaco-codemirror-ace-comparison/
- Performance inside Electron: Monaco runs its language workers as Web Workers; with the `?worker` setup above there is nothing Electron-specific. Keep one shared `monaco` instance and use `editor.setModel` to switch files instead of mounting a new editor per file.

Runner-up: CodeMirror 6 (`codemirror` 6.0.2, `@codemirror/lang-cpp` 6.0.3). Hover is `hoverTooltip(source)` from `@codemirror/view` and completion is `autocompletion({ override: [...] })` from `@codemirror/autocomplete`. It is lighter and more composable, but the app's hover card, completion, and a VS Code-like feel come for free with Monaco. Switch only if Monaco's bundle or memory becomes a measured problem. Reference: https://codemirror.net/docs/ref/

## 3. UI stack

**Choice: React 19 + TypeScript strict, Tailwind v4 via `@tailwindcss/vite`, shadcn/ui components (radix-ui), Motion for animation, lucide-react icons. No chart library.**

- Tailwind v4 with Vite: `npm install tailwindcss @tailwindcss/vite`, add `tailwindcss()` to the renderer's Vite plugins, and put `@import "tailwindcss";` at the top of the CSS. No `tailwind.config.js` needed; design tokens go in `@theme { ... }` in CSS, which keeps the "tokens.css" idea from PLAN.md. Source: https://tailwindcss.com/docs/installation/using-vite (page shows v4.3)
- shadcn/ui on Vite: configure the `@/*` alias in both `tsconfig.json` (and `tsconfig.web.json` here) and the Vite `resolve.alias`, then `npx shadcn@latest init` and `npx shadcn@latest add button dialog tooltip hover-card progress tabs`. Components are copied into `src/renderer/src/components/ui`, so the only runtime dependency is `radix-ui` (1.8.x) and a few utilities. Source: https://ui.shadcn.com/docs/installation/vite
- Why Tailwind over CSS modules or vanilla-extract: one place for tokens, no separate file per component, and the agent produces far fewer mismatched class names than it produces mismatched CSS module imports. vanilla-extract needs a Vite plugin per target and a build step that electron-vite would have to run for the renderer only; nothing here needs typed CSS.
- Animation: `motion` 14.4.x (`import { motion, AnimatePresence, animate, useMotionValue, useTransform } from "motion/react"`), peers React 18 or 19. Covers the three reward screens: XP counters (animate a motion value and render it), card flips (`rotateY` with `preserve-3d`), level-up (`AnimatePresence` for enter and exit, `layout` for reflow). Source: https://motion.dev/docs/react-quick-start. GSAP 3.15 is more powerful but imperative and larger; `@formkit/auto-animate` 0.10 handles only list reflow. Use Motion alone.
- Icons: `lucide-react` 1.60.x (tree-shaken, consistent stroke, used by shadcn). 
- Charts: not needed. The XP bar is a `<Progress>` from shadcn; the skill tree is a React Flow graph (section 4) or an SVG. If a real chart is ever needed, `recharts` 3.10.x.
- TypeScript: npm `latest` is 7.0.2 (2026-07-08), the native compiler. The scaffold is on 5.8/5.9. Try `typescript@7` for `tsc --noEmit` in Sprint 0; if any tool complains (editor plugins, `@types`), pin `5.9.3` and move on. Both are fine for `electron-vite`, which transpiles with esbuild/rolldown and never calls `tsc`.

## 4. Drag and drop board

**Choice: React Flow (`@xyflow/react` 12.12.0).**

- MIT licensed; peers React 17+. Custom nodes (the piece cards), handles, edges (the event arrows), parent nodes for groups ("Sub Flows", "Parent Child Relation"), `onConnect` with `addEdge`, connection validation and limits, drag handles, minimap and controls are all built in. Source: https://reactflow.dev/learn
- The only cost is a small "React Flow" attribution link in the corner. Removing it requires React Flow Pro (from $169/month). Leave it on; it is a free learning app. Source: https://reactflow.dev/learn/troubleshooting/remove-attribution
- Fits the breakdown board exactly: node `data` carries `{ kind: 'class' | 'component' | 'data' | 'event' | 'step', name, responsibility }`, edges carry `{ kind: 'owns' | 'calls' | 'emits' | 'listens' }`, groups are parent nodes with `extent: 'parent'`. The grader receives `nodes` and `edges` as JSON, which is the same shape the reference breakdowns use.

Alternatives:

- dnd-kit: `@dnd-kit/core` 6.3.1 is the stable package; the rewrite (`@dnd-kit/react` 0.5.1, on top of `@dnd-kit/abstract` and `@dnd-kit/dom`) is a new layered design aimed at lists, grids, multiple containers and virtualized lists. Neither draws edges or handles pan and zoom. Good for the drill's "order the steps" question, wrong tool for a graph. Source: https://github.com/clauderic/dnd-kit
- tldraw 5.5.x: full whiteboard, but the license forbids removing the watermark without a paid business license. Source: https://tldraw.dev/legal/tldraw-license
- Hand-rolled: pan/zoom, hit testing, edge routing and keyboard accessibility are weeks of work and the agent will get subtle pointer-capture bugs wrong.

## 5. Markdown with custom hover terms

**Choice: react-markdown 10.1.0 + remark-gfm + a 40-line remark plugin that turns glossary matches into a custom node rendered as `<TermHover>`.**

How it works:

1. Load `glossary.json`, build one regex from all terms and aliases (longest first, word boundaries).
2. Write a remark plugin that uses `unist-util-visit` on `text` nodes (skip `code`, `inlineCode`, `link`), splits each text node on the regex, and replaces matches with a node `{ type: 'glossaryTerm', data: { hName: 'glossary-term', hProperties: { termId } }, children: [{ type: 'text', value }] }`. The `hName`/`hProperties` data is what remark-rehype uses to emit a `<glossary-term term-id="...">` element.
3. Pass `components={{ 'glossary-term': TermHover }}` to `<ReactMarkdown>`. The hover card is a real React component (shadcn `HoverCard`), can count hovers and open the side panel, and no HTML string is ever injected.

Why not marked: marked 18.x supports custom inline extensions (`name`, `level: 'inline'`, `start`, `tokenizer`, `renderer`) and `walkTokens`, but its output is an HTML string, so hover behaviour needs delegated DOM event handlers or a second pass to hydrate spans, and the output must be run through DOMPurify (`hooks.postprocess`). That is more moving parts for the agent to keep consistent. Source: https://marked.js.org/using_pro. The repo currently depends on marked; keep it only for `tools/verify-content.ts` if a plain HTML dump is useful, otherwise remove it.

Why not markdown-it: same HTML-string problem as marked, and its plugin API (inline rules with state manipulation) is harder to generate correctly.

Safety: react-markdown escapes raw HTML by default (`skipHtml` ignores it), never uses `dangerouslySetInnerHTML`, and `urlTransform` blocks `javascript:` URLs. Only add `rehype-raw` for trusted content, and prefer `rehype-sanitize` 6.x if packs from third parties are ever loaded. Source: https://github.com/remarkjs/react-markdown

The same glossary regex drives the Monaco hover provider, so one `TermLinker` in `src/main/services/content` (or `src/shared`) is the single source of truth.

## 6. State and persistence

**Choice: Zustand 5 in the renderer, plain JSON files owned by the main process for progress, electron-store for settings.**

- Zustand 5.0.x: minimal API, no provider, selectors prevent re-renders. The `persist` middleware takes `name`, `storage: createJSONStorage(() => adapter)` where the adapter implements `getItem`/`setItem`/`removeItem`, plus `version` and `migrate(persisted, version)` for schema changes and `partialize` to keep actions out of storage. Source: https://zustand.docs.pmnd.rs/middlewares/persist
- Jotai 3.0.x is also fine (atoms compose well), Redux Toolkit 2.13 is heavier than this app needs. All three are well represented in training data; Zustand produces the least code.
- Progress data (XP, unlocks, SM-2 schedule, hover counts) is written by `ProgressService` in the main process to `app.getPath('userData')/progress.json` with write-to-temp-then-rename for atomicity, and the renderer store is hydrated over IPC. This keeps a single writer and makes "export my progress" a file copy. The persisted shape carries a `schemaVersion`.
- Settings (engine path, sandbox path, API key presence flag) use `electron-store` 12.0.0: JSON in `userData/config.json`, atomic writes, JSON Schema validation, Electron 30+, native ESM only (the main process must be ESM or import it dynamically). Its `migrations` feature is documented as having known bugs, so keep settings flat and versioned by hand. It is not a database: the whole file is rewritten on every change, so anything above roughly 1 MB should go elsewhere. Source: https://github.com/sindresorhus/electron-store
- Secrets (Anthropic API key) go through Electron's `safeStorage` (OS keychain backed) and not into either JSON file. Note that `safeStorage` can misbehave on unsigned or ad-hoc signed macOS builds. Source: https://www.electronjs.org/docs/latest/tutorial/code-signing
- Why not SQLite: `better-sqlite3` 13.x requires Node 22+ and a native build matched to Electron's ABI, so every Electron bump means `electron-rebuild` on both platforms and a CI that compiles C++. `node:sqlite` needs no build, but as of Node 25.7 it is only a release candidate (stability 1.2) and Electron 44 ships Node 24, so treat it as a later option once it is stable in the Node that Electron bundles. Source: https://nodejs.org/api/sqlite.html. For 300 quests and one learner, JSON is simpler and robust enough.

## 7. Testing

**Choice: vitest 5.0.x for units, Playwright 1.64.x `_electron` for end-to-end and screenshots.**

- vitest 5.0.5 requires Node 22.12+ or 24+. Unit test every service in `src/main/services` (parsers, XP rules, SM-2, report parser, log filter, prompt JSON extraction) with fixtures in `tests/fixtures`. For `PlatformPaths` and `EngineLocator`, inject a fake `fs` and `process.platform`.
- Playwright drives the real app: `const app = await _electron.launch({ args: ['out/main/index.js'] })`, `const page = await app.firstWindow()`, `await page.screenshot({ path })`, `await app.evaluate(({ app }) => app.getAppPath())` to run code in the main process. Native dialogs cannot be intercepted; stub them with `app.evaluate` by replacing `dialog.showOpenDialog`. Electron support is labelled experimental and needs Electron 21+; launch timeout defaults to 30 s. Sources: https://playwright.dev/docs/api/class-electron and https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Screenshots in CI: run the Playwright job on `windows-latest` and `macos-latest` (they have a display). On Linux you would wrap with `xvfb-run`, but the matrix in section 8 does not need Linux. Upload `tests/e2e/screenshots/*.png` with `actions/upload-artifact` so each sprint review has pictures. Playwright's `toHaveScreenshot` can be turned on later for visual regression once the UI stabilises.
- Keep the Unreal-dependent integration test (`tests/integration/unreal-pipeline.test.ts`) behind an environment variable (`DOJO_ENGINE_PATH`) so CI skips it; it runs on the two real machines.

## 8. Packaging and CI

**Choice: electron-builder 26.15.x, GitHub Actions matrix `[windows-latest, macos-latest]`, unsigned builds first, signing added when there is a public release.**

- electron-builder config stays in `package.json` `build` (already present): `nsis` on Windows, `dmg` on macOS. macOS signing only works on macOS, Windows NSIS builds on Windows (or on macOS/Linux via Wine, not needed with a Windows runner). Source: https://www.electron.build/multi-platform-build
- Forge 8.0.1 is the alternative; it wins on first-party tooling (`@electron/packager`, `@electron/osx-sign`, `@electron/notarize`, `@electron/windows-sign`) but its Vite plugin is experimental, so stay on electron-builder. Sources: https://www.electronforge.io/core-concepts/why-electron-forge and https://www.electronforge.io/config/plugins/vite
- macOS minimum for a public release: Apple Developer Program, a Developer ID Application certificate exported as `.p12`, `mac.hardenedRuntime: true`, `mac.entitlements` with `com.apple.security.cs.allow-jit` (Electron requires it), and notarization. electron-builder reads `CSC_LINK` (base64 `.p12`) and `CSC_KEY_PASSWORD`; with no identity, arm64 and universal builds get an ad-hoc signature and Intel builds are unsigned; `CSC_IDENTITY_AUTO_DISCOVERY=false` or `mac.identity: null` skips signing explicitly. Gatekeeper blocks un-notarized apps outside the App Store since macOS 10.15. Sources: https://www.electron.build/code-signing-mac, https://www.electron.build/docs/notarization, and a worked GitHub Actions example at https://til.simonwillison.net/electron/sign-notarize-electron-macos (it uses the `afterSign` hook with `@electron/notarize`; current electron-builder also accepts `mac.notarize: true` with `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, which should be verified against the notarization page when the release sprint arrives).
- Windows minimum: Microsoft has required EV-grade keys on hardware since June 2023, so the practical route is Azure Trusted Signing (now called Azure Artifact Signing), which electron-builder supports through `win.signtoolOptions`/`win.azureSignOptions` with `endpoint`, `certificateProfileName`, `codeSigningAccountName`, `publisherName`, authenticated by Azure Entra environment variables. Without signing, SmartScreen warns on first run; the app still installs. Sources: https://www.electronjs.org/docs/latest/tutorial/code-signing, https://www.electron.build/docs/features/code-signing/code-signing-win, https://www.electron.build/docs/api/app-builder-lib.Interface.WindowsAzureSigningConfig
- Auto-update later: `electron-updater` 6.8.x with `publish: { provider: 'github' }`; call `autoUpdater.checkForUpdatesAndNotify()` and never `setFeedURL` (the build writes `app-update.yml`). macOS auto-update requires a signed app. Source: https://www.electron.build/docs/features/auto-update
- CI workflow (`.github/workflows/build.yml`):

```yaml
name: build
on: [push, pull_request]
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - run: npx electron-builder --publish never
        env:
          CSC_IDENTITY_AUTO_DISCOVERY: "false"
      - uses: actions/upload-artifact@v4
        with:
          name: unreal-dojo-${{ matrix.os }}
          path: |
            dist/*.exe
            dist/*.dmg
            tests/e2e/screenshots/*.png
```

Add the signing secrets and drop `CSC_IDENTITY_AUTO_DISCOVERY` on the release job only.

## 9. The Unreal side

### 9.1 Toolchain facts

- UE 5.8 requires Visual Studio 2022 17.14+ or VS 2026 18.0+, workload "Game development with C++", MSVC 14.38 minimum (14.50 recommended), Windows SDK 10.0.22621.0 minimum. Detect with `vswhere`. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-visual-studio-development-environment-for-cplusplus-projects-in-unreal-engine
- Configuration names: Debug, DebugGame, Development, Shipping, Test; targets Game, Editor, Client, Server; the combined name `DevelopmentEditor` is the default editor build. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/compiling-game-projects-in-unreal-engine-using-cplusplus

### 9.2 Building the editor target (UE 5.4 to 5.8)

Windows:

```
"C:\Program Files\Epic Games\UE_5.6\Engine\Build\BatchFiles\Build.bat" DojoEditor Win64 Development -Project="C:\Dojo\Sandbox\Dojo.uproject" -WaitMutex -NoHotReloadFromIDE
```

macOS:

```
"/Users/Shared/Epic Games/UE_5.6/Engine/Build/BatchFiles/Mac/Build.sh" DojoEditor Mac Development -Project="/Users/<you>/Dojo/Sandbox/Dojo.uproject"
```

- Form is `Build.bat <Target> <Platform> <Configuration> [args]`; `-WaitMutex` waits for another UBT instance instead of failing; `-NoHotReloadFromIDE` avoids hot-reload DLL naming; `-Clean` forces a clean rebuild. Sources: https://github.com/ALEXGREENALEX/compiling-unreal (UBT invocation reference) and https://mcpmarket.com/tools/skills/ue5-development-debugging (Mac `Build.sh` example).
- Pass `-Progress` to get `@progress` lines UBT prints for IDE progress bars, which `BuildProgress` can parse. Spawn with `shell: false`, `windowsHide: true`, `stdio: ['ignore', 'pipe', 'pipe']` (an open-then-closed or `/dev/null` stdin matters, see pitfalls).
- Exit code 0 means success; non-zero with `error C` / `error:` lines in stdout is the compile failure the reviewer should see. Filter the log to lines containing `error`, `warning` and `@progress` for the UI, keep the full log on disk.

### 9.3 Running automation tests headless and getting JSON

Windows:

```
"C:\Program Files\Epic Games\UE_5.6\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" "C:\Dojo\Sandbox\Dojo.uproject" -ExecCmds="Automation RunTests Dojo.Foundations.Health; Quit" -Unattended -NoPause -NullRHI -NoSplash -NoSound -stdout -FullStdOutLogOutput -ReportExportPath="C:\Dojo\Sandbox\Saved\Automation\Reports" -log
```

macOS (binary is `Engine/Binaries/Mac/UnrealEditor-Cmd`; if absent on a given version, use `UnrealEditor.app/Contents/MacOS/UnrealEditor` with the same flags):

```
"/Users/Shared/Epic Games/UE_5.6/Engine/Binaries/Mac/UnrealEditor-Cmd" "/Users/<you>/Dojo/Sandbox/Dojo.uproject" -ExecCmds="Automation RunTests Dojo.Foundations.Health; Quit" -Unattended -NoPause -NullRHI -NoSplash -NoSound -stdout -FullStdOutLogOutput -ReportExportPath="/Users/<you>/Dojo/Sandbox/Saved/Automation/Reports" -log
```

- Epic's docs show `-ExecCmds="Automation RunTest Test1+Test2;Quit"`, `RunTest MySet.MySubSet` for a prefix, `RunTest Group:MyGroup` for groups configured in `DefaultEngine.ini`, and `-ReportExportPath="<path>"` for "JSON with related HTML files". `-ResumeRunTest` resumes a partial run. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/run-automation-tests-in-unreal-engine
- `RunTests` (plural) with a prefix is the form the community has used since UE 4.11 and still works in 5.x; `-TestExit="Automation Test Queue Empty"` is the older alternative to `;Quit`. Source: https://forums.unrealengine.com/t/run-automated-testing-from-command-line/294995 and the CI example at https://dev.to/gamedevtoollab/testing-in-unreal-engine-5-cqtest-automation-spec-functional-tests-and-ci-3776
- `-stdout -FullStdOutLogOutput` are what make the log appear on the process stdout for streaming. Source: https://smithery.ai/skills/guangminju/ue-test
- Report: `<ReportExportPath>/index.json` with top-level `devices[]`, `reportCreatedOn`, `succeeded`, `succeededWithWarnings`, `failed`, `notRun`, `inProcess`, `totalDuration`, and `tests[]` where each test has `testDisplayName`, `fullTestPath`, `state` (`Success`, `Fail`, `Skipped`, `NotRun`, `InProcess`), `deviceInstance`, `duration`, `dateTime`, `entries[]` (each with `event.type` `Error|Warning|Info`, `event.message`, `event.context`, `filename`, `lineNumber`, `timestamp`), `warnings`, `errors`, `artifacts`. The log also prints `Test Completed. Result={status}. Name={short} Path={full}` per test and `**** TEST COMPLETE. EXIT CODE: <n> ****` at the end, with 0 meaning no failures. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/review-test-results-in-unreal-engine
- Do not trust the process exit code alone; parse `index.json` and treat any `state: "Fail"` as failure. Source: https://tessl.io/registry/testland/unreal-automation-system/files/references/running-and-reporting.md

### 9.4 Automation framework macros

Simple test (one `RunTest`):

```cpp
#include "Misc/AutomationTest.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojoHealthComponentTest, "Dojo.Foundations.Health.TakesDamage",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

bool FDojoHealthComponentTest::RunTest(const FString& Parameters)
{
    // ...
    TestEqual(TEXT("Health after damage"), Health, 70.f);
    return true;
}
```

- `IMPLEMENT_SIMPLE_AUTOMATION_TEST(TClass, PrettyName, TFlags)`; `PrettyName` is a dot-separated path that becomes the tree in Session Frontend and the `RunTests` prefix. `IMPLEMENT_COMPLEX_AUTOMATION_TEST` adds `GetTests(OutBeautifiedNames, OutTestCommands)` for parameterised runs. Return `false` or call `AddError` to fail. Place files under the module's `Private/Tests` folder. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/write-cplusplus-tests-in-unreal-engine
- Flags: a context (`EditorContext`, `ClientContext`, `ServerContext`, `CommandletContext`, or `ApplicationContextMask` for all) OR a filter (`SmokeFilter`, `EngineFilter`, `ProductFilter`, `PerfFilter`, `StressFilter`). Epic's spec examples use `ProductFilter | ApplicationContextMask`; PLAN.md's `EditorContext | ProductFilter` is right for tests that must run in the editor process. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine
- Spec style (BDD): `DEFINE_SPEC(Class, "Path", Flags)` or `BEGIN_DEFINE_SPEC ... END_DEFINE_SPEC` for members, then `Define()` with `Describe`, `It`, `BeforeEach`, `AfterEach`; latent variants `LatentIt`, `LatentBeforeEach`, `LatentAfterEach` take `const FDoneDelegate& Done` which must be executed. Files conventionally end in `.spec.cpp`. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-spec-in-unreal-engine
- Latent commands for simple tests: `DEFINE_LATENT_AUTOMATION_COMMAND(FName)` or `DEFINE_LATENT_AUTOMATION_COMMAND_ONE_PARAMETER(FName, Type, Param)`, implement `bool Update()` (return `true` when done), queue with `ADD_LATENT_AUTOMATION_COMMAND(FEngineWaitLatentCommand(2.0f))`. Source: same page as the simple test.
- CQTest (ships in the engine under `Engine/Source/Developer/CQTest`, documented in 5.8) adds `TEST_CLASS`, `TEST_METHOD`, `BEFORE_EACH`, `AFTER_EACH`, `ASSERT_THAT(AreEqual(...))`, a `TestCommandBuilder` for multi-frame steps, and `FActorTestSpawner`, which creates a test world and spawns actors without PIE. Add `CQTest` to the test module's dependencies. Worth adopting for Dojo tests because fixtures and a spawner are exactly what quest tests need. Sources: https://dev.to/gamedevtoollab/testing-in-unreal-engine-5-cqtest-automation-spec-functional-tests-and-ci-3776 and https://dev.epicgames.com/documentation/unreal-engine/API/Developer/CQTest/FActorTestSpawner?lang=en-US

### 9.5 Creating a test UWorld

Two documented routes, both for editor-context tests:

1. Editor map (needs `UnrealEd` in `PrivateDependencyModuleNames`, include `Tests/AutomationEditorCommon.h`): `UWorld* World = FAutomationEditorCommonUtils::CreateNewMap();` then `World->SpawnActor<ADojoTestActor>()`. Source: https://unreal-garden.com/tutorials/unreal-testing-introduction/ and https://forums.unrealengine.com/t/getting-uworld-inside-automation-test/436602
2. Standalone game world (no editor map, BeginPlay works):

```cpp
UWorld* World = UWorld::CreateWorld(EWorldType::Game, false);
FWorldContext& Context = GEngine->CreateNewWorldContext(EWorldType::Game);
Context.SetCurrentWorld(World);
World->InitializeActorsForPlay(FURL());
World->BeginPlay();
// spawn, tick with World->Tick(LEVELTICK_All, DeltaSeconds), assert
GEngine->DestroyWorldContext(World);
World->DestroyWorld(false);
```

Source for the setup half: https://www.zomgmoz.tv/unreal/Testing/Creating-UUserWidgets-in-UE-tests (the teardown calls are the matching engine functions; verify in Sprint 1 on both machines). Route 2 is what `Support/DojoTestWorld` should wrap, with route 1 as fallback when `GEditor` is present and a map is needed. CQTest's `FActorTestSpawner` does the same job in engine code and is the least custom option.

### 9.6 Live Coding from outside the editor

- Live Coding is triggered with Ctrl+Alt+F11 in the IDE or editor; the console shows as a separate window. Large structural changes need Object Reinstancing (on by default); constructor-default changes in `.cpp` do not update existing instances. Not available on consoles or mobile; it is a Windows feature (the editor preference exists on Mac but Live Coding is implemented for MSVC). Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime
- Remote trigger for 5.4 to 5.7: the editor console command `LiveCoding.Compile` works and can be sent through the Remote Control API when "Enable Remote Control" and "Allow Remote Console Command Execution" are on in Project Settings; the UE neovim suite does exactly this. Source: https://dev.to/taku25/a-practical-guide-to-the-unreal-engine-neovim-plugin-suite-36f4 (community source; verify the setting name on your version). The Remote Control API plugin listens on `http://localhost:30010`, started with `WebControl.StartServer` (or `WebControl.EnableServerOnStartup`), and `PUT /remote/object/call` takes `{ objectPath, functionName, parameters, generateTransaction }`. Static Blueprint function libraries are called through their CDO path, for example `/Script/MyModule.Default__MyLibrary`. Sources: https://dev.epicgames.com/documentation/en-us/unreal-engine/remote-control-quick-start-for-unreal-engine and https://zenn.dev/akiya_souken/articles/ue-remote-control-tips
- Remote trigger for 5.8: `ULiveCodingToolset::CompileLiveCoding()` (plugin `Engine/Plugins/Experimental/Toolsets/LiveCodingToolset`) starts a Live Coding compile, waits, and returns status plus captured `LogLiveCoding` output and UBT diagnostics, exposed to MCP clients. Source: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/LiveCodingToolset/ULiveCodingToolset
- Limits that matter for Dojo: Live Coding does not pick up new `UFUNCTION` declarations, and header or `UPROPERTY` changes to reflected types are risky; the unreal-mcp doc says new UFUNCTIONs need an editor restart. Build quests that add new classes must still go through a full UBT build at least once. Source: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor

### 9.7 Driving an already-open editor (the seconds-not-minutes loop)

**UE 5.8 (Epic, official, experimental): Unreal MCP.** Enable the plugins "Unreal MCP" (`ModelContextProtocol`) and "All Toolsets" (Toolset Registry comes along), restart, turn on Auto Start Server in Editor Preferences > General > Model Context Protocol or run `ModelContextProtocol.StartServer`. The server speaks Streamable HTTP + SSE at `http://127.0.0.1:8000/mcp` (stdio and WebSocket are not supported), loopback only, no auth, tool calls run serially on the game thread, default tool timeout 60 s. `ModelContextProtocol.GenerateClientConfig ClaudeCode` writes a `.mcp.json`. With "Enable Tool Search" on (default) the server exposes three meta-tools `list_toolsets`, `describe_toolset`, `call_tool`. Sources: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor and https://dev.to/gamedevtoollab/using-unreal-mcp-in-ue-58-from-codex-setup-toolsets-and-safe-editor-automation-4pon

The two toolsets Dojo needs are in the engine:

- `UAutomationTestToolset` (plugin `Engine/Plugins/Experimental/Toolsets/AutomationTestToolset`) wraps `IAutomationControllerManager`, the same backend as Session Frontend: `DiscoverTests(bForceRediscover)`, `ListTests(NameFilter, TagFilter, Limit)`, `RunTests(TArray<FString> TestNames)` (async, resolves to a JSON summary), `RunTestsByFilter(FilterExpression)`, `GetTestStatus()`, `GetTestResults()`, `StopTests()`. `DiscoverTests` must complete before `RunTests`. Sources: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/AutomationTestToolset/UAutomationTestToolset and https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/AutomationTestToolset/UAutomationTestToolset/RunTests
- `ULiveCodingToolset::CompileLiveCoding()` as above.

Because it is plain HTTP JSON-RPC, the app does not need Claude in the middle: `LiveEditorRunner` can be an MCP client (`@modelcontextprotocol/sdk` 1.32.x `StreamableHTTPClientTransport`) that calls `call_tool` with `{ toolset: "LiveCodingToolset", tool: "CompileLiveCoding" }` then `{ toolset: "AutomationTestToolset", tool: "RunTests", arguments: { TestNames: [...] } }` and reads the JSON result. That is the fast path PLAN.md section 6 reserved for `IRunner`.

Caveats: experimental, formats may change, the editor must be open with the sandbox project, and reviewers report multi-minute latency only when an LLM is in the loop, not for direct tool calls. Source: https://www.pugetsystems.com/blog/2026/07/09/unreal-engine-mcp-hands-on-testing-ai-inside-the-editor/

**UE 5.4 to 5.7: Remote Control API or Python.** The Automation console command (`Automation RunTests <prefix>`) is an exec command, so it can be sent to a running editor through Remote Control's console execution (see 9.6) or through Python (`unreal.SystemLibrary.execute_console_command(None, "Automation RunTests Dojo.Foundations")`) in the Output Log or via the Python Remote Execution socket. Two gaps to plan for: the JSON report is only written when `-ReportExportPath` was passed on the editor's command line (so launch the editor with it), and completion must be detected by watching the editor log for `TEST COMPLETE` or by polling the report. The cleanest fix for 5.4 to 5.7 is a 100-line editor plugin in the sandbox template that wraps `IAutomationControllerManager` the way Epic's 5.8 toolset does and exposes a `UFUNCTION(BlueprintCallable)` static that Remote Control can call via `/remote/object/call` on its CDO path, returning the results JSON. Epic's Python test plugin (`PythonAutomationTest`, `test_*.py` under `Content/Python`) registers Python tests but does not itself run the C++ test queue. Sources: https://dev.epicgames.com/documentation/en-us/unreal-engine/write-editor-tests-with-python-in-unreal-engine and https://dev.epicgames.com/documentation/unreal-engine/API/Developer/AutomationController/IAutomationControllerManager

**Third-party unreal-mcp projects** (for example chongdashu/unreal-mcp: a UE plugin with a TCP server on 55557 plus a Python FastMCP server, UE 5.5+, MIT, labelled experimental) cover actors, Blueprints, node graphs and viewport, not automation tests or Live Coding. They are not needed once 5.8's built-in server exists. Source: https://cdn.jsdelivr.net/gh/chongdashu/unreal-mcp@main/README.md

Recommendation: ship v1 on the headless loop (9.2 and 9.3) because it is deterministic and works on 5.4 to 5.8. Build `LiveEditorRunner` against 5.8's MCP server as the Sprint 4+ upgrade; it is the single biggest improvement to the learner's loop. Mohammad's machines should move to 5.8 for this.

## 10. AI review

### 10.1 `claude` CLI, non-interactive

Recommended call (user message on stdin, structured JSON back):

```
claude --bare -p --output-format json --json-schema "<review schema>" --system-prompt-file prompts/code-reviewer.txt --tools "" --max-turns 1 --no-session-persistence --model sonnet < review-input.md
```

- `-p`/`--print` runs one query and exits 0 on success, non-zero on failure; stdin is read as the prompt input (capped at 10 MB). Source: https://code.claude.com/docs/en/headless
- `--bare` skips hooks, skills, plugins, MCP servers, auto memory and CLAUDE.md so the run is the same on every machine, starts faster, and is "the recommended mode for scripted and SDK calls". In bare mode the CLI never reads OAuth credentials: set `ANTHROPIC_API_KEY` or an `apiKeyHelper` in `--settings`. Without `--bare`, a `-p` run in the sandbox folder would execute any `.claude/settings.json` hooks and `.mcp.json` servers found there. Source: https://code.claude.com/docs/en/headless
- `--output-format json` returns `{ result, session_id, total_cost_usd, usage, is_error, ... }`; with `--json-schema '<schema>'` the validated object is in `structured_output`. `stream-json` gives newline-delimited events for streaming. Source: https://code.claude.com/docs/en/headless
- `--system-prompt` / `--system-prompt-file` replace the whole default prompt (right for a reviewer that is not a coding agent); `--append-system-prompt` keeps Claude Code's defaults. Put a line `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` between the static rubric and the per-quest context so the static part is cached (v2.1.275+). Source: https://code.claude.com/docs/en/cli-reference
- Disabling tools: `--tools ""` disables all built-in tools; `--disallowedTools "mcp__*"` removes MCP tools; `--allowedTools` only auto-approves. `--max-turns 1` caps the agent loop, `--max-budget-usd 0.25` caps spend, `--no-session-persistence` keeps review runs out of `~/.claude`. `--permission-prompts none` (v2.1.259+) makes unattended runs deny instead of wait. Source: https://code.claude.com/docs/en/cli-reference
- Stopping: SIGINT ends the turn; SIGTERM exits 143 without a result. Use SIGINT first on timeout. Source: https://code.claude.com/docs/en/headless
- Important subscription note: bare mode cannot use a claude.ai subscription login. If Mohammad wants review billed to his subscription rather than an API key, drop `--bare` and instead pass `--setting-sources user --strict-mcp-config --tools ""` and run with `cwd` set to a clean temp directory so project hooks and `.mcp.json` are not picked up. Test both in Sprint 2 and record which one `ClaudeCodeProvider` uses.
- Version: @anthropic-ai/claude-code 2.1.306 (2026-10-21), Node 22+. Flags above exist in that version; `ClaudeCodeProvider` should run `claude --version` once and refuse versions below 2.1.275.

### 10.2 Anthropic Messages API from Node

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
const message = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 2048,
  system: reviewerPrompt,
  messages: [{ role: "user", content: reviewInput }],
});
const text = message.content.find(b => b.type === "text")?.text ?? "";
```

- `@anthropic-ai/sdk` 0.137.x, Node 20+. Retries 2 times by default on 408/409/429/5xx and connection errors; default timeout 10 minutes (set it lower). 429 throws `RateLimitError`; honour the `retry-after` header. Streaming via `client.messages.stream(...)` if the review should appear progressively. Source: https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript
- Model choice: `claude-sonnet-5-5` ($2 input / $10 output per MTok, 1M context) for code review and breakdown grading; `claude-haiku-5-5` ($0.10 / $0.50 for prompts under 100k tokens) is enough for concept-quiz explanations. `claude-opus-5-5` is $4 / $20. Prompt cache reads cost 5% of input on Sonnet 5.5, so mark the rubric block with `cache_control`. Sources: https://platform.claude.com/docs/en/models/overview and https://platform.claude.com/docs/en/about-claude/pricing
- Cost per review: a build quest review is roughly 6k input tokens (prompt, files, build log, test report) and 800 output tokens, so about $0.02 on Sonnet 5.5 before caching. 200 reviews a month is about $4.
- Rate limits: new organisations start in the Evaluation tier then Start tier (1,000 RPM, 2M input tokens/min, 400k output tokens/min for Sonnet 5.5; $500 monthly spend cap). Cached input tokens do not count toward ITPM. A single learner will never hit these; the spend cap 429 (`enforced_spend_limit_reached`) has no `retry-after` and must not be retried. Source: https://platform.claude.com/docs/en/api/rate-limits
- Never call the API from the renderer; the SDK is disabled in browsers by default and the key must stay in the main process (`safeStorage`).

## Setup commands

The repo already exists. These commands bring it to the recommended stack from the current scaffold. Run from `/home/claude/unreal-dojo` (Node 22 LTS or 24).

```bash
# 1. Upgrade the shell and build tooling
npm install -D electron@^44.9.3 electron-vite@^6.0.0 vite@^8.3.4 @vitejs/plugin-react@^6.1.2 \
  typescript@^5.9.3 vitest@^5.0.5 electron-builder@^26.15.3 @types/node@^24 tsx@latest

# 2. UI
npm install react@^19.3.1 react-dom@^19.3.1 motion@^14.4.0 lucide-react@^1.60.0 radix-ui@^1.8.1 \
  class-variance-authority clsx tailwind-merge
npm install -D tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3 @types/react@^19 @types/react-dom@^19
npx shadcn@latest init            # answers: New York style, base color of choice, CSS variables yes
npx shadcn@latest add button dialog tooltip hover-card progress tabs scroll-area badge separator

# 3. Editor, board, markdown
npm install monaco-editor@^0.57.0 @monaco-editor/react@^4.7.0 @xyflow/react@^12.12.0 \
  react-markdown@^10.1.0 remark-gfm@^4.0.1 unified@^11.0.5 unist-util-visit@^5.1.0 gray-matter@^4.0.3 \
  fast-xml-parser@^5
npm uninstall marked               # keep only if tools/verify-content.ts needs an HTML dump

# 4. State, persistence, validation
npm install zustand@^5.0.15 electron-store@^12.0.0 zod@^4.6.7

# 5. AI
npm install @anthropic-ai/sdk@^0.137.0
# optional, only for the 5.8 LiveEditorRunner:
npm install @modelcontextprotocol/sdk@^1.32.1

# 6. Tests
npm install -D @playwright/test@^1.64.1
npx playwright install

# 7. Verify
npm run typecheck && npm test && npm run build
```

Config changes to make alongside:

- `electron.vite.config.ts`: replace `externalizeDepsPlugin()` with `build: { externalizeDeps: true }` on main and preload (electron-vite 5+), add `tailwindcss()` and `react()` to `renderer.plugins`, add the `@` alias to `src/renderer/src` for shadcn.
- `src/renderer/src/styles/global.css`: start with `@import "tailwindcss";` and an `@theme { --color-accent-foundations: ...; }` block for the per-pack accents.
- `src/renderer/src/lib/monaco.ts`: `import * as monaco from 'monaco-editor'; import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'; self.MonacoEnvironment = { getWorker: () => new EditorWorker() }; loader.config({ monaco });` and register the C++ hover and completion providers once here.
- `package.json`: `"type": "module"` (electron-store is ESM only), scripts `"test:e2e": "playwright test"`, `"package": "electron-vite build && electron-builder"`.
- `playwright.config.ts`: one project with `testDir: 'tests/e2e'`, no browsers; tests use `_electron.launch({ args: ['out/main/index.js'] })`.

Fresh scaffold, if ever starting from zero: `npm create @quick-start/electron@latest unreal-dojo -- --template react-ts`, then steps 2 to 7. Source: https://electron-vite.org/guide/

Sandbox project on UE 5.8 (for the fast loop): enable plugins `ModelContextProtocol`, `AllToolsets`, `LiveCodingToolset`, `AutomationTestToolset` in `Dojo.uproject`, set `Auto Start Server` in Editor Preferences, and keep `DefaultEngine.ini` listener on `127.0.0.1`.

## Known pitfalls

1. **electron-vite 6 deprecations.** The scaffold's `externalizeDepsPlugin` form is deprecated since 5.0 in favour of `build.externalizeDeps`; the config interfaces were restructured. Read the v5 migration guide before bumping. https://github.com/alex8088/electron-vite/blob/master/CHANGELOG.md
2. **Monaco blank editor.** A missing `MonacoEnvironment.getWorker` or loading from the CDN in a packaged app gives an empty editor. Always bundle locally with the `?worker` import. https://cdn.jsdelivr.net/npm/@monaco-editor/react@4.7.0/README.md
3. **Provider double registration.** `registerHoverProvider` returns a disposable; registering inside a React effect without disposing produces duplicate hover cards after hot reload. Register once in `lib/monaco.ts`.
4. **electron-store is ESM only** (12.x, Electron 30+). A CommonJS main bundle must `await import('electron-store')` or the whole main process goes ESM. Its `migrations` feature has known bugs; version settings by hand. https://github.com/sindresorhus/electron-store
5. **Native modules.** Avoid `better-sqlite3` and anything with a `.node` binary; each Electron major (two to three per year) requires a rebuild on both platforms. `node:sqlite` is not yet stable in Node (release candidate as of 25.7). https://nodejs.org/api/sqlite.html
6. **Unsigned macOS builds.** Without a Developer ID and notarization, Gatekeeper blocks the DMG on first open (right-click Open, or `xattr -d com.apple.quarantine`). `safeStorage` and `autoUpdater` can misbehave on unsigned or ad-hoc signed builds. Document the Gatekeeper note in the README until signing exists. https://www.electronjs.org/docs/latest/tutorial/code-signing
7. **Windows SmartScreen.** Unsigned NSIS installers show the "unknown publisher" warning; OV certificates no longer silence it, Azure Trusted Signing is the cheap route but is country-restricted. https://www.electronjs.org/docs/latest/tutorial/code-signing
8. **Playwright cannot intercept native dialogs.** Stub `dialog.showOpenDialog` with `electronApp.evaluate` in E2E tests; launch defaults to a 30 s timeout. https://playwright.dev/docs/api/class-electron
9. **UBT mutex and stdin.** Two UBT instances on the same engine conflict; use `-WaitMutex`. On UE 5.8.3 with macOS 27 / Xcode 27, Mac Game targets fail at "Failed to finalize the .app with Xcode" because UBA launches `xcodebuild` with a closed stdin; editor targets were not reported affected, but spawn UBT with `stdio: ['ignore', 'pipe', 'pipe']` (stdin on `/dev/null`) rather than a closed pipe. https://forums.unrealengine.com/t/ue-5-8-3-build-macos-27-every-mac-game-target-build-fails-at-failed-to-finalize-the-app-with-xcode-because-uba-starts-xcodebuild-with-stdin-closed/2840411
10. **Test discovery in headless runs.** Tests flagged for a context the process does not have (for example `ClientContext` while running the editor commandlet) are silently absent. Use `EditorContext | ProductFilter` for Dojo tests and run `-ExecCmds="Automation List"` once in Sprint 1 to confirm names. https://forums.unrealengine.com/t/run-automated-testing-from-command-line/294995
11. **Exit code is not the verdict.** Parse `index.json` for `"state": "Fail"`; also handle the case where the editor crashes before writing the report (no file, non-zero exit). https://dev.epicgames.com/documentation/en-us/unreal-engine/review-test-results-in-unreal-engine
12. **Live Coding does not see new UFUNCTIONs or reflected header changes.** A quest that adds a class must do a full build before Live Coding is useful; the runner should fall back to UBT when the diff touches a header. https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor
13. **Unreal MCP is experimental, loopback only, no auth, serial on the game thread, 60 s default tool timeout.** Never bind it to 0.0.0.0; make `LiveEditorRunner` wait for one call to finish before sending the next, and poll `GetTestStatus` for long runs. https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-mcp-in-unreal-editor
14. **Headless editor first run.** The first `UnrealEditor-Cmd` run after a build compiles shaders and derived data; it can take many minutes even with `-NullRHI`. Do the first run during First-run setup with a progress screen, not inside a quest.
15. **`claude -p` without `--bare` executes project hooks and MCP servers** from the working directory with no trust prompt. Run the reviewer with `--bare` or with `cwd` set to a clean temp folder. https://code.claude.com/docs/en/headless
16. **`--bare` ignores subscription login.** It needs `ANTHROPIC_API_KEY`. Decide in Sprint 2 which auth path `ClaudeCodeProvider` supports and detect the other with `claude auth status` (exit 1 when logged out). https://code.claude.com/docs/en/cli-reference
17. **Spend cap 429 has no `retry-after`.** The SDK will retry it uselessly; check `error.details.error_code === 'enforced_spend_limit_reached'` and surface it to the learner. https://platform.claude.com/docs/en/api/rate-limits
18. **React Flow attribution.** The small link stays unless React Flow Pro is bought; do not hide it with CSS, that violates the terms. https://reactflow.dev/learn/troubleshooting/remove-attribution
19. **Tailwind v4 has no `tailwind.config.js` by default.** Tokens live in `@theme`; shadcn's generated CSS expects this. Do not add a v3-style config. https://tailwindcss.com/docs/installation/using-vite
20. **TypeScript 7 is `latest` on npm.** Install with an explicit `^5.9.3` unless you have verified `tsc 7` with the editor and `@types` packages in this repo.
