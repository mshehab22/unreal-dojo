# M4.y spot-check 4, 2026-11-03

A fourth look, at Pack 4 World 6 "AI perception and behavior" (`content/packs/systems/worlds/06-ai-perception-and-behavior`, merged at 41bace6). Branch `claude/m4y-spotcheck-4`, cut from main 6bb2ea2. Docs only: no content, solution or test file was changed. Method is that of `docs/reviews/m4y-spotcheck-2.md` and `docs/reviews/m4y-spotcheck-3.md`.

## Method

- The world has 6 quests, so all 6 were read (no sampling, no seed).
- Two fresh read-only reviewers ran in parallel: one for quests 01, 02 and 06, one for 03, 04 and 05. Each read the quests, their reference solutions and tests in `tools/solutions/`, the glossary entries behind `terms[]`, `docs/decisions.md` A1560 to A1565, and the house rules. Every engine claim in prose, hints, comments, `@explain` marks and editor steps was checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8/Engine/Source/Runtime/AIModule`), because engine proofs test the solutions and not the prose (A1622).
- The reviewers were also told the recurring Should-fix kinds: editor steps the learner cannot see, hints holding code or running long, text beside the brief touching the deliberate failure (A1564: a decorator without an abort mode), answer-length tells, stubs that are really faded, interchangeable Parsons lines.
- I (QA session) re-read the file lines and the engine source behind every Must fix, and the lines behind the sense-memory `NoteNoise` finding and the "interruption for free" finding. All held. One reviewer rating was lowered (Should, not Must; A1881). Nothing was dropped.
- No engine run. `npm run typecheck` and `npx tsx tools/verify-content.ts` results are at the end.

## Counts by quest

| Quest | Stage | Must fix | Should fix | Note |
|---|---|---|---|---|
| 01 `s6-guard-plan` | breakdown | 1 | 3 | 0 |
| 02 `s6-sense-memory` | worked | 0 | 3 | 4 |
| 03 `s6-walk-beat` | faded | 0 | 6 | 4 |
| 04 `s6-memory-service` | stub | 2 | 3 | 5 |
| 05 `s6-clue-decorator` | blank | 1 (glossary) | 4 | 3 |
| 06 `s6-boss-night-shift` | boss | 0 | 2 | 5 |
| World level (term teaching) | | 0 | 1 | 0 |
| **Total** | | **4** | **22** | **21** |

## Result in one line

No copied wording (the 5-word-run scan against `research/` found only code boilerplate), no em dashes, every id resolves, the numbers and class names are original, and the A1564 failure itself is sound in the engine. Four Must fix items: two false hints in the service quest, one false claim in the breakdown that also undercuts the world's failure, and one glossary hover card (`bt-decorator`) that hands over the failure and the fix before the learner meets it. Hints longer than one sentence, Parsons lines that can be swapped, and editor steps the learner cannot see are back.

Paths below are relative to `content/packs/systems/worlds/06-ai-perception-and-behavior/` unless they start with `content/` or `tools/`. Abbreviations: Q01 to Q06 are the quests by their number.

---

## Question from the Lead: the verifier went from 12 warnings to 37

**Answer: all 25 new warnings are one rule (`termOrderCheck`, A72) and one cause: this world has no concept quest, so no concept quest teaches any of its terms. The warning is correct, and it should be fixed in the content, not the rule.**

The 12 old warnings are unchanged (4 aggregate warnings, 8 older `terms:` warnings in other packs). The 25 new ones are all in World 6, all worded "never taught by a concept quest" (none says "first taught later"):

| Term | Warnings | Where | Glossary `firstQuestId` today |
|---|---|---|---|
| `ai-controller` | 5 | Q01, Q03, Q04, Q05, Q06 | none |
| `blackboard` | 5 | Q01, Q03, Q04, Q05, Q06 | none |
| `ai-perception` | 3 | Q01, Q02, Q06 | none |
| `ai-stimulus` | 3 | Q01, Q02, Q06 | `s6-sense-memory` (a build) |
| `bt-service` | 3 | Q04, Q05, Q06 | `s6-memory-service` (a build) |
| `bt-decorator` | 2 | Q05, Q06 | `s6-clue-decorator` (a build) |
| `bt-task-node` | 2 | Q03, Q06 | `s6-walk-beat` (a build) |
| `node-memory` | 2 | Q03, Q06 | `s6-walk-beat` (a build) |
| **Total** | **25** | by quest: Q01 4, Q02 2, Q03 4, Q04 3, Q05 4, Q06 8 | |

`behavior-tree` and `finite-state-machine` do not warn: Pack 2's State world (`p7-state-card`, `p7-flags-to-modes`) is a concept quest that lists them.

**Are the terms taught before a learner meets them? Partly.**

- Taught in a build quest at the point of use (functionally, in the brief and the starter comments): `bt-task-node` and `node-memory` in Q03, `bt-service` in Q04, `bt-decorator` in Q05 (deliberately not the abort modes). For these the warning is about convention, not a gap a learner would feel.
- Not taught anywhere, only linked: `ai-controller` (one sentence in `f4-pawns-and-controllers`), `ai-perception`, `ai-stimulus`, `blackboard`, and the tree vocabulary (root, selector, sequence, composite) that Q03's editor step uses at `03-build-walk-beat.md:40`. Q01 lists four of them in `terms[]` and uses them in labels without defining them (`01-breakdown-night-guard.md:41`, `:73`, `:77`); Q02 uses "perception", "sense" and "stimulus" in the brief at `02-build-sense-memory.md:22` before any visible text defines them (the only definitions are the hidden `@explain` model answers at `:167` and `:171`); Q03 uses "blackboard" and "AI controller" at `03-build-walk-beat.md:26` and lists the four keys only in Q04's editor step (`04-build-memory-service.md:38`). A learner has the hover card, which is a real definition, but that is a lookup and not a lesson, and for these four terms there is no lesson.
- So it is a real, moderate gap, not a wrong warning and not a blocker (A72: "It links but does not gate").

**Fix in the content.** Changing the rule to count build quests would silence the check for every world and it exists to catch exactly this. A1565 chose no concept quests without saying what that costs, and the sibling decision A1351 (Pack 4 World 2) went the other way because "without the concept quests every quest listing `gameplay-tags` would carry an A72 warning". Suggested shape, two short concept quests placed before the first build that needs them:

1. Before Q02, "Senses and the blackboard": `ai-controller`, `ai-perception`, `ai-stimulus`, `blackboard`. It also covers root, selector and sequence in two sentences.
2. Before Q03, "The nodes of a tree": `bt-task-node`, `node-memory`, `bt-service`, `bt-decorator`.

Rules for the second one: it must not teach the abort modes or say a decorator interrupts anything (that is the deliberate failure, A1564; see Must fix 1 and 2 below). Then point the five `firstQuestId` values at the new concept quests (the verifier only checks that the id exists), and the 25 warnings go. A cheaper partial fix does not exist: dropping the terms from `terms[]` would also drop their hover cards.

---

## Must fix

1. `content/glossary.json:4188` onward (`bt-decorator`), linked from Q05's brief (`05-build-clue-decorator.md:24`, "It is a Behavior Tree decorator") and in Q06's `terms[]`. The `short` says a decorator "can interrupt running branches when its answer changes"; the `long` says "On its own it is checked only when the tree reaches that node. Its FlowAbortMode adds observing: Self ... LowerPriority ... Both ...", and the aliases `FlowAbortMode` and `observer aborts` link the same card. That is Q05's hints 2 and 3 and its after-pass text, shown before the learner has tried and failed. The card is on screen inside the quest (A1822). A learner would never meet the failure: the card names the setting and the three values. Fix: `short` "A condition attached to a behavior tree node that decides whether its branch may run." `long`: it gates the node under it, `CalculateRawConditionValue` returns true to let the branch run, `UBTDecorator_BlackboardBase` ties it to one blackboard key. Move the abort-mode text to Q05's Alternative (`05-build-clue-decorator.md:219`, which already has it) and drop the two aliases or accept they link only to the neutral card.
2. `01-breakdown-night-guard.md:117` (Alternative Note): "its decorators give interruption for free". Wrong. A decorator's `FlowAbortMode` defaults to `None` (`BTDecorator.cpp:12`) and with `None` it is only checked when the search reaches its node (`ConditionalFlowAbort` returns at `BTDecorator.cpp:90`). A learner will expect an added decorator to interrupt a running walk, which is the exact mistake Q05 is built to make and then correct. Fix: "its decorators can interrupt a running branch once they are set to observe their key".
3. `04-build-memory-service.md:296` (hint 1): "A service only ticks if the tree is told it wants to." False for ticking: `UBTService`'s constructor sets `bNotifyTick = true` (`BTService.cpp:11`). Only `OnBecomeRelevant` is off by default (`bNotifyBecomeRelevant = false`, `BTAuxiliaryNode.cpp:13`), and that call is what the `FirstFrameSeesTheMemory` test needs. A learner who skips the macro sees the service tick, stops trusting the hint, and fails only the first-frame test with no idea why. Fix: "The first-frame copy needs the tree told the service wants its become-relevant call; the service base class has a macro for that." The brief at `:28` ("asks the tree for the activation and tick calls") is true as written because the macro sets both.
4. `04-build-memory-service.md:297` (hint 2): "The parent `TickNode` schedules the next tick, so skipping it stops the service after its first copy." False. `UBTService::TickNode` only calls `ScheduleNextTick` (`BTService.cpp:24-27`); `WrappedTickNode` clamps `NextTickRemainingTime` to 0 after each tick and leaves `TickNode` to set a new one (`BTAuxiliaryNode.cpp:62-70`, comment "tick on next frame"). Without the parent call the service ticks every frame, which is what rubric bullet 5 forbids. A learner who omits `Super::TickNode` passes four tests and never sees the stop the hint promised. Fix: "The parent `TickNode` schedules the next interval; skipping it makes the service run every frame."

## Should fix

**Q01 `s6-guard-plan`**
- `01-breakdown-night-guard.md:79` (plan 1 label): "Decorators on chase and search that interrupt running branches when the facts change". The same overclaim as Must fix 2, in a label shown after submission. Fix: "Decorators on chase and search that choose which branch may run".
- `01-breakdown-night-guard.md:117` and `03-build-walk-beat.md:670` name "Pack 2's State world". Its title is "One mode at a time" (`patterns/worlds/07-state/world.json:3`). A learner searching for a world called State will not find one. Fix: use the title.
- `01-breakdown-night-guard.md:97` (plan 2 board: "binds the brain's OnStateChanged event") against the required piece at `:65` ("shows the guard's state from the memory's events") and rubric bullet 3 at `:110` ("the memory announces its changes and the board only listens"). Plan 2 fails its own rubric. Fix: have the plan 2 board listen to the memory's `OnMemoryChanged`, or loosen the piece and bullet.

**Q02 `s6-sense-memory`**
- `02-build-sense-memory.md:537-539`: hints are two sentences each. The ladder is generic, then almost the full answer for gap 1 (hint 2: compare the actor with the followed one, `Get` returns it or null, return early), then the answer for gap 2, so a learner stuck on `NoteNoise` skips from generic to near-complete code. Fix: one sentence per rung, each stronger than the last for both gaps.
- `02-build-sense-memory.md:561` (Parsons line `if (bTargetVisible)`) and `tools/solutions/s6-sense-memory/DojoS6SenseMemoryComponent.cpp:76` (`NoteNoise`): the raw flag, not `IsTargetVisible()` (`:106-109`, which also requires the weak pointer to be valid). If the followed actor is destroyed while seen and no loss update arrives, `bTargetVisible` stays true and every later noise is ignored. That contradicts the concept "never keeps a vanished intruder alive", and no test covers it. A learner copying the pattern writes a guard that goes deaf. Fix: use `IsTargetVisible()` in `NoteNoise` and in the Parsons line, and add a test line.
- `02-build-sense-memory.md:35` (editor step): "Place a Pawn in the level ... walk in front of it". A bare `APawn` has no components (no root, mesh or facing), so the learner cannot see where it is or which way it looks. Fix: use a Character or a Pawn Blueprint with a mesh and an arrow, say which way it faces, or turn on the AI perception debug view.

**Q03 `s6-walk-beat`**
- `03-build-walk-beat.md:656-658`: hints are not one sentence each (2, 3 and 2). Hint 2 restates brief item 2 (stand on the point, advance, finish, leave) and gives the whole function. Fix: one sentence each, from idea to API to location.
- `03-build-walk-beat.md:657` and `:678-684` (hint 2 and the Parsons block): "three things in a fixed order". Only `return` must come last; `SetActorLocation`, `AdvancePoint` and `FinishLatentTask` can be swapped (`FinishLatentTask` only calls `OnTaskFinished`, which schedules the next execution). The grader compares exact order, so a valid order is marked wrong and the hint's claim is false. Fix: force the order with a data dependency or reduce the block to lines whose order is real; delete "fixed order".
- `03-build-walk-beat.md:40`: "Press Play: the guard glides to each point in turn." `ADojoS6Guard` has only a scene-component root (`tools/solutions/s6-walk-beat/DojoS6Guard.cpp`), so `BP_Guard` is invisible. The same guard is used by Q04 and Q05, where "stands still" is also only visible in the Behavior Tree debugger. Fix: have the learner add a cube mesh to `BP_Guard`, or give the guard a default mesh in the class.
- `03-build-walk-beat.md:670` (Alternative): "the engine's own tasks avoid it for that reason" is overbroad. Engine nodes that create instances: `BTTask_BlueprintBase.cpp:24`, `BTTask_PlayAnimation.cpp:19`, `BTTask_RunBehaviorDynamic.cpp:14`, and the Blueprint service and decorator bases (`BTService_BlueprintBase.cpp:26`, `BTDecorator_BlueprintBase.cpp:34`). Fix: "most of the engine's native tasks use node memory instead".
- `content/glossary.json:4149` (`node-memory`, a Q03 term): `long` and aliases name `InitializeNodeMemory`, `CleanupNodeMemory` and `CastInstanceNodeMemory`, which are the faded quest's gap 3 (hint 1 words them as "two more [calls]"). Fix: keep `GetInstanceMemorySize` and the pointer in `long`; keep the helper names as aliases only if the app does not render them.
- `03-build-walk-beat.md:361` (the `Hold` task's header comment, in the listing): "the branch above it ends only when a decorator aborts it." Two quests before the failing one, this tells the learner that decorators abort branches, which is half of the fix. The reviewer rated this Must fix; I rated it Should because it does not say a decorator needs an abort mode set (A1881). Fix: "A task that stands still and never finishes on its own", here and in `tools/solutions/s6-walk-beat/DojoS6BTTask_Hold.h`.

**Q04 `s6-memory-service`**
- `04-build-memory-service.md:296-298`: hints 2 and 3 are two sentences each; hint 3's second sentence restates brief item 3 and hint 2's second restates brief item 2. Fix: one sentence each, narrower each time.
- `04-build-memory-service.md:318-320` (Parsons): the `ClueLocation` and `HasClue` writes can be swapped. Fix: add a real dependency or drop one line.
- `04-build-memory-service.md:38` (editor step): "Give the guard's AI controller a `DojoS6SenseMemoryComponent`, as in the memory quest." `ADojoS6Guard` uses a plain `AAIController`, and the memory quest's Blueprint is `BP_Watcher`. Fix: say to set `BP_Guard`'s AI Controller Class to `BP_Watcher` and how to reach the memory from the level Blueprint (Get AI Controller, Get Component by Class, Note Noise).

**Q05 `s6-clue-decorator`**
- `05-build-clue-decorator.md:213` (rubric bullet 3: "the decorator's own branch is interrupted") with concept line 16 ("Switching branches the moment the condition changes, in both directions"): the Self and Both abort in plain words, beside the brief. Rubric and concepts state outcomes only (A1230). Fix: "When the clue goes stale, the guard leaves the clue branch and walks its beat again within half a second"; concept: "A guard that reacts to a clue while it is already busy."
- `05-build-clue-decorator.md:205-207`: hints are 2, 3 and 2 sentences. Hint 1's second sentence announces the failure ("can still fail these tests"); hint 3 carries unrelated Windows parameter-name advice. A1564 lets the ladder climb to the abort, one sentence at a time. Fix: one sentence each.
- `05-build-clue-decorator.md:227-228` (Parsons): lines 1 (`Blackboard`) and 2 (`Controller`) can be swapped.
- `05-build-clue-decorator.md:43` (editor step): "change the root to a Selector ... Keep Read Memory on the root." The root cannot be converted in place; the learner must delete the Sequence and add a Selector under Root, which deletes the service Q04 put on that Sequence (`04-build-memory-service.md:38`). "Keep" is then wrong. Fix: "Replace the root Sequence with a Selector and add Read Memory to it again."

**Q06 `s6-boss-night-shift`**
- `06-boss-night-shift.md:122-129` (rubric): never says the controller and guard know nothing about the director, though the spec says the director "only listens". The house rule is that the dependency direction is in the rubric. Bullets 2 and 6 cover only the controller's ownership and the event-only board.
- `tools/solutions/s6-boss-night-shift/s6-boss-night-shift.Test.cpp:88` ("A pebble after the finale changes nothing") is not in the spec or rubric. A spec-correct solution whose memory listener stays bound after the finale rewrites the board to "Guard: searching" and fails. Fix: add "after the round ends, a noise and the guard's senses change nothing on the board" to the spec, or drop the test line.

**World level**
- No concept quest teaches `ai-controller`, `ai-perception`, `ai-stimulus`, `blackboard` or the tree vocabulary, and the other four terms are defined only inside build quests. This is the cause of the 25 warnings and is discussed above. Fix: two concept quests as sketched, with the second kept clear of the abort modes.

## Note

**Q02**
- `02-build-sense-memory.md:551`: "nothing announces a change, so something must poll". Perception does announce changes (`OnTargetPerceptionUpdated`, which this quest binds). Say "if decisions read the getters directly, nothing in the guard announces a change".
- `02-build-sense-memory.md:22` and the test's hand-built `Lost` stimulus at 450: the engine's lost-sight broadcast carries the stored last successful stimulus marked as no longer sensed, not one with the target's current position (`AIPerceptionComponent.cpp:556-565` and `:593`, compare `AISense_Sight.cpp:611`). The clue is the last place seen, which matches Q01 and the editor step, but the test is not what the engine sends. Worth a sentence in the `@explain` at `:171`.
- Rubric bullet 4, "points at the perception component only to unbind", is inaccurate: the memory also binds and holds a strong `UPROPERTY` pointer to it.
- Parsons `memory-watch` has duplicate identical lines (`if`, `{`, `}`), easy to misplace (optional).

**Q03**
- `03-build-walk-beat.md:656`: "The three results a task can return are Succeeded, Failed, and InProgress". `EBTNodeResult` also has Aborted (from `AbortTask`). Say "from ExecuteTask".
- `03-build-walk-beat.md:662-666`: the rubric states task to guard but not that the guard knows nothing about trees; the brief at `:34` does.
- `03-build-walk-beat.md:40`: "finishes once per point" is vague, and the Behavior Tree editor debugger needs the guard selected.
- `03-build-walk-beat.md:663` names `FinishLatentTask` in the rubric: API wording, not an outcome. Not the failure, so low priority.

**Q04**
- `04-build-memory-service.md:22` and `:302`: "within a quarter of a second" is up to 0.25 s plus one frame; the test allows 20 frames and its comment says "a third of a second".
- The stub hands over all the includes; fine for a stub.
- Hint 3 gives no names for the memory accessors (`GetClueAge`, `HasClue`); the learner looks back at Q02. Acceptable at stub level.
- `GetBlackboardComponent` and `GetAIOwner` are on `UBrainComponent` (`BrainComponent.h:195-200`); the hint is right.
- A misspelled key writes nothing and logs nothing (`BlackboardComponent.h:345-352`); the Parsons distractor text is right.

**Q05**
- `tools/solutions/s6-clue-decorator/DojoS6BTDecorator_NearClue.cpp:13`: the decorator observes only the `HasClue` key. A near noise heard while a far, still-fresh clue already holds `HasClue` true changes no observed key, because `SetValue` notifies only on change (`BlackboardComponent.h:358-361`), so the abort never fires. That contradicts "a fresh near clue ... stops walking within half a second" for that sequence; the tests do not cover it. State the limit in the Alternative or cover it in a test.
- `05-build-clue-decorator.md:32`: "sets everything the decorator needs" does not hint that the node needs a name for the editor list; fine for a blank quest.
- Hints 2 and 3 and the Alternative at `:219` are accurate against `BehaviorTreeComponent.cpp:922-966`, `BTCompositeNode.cpp:235-310` and `BTDecorator_BlackboardBase.cpp:34-66`.

**Q06**
- The solution uses `LoseSightRadius` 1400 while the spec says "sees up to 1200"; `SightRadius` only sets noticing and `LoseSightRadius` is the range once seen (`AISenseConfig_Sight.h:28-32`). Untested and undisclosed.
- A null instigator makes the pebble inaudible: noise stimuli with no source are dropped in `ProcessStimuli` (`AIPerceptionComponent.cpp:504-520`). The boss has no hints and the spec says only "makes a noise there". Add "attributed to the thief".
- `06-boss-night-shift.md:110` (plan 2): "The R event behind a Running branch" is unclear.
- Extension 2 says "sharing the same tree", but the reference controller builds its own tree per controller. Say "the same tree design".
- The 60 degrees in the core numbers appears in the research as a total cone (`research` line 716); Q06 uses it as a half angle, so it is not a copy, but D13 forbids reproduced numbers, so 50 or 70 is safer.

## What checked out

- Originality: the 5-word-run scan against all of `research/` found no copied wording; the idea (sight, hearing, last known position, search) follows the research at concept level only.
- Em dashes: none in the six quests, `world.json`, the two reviewed solution folders and the five glossary entries.
- Shape: Q01 has two labelled plans and every required piece is covered; Q02 has 5 `@explain` marks and matches A1565's worked stage; Q03 has 4 marks (in range); Q04's stub bodies are empty and Q05's blank files are one comment each; Q06 has two plans, 8 rubric bullets, fixed numbers, a named reference game, 3 extensions and a feel criterion.
- Engine facts confirmed: `OnTargetPerceptionUpdated` takes `(AActor*, FAIStimulus)` (`AIPerceptionComponent.h:23`, `:423`) and `OnPerceptionUpdated` does not (so the Parsons distractor is right); `GetSenseClassForStimulus` (`AIPerceptionSystem.cpp:659`); sight's `PeripheralVisionAngleDegrees` is a half angle (`AISenseConfig_Sight.h:35-37`); `INIT_TASK_NODE_NOTIFY_FLAGS` sets `bNotifyTick` and the default is false (`BTTaskNode.cpp:11`); `RunBehaviorTree` starts the tree looped (`AIController.cpp:1039`); `EvaluateBranch` returns at once with abort mode `None` (`BehaviorTreeComponent.cpp:933-937`), so A1564's failure holds.
- Not verified: the Gameplay Debugger and Behavior Tree editor behaviour were checked against source only; nothing was built or run with `--engine`.

## Checks on this branch

`npm run typecheck`: passes (exit 0). `npx tsx tools/verify-content.ts`: no problems, 37 warnings, of which 25 are the term-order warnings explained above and 12 are the previous set.
