# System: app-shell

Owner: builder-shell. Folders: `src/main/index.ts`, `src/main/window/`, `src/main/ipc/`, `src/main/services/settings/`, `src/preload/`, `electron.vite.config.ts`, `package.json`. Research: `research/tooling-and-stack.md` sections 1, 6, 8, setup commands, pitfalls.

## Stack (pinned by `docs/decisions.md` D01 to D08)

Electron ^44, electron-vite ^6 (use `build.externalizeDeps`, not the deprecated plugin), Vite 8, React 19, TypeScript 5.9 strict, Tailwind v4 via `@tailwindcss/vite`, shadcn/ui, motion, lucide-react, monaco-editor + @monaco-editor/react (bundled locally, workers configured), @xyflow/react, react-markdown + unified + unist-util-visit + remark-gfm, zustand, electron-store, @modelcontextprotocol/sdk, @anthropic-ai/sdk, vitest, @playwright/test, electron-builder, tsx.

## Layout

```
src/
  shared/types/        content.ts, progress.ts, run.ts, review.ts, settings.ts, index.ts
  shared/ipc.ts        DojoApi interface, IPC_CHANNELS map, progress event names
  main/index.ts        app lifecycle, window, composition root
  main/window/createMainWindow.ts   the BrowserWindow and its security rules
  main/ipc/registerHandlers.ts
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
- Settings: electron-store for paths, provider choice, model id, theme; API key through `safeStorage` only. `SettingsService.current()` is synchronous after first load so services read it through closures without restarts.
- First-run flow support: engine detection results, sandbox creation progress, toolchain checks (vswhere, xcode-select) exposed through IPC with clear messages.
- Friendly errors: a single `AppError` type with a code, a plain-English message, and a suggested action; the renderer shows them in one component.
- Packaging config: electron-builder with nsis and dmg, `files`: `out/**`, `package.json`, with `content/` and `resources/` copied beside the app as `extraResources` (see A13 in `docs/decisions.md`); unsigned first (`CSC_IDENTITY_AUTO_DISCOVERY=false`), Gatekeeper note in the README.

## Done criteria

- `npm run dev` opens the window; `npm run typecheck`, `npm test`, `npm run build`, `npm run package` succeed on both CI runners.
- IPC coverage test passes; a renderer call with a bad payload returns an `AppError`, never crashes main.
- Architecture section at the bottom of this file matches the real tree (update it with every structural change).

## Architecture (keep current)

Last updated by M0.1 (scaffold). M0.2 adds the full typed IPC contract.

### Processes and files
- `src/main/index.ts`: composition root. Waits for `app.whenReady()`, calls `registerHandlers()`, opens the window, reopens it from the macOS dock, quits when all windows close on Windows.
- `src/main/window/createMainWindow.ts`: the one `BrowserWindow`. 1440x900 (the OS caps it to the screen's work area), minimum 1100x700, background `#0b0d12`, `hiddenInset` title bar on macOS, `contextIsolation` on, `nodeIntegration` off, `sandbox` on. Shown on `ready-to-show`. New windows are denied and outside links (`http`, `https`) go to the system browser; in-page navigation away from the app is blocked the same way. Loads `ELECTRON_RENDERER_URL` in dev, `out/renderer/index.html` when built.
- `src/main/ipc/registerHandlers.ts`: one `ipcMain.handle` per `DojoApi` method.
- `src/main/services/settings/`: empty; SettingsService arrives with the settings task.
- `src/preload/index.ts`: exposes `window.dojo` (a `DojoApi`) through `contextBridge`. Built as CommonJS (`out/preload/index.cjs`) because sandboxed preloads cannot be ES modules. `src/preload/index.d.ts` types `window.dojo` for the renderer.
- `src/shared/ipc.ts`: `DojoApi` interface and `IPC_CHANNELS`, typed so every method has exactly one channel. `src/shared/types/*.ts` are empty stubs owned by the system tasks.
- `src/renderer/`: `index.html` (with the CSP), `src/main.tsx` (mounts React and loads the Fast Refresh preamble as a module), `src/App.tsx` (placeholder title screen until M0.3), `src/components/TitleBarDragRegion.tsx` (the 36px window drag strip), `src/lib/utils.ts` (`cn`), `src/styles/global.css` (Tailwind v4 entry and base color variables). `components.json` configures shadcn/ui with the `@/` alias.

### IPC surface
| Method | Channel | Answer |
| --- | --- | --- |
| `getAppVersion()` | `dojo:getAppVersion` | `app.getVersion()` from package.json |

### Security
- CSP (meta tag in `src/renderer/index.html`): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'`. Inline styles are allowed because Tailwind, Motion, and React Flow set style attributes; scripts are not.
- The renderer never sees `ipcRenderer` or Node; the smoke test checks that `require` is undefined in the page.

### Build and tooling
- `electron.vite.config.ts`: `build.externalizeDeps: true` for main (anything in `dependencies` stays a real import, loaded from `node_modules`); `externalizeDeps: false` for the preload, because a sandboxed preload cannot `require` packages, so everything it imports is bundled in (electron-vite still keeps `electron` and Node built-ins external). `@shared` alias in all three targets, `@` alias and the React and Tailwind plugins in the renderer.
- `package.json` is `"type": "module"`, so the main bundle is ESM (`out/main/index.js`). `dependencies` holds only what the main process loads at runtime (electron-store, the MCP and Anthropic SDKs, zod, gray-matter, fast-xml-parser, and unified, remark-parse, remark-gfm, unist-util-visit, kept for main-process markdown work such as the glossary service in M1.8; the M0.4 content parser does not use remark-parse, it splits sections with its own fence-aware scanner and uses gray-matter and zod); renderer libraries are `devDependencies` because Vite bundles them, which keeps the installer smaller.
- TypeScript: `tsconfig.base.json` (strict plus `noUncheckedIndexedAccess`), `tsconfig.node.json` (main, preload, shared, tests, e2e, tools, configs), `tsconfig.web.json` (renderer and shared). `npm run typecheck` runs both.
- Tests: `vitest.config.ts` runs `tests/**/*.test.ts`; `playwright.config.ts` runs `e2e/` against the built app (run `npm run build` first). The smoke test saves its screenshot under the gitignored `test-results/` folder (Playwright's `testInfo.outputPath`), so test runs never change tracked files. Run `SAVE_PROOF=1 npm run test:e2e` to also copy it to `docs/iterations/m0-1-window.png` for an iterations entry.
- Packaging: electron-builder config in `package.json` `build`. `out/**` goes into the asar; `content/` and `resources/` are copied next to it as `extraResources` (read through `process.resourcesPath`) so the sandbox template can be copied as real files. macOS `dmg` with `identity: null` (unsigned), Windows `nsis` (assisted installer). Output in `dist/`.

