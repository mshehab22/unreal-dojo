# Unreal Dojo

A desktop app (Windows and macOS) that teaches Unreal Engine C++ through practice: concept cards with hover definitions, spaced recall drills, breakdown quests (plan a finished mechanic or system before coding), build quests (real UE5 C++ compiled and tested in a sandbox Unreal project), refactor quests, and bosses. A game layer (studio, XP, roles, pattern cards, spree, streak, loot) keeps the learner coming back. Built for Mohammad first, published free for others later.

## Docs folder

`docs/`. Read these at the start of every session, in this order:
- `docs/plan.md`: milestones, the task board (every task, system, owner, worktree, stage), ready-to-review list, handoff notes.
- `docs/decisions.md`: every decision made, with the ones awaiting Mohammad's review at the top.
- `docs/problems.md`: open problems and blockers.
- `docs/iterations.md`: builder entries per task, plain English with screenshots.
- `docs/product.md`: vision, learner model, curriculum, game design. The "why".
- `docs/systems/*.md`: one spec per system. Builders build from these; reviewers review against these.
- `docs/lead/handbook.md` and `docs/lead/reviewer-brief.md`: how the Lead runs the loop (merge script `tools/lead/merge.sh`, engine lock, background-only tests, the Windows setup) and the brief every reviewer reads first.
- `research/`: the source studies (GameDev.tv exercise design, Nystrom's patterns, gamified learning platforms, tooling and stack, Unreal concepts inventory, glossary seed). Content authors read the one for their pack before writing.

## How this project is run

The `/project-lead` skill runs this project with one change: **the Lead never waits for Mohammad.** Every open question, including design picks and names, is decided by the Lead using the research in `research/` and the specs, logged in `docs/decisions.md` under "Awaiting Mohammad's review" with the options considered and the reason, and work continues. Mohammad reads that list when he is available and can reverse any of them. Only two things stop for him: spending money (paid services, certificates, licenses) and publishing anything publicly.

- No sprints, no dates. The board in `docs/plan.md` is ordered by dependency. Builders, reviewers, and testers run in parallel from the first minute. Nobody idles.
- Each system in `docs/systems/` has one owning builder session. A task that crosses systems is split per owner and run in order.
- Each task gets its own git worktree and branch. Merge to main only after review and tests pass; run typecheck, unit tests, and the content verifier on main after every merge.
- Reviewers are fresh agents that did not write the code. They review against the system spec, `docs/product.md`, and the game-dev-rules skill (code style, comments, SOLID, folder structure, docs updated in the same commit).
- Testers run `npm run typecheck`, `npm test`, `npx tsx tools/verify-content.ts`, and the Playwright flow for anything that touches UI, and attach screenshots to `docs/iterations.md`.
- When something cannot be verified on this machine (the other platform, an engine version not installed), the Lead logs it in `docs/problems.md` as "unverified on <platform>" and moves on; it does not block.
- "Ready to playtest" in `docs/plan.md` lists what Mohammad can try, with exact steps. He tests when available; nothing waits on it.

## Commands

- `npm install`
- `npm run dev`: start the app with hot reload
- `npm run typecheck`: main, preload, and renderer type checks
- `npm test`: vitest unit tests
- `npm run test:e2e`: Playwright against the built Electron app
- `npx tsx tools/verify-content.ts [--pack <id>] [--engine <path>]`: content checks; with `--engine` it builds and runs every reference solution's tests in a temp sandbox
- `npm run build`: production build to `out/`
- `npm run package`: installer to `dist/` (nsis on Windows, dmg on macOS)

## Machines

- Mohammad's Windows desktop: where Unreal Engine lives (game dev machine). Engine pipeline work is verified there.
- Mohammad's MacBook Air (M5): where the app is developed. Unreal can be installed there too for the Mac pipeline check.
- Target engine: UE 5.8 (built-in MCP server with automation test and Live Coding toolsets). UE 5.4 to 5.7 work through the headless fallback loop.

## Code rules (the game-dev-rules skill applies to this app too)

- TypeScript strict everywhere. SOLID. One class or component per file. Feature folders as in `docs/systems/app-shell.md`.
- A one-line human-readable comment above every class, function, component, and store. Longer only when needed.
- Readable spacing, one statement per line, no abbreviations in names. No em dashes anywhere, in code comments, docs, or UI copy.
- Update `docs/systems/<system>.md`, `docs/decisions.md`, and the architecture section in the same commit as any structural change.
- Original content only. The books and the GameDev.tv course are structure and concept references. No sentence, exercise text, or code from them is reproduced. Glossary entries link to Epic's docs.
- Every build quest ships a reference solution in `tools/solutions/<quest-id>/` that the verifier actually compiles and tests.
- Never store secrets in the repo. The learner's API key goes through Electron `safeStorage`.
