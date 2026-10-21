# Problems

Open problems and blockers. The Lead adds an entry when something cannot be resolved by the owning builder in one round, and removes it when solved (with a line in `decisions.md` if a decision was involved).

Format: date, system, problem, what was tried, current workaround, who owns it.

## Open


- 2026-10-21, unreal-pipeline: nothing has been verified against a real engine yet. The exact commands come from Epic's docs and forum posts in `research/tooling-and-stack.md` section 9; the first task on the board proves them.
- 2026-10-21, unreal-pipeline: a UE 5.8.3 on macOS forum report says Game-target builds can fail because UBA launches xcodebuild with a closed stdin. Spawn UBT with stdin set to ignore.

## Unverified on a platform

(The Lead lists here anything that passed on one machine and could not be run on the other.)

## Solved

(Move entries here with the fix in one line.)
