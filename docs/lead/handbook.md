# Lead handbook

How the Lead runs Unreal Dojo day to day: the loop, the tools, the rules learned the hard way, and what the next Lead needs to start on Windows. CLAUDE.md and the `/project-lead` skill are the source of truth; this file is the working detail they leave out. The reviewer brief that every reviewer reads first is `docs/lead/reviewer-brief.md`.

## Starting a Lead

1. Read CLAUDE.md, then `docs/plan.md`, `docs/decisions.md`, `docs/problems.md`, `docs/product.md`, and `docs/systems/*.md`.
2. Read this handbook and `docs/lead/reviewer-brief.md`.
3. Check the board's "Moving engine work to Windows" and "Engine missing" sections in plan.md: they list what is waiting for an engine.
4. Start one builder session per system that has work (the owner table at the top of plan.md). Sessions do not carry over between machines; a new session reads the docs and its row on the board. Give each one a short name and a brief with its branch, decision block, and proof.
5. Never wait for Mohammad. Decide, log it under "Awaiting Mohammad's review" in decisions.md with the options and the reason, and continue. Only spending money and publishing anything publicly wait for him.

## The loop

1. **Assign.** Every task gets a row on the board (Task, System, Owner, Worktree, Stage, Notes), its own branch in its own git worktree, cut from current main, and a decision block (A71: the Lead assigns blocks; the next free block is in the A71 line of decisions.md). One owner per system; a task that crosses systems is split per owner and run in order. A tiny cross-owner change may be accepted at merge if it is logged and tested (A954 is an example).
2. **Review.** A fresh reviewer agent that did not write the code checks the branch against its spec, product.md, decisions.md, and the game-dev-rules skill. Start the brief with "read docs/lead/reviewer-brief.md first", then the commit, what it claims, and what to check. Send a fix round back to the builder, then re-review with the same reviewer, which remembers its findings.
3. **Merge.** Only after a PASS. The Lead may check a very small diff itself (tests only, docs only, a few text lines) and say so in the merge message. Merge with `bash tools/lead/merge.sh <branch> "<message>"`. It merges with `--no-ff`, keeps both sides of docs-only conflicts, stops on a code conflict, then runs `npm ci`, typecheck, unit tests, the content verifier, the build, and e2e. Resolve a code conflict by hand, keeping every dependency from both sides (every `createHandlers({...})` call must pass every dependency), then rerun the checks.
4. **Record.** Update the board row to merged, tell the builder, and give it its next task. If main fails after a merge, remove only that merge commit (`git log --first-parent`) and send the branch back.
5. **Report** to Mohammad in plain English: what is done, what is next, and anything only he can do.

## Commits

Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No em dashes anywhere. Docs change in the same commit as the code they describe.

## Content rules the reviews keep catching

- **A64, A373:** a pattern is never named before its card, including in the class comments of earlier starters.
- **A67:** every boss ships a compiled reference integration with a test that plays two rounds, proven by mutations the tests catch.
- **A72:** a term gates a quest only when an earlier concept quest teaches it; every glossary term's `firstQuestId` points at the first concept quest that teaches it.
- **A73:** world ids are unique across packs.
- **D13:** originality. Compare at 6 and 5 words against Nystrom's book and the GameDev.tv research. The book PDF is no longer on the Mac (problems.md), so recent worlds were checked by a manual read and owe an n-gram check.
- **Deliberate failures** must not be given away anywhere the learner sees before failing: brief, card, questions, glossary hover cards, rubric, front matter, breakdown text.

## Engine runs

- **One at a time.** Unreal builds and tests take a directory lock so sessions never run two at once. Take it with `until mkdir "<lock>" 2>/dev/null; do sleep 20; done` and release it with `rmdir "<lock>"` as soon as the run ends, also on failure. Use one lock path for every session on the machine, for example `$(node -p "require('os').tmpdir()")/dojo-engine.lock`, and put it in every brief.
- **Integration tests** run only with an engine and only one file at a time: `DOJO_ENGINE_ROOT=<engine root> npx vitest run tests/integration --no-file-parallelism`. Without the flag the files build sandboxes at once and fail in about 200 ms (A612). Run them whenever a branch touches `src/main/ipc`, `createHandlers`, or a service they use.
- **Content proof:** `npx tsx tools/verify-content.ts --pack <id> --engine <engine root>` builds every reference solution and checks every starter. Boss mutations are edits to a scratch copy of the solution, run with `--quest <id> --solutions <copy>`. Every run builds all solutions in the folder it is given, so one broken solution anywhere fails every quest; a scratch folder with only the world's own solutions isolates a world.
- **Second slot (A1291).** The Lead may hand one session `dojo-engine-2.lock` (same folder as the main lock) together with its own workspace, `--workspace C:/dojo-ws2`, so two engine runs never share a verify workspace. A third slot works the same way (`dojo-engine-3.lock`, `--workspace C:/dojo-ws3`). Only the Lead assigns a slot.
- **Hold the lock once per batch.** The `sleep 20` loop is not fair, and with five testers the waits reached 2.5 hours. A tester with several runs (mutations, reruns) takes the lock once and runs them all inside it.
- **Never** open the windowed Unreal editor; headless and `-NullRHI` only (A643).

## Background only (A77)

Mohammad uses the machine while sessions work. e2e opens the app's windows hidden and unfocused (M0.1b, M0.1c), so it may run anywhere. Never set `DOJO_TEST_SHOW_WINDOW`, never run `npm run dev`, and never launch the app any other way in a session. If an e2e run fails at launch with a missing Electron app, `npm ci` skipped the Electron download: run `node node_modules/electron/install.js`.

## Windows (A76)

The Windows desktop is the engine machine from now on.

- **Install:** Git and GitHub Desktop, Node 24, Unreal Engine 5.8 from the Epic launcher, and Visual Studio 2022 17.14 or later with "Game development with C++" (the NativeGame workload and the MSVC x64 tools; the app's toolchain check asks for exactly this). Then clone https://github.com/mshehab22/unreal-dojo (private, A78), run `npm install`, and open the folder in Claude Code.
- **Engine root:** usually `C:\Program Files\Epic Games\UE_5.8`; `npx tsx tools/locate-engine.ts` prints what the app finds.
- **Shell:** run `tools/lead/merge.sh` and the lock commands in Git Bash. The app itself calls `UnrealBuildTool.exe` directly and anchors test names with `$`; both are handled in code.
- **Paths:** keep the sandbox path short (the app warns past 100 characters on Windows).
- **Done on 2026-10-26:** items 0 to 3 below (CI green with push back on; all five worlds proven and merged; the suite and learner flow run, their fixes in W8 and W9). Left: item 4.
- **What is waiting there,** in order:
  0. Make CI green on Windows, then turn the push trigger in `.github/workflows/ci.yml` back on (A80): `npm test` fails in 6 test files on windows-latest (path separators, CRLF line endings with no `.gitattributes`, the prerequisite filler, save-store renames). Details in problems.md. Reproduce with `npm test` on the Windows machine and split the fixes by owner.
  1. The engine proofs for the content branches marked "ready, engine proof pending" on the board (Pack 1 World 6, Pack 2 Worlds 9 to 11, Pack 3 World 6). The exact steps are in problems.md and in each world's iterations entry. A world merges once its proof passes.
  2. The integration suite for the merged code waiting on it (M1.3c, M1.6g, M2.1e, M3.4).
  3. The real-engine learner flow: `DOJO_E2E_ENGINE=1 npx playwright test e2e/learner-flow.spec.ts`.
  4. Every "unverified on Windows" item in problems.md: Live Coding and the fast loop, the UBT crash markers (A890), packaging with nsis.

## Pushing to GitHub (A78)

On the Mac the GitHub CLI is installed at `~/.local/bin/gh` and signed in as mshehab22, and git uses it for github.com, so the Lead pushes `main` after merges and any branch another machine needs (the content branches waiting for engine proof are already there). On a new machine, install the GitHub CLI and have Mohammad run `gh auth login --web --git-protocol https` in a real terminal (it asks a question and shows a code, so it cannot run inside a chat command); until then he pushes with GitHub Desktop. Never push without his sign-in, and never make the repository public.

## Lessons learned

- **Engine proofs no longer fill Temp (2026-10-28, W14, A1280):** `--engine` builds in one persistent workspace per engine version, `%USERPROFILE%\.unreal-dojo\verify\<major.minor>` on Windows (not AppData: the Claude app's MSIX package redirects AppData writes into a long hidden path, A1286; `--workspace <folder>` or `DOJO_VERIFY_WORKSPACE` moves it), and the logs of its last five runs are in `Saved/VerifierLogs/<stamp>/` there. It is a cache of a few GB that is safe to delete; the old `dojo-verify-*` folders in Temp were 2.6 GB each and can be deleted. Two runs on one engine version wait for each other on `<workspace>.lock`.
- **Engine load:** too many sessions running Unreal at once got six of them killed by the system. Hence the lock.
- **Unread rules:** an engine-gated test suite that nobody runs hides breaks. Name the flag and the command in every brief.
- **Scratch folders:** the scratch folder can be wiped; keep anything the next Lead needs (proof recipes, scripts) in the repo.
- **Messaging limit:** session messages pause after about ten in a row with no message from Mohammad; they resume when he types.
- **MSVC catches what clang does not (Windows, 2026-10-26):** a local or parameter named like an actor member (`Instigator`, `bHidden`, `Owner`, `Tags`) is error C4458 on Windows and silent on the Mac. Since V1 the content verifier lints for it without an engine (A1170), so a plain `npx tsx tools/verify-content.ts` on the Mac fails on it (A1050, A1060).
- **Shared scratch:** the session scratchpad is shared by every agent of the session, and one agent's cleanup can delete another's files. Each agent works in its own subfolder.
- **Shared node_modules (Windows, 2026-10-26):** worktrees here link `node_modules` to one installed copy with a junction (`cmd //c "mklink /J node_modules <shared path>"`), which saves a minute per worktree. `git worktree remove --force` follows the junction and empties the shared copy, and so does `npm ci` inside a linked worktree; both broke every running session once. Before removing a worktree, run `cmd //c rmdir node_modules` in it; never install inside a linked worktree; the merge script's `npm ci` runs only in the main checkout. The shared copy is the main checkout's own `node_modules`, so a merge's `npm ci` wiped it under a running engine batch (2026-11-03, Pack 2 World 13); the merge script now runs `npm ci` only when the merge changed `package-lock.json` or `node_modules` is missing. When it must run, warn the sessions first.
- **Long branches:** a branch cut long ago conflicts in `src/shared/ipc.ts`, the fake API, and test fakes. Resolve import lines by combining both sides, and add any new dependency to every fake.
