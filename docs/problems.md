# Problems

Open problems and blockers. The Lead adds an entry when something cannot be resolved by the owning builder in one round, and removes it when solved (with a line in `decisions.md` if a decision was involved).

Format: date, system, problem, what was tried, current workaround, who owns it.

## Open


- 2026-10-21, unreal-pipeline: nothing has been verified against a real engine yet. UE 5.8.3 is now found on the Mac at `~/Applications/UE_5.8` (A03); task M1.2a proves the template build there first.
- 2026-10-21, qa: no GitHub remote and no `gh` CLI on the Mac, so M0.6 cannot show a green Actions run. Workaround: the workflow is written and each step run locally (A05). Owner: Lead, after Mohammad runs `gh auth login`.
- 2026-10-21, unreal-pipeline: a UE 5.8.3 on macOS forum report says Game-target builds can fail because UBA launches xcodebuild with a closed stdin. Spawn UBT with stdin set to ignore.

## Unverified on a platform

(The Lead lists here anything that passed on one machine and could not be run on the other.)

## Solved

(Move entries here with the fix in one line.)
