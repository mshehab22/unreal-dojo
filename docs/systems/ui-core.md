# System: ui-core

Owner: builder-ui-core. Folder: `src/renderer/src/` (app frame, `screens/` for the screens below, `components/` shared, `styles/`). Research: `research/gamified-learning-platforms.md` section 1 for what each platform's screens do well; `research/tooling-and-stack.md` section 3.

## Visual direction

Use the frontend-design skill before the first screen. Dark, high contrast, generous type, one accent per pack (foundations amber, patterns violet, mechanics cyan, systems green), short feedback transitions (150 ms or less on hover, press, and panel open) allowed and expressive motion reserved for reward moments (A98), a small cast of studio characters drawn as simple vector portraits (client, lead programmer, QA) used sparingly for delight. No stock dashboard look, no gradients-on-everything. Tokens in `styles/tokens.css` (colors, spacing, radii, type scale, motion durations). Every screen works at 1100x700.

## Shared components

`TermText` (react-markdown with the TermLinker plugin, renders glossary terms as `HoverCard`), `HoverCard` (short definition, "Read more" opens the Codex panel, "Drill me" adds to the queue, increments hover count), `XpBar`, `RoleBadge`, `PatternCard` (front and back, tier frame), `SkillTree` (inline SVG, grouped by prefix, mastery color), `StreakFlame`, `SpreeMeter`, `QuestCard`, `Chest`, `AppError`, `KeyboardHints`.

## Screens

- Title: player name, continue, environment chips (engine found with version, sandbox ready, review provider active, loop mode). Fresh learner goes to First-run.
- First-run setup: pick engine (auto-detected list plus manual), pick sandbox folder (short path warning), full build progress with phase and elapsed, open editor once, done. Each step has a plain-English failure message and a retry.
- Studio home: avatar and role, engine room with modules earned, shipped-titles wall, today's daily quest offers (three), due drill count with a start button, streak and freezes, continue last quest, next due dates.
- World Map: packs as regions, worlds as contract cards with the client's one-paragraph brief, quests as stages on a path with states (locked with the reason on hover, available, in progress, passed, due for rematch glowing), boss as a larger node, test-out button per world when eligible.
- Character: level and role, XP bar, pattern card grid (locked silhouettes, tiers), skill tree with mastery, spree and best, streak and milestones, attempt history, Seer Stones and armor held.
- Codex: searchable glossary (Cmd/Ctrl+K), category filters, each entry with short, long, example, related, Epic docs link, "where you met it", "drill me".
- Settings: engine path, sandbox path, loop mode (auto, fast, headless), review provider with availability, API key (masked), model id, test Claude Code button, rebuild sandbox, reset progress with confirmation.

Keyboard: Cmd/Ctrl+K codex search; Esc closes panels.

## Done criteria

- Playwright screenshots of every screen in light-free dark theme at 1100x700 and 1440x900, attached to `docs/iterations.md`.
- Hover on a term works in every place text is rendered through `TermText`.
- No screen reads rules constants from anywhere but IPC.

## Architecture (keep current)

Last updated by M0.3 (tokens, frame, navigation).

### Tokens
- `styles/tokens.css` is the only place colors, fonts, type scale, spacing, radii, shadows, easing, entrance animations, and motion durations are defined. They are Tailwind v4 theme variables (`@theme static`, so every one is emitted on `:root` even when no utility uses it), which makes each both a CSS variable (`var(--color-ink)`) and a utility (`bg-ink`, `text-paper-muted`, `w-rail`, `rounded-lg`). Tailwind's default palette, type scale, radii, and shadows are reset, so only Dojo tokens exist.
- Colors: surfaces `ink`, `surface`, `raised`, `overlay`, `line`, `line-strong`; text `paper`, `paper-muted`, `paper-faint`; outcomes `pass`, `fail`, `warn`; pack accents `foundations` (amber), `patterns` (violet), `mechanics` (cyan), `systems` (green), each with `-soft` (tinted fill) and `-deep` (text on the accent). The shadcn names (`background`, `primary`, `muted`, `border`, `ring`, ...) are aliases onto these.
- Current pack: `pack`, `pack-soft`, `pack-deep`, `ring`, and `shadow-glow` follow the nearest `data-pack="<pack id>"` attribute (an `@theme inline` block plus `[data-pack]` rules). Foundations amber is the default and the app's signature accent.
- Motion durations (`--duration-instant` to `--duration-reward`) are plain variables, used as `duration-(--duration-fast)`. Feedback uses `instant` or `fast` (150 ms or less); `base`, `slow`, and `reward` are for reward moments only (A98). They drop to zero under `prefers-reduced-motion`.
- Font licenses ship in the packaged app at `Resources/licenses/fonts/` through an electron-builder `extraResources` entry.
- Fonts are committed woff2 files in `assets/fonts/` with `fonts.css` (imported first by `styles/global.css`) and their OFL licenses: Bricolage Grotesque (`font-display`, headings), Instrument Sans (`font-sans`, body), JetBrains Mono (`font-mono`, code and keys). No network at runtime.
- `styles/tokenCatalog.ts` names every token and its purpose for the gallery; `tests/renderer/tokenCatalog.test.ts` fails if it and `tokens.css` drift.

### Frame and routing
- `App.tsx` renders `app/AppFrame.tsx`: the `NavigationRail` (brand mark, one `RailLink` per screen, Codex search button), a scrollable stage with the dot-grid background, and the overlay panels. The shared `TitleBarDragRegion` (36px, `.app-drag-region`, room for the macOS window buttons, interactive children stay clickable) is fixed across the top of both columns; each column starts with an empty `h-titlebar` band (48px) so nothing clickable sits under it.
- Routing is a hash router with no library: `app/router/routes.ts` (route table, `routeFromHash`, `hashForRoute`; pure, unit tested) and `app/router/useRoute.ts` (`useRoute` over `hashchange`, `useNavigate`). `app/ScreenOutlet.tsx` maps a route id to its screen. Routes: `#/` Title, `#/studio`, `#/world-map`, `#/character`, `#/codex`, `#/settings`, and `#/dev/tokens` (gallery, not in the rail).
- Panels: `app/usePanelStore.ts` (Zustand) holds which overlays are open. `hooks/useGlobalShortcuts.ts` toggles Codex search on Cmd+K (macOS) or Ctrl+K and closes every panel on Esc. `components/CodexSearchPalette.tsx` is the placeholder search dialog.
- Screens live in `screens/`. Unbuilt ones use `components/PlaceholderScreen.tsx` (number, name, purpose, "built in a later task" list). The gallery is `screens/dev/`.
- Base components in `components/ui/` (shadcn/ui on `radix-ui`, restyled): `button`, `badge`, `dialog`, `input`, `kbd`, `separator`, `tooltip`. File names follow shadcn; `dialog` and `tooltip` are compound components whose parts live in one file.
- Tests: `e2e/ui-core-tokens.spec.ts` visits every route at 1100x700 and 1440x900 (forced through CDP device metrics, since the OS may cap the window), checks nothing scrolls sideways, exercises rail navigation, Cmd/Ctrl+K, and Esc, and saves screenshots to `test-results/`, copying them to `docs/iterations/m0-3-*.png` only with `SAVE_PROOF=1`. It runs with reduced motion so pictures never catch a transition.
