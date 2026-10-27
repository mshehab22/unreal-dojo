# Reviewer brief

Every reviewer reads this first. You are a fresh reviewer: you did not write the work you are reviewing.

## What to review against

The system spec in `docs/systems/`, `docs/product.md`, `docs/decisions.md`, and the game-dev-rules skill: code style, a one-line comment above every class, function, component, and store, SOLID, one class or component per file, folder structure, no abbreviations in names, no em dashes anywhere, and docs updated in the same commit as the code.

## How to work

- **Your own worktree.** Work in a detached worktree: `git worktree add --detach <scratch folder>/<name> <commit>`. For a temp merge with main, merge main into that detached worktree. Never edit the main checkout, never commit to any branch, never push. Remove your worktrees with `git worktree remove --force` and `git worktree prune` when done.
- **Install.** Run `npm ci` in your worktree before the checks, unless the Lead's brief gives you a `node_modules` junction to a shared folder: then never run `npm ci` or `npm install` (it empties the shared folder for every session), and before `git worktree remove`, delete the junction with `cmd //c rmdir node_modules`. If the Electron app is missing afterwards, run `node node_modules/electron/install.js`.
- **Checks:** `npm run typecheck`, `npm test`, `npx tsx tools/verify-content.ts`, `npm run build`, and `npm run test:e2e`. A known load flake fails about one run in twelve: if exactly one e2e test fails, rerun once before blaming the branch.
- **Background only (A77).** e2e opens its windows hidden. Never set `DOJO_TEST_SHOW_WINDOW`, never run `npm run dev`, and never launch the app any other way: the person at the computer is using it.
- **Engine runs.** Only one at a time on a machine. Take the lock the Lead names in your brief before any Unreal build, headless test, or `--engine` run, and release it as soon as the run ends, also on failure. Never launch the windowed editor.
- **Integration tests.** They are skipped unless `DOJO_ENGINE_ROOT` is set. If the branch touches `src/main/ipc`, `createHandlers`, or a service those tests use, run them under the lock with `DOJO_ENGINE_ROOT=<engine root> npx vitest run tests/integration --no-file-parallelism`. The flag is required (A612).
- **No engine on the machine.** Do every other check and list each engine step you could not run under "Not verified: engine not installed", precisely enough to run later. Do not fail a review only for that.

## Content reviews

- **Engine:** run the pack with `--engine`, confirm every reference passes and every starter fails or does not compile as designed, and try at least two boss mutations of your own (A67).
- **Originality (D13):** compare at 6 and 5 words against the sources the brief names, and read every card item for leftover book examples.
- **Accuracy:** check every Unreal claim against UE 5.8.
- **Windows compiler:** no local or parameter in a solution or starter may share a name with a member of the class it sits in or of `AActor`, `UActorComponent`, or `UObject` (`Instigator`, `bHidden`, `Owner`, `Tags`, and so on). MSVC rejects it as C4458 and clang on the Mac does not warn (A1050, A1060).
- **Rules:** check A64 (and A373 for starter comments), A66, A72 and every `firstQuestId`, A73, and that rubrics match briefs.
- **Deliberate failure:** confirm it is not given away anywhere the learner sees before failing, including glossary hover cards and the rubric shown beside the brief.

## Report

Start with PASS or FIXES NEEDED. Then list each issue with its file and line, the problem, and the fix. Then say what you verified and what you could not verify. Clean up your worktrees.
