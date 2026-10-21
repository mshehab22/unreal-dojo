# System: app-shell

Owner: builder-shell. Folders: `src/main/index.ts`, `src/main/ipc/`, `src/main/services/settings/`, `src/preload/`, `electron.vite.config.ts`, `package.json`. Research: `research/tooling-and-stack.md` sections 1, 6, 8, setup commands, pitfalls.

## Stack (pinned by `docs/decisions.md` D01 to D08)

Electron ^44, electron-vite ^6 (use `build.externalizeDeps`, not the deprecated plugin), Vite 8, React 19, TypeScript 5.9 strict, Tailwind v4 via `@tailwindcss/vite`, shadcn/ui, motion, lucide-react, monaco-editor + @monaco-editor/react (bundled locally, workers configured), @xyflow/react, react-markdown + unified + unist-util-visit + remark-gfm, zustand, electron-store, @modelcontextprotocol/sdk, @anthropic-ai/sdk, vitest, @playwright/test, electron-builder, tsx.

## Layout

```
src/
  shared/types/        content.ts, progress.ts, run.ts, review.ts, settings.ts, index.ts
  shared/ipc.ts        DojoApi interface, IPC_CHANNELS map, progress event names
  main/index.ts        app lifecycle, window, composition root
  main/ipc/registerHandlers.ts
  main/services/<system>/...
  preload/index.ts     contextBridge exposing window.dojo and an onBuildProgress subscription
  renderer/src/        React app (see ui-core and ui-quests)
tests/                 vitest
e2e/                   Playwright
tools/                 verify-content.ts, scripts
content/, resources/, research/, docs/
```

## Responsibilities

- Window: 1440x900 default, min 1100x700, dark background, hiddenInset title bar on macOS, external links open in the browser, CSP `script-src 'self'`, contextIsolation on, nodeIntegration off, sandbox on where Monaco workers allow it.
- Typed IPC: every method in the system specs is a `DojoApi` member; `IPC_CHANNELS` derives names from the method names; a unit test asserts every channel has a handler. Long operations stream `BuildProgressEvent` on a dedicated channel with a run id; the renderer can cancel by id.
- Settings: electron-store for paths, provider choice, model id, theme; API key through `safeStorage` only. `SettingsService.current()` is synchronous after first load so services read it through closures without restarts.
- First-run flow support: engine detection results, sandbox creation progress, toolchain checks (vswhere, xcode-select) exposed through IPC with clear messages.
- Friendly errors: a single `AppError` type with a code, a plain-English message, and a suggested action; the renderer shows them in one component.
- Packaging config: electron-builder with nsis and dmg, `files` including `out/`, `content/`, `resources/`; unsigned first (`CSC_IDENTITY_AUTO_DISCOVERY=false`), Gatekeeper note in the README.

## Done criteria

- `npm run dev` opens the window; `npm run typecheck`, `npm test`, `npm run build`, `npm run package` succeed on both CI runners.
- IPC coverage test passes; a renderer call with a bad payload returns an `AppError`, never crashes main.
- Architecture section at the bottom of this file matches the real tree (update it with every structural change).

## Architecture (keep current)

(Builder maintains a short description of main-process services, their dependencies, and the IPC surface here.)
