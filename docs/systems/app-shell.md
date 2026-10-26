# System: app-shell

Owner: builder-shell. Folders: `src/main/index.ts`, `src/main/window/`, `src/main/ipc/`, `src/main/content/`, `src/main/errors/`, `src/main/services/settings/`, `src/preload/`, `electron.vite.config.ts`, `package.json`. Research: `research/tooling-and-stack.md` sections 1, 6, 8, setup commands, pitfalls.

## Stack (pinned by `docs/decisions.md` D01 to D08)

Electron ^44, electron-vite ^6 (use `build.externalizeDeps`, not the deprecated plugin), Vite 8, React 19, TypeScript 5.9 strict, Tailwind v4 via `@tailwindcss/vite`, shadcn/ui, motion, lucide-react, monaco-editor + @monaco-editor/react (bundled locally, workers configured), @xyflow/react, react-markdown + unified + unist-util-visit + remark-gfm, zustand, electron-store, @modelcontextprotocol/sdk, @anthropic-ai/sdk, vitest, @playwright/test, electron-builder, tsx.

## Layout

```
src/
  shared/types/        catalog.ts, content.ts, drill.ts, engine.ts, errors.ts, progress.ts, run.ts, review.ts, settings.ts, index.ts
  shared/ipc.ts        DojoApi interface, IPC_CHANNELS map, progress event channel
  main/index.ts        app lifecycle, window, composition root
  main/window/createMainWindow.ts   the BrowserWindow and its security rules
  main/ipc/            registerHandlers.ts (wrapper), createHandlers.ts (handler table), payload checks
  main/errors/         AppErrorException
  main/content/        ContentCatalog (content loaded once at startup), content root, renderer views, glossary alias table
  main/services/<system>/...
  preload/index.ts     contextBridge exposing window.dojo and an onBuildProgress subscription
  renderer/src/        React app (see ui-core and ui-quests)
tests/                 vitest
e2e/                   Playwright
tools/                 verify-content.ts, verifier/ (the verifier's argument parsing, runner, report, and check extension point), scripts
content/, resources/, research/, docs/
```

## Responsibilities

- Window: 1440x900 default, min 1100x700, dark background, hiddenInset title bar on macOS (traffic lights at x 14, y 12), external links open in the browser, CSP `script-src 'self'`, contextIsolation on, nodeIntegration off, sandbox on where Monaco workers allow it.
- Drag region: with the hidden macOS title bar the window can only be moved through a renderer element marked `app-region: drag`. ui-core must keep a drag strip at the top of the real frame (36px tall, left inset of 80px on macOS for the traffic lights, interactive children `no-drag`). The placeholder uses `TitleBarDragRegion` and the `.app-drag-region` class in `global.css`; the smoke test checks it.
- Typed IPC: every method in the system specs is a `DojoApi` member; `IPC_CHANNELS` derives names from the method names; a unit test asserts every channel has a handler. Long operations stream `BuildProgressEvent` on a dedicated channel with a run id; the renderer can cancel by id.
- Settings: electron-store for paths, provider choice, model id, theme, loop mode, MCP port; API key through `safeStorage` only. `SettingsService.current()` is synchronous after first load so services read it through closures without restarts.
- First-run flow support: engine detection results, sandbox creation progress, toolchain checks (vswhere, xcode-select) exposed through IPC with clear messages.
- Friendly errors: a single `AppError` type with a code, a plain-English message, and a suggested action; the renderer shows them in one component.
- Packaging config: electron-builder with nsis and dmg, `files`: `out/**`, `package.json`, with `content/` and `resources/` copied beside the app as `extraResources` (see A13 in `docs/decisions.md`); unsigned first (`CSC_IDENTITY_AUTO_DISCOVERY=false`), Gatekeeper note in the README.

## Done criteria

- `npm run dev` opens the window; `npm run typecheck`, `npm test`, `npm run build`, `npm run package` succeed on both CI runners.
- IPC coverage test passes; a renderer call with a bad payload returns an `AppError`, never crashes main.
- Architecture section at the bottom of this file matches the real tree (update it with every structural change).

## Architecture (keep current)

Last updated by M0.2c (settings service).

### Processes and files
- `src/main/index.ts`: composition root. Waits for `app.whenReady()`, opens the `ProgressService` on `<userData>/progress.json` (M1.6), calls `registerHandlers()`, opens the window, reopens it from the macOS dock, quits when all windows close on Windows.
- `src/main/window/createMainWindow.ts`: the one `BrowserWindow`. 1440x900 fitted to the primary screen's work area by the app itself (never below the minimum, A971), minimum 1100x700, background `#0b0d12`, `hiddenInset` title bar on macOS, `contextIsolation` on, `nodeIntegration` off, `sandbox` on. Shown on `ready-to-show`. New windows are denied and outside links (`http`, `https`) go to the system browser; in-page navigation away from the app is blocked the same way. Loads `ELECTRON_RENDERER_URL` in dev, `out/renderer/index.html` when built. In a hidden e2e run (`DOJO_TEST_HIDDEN_WINDOW=1`, see `docs/systems/qa-and-ci.md`) the window is never shown, cannot take focus (`focusable: false`), still paints (`paintWhenInitiallyHidden`), and runs unthrottled (`backgroundThrottling: false`); `index.ts` hides the macOS Dock icon before `whenReady` (A970).
- `src/main/window/testWindowMode.ts`: `isHiddenTestWindow(environment, isPackaged)`, true when `DOJO_TEST_HIDDEN_WINDOW=1`, `DOJO_TEST_SHOW_WINDOW` is not `1`, and the app is not packaged. Tested in `tests/window/testWindowMode.test.ts`.
- `src/main/ipc/`: the IPC boundary (see "IPC surface" below). `createHandlers.ts` builds the table with one `HandlerDefinition` per method (a zod schema per argument plus the answering function); `registerHandlers.ts` wraps each one and registers it on its channel; `requestSchemas.ts` holds the zod schemas, each typed against its shared type (A83); `sendBuildProgress.ts` pushes progress events to every window.
- `src/main/errors/AppErrorException.ts`: what services throw to send a specific `AppError` to the renderer (A84).
- `src/main/content/`: the content the renderer reads (A220). `resolveContentRoot.ts` picks `<appPath>/content` in dev and `<process.resourcesPath>/content` when packaged (A13). `ContentCatalog.ts` loads the folder once through the content-engine's `ContentLoader`, starting in the background at startup, and answers every content request from memory; `createContentCatalog.ts` wires it to the real loader and file system. `contentViews.ts` makes the World Map outlines and the learner quests (hint texts left out, A222). `buildGlossaryAliases.ts` makes the flat alias table (A223).
- `src/main/services/settings/`: the learner's settings (A420 to A426).
  - `SettingsService.ts`: reads electron-store's default `config.json` once at startup and keeps the settings in memory; `current()` is synchronous, so services read settings through a closure (`() => settingsService.current()`) and see a change at once. `update(patch)` writes through. `setApiKey` encrypts with `safeStorage` and stores the bytes as base64 under `apiKeyEncrypted`; the key is never logged, never kept in plain text, and never returned (only `hasApiKey`). `loadEncryptedApiKey()` hands the bytes to the review service, which decrypts only when a review needs them (A149). Paths are never trusted blindly (A427): a non-null `enginePath` in `update` must pass `EngineLocator.inspectFolder` (through `SettingsChecks`) and is stored as the engine root it found; the renderer can only reset `sandboxPath` to null, because only the sandbox service sets it, as the `SandboxPathStore`, after creating the folder and resolving its real path (A190). `completeFirstRun()` checks the same way: engine and sandbox set, the engine folder still a supported engine, the sandbox folder holding `Dojo.uproject`.
  - `storedSettings.ts`: the file's keys, the defaults (`loopMode` auto, `reviewProvider` auto, `modelId` `claude-sonnet-5-5`, `theme` dark, `mcpPort` 8000), and one zod check per stored value; a missing or invalid value falls back to its default alone.
  - `SettingsStore.ts`, `ElectronSettingsStore.ts`, `MemorySettingsStore.ts`: the file behind an interface, electron-store, and an in-memory fallback. `openSettingsStore.ts` opens the file at startup; an unparseable `config.json` is renamed to `config.invalid-<time>.json` and settings start from the defaults, logged once; if that fails too, the app runs on the memory store for the session (A429). `SecretEncryptor.ts`: the two `safeStorage` calls used; `SettingsChecks.ts`: the engine and sandbox folder checks. Tests pass fakes for all three.
  - `EnvironmentStatusReader.ts`: answers `getEnvironmentStatus` from the engine in settings (`EngineLocator.inspectFolder`), the sandbox folder (ready when it holds `Dojo.uproject` and `Binaries`), the review provider a review would use now (`resolveReviewProvider` over the review service's statuses), the loop mode, and the editor connection (`EditorService.isConnected()` once the Unreal services exist, else false; M1.4b). A part whose source fails reports as missing; the call never throws.
- `src/preload/index.ts`: exposes `window.dojo` (a `DojoApi`) through `contextBridge`. It builds one forwarding function per method from `IPC_CHANNELS`, so adding a method never needs a preload edit, and adds `onBuildProgress` and `isPackaged()` (synchronous, read from the `--dojo-packaged` argument `createMainWindow` passes in packaged builds; the renderer uses it to refuse its fake data source, A251). Built as CommonJS (`out/preload/index.cjs`) because sandboxed preloads cannot be ES modules. `src/preload/index.d.ts` types `window.dojo` for the renderer.
- `src/shared/ipc.ts`: `DojoInvokeApi` (request methods), `DojoApi` (those plus `onBuildProgress`), `IPC_CHANNELS`, `DOJO_METHODS`, `BUILD_PROGRESS_CHANNEL`, `IpcResponse`.
- `src/shared/types/`: `errors.ts` (`AppError`, `AppErrorCode`, `isAppError`), `settings.ts`, `engine.ts` (engine installs, toolchain, sandbox folder, environment status), `run.ts` (`BuildProgressEvent`, `RunResult`, `RunRequest`, `SandboxSetupRequest`), `review.ts` (the three grader results, provider status), `progress.ts` (save file, attempt outcomes, drills, daily quest, `RulesSnapshot`), `catalog.ts` (`PackOutline`, `WorldOutline`, `QuestOutline`, `LearnerQuest`, `LearnerWorld`, `GlossaryAlias`, `ContentStatus`), `drill.ts` (`DrillRequest`, `DrillSession`). `content.ts` belongs to content-engine (M0.4).
- `src/renderer/`: `index.html` (with the CSP), `src/main.tsx` (mounts React and loads the Fast Refresh preamble as a module), `src/App.tsx` (placeholder title screen until M0.3), `src/components/TitleBarDragRegion.tsx` (the 36px window drag strip), `src/lib/utils.ts` (`cn`), `src/styles/global.css` (Tailwind v4 entry and base color variables). `components.json` configures shadcn/ui with the `@/` alias.

### IPC surface

How a call travels (A80):
1. The renderer calls `window.dojo.<method>(...)`. The preload sends it with `ipcRenderer.invoke` on `dojo:<method>`.
2. In main, the wrapper parses every argument with its zod schema (unknown fields, wrong types, too many arguments, unsafe file names are all rejected). A bad payload answers `{ ok: false, error }` with code `invalid-payload` and never reaches the handler; a good one reaches it as zod's parsed copy.
3. The handler runs. Whatever it throws (an `AppErrorException`, a plain `Error`, a rejected promise, anything) becomes `{ ok: false, error }`; an unknown throw is code `unexpected` and is logged in main. Main never crashes on a renderer call.
4. The preload unwraps: `ok` resolves the promise with the value, otherwise the promise rejects with the plain `AppError` object. Renderer code uses `try` and `isAppError(error)` and shows it in the one `AppError` component.

Long operations (`createSandbox`, `rebuildSandbox`, `runQuest`, `submitQuest`) take a `runId` the renderer makes with `crypto.randomUUID()` (A82). Progress arrives as `BuildProgressEvent { runId, phase, elapsedMs, lastLine, percent?, loop?, loopReason? }` on `dojo:event:buildProgress`; `window.dojo.onBuildProgress(listener)` returns the unsubscribe function. `cancelRun(runId)` stops it, and the cancelled call rejects with `run-cancelled`. The final result comes back on the call's own promise. `getRunStatus(runId)` answers how a run stands for a window that stopped hearing from it: `running` with its last progress event and event count, `finished` with its answer (kept for the newest 20 runs), or `unknown` (A820). `trackRun` records both in the `RunRegistry`.

| Group | Method | Answer | Built by |
| --- | --- | --- | --- |
| App | `getAppVersion()` | version from package.json | done (M0.1) |
| Settings | `getSettings()` | `Settings` (with `hasApiKey`, never the key) | done (M0.2c) |
| Settings | `updateSettings(patch)` | `Settings`; the patch may set `enginePath` (must be a supported engine, else the locator's `engine-not-found` or `engine-version-unsupported`), reset `sandboxPath` to null, and set loop mode, provider, model id, theme, and `mcpPort` (1024 to 65535) | done (M0.2c) |
| Settings | `setApiKey(apiKey)`, `clearApiKey()` | nothing; key kept in safeStorage; `secure-storage-unavailable` when it cannot encrypt | done (M0.2c) |
| First run | `detectEngines()` | `EngineInstall[]` | done (M1.1), through `EngineLocator` |
| First run | `pickEngineFolder()` | `EngineInstall` or null when cancelled | done (M0.2b): native folder dialog, then `EngineLocator.inspectFolder` |
| First run | `checkToolchain()` | `ToolchainCheck` (vswhere or xcode-select) | done (M1.1), through `EngineLocator` |
| First run | `getEnvironmentStatus()` | `EnvironmentStatus` for the Title chips | done (M0.2c); `editorConnected` from the editor service since M1.4b |
| First run | `completeFirstRun()` | `Settings` with `firstRunCompletedAt`; `settings-invalid` while a path is unset, the locator's error for an engine folder that is no longer an engine, `sandbox-not-ready` when the sandbox has no `Dojo.uproject` | done (M0.2c) |
| Sandbox | `pickSandboxFolder()` | `SandboxFolderChoice` (path and warnings) or null | M1.2 |
| Sandbox | `createSandbox(request)`, `rebuildSandbox(runId)` | `SandboxSetupResult`, streams progress | M1.2 |
| Sandbox | `openEditor(questId or null)` | nothing; opens the editor on the sandbox with its MCP server and resolves once it answers (the quest id is ignored until per-quest maps exist, A533) | done (M1.4b) |
| Runs | `runQuest(request)` | `RunResult`, streams progress | M1.3, M1.4 |
| Runs | `submitQuest(request)` | `SubmitOutcome` (run, review, loot), streams progress | done (M1.7c, on M1.3b's run path) |
| Runs | `checkSnippetSyntax(request)` | `SyntaxCheckResult` for the concept scratch buffer | M1.3 |
| Runs | `cancelRun(runId)` | nothing | M1.3 |
| Runs | `getRunStatus(runId)` | `RunStatus` | M2.1e |
| Progress | `getProgress()`, `resetProgress()` | `PlayerProgress` | done (M1.6) |
| Progress | `getRules()` | `RulesSnapshot` (every rule constant the UI shows) | done (M1.6) |
| Progress | `getQuestAvailability()` | status and locked reason per quest id | done (M1.6b) |
| Progress | `getTestOutStatus()` | test-out eligibility per world id | done (M1.6b) |
| Progress | `setPlayerName(name)` | `PlayerProgress` | done (M1.6) |
| Progress | `saveQuestDraft(draft)`, `resetQuest(questId)` | nothing, `QuestProgress` (drafts hold files, board, and worked-level self-explanations); a reset also removes the quest's sandbox files (M1.4b, A534) | done (M1.6) |
| Progress | `revealHint(questId, hintIndex?)` | `HintReveal` (text, XP cost, `alreadyRevealed`; a revealed hint is answered again for free, A501) | done (M1.6b) |
| Progress | `submitConcept(submission)` | `ConceptOutcome` | done (M1.6b) |
| Progress | `submitBreakdown(submission)` | `BreakdownReferenceChoice` (which reference plan to show) | done (M1.6b) |
| Progress | `reviseBreakdown(revision)` | `BreakdownOutcome` (grade and loot) | done (M1.6b; AI grading when the review service is wired, A318) |
| Progress | `recordTermHover(termId)`, `queueDrillItem(itemId)` | nothing | done (M1.6) |
| Progress | `getDailyQuest()`, `chooseDailyOffer(index)` | `DailyQuestState` | done (M1.6b) |
| Content | `getContentStatus()` | `ContentStatus` (root, counts, every problem) | done (M0.2b) |
| Content | `listPacks()` | `PackOutline[]`: packs, worlds, quest outlines, in order | done (M0.2b) |
| Content | `getWorld(worldId)` | `LearnerWorld` with full quests (build and refactor quests carry their revealed hint texts, A502), or `world-not-found` | done (M0.2b, M1.6c) |
| Content | `getQuest(questId)` | `LearnerQuest` (hint texts replaced by `hintCount`, plus `revealedHints` with the texts already revealed, A502), or `quest-not-found` | done (M0.2b, M1.6c) |
| Content | `getGlossary()` | `GlossaryEntry[]` | done (M0.2b) |
| Content | `getGlossaryAliases()` | `GlossaryAlias[]`, longest text first, for Monaco and the TermLinker | done (M0.2b) |
| Content | `getPatternCards()` | `PatternCard[]` | done (M0.2b) |
| Drills | `startDrill(request)` | `DrillSession`; request is `{ kind: "due" }`, `{ kind: "test-out", worldId }`, or `{ kind: "parsons-fallback", questId }` | done (M1.6b) |
| Drills | `getDrillSummary()` | `DrillSummary` | done (M1.6) |
| Drills | `answerDrillItem(answer)` | `DrillItemResult` | done (M1.6b; AI grading when the review service is wired, A318) |
| Drills | `finishDrill(sessionId)` | `DrillOutcome` | done (M1.6b) |
| Review | `getReviewProviders()`, `testClaudeCode()` | `ReviewProviderStatus[]`, `ReviewProviderStatus` | done (M1.7c) |
| Review | `explainFinding(request)` | plain-English text; kept on the attempt, so a repeat is free (A851) | done (M1.7c, M3.4) |
| Review | `answerReflection(request)` | `ExplainGrade`; the answer and grade are kept on the attempt as `reflection`, and the same sentence again answers the kept grade (A852) | done (M1.7c, M3.4) |
| Review | `retryReview(attemptId)` | `CodeReview`; reviews the stored Submit again with no new build and replaces its stored review (score, pass, XP stay) | done (M1.7d) |
| Review | `getQuestAlternative(questId)` | `QuestAlternative` or null; `alternative-locked` before a pass; no AI call (A850) | done (M3.4) |

Every method answers for real; the last stubs went with M1.4b and M1.7c, and `notImplemented.ts` was removed with them. The `not-implemented` AppError code stays for features a later task may stub again. The Parsons fallback offer and the self-explanation gate are renderer-only (A89).

Content is read once at startup (A220). A file with problems is left out and listed in `getContentStatus().problems`; the rest still loads. Only a missing content folder or a load that throws makes the content methods reject, with `content-invalid` ("Unreal Dojo could not find its lessons."), and the next call tries the load again. Main never crashes on bad content.

`explainFinding`, `answerReflection`, and `retryReview` find the review by attempt id: `AttemptRecord.review` holds the `CodeReview` of every build, refactor, or boss Submit that compiled, and `AttemptRecord.files` and `AttemptRecord.run` hold what that review read, on the quest's last five Submits (A740). `AttemptRecord.explanations` and `AttemptRecord.reflection` keep the follow-ups' answers (A851, A852).

The wrapper always returns a fresh copy of an AppError with only `code`, `message`, `suggestedAction`, and `detail`, so an extra property on a thrown error (a function, a class instance) cannot make the answer fail to clone and turn into `ipc-failed`.

Adding a method: add it to `DojoInvokeApi`, add its channel to `IPC_CHANNELS` (the type forces `dojo:<method>`), add its entry to `createHandlers.ts` with one zod schema per argument (the type forces the count and each schema's type; put new request schemas in `requestSchemas.ts`). The preload needs no change; `tests/ipcHandlers.test.ts` fails if a channel has no handler.

### Security
- CSP (meta tag in `src/renderer/index.html`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'`. Inline styles are allowed because Tailwind, Motion, and React Flow set style attributes; scripts are not.
- The renderer never sees `ipcRenderer` or Node; the smoke test checks that `require` is undefined in the page.

### Build and tooling
- `electron.vite.config.ts`: `build.externalizeDeps: true` for main (anything in `dependencies` stays a real import, loaded from `node_modules`); `externalizeDeps: false` for the preload, because a sandboxed preload cannot `require` packages, so everything it imports is bundled in (electron-vite still keeps `electron` and Node built-ins external). `@shared` alias in all three targets, `@` alias and the React and Tailwind plugins in the renderer.
- `package.json` is `"type": "module"`, so the main bundle is ESM (`out/main/index.js`). `dependencies` holds only what the main process loads at runtime (electron-store, the MCP and Anthropic SDKs, zod, gray-matter, fast-xml-parser, and unified, remark-parse, remark-gfm, unist-util-visit, kept for main-process markdown work such as the glossary service in M1.8; the M0.4 content parser does not use remark-parse, it splits sections with its own fence-aware scanner and uses gray-matter and zod); renderer libraries are `devDependencies` because Vite bundles them, which keeps the installer smaller.
- TypeScript: `tsconfig.base.json` (strict plus `noUncheckedIndexedAccess`), `tsconfig.node.json` (main, preload, shared, tests, e2e, tools, configs), `tsconfig.web.json` (renderer and shared). `npm run typecheck` runs both.
- Tests: `vitest.config.ts` runs `tests/**/*.test.ts` (`tests/ipcHandlers.test.ts` covers channel coverage, payload checks, and the error wrapper; `tests/preloadBridge.test.ts` runs the preload against a mocked `electron` and checks what `window.dojo` exposes, how answers unwrap, and the progress subscription); `playwright.config.ts` runs `e2e/` against the built app (run `npm run build` first). The smoke test saves its screenshot under the gitignored `test-results/` folder (Playwright's `testInfo.outputPath`), so test runs never change tracked files. Run `SAVE_PROOF=1 npm run test:e2e` to also copy it to `docs/iterations/m0-1-window.png` for an iterations entry.
- Packaging: electron-builder config in `package.json` `build`. `out/**` goes into the asar; `content/` and `resources/` are copied next to it as `extraResources` (read through `process.resourcesPath`) so the sandbox template can be copied as real files. macOS `dmg` with `identity: null` (unsigned), Windows `nsis` (assisted installer). Output in `dist/`.

