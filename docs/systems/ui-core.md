# System: ui-core

Owner: builder-ui-core. Folder: `src/renderer/src/` (app frame, `screens/` for the screens below, `components/` shared, `styles/`). Research: `research/gamified-learning-platforms.md` section 1 for what each platform's screens do well; `research/tooling-and-stack.md` section 3.

## Visual direction

Use the frontend-design skill before the first screen. Dark, high contrast, generous type, one accent per pack (foundations amber, patterns violet, mechanics cyan, systems green), motion only on reward moments, a small cast of studio characters drawn as simple vector portraits (client, lead programmer, QA) used sparingly for delight. No stock dashboard look, no gradients-on-everything. Tokens in `styles/tokens.css` (colors, spacing, radii, type scale, motion durations). Every screen works at 1100x700.

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
