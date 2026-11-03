# M4.y spot-check 2, 2026-11-03

A second look at the seven worlds merged since the first spot-check (`docs/iterations.md`, "M4.y spot-check, 2026-10-26"). Branch `claude/m4y-spotcheck-2`, cut from main 6ed57c6. Docs only: no content, solution or test file was changed.

## Method

- Sampling: seeded shuffle (mulberry32, seed **20261103**) of each world's quest files. A world with 8 or fewer quests is taken whole. Packs 3 Worlds 1 to 3 have 10 quests each, so 8 were drawn each.
- One fresh reviewer per world read the sampled quests, their reference solutions and tests in `tools/solutions/`, the glossary entries behind `terms[]`, and the research files. Engine API claims were checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8`). The book PDF is not in the repo, so originality was compared with `research/*.md` (5-word run scan) plus the reviewers' knowledge of Nystrom and the GameDev.tv course.
- I (the Lead's QA session) re-checked the findings that carry the most weight against the files or the engine source: both Must fix items, the World 13 boss and starter items, World 1 of Pack 4 (`fails on purpose`, `DA_Dagger`), World 3's breakdown plate line and boss feel line, and the unsampled cracking wall number. Where a reviewer's severity did not hold I changed it (marked "severity changed").
- No engine run. Anything that needs the engine or the editor is marked as read from the code. `npm run typecheck` passes. `npx tsx tools/verify-content.ts` on this branch: no problems, 12 warnings (the known pattern-coverage warning and similar).

## Counts by world

| World | Sampled | Must fix | Should fix | Note |
|---|---|---|---|---|
| Pack 2 World 12, Prototype (`patterns/worlds/12-prototype`) | 6 of 6 | 0 | 4 | 8 |
| Pack 2 World 13, Bytecode (`patterns/worlds/13-bytecode`) | 7 of 7 | 0 | 3 | 6 |
| Pack 3 World 1, Enhanced Input (`mechanics/worlds/01-input`) | 8 of 10 | 1 | 7 | 7 |
| Pack 3 World 2, Transforms (`mechanics/worlds/02-transforms`) | 8 of 10 | 1 | 5 | 4 |
| Pack 3 World 3, Collision (`mechanics/worlds/03-collision`) | 8 of 10 | 0 | 3 | 5 |
| Pack 4 World 1, Inventory and equipment (`systems/worlds/01-inventory-and-equipment`) | 6 of 6 | 0 | 7 | 7 |
| Pack 4 World 2, Ability system (`systems/worlds/02-ability-system`) | 8 of 8 | 0 | 3 | 4 |
| **Total** | 51 | **2** | **32** | **41** |

Sampled quests: Pack 3 World 1 skipped 03 and 05; World 2 skipped 05 and 09; World 3 skipped 05 and 06. Every other quest in the seven worlds was read.

## Result in one line

No copied wording in any world (one near-paraphrase of Epic's code comment and two close research echoes, all Notes or Should fix below), no em dashes anywhere (quests, solutions, glossary entries), every glossary term, prerequisite and `related` id resolves. Two Must fix items are wrong Unreal facts taught to the learner. The recurring Should fix kinds are editor steps that promise something the learner cannot see, hints that are long or hold code, and text beside the brief that touches the deliberate failure.

Abbreviations below: `P2W12` is `content/packs/patterns/worlds/12-prototype`, `P2W13` is `.../13-bytecode`, `M1` is `content/packs/mechanics/worlds/01-input`, `M2` is `.../02-transforms`, `M3` is `.../03-collision`, `S1` is `content/packs/systems/worlds/01-inventory-and-equipment`, `S2` is `.../02-ability-system`. Line numbers are on 6ed57c6.

---

## Pack 2 World 12, Prototype (author-patterns)

Sampled all 6. Fade ladder passes (worked 02, stub 04, stub refactor 05, same shape as Worlds 9 to 11). The deliberate failure (a grandchild whose parent is itself a child, quest 04) is not named beside any brief. Starters fail, spot-the-bug items each have one wrong line, API clean.

**Must fix:** none.

**Should fix**
- `P2W12/05-refactor-kit.md:233` (hint 2) is code: `DuplicateObject<UDojoP12Kit>(SourceObject, Outer)`, the whole call, which the brief already gives at line 29. Hints carry no code. Fix: describe it in words ("the engine function that copies an object takes the source and an outer; the kit's own outer is what its `GetOuter` returns").
- `P2W12/03-prototype-card.md:45`: "There is no need for a bare abstract 'base' record: the plain Basic trial was a real trial and the parent of the others." Same idea, same order as Nystrom's remark that a concrete goblin can serve as the prototype (and as `research/patterns-inventory.md` line 322). Not a verbatim run. Fix: drop the sentence or state it as a rule of this hall ("keep the parent a trial players can actually run, so designers can test it").
- `content/patterns.json:1627` (prototype-scenario-3) follows the shape and the "one or two" wording of the research scenario at `research/patterns-inventory.md:369`; `:1600` (scenario-2, "sixty blade kinds") reuses 60 from research line 843. Neither is a 5-word run. Fix: change the numbers and the shape (for example "every trial starts from the Basic trial's time limit and reward").
- `P2W12/03-prototype-card.md:102-104` (`prototype-or-type-object`): the correct choice (index 2) is far longer than the other three. Fix: trim it or pad the others.

**Note**
- `P2W12/05-refactor-kit.md:37` (editor step): "Make a Blueprint function library or use the Level Blueprint" (a function library has no Begin Play); "Set Favor on the first kit only" never says what to set it to.
- `P2W12/04-build-trial-rows.md:39` (editor step): never says to add the key event for "resolve Swift from a key press", and never says to resolve Heavy though it claims "Heavy keeps its 25".
- `P2W12/02-build-blade-copies.md:370-372`: the three hints cover three separate gaps (template, offset, wake), so they do not narrow one problem. No code. Hint 1 nearly hands over `TunedBlade->GetClass()`.
- `P2W12/04-build-trial-rows.md:362-366`: both Parsons distractors are plain C++ (`Result = *Row;`, `const_cast`), not Unreal lines. Quest 02's is Unreal, so the world meets the rule.
- `P2W12/01-copy-the-tuned-one.md:94-103` repeats `content/patterns.json:1556` (recall-5) nearly word for word; `06-prototype-when-not.md:72-81` repeats scenario-4 at `:1652`; Q01 (line 82) and Q06 (line 82) both test the `GetMutableDefault` write bug.
- Scenario-3 (answer "prototype", copies look up the parent live) and `06-prototype-when-not.md:41` (point copies at a shared record when all must follow one edit) are easy to confuse. The card at `03-prototype-card.md:51` explains it.
- `P2W12/06-prototype-when-not.md:70,80,102`: three items in a row have `answerIndex` 1. The runner shuffles.
- `P2W12/05-refactor-kit.md:100`: `Instanced` on `Charm` is not what makes `DuplicateObject` copy it deeply; it could teach that wrongly. Compiles, engine-proven.

---

## Pack 2 World 13, Bytecode (author-patterns)

Sampled all 7. Deliberate failure (operand order of Less and Greater) appears only by example in the brief (A1374). Starters fail as designed (the trap starter passes 2 of 4 tests). Reflection, `TArray::Pop(EAllowShrinking::No)`, `UPARAM(ref)`, `EditCondition`, `BindKey` all correct. No wizard or spell examples.

**Must fix:** none.

**Should fix**
- `P2W13/07-boss-modded-vault.md:42` (Feel), repeated in rubric bullet 8 (`:125`): "the order of potions matters and a player who drinks everything at once in the wrong order is short of the Vault door ... about ten seconds to spare" cannot be shown with the standard mod at `:24`. Only Second Wind touches Health; Purse and Key brew change Gold and Keys; doors change no stats. Time to spare also depends on a champion speed the spec never fixes. Fix: either say the learner adds or changes an entry (a potion that costs Health, so order matters) or fix a speed and a recipe set where order matters; reword rubric bullet 8 to match.
- `P2W13/04-build-door-conditions.md:63,65`: starter doc comments on `ECO_Less` and `ECO_Greater` read "whether the first written is less than the second" and "... greater than the second". A1374 says only the brief states the operand order, by example. The learner reads the header before the failing test. Fix: use the wording of the other ops ("Takes two values and puts back whether the comparison holds").
- The correct answer is the longest choice in most multiple-choice items: `P2W13/01-behavior-as-data.md` lines 27-31, 76-81, 94-97, 124-132; `03-bytecode-card.md` lines 28-31; `06-bytecode-when-not.md` lines 28-31, 81-88, 93-98. Fix: match choice lengths.

**Note**
- Severity changed from Should fix: `P2W13/06-bytecode-when-not.md:100-116` (`spot-no-tools`). The reviewer called `bugLine: 6` ("if (!Execute(...)) return false;") a missing-line bug. The line is present and the mistake is that it returns without a log, which the spec allows; it is also the same line the learner writes in `02-build-potion-recipes.md`, which can confuse. Optional: make the bad version show a visible "nothing recorded" cue.
- `answerIndex: 1` on 4 of 5 multiple-choice items in `P2W13/01-behavior-as-data.md` and 3 of 4 in `06-bytecode-when-not.md`; most card items too. Shuffled at run time.
- `P2W13/02-build-potion-recipes.md:490` (hint 2): "the fifth step fails, even though the second step wrote to them" does not match the `WritesThenFails` test (third step after a write on the second). The three hints cover three separate sub-problems.
- `P2W13/05-refactor-trap-routines.md:40`: "select each trap in turn" after F8, but the dart trap has only a scene root, so there is nothing to click in the viewport. Say "in the World Outliner".
- Fade ladder is worked, stub, stub, as in Worlds 8 to 12 (consistent with the project convention).
- `blueprint-recall-1` and the `blueprint-is` item in `03-bytecode-card.md:86-95` are near duplicates; A1379 says on purpose.

---

## Pack 3 World 1, Enhanced Input (author-mechanics)

Sampled 8 of 10 (not 03, 05). Boss complete (KSP named, fixed numbers, 3 extensions, feel line, 8 bullets, two plans cover every piece). The world's deliberate failure (diagonal speed, quest 05, not sampled) appears in none of the sampled text.

**Must fix**
- `M1/08-triggers-and-events.md:46,48,79-88` (`ongoing-needs-time`): the card says "Only triggers that take time can be ongoing, so only they announce `Ongoing`". The question "Which trigger can make an action announce Ongoing?" has choices Pressed, Released, Down, Hold with answer Hold (index 3) and explanation "Pressed, Released, and Down answer at once". Wrong: `UInputTriggerReleased::UpdateState` returns `Ongoing` while the key is actuated and `Triggered` on release (checked in `Plugins/EnhancedInput/.../InputTriggers.cpp:166-180`, and the header comment "Trigger returns Ongoing whilst input exceeds the actuation threshold"). Released is a second correct answer. Fix: drop Released from the choices (use Pressed, Down, Hold, Tap), reword line 48 to "Pressed and Down answer at once; Released is ongoing while the key is down and triggers on release", and fix the explanation at line 88 the same way.

**Should fix**
- `M1/09-build-charge-meter.md:24-28,103-142,166-239`: labelled blank, but the whole header ships with the five stage functions named and described, and `// Your code:` step lists sit in `NotifyControllerChanged` and `SetupPlayerInputComponent`. It is a stub, so the ladder (07 stub, 09 blank) does not step down. Fix: ship an empty `.h` and `.cpp`, list the public interface in the brief (`GetMeter`, `IsCharging`, `GetLastShot`, `GetShotsFired`, `TierForMeter`, `FullChargeSeconds`, `ChargeAction`, `ChargeContext`, the tier enum) and leave the stage functions to the learner. (Verified: the brief at line 24 says the header is written for the learner.)
- `M1/04-build-turntable.md:36` (editor step): "Hold D: the turntable turns right at 90 degrees per second" cannot be seen. The pawn has only a scene root, `bUseControllerRotationYaw` is false so the PIE camera does not turn either. Fix: eject with F8, select the live actor in the World Outliner and watch Rotation Z in Details, or add a Static Mesh in a Blueprint subclass.
- `M1/09-build-charge-meter.md:38` (editor step): "Add a Print String of Get Meter and Get Last Shot on a one second Set Timer by Event" never says to make a Blueprint subclass of `DojoM1Charger` (quest 07 line 37 does).
- `M1/04-build-turntable.md:28,428` and `M1/09-build-charge-meter.md:30`: "The controller and the engine hold no pointer to this class" and "nothing else points at it" are false (the controller holds the possessed pawn; the input component holds a delegate bound to it). Fix: "no code in the controller or the engine names this class".
- `tools/solutions/m1-boss-drone-handoff/DojoM1DroneHandoff.cpp:167` and `M1/10-boss-drone-handoff.md:29`: `FMath::Abs(Scanner->GetActorRotation().Yaw) >= TurnGoalDegrees` uses the normalized yaw. A scanner turned 350 degrees reads as 10 and a full 360 reads as 0, though the spec says "turned at least 90 degrees ... (either way)". Fix: say the goal is the net angle from the start in the range -180 to 180, or track the cumulative turn.
- `M1/02-actions-and-values.md:86-90` (`wrong-read` code): line 4, `AddActorLocalOffset(FVector(0.f, Push * Speed, 0.f))`, has no delta time, which is the frame-rate-dependent movement quest 04 forbids, giving a second plausible wrong line. Fix: multiply by `GetWorld()->GetDeltaSeconds()`.
- `M1/09-build-charge-meter.md:444-454` (Parsons `charger-bind`): the five `BindAction` lines are independent, but the grader accepts one order and the prompt does not say which. Fix: say "in the order the events happen", or merge lines.

**Note**
- `M1/10-boss-drone-handoff.md:27,35`: the tie rule cannot happen with the fixed numbers (drones 1000 apart, reach 250). The test only reaches it with `ReachDistance = 600` (`m1-boss-drone-handoff.Test.cpp:180`). Say reach is a designer value and a larger reach is how the tie shows.
- Hints are 2 to 3 sentence paragraphs (`M1/04` line 420, `M1/07` lines 340-342, `M1/09` lines 413-415); `M1/09` hint 3 states the formula, `M1/04` hint 3 has the expression `GetWorld()->GetDeltaSeconds()`. No code lines.
- `M1/09-build-charge-meter.md:428`: "is the State pattern" overclaims (two flags and five handlers). Quest 07 line 355 hedges and is fine.
- `M1/08-triggers-and-events.md:31`: "began to be evaluated but never reached Triggered" is close to Epic's `ETriggerEvent::Canceled` code comment ("The action has started to be evaluated, but never completed"). Reword.
- Answer positions: concept quests 02 (1,1,1, predict 2), 06 (2,2,1,1) and 08 (2,3,1,1) never use index 0.
- `M1/01-breakdown-controls-plan.md`: acceptance line 28 and rubric line 100 ask about a held key when a context is added, and the layers and consume pieces (lines 40, 51) lean on quest 06, taught later; line 79, `{ from: walker, to: pause, label: sits below }`, reads as a dependency in the wrong direction.
- `M1/09-build-charge-meter.md:414`: "built like the walker's" points at `m1-move-pad`, which is not in this quest's "Compiles against" line. Use the turntable.

---

## Pack 3 World 2, Transforms and movement (author-mechanics)

Sampled 8 of 10 (not 05, 09). Boss complete (Fall Guys named, 8 bullets). Only the patrol has a deliberate failure and it is not named. Starters fail. The reviewer read the 5.8 engine source for the API claims.

**Must fix**
- `M2/06-interpolation.md:38`: the Constant bullet ends "A speed of 0 or less means no limit at all: the helper jumps straight to the target." True only for `RInterpConstantTo`. Verified in `Engine/Source/Runtime/Core/Private/Math/UnrealMath.cpp:2562-2580` (`VInterpConstantTo` returns `Current` when `MaxStep` is 0) and `UnrealMathUtility.h:1490-1505` (`FInterpConstantTo` steps by `InterpSpeed * DeltaTime`, so 0 stands still). `RInterpConstantTo` and the ease-out helpers do return `Target`. The dart solution's special case for `TurnRate == 0` (`tools/solutions/m2-dart/DojoM2Dart.cpp:31`) is correct. Fix: "For the rotator version, a speed of 0 or less jumps straight to the target; the float and vector versions do not move."

**Should fix**
- `M2/03-build-sled.md:34`, `M2/04-build-patrol.md:35`, `M2/08-build-dart.md:39` (editor steps): the sled, patrol and dart have a scene root and an arrow that is hidden in game (`ArrowComponent.cpp:236`), so "Press Play: it glides along Y" and "the block swings along Y" cannot be seen. The steps also say "in the level Blueprint, on the 1 key, ..." without creating a reference to the selected actor. Fix: tell the learner to eject with F8 and read Location in Details, or add a debug point in Event Tick.
- `M2/04-build-patrol.md:234` (rubric): "At the end of every frame the block stands between the start and the far end" names the deliberate failure's condition (the frame that passes an end) beside the brief. A1133 (`docs/decisions.md:235`) allows that talk first in hint 2. Fix: "The block is always on the stretch between the start and the far end."
- `M2/04-build-patrol.md:117-118`: the faded quest has two `// @explain:` marks; the spec asks for 3 to 5 and the faded example has 3. Fix: add a third (for example on `bCanEverTick = true`, line 104).
- `M2/07-build-lift.md:135-136,159-160,165`: the stub keeps step-by-step `// Your code:` comments in each empty body and leaves the constructor, `BeginPlay` and accessors written, while the stub example leaves every body empty. Patrol (faded) to lift (stub) steps down very little. Fix: remove the in-body step comments; optionally empty the constructor.
- `tools/solutions/m2-boss-clockwork-hall/m2-boss-clockwork-hall.Test.cpp:150`: the failure text says "a third of the way round its swing"; after 1 second at 300 units a second on a 600 unit path it is halfway out. Fix: "halfway out along its swing".

**Note**
- Concept snippets use class names without the quest prefix: `M2/02-space-and-sweeps.md:59,88` (`ADojoPusher`, `ADojoMuzzleMarker`), `M2/06-interpolation.md:51,77` (`ADojoHoverCamera`, `ADojoRiser`). Use `ADojoM2...`.
- Unused terms: `M2/08-build-dart.md:10` lists `kismet-math-library` (hint 3 uses `FVector::Rotation`); `M2/01-breakdown-clockwork-hall.md:9` lists `scene-component` and `ftransform`; none is mentioned, so none hover-links.
- `M2/03-build-sled.md:252-253`: Parsons lines use braceless one-line `if` and `else`; the solution uses braces and CLAUDE.md says one statement per line.
- `M2/10-boss-clockwork-hall.md:36`: reference game "Fall Guys" is also the game GameDev.tv's Module 2 microjam names (`research/gamedevtv-exercise-design.md:302`). A game name, not text. Low risk.

---

## Pack 3 World 3, Collision (author-mechanics)

Sampled 8 of 10 (not 05, 06). Boss complete (Portal; fixed numbers match the room, flag, plate, pit and gate solution). All three spot-the-bug items have exactly one wrong line. Delegate signatures, profiles and overlap behaviour checked against the engine source and `BaseEngine.ini`.

**Must fix:** none.

**Should fix**
- `M3/01-breakdown-vault-room.md` hands over later quests' answers beside the brief: line 83 the plate piece "counts the actors on it" (the fix for the plate's deliberate failure, A1333, six quests before the plate; the Required Pieces line 47 correctly says "what stands on it"); line 115 (rubric) "the gate's change when it opens is a change to one object type's response"; line 56 (`gate.why`) "a response per object type, not collision on or off"; line 101 (plan 2 gate) "only changes its response to the Pawn channel". Together these give away quest 06's design choice (A1336). Fix: "counts what stands on it" in the plan, and make the rubric and `why` outcome-only ("runners pass while it is open, crates never do, and the doorway is never shut on a runner"); keep the mechanism for the reference plans or the Alternative note. (Verified: line 83 reads as quoted.)
- `M3/10-boss-vault-room.md:52` (Feel): "carrying a crate from it past the pit" depends on Extension 1 (line 48); the core spec has only `PressDispense` and nothing that moves a crate or the runner. A core-only submission cannot be judged. Fix: reword to something the core can show (spawn spot versus pit and plate distance, through Level Blueprint teleports) or say it applies once Extension 1 is done. (Verified: line 52 reads as quoted.)
- Answer positions: all 12 multiple-choice items in `M3/02-channels-and-responses.md` (lines 29, 85, 111, 120), `M3/03-overlap-and-hit.md` (29, 93, 122, 131) and `M3/08-shapes-and-actors.md` (29, 69, 90, 104) have `answerIndex: 1` (verified: 4 each), and the correct choice is the longest in most. The spec says spread them. Fix: rotate through 0 to 2 and trim long answers.

**Note**
- `M3/07-build-scale-plate.md:23` says the crate has "a solid box body, a small grab handle on top", which tells the learner beside the brief that the crate has two shapes, the premise of the deliberate failure. Hard to hide because the crate source is given. `M3/03-overlap-and-hit.md:56` also teaches `GetOverlappingActors` with "Ask when a decision depends on the present; listen when something should happen at the moment of change" before the failing step. Consider "a crate with a home it can be sent back to" in the brief.
- Fade ladder, quest 07 (stub): four gap comments (lines 232, 247, 252, 257), the same count as faded quest 05; the constructor and getters are written. A step down only in how much each comment says.
- `M3/01-breakdown-vault-room.md:93`: the edge `flag -> pit` ("sets where the pit sends a runner") suggests a direct dependency, while the rubrics say pieces hold no pointer to each other.
- `M3/03-overlap-and-hit.md:41`: "function by name through reflection" is a 5-word run shared with `research/unreal-concepts-inventory.md:545`. A stock phrase, not GameDev.tv text.
- Out of sample, checked by me: `M3/05-build-cracking-wall.md` (line 70 in the starter header, `HitsToBreak = 3`; brief line 26 disables collision on the break) matches the research's "Fragile Floor" row ("After three hits the floor disables collision", `research/gamedevtv-exercise-design.md:670`). The authoring rules forbid reusing source numbers. Suggest a different count (for example 4) and a different break effect in the next fix round; a full read of quest 05 was not done.

---

## Pack 4 World 1, Inventory and equipment (author-systems)

Sampled all 6. Breakdown has two plans labelling every piece; boss complete (Resident Evil 4 attache case named, 8 bullets). Fade ladder passes (worked 02, faded 03, stub 04, blank 05; `@explain` on the worked quest only). Starters diffed against the solutions: only intended gaps differ. No copied wording; 5-gram scan only hit "and every change to".

**Must fix:** none.

**Should fix**
- `S1/04-build-equipment.md:42` (editor step): uses `DA_Dagger`, but no quest creates it; `S1/02-build-item-data.md:34` creates only `DA_Potion` and `DA_Sword`. The learner cannot see "2 prints 3". Fix: add "make `DA_Dagger` (Weight 2, Equip Slot Hand, Power Bonus 3)" to this step. (Verified: the name appears only at line 42.)
- `S1/03-build-bag.md:37` and `S1/04-build-equipment.md:42`: both tell the learner to print the `Get Slots` array ("shows the sword back in it"). Print String cannot take an array of structs. Fix: print `Count Of` for the item or the array Length.
- `S1/05-build-bag-view.md:46`: key mapping is muddled. Key 1 adds the sword and then the potion, so "press a key to add a potion and the text changes" is not visible alone, and "press another to equip" does not say which key. Fix: sword on 1, potion on 2, Equip on 3, Destroy on 4, and name each key.
- `S1/02-build-item-data.md:402-406`: the rubric has no dependency-direction bullet (rule: every two-actor quest). The brief (line 28) states it and the rubric has room (5 of 6). Fix: add "The asset knows nothing about piles, and a pile knows nothing about bags."
- Parsons blocks with interchangeable lines (the grader compares exact order): `S1/03-build-bag.md:476-477` (`Slots[Index].Count -= Taken;` and `Left -= Taken;`), `S1/02-build-item-data.md:422-423` (`RefreshLabel();` and the `if (Given > 0 && Count == 0) Destroy();` block). Fix: merge each pair into one line or force the order with a dependent line.
- Hints far longer than the examples' one-sentence hints and collapsing the ladder: `S1/05-build-bag-view.md:230` (hint 2 has four sentences: `AddUnique`, `RemoveDynamic`, the shown pointers, `EndPlay`, the C4458 warning; hint 3 is a weaker step), `S1/03-build-bag.md:450` (hint 1 restates the brief's algorithm), `S1/04-build-equipment.md:436` (hint 3 packs three facts). Fix: one sentence each, each more specific than the last.
- `S1/04-build-equipment.md:378`: the assertion message "Exactly one sword and one dagger exist" actually checks that the bag holds one sword-or-dagger in total (sword in the bag, dagger worn). A failing learner gets a misleading message. Fix: "The sword is in the bag and the dagger is not".

**Note**
- Severity changed from Should fix: `S1/04-build-equipment.md:36` "Write it the obvious way first and run the tests. This one fails on purpose the first time for most people". The reviewer read this as telling the learner a trap exists. I count the sentence in 22 quests across all four packs plus `content/examples/05-build-blank-proximity-lantern.md:31`, and in S2 quest 05 line 39, so it is house style and was not flagged in the first spot-check. Left for the Lead to rule (see decision A1623); if the rule is "revealed only after the failing step", all 22 need the same edit.
- `S1/02-build-item-data.md:108`: the starter comment says "even when a designer typed 0 or less", but `ClampMin` and the `@explain` at line 68 mean a designer cannot type 0. Change to "an old asset or code".
- `S1/06-boss-expedition-pack.md:46` vs `:54` and `:129`: "Core numbers are fixed: 4 slots, a weight limit of 20" while the Feel line says to tune slots and weight limit and report the "tuned numbers". The lighthouse example has the same shape. A line saying the tuned values are reported in addition would remove the contradiction.
- `S1/04-build-equipment.md:29`: grammar slip, "wears one of the item from the bag".
- `S1/05-build-bag-view.md:250`: the blank-level Parsons prompt says "using the names from the reference", which a blank-level learner does not have before passing; `ShownBag`, `StopListening`, `HandleBagChanged` pre-supply design choices. A post-pass drill.
- `S1/02-build-item-data.md:56` and `S1/03-build-bag.md:57` (starter class comments) name "the Type Object pattern", "the Component pattern" and "the Observer pattern" before the build. Pack 2 already taught all three, so low risk.
- Reviewer looked at "a director that owns no rules" in `tools/solutions/s1-boss-expedition-pack/DojoS1PackDirector.cpp:340-350,288-322` (the director owns health, the heal clamp, reach and the finale test) and did not call it a violation; the bag and equipment rules stay in the components.

---

## Pack 4 World 2, Ability system (author-systems)

Sampled all 8. Fade ladder passes (worked 03, faded 04, stub 05, blank 07; `@explain` only on 03; exactly three hints, no code; every Parsons has 2 Unreal distractors). Tags, timers, `BindKey`, `FTimerHandle` as USTRUCT, `IsTimerActive` in its own callback all verified against 5.8 source. A1449 alias fix holds.

**Must fix:** none.

**Should fix**
- `S2/07-build-effects.md:30,248-250` (blank, hidden trap): `FindTargetsNear(Center, Radius, Ignore)` can only get a world through `Ignore`. An effect made with `NewObject` has a null `GetWorld()`. The reference does `TActorIterator<AActor> It(Ignore->GetWorld())` (`tools/solutions/s2-effects/DojoS2Effect.cpp:39`). Nothing in the brief or hints says so; hint 2 only says "walks every actor in a world", and the `tactoriterator` glossary entry (`content/glossary.json:4101`) shows `GetWorld()`, which gives a null world in an effect. Fix: add to hint 2 "An effect has no world of its own; take the world from the actor you were handed."
- `S2/07-build-effects.md:44` (editor step): cubes from Place Actors are Static, so `AddActorWorldOffset` only logs "has to be 'Movable'" (`SceneComponent.cpp:3383-3398`) and "1 shoves the two tagged cubes 300 away" will not happen; `BP_Sparrer` has no mesh, so "2 moves the sparrer 300 ahead" is invisible. Fix: set the cubes to Movable and give the sparrer a cube mesh, or print Get Actor Location after the dash.
- `S2/08-boss-sparring-ring.md:120` vs the plan at `:101-109`: rubric bullet 1 says the pieces are "reused unchanged apart from the Effects list on the ability asset", but plan 2's `effects-run` step (`:105`) has the ability component call `Apply` on each effect of a move, which changes the component. A reviewer holding plan 2 to the bullet would fail it. Fix: allow the one call that runs a move's effects, in whichever piece the plan puts it. (Verified: both lines read as quoted.)

**Note**
- `content/glossary.json:1181`: `tsubclassof` links `API/Runtime/Core/TSubclassOf`, but the type lives in CoreUObject (`CoreUObject/Public/Templates/SubclassOf.h`); `TWeakObjectPtr` has the same Core path. Old entries; live pages not opened.
- `S2/06-instanced-effects.md`: after A1449 the first quest for `instanced-subobjects` is `p13-bytecode-card`, and Pack 2 World 13 refactor 05 already uses `EditInlineNew` and `Instanced`. The A1351 and A1358 wording that this world is first to teach it is stale and 06 partly re-teaches it. Optional: add `p13-bytecode-card` as a prerequisite.
- Parsons blocks hand over the full body of `CanActivate` and the cooldown start in 05 (lines 749-781) and of `Apply` and the push hook in blank quest 07 (lines 267-303). They hold no hidden answer to the deliberate failure and World 1 does the same, but a blank quest would be harder without them.
- Names overlap the research's 6.10 ability item (`OnAbilityActivated`, `OnCooldownChanged`, the 400-unit push radius like Ground Pound). Generic names and numbers from the project's own research, not GameDev.tv wording; no 5-word prose run.

---

## Across the worlds

- **Editor steps that promise what the learner cannot see** are the most common Should fix (P2W12 05 and 04, M1 04 and 09, M2 03, 04, 08, S1 03, 04, 05, S2 07): a hidden arrow or a scene-only pawn that never visibly moves, arrays that Print String cannot show, assets or keys the steps never create, Static meshes that will not move. The previous spot-check found the same kind. A verifier lint cannot catch this; a rule in the author brief ("every number or motion in an editor step has a visible carrier: text render, mesh, or a Details value you name") would.
- **Answer length and position tells** show up in four worlds (P2W13, M1, M3, and P2W12 once): the correct choice is the longest and `answerIndex` clusters on 1 or 2. The runner shuffles positions (A61), so only the length tell matters. A verifier warning when the longest choice is correct in more than half of a quest's items would catch it.
- **Hints with code or more than one sentence** (P2W12 05, S1 03, 04, 05, M1 04, 07, 09): the ladder is three bullets, no code, one step more specific each time. Several authors let the hint repeat the brief.
- **Text beside the brief that touches a later answer** shows up in breakdowns (M3 01, M1 01), a starter header comment (P2W13 04) and a rubric (M2 04). It is the same pattern as the first spot-check's three Must fix items, now at Should fix level; the earlier fix round seems to have helped for the deliberate failures themselves.
- **Wrong or overbroad engine statements** (2 Must fix: M1 08 Released trigger, M2 06 constant interpolation at speed 0) were found only by reading the 5.8 source. Both worlds were engine-proven; the proofs test the solutions, not the teaching text. A reviewer pass against the installed source for every claim in a concept quest is worth keeping.
- **Cracking wall and research numbers**: M3 05 reuses the research's three-hits-then-disable-collision example (see M3 Note).
- Not verified anywhere: starters failing as designed, the editor steps, and anything else that needs the engine or the editor.
