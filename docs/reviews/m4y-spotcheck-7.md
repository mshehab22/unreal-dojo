# M4.y spot-check 7, 2026-11-04

A seventh look, at the last Pack 2 worlds: World 20 (Strategy), World 21 (Factory Method), World 22 (Facade) and World 23 (Combos). Branch `claude/m4y-spotcheck-7`, cut from main cf01c0d. Docs only: no content, solution or test file was changed. Method is that of `docs/reviews/m4y-spotcheck-2.md` to `m4y-spotcheck-6.md`.

## Method

- Coverage: every quest was read, not a sample. 28 of 28 quests (7 per world), each with its `world.json`, reference solutions and `*.Test.cpp` graders, the glossary entries behind `terms[]` and every hover card, the pattern card, and the world's decisions (A1730 to A1739 with fix round entries A1986 to A1989, A1750 to A1755, A1770 to A1782, A1790 to A1809).
- One fresh read-only reviewer per world, four in parallel. Every engine claim in prose, hints, comments, explanations, editor steps, plan text and glossary cards was checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8`), because engine proofs test the solutions and not the prose (A1622). Originality was checked by a 5-word-run scan against `research/*.md`; the book PDF is not on this machine, so structure findings are judgement calls of the L1 kind (D13).
- Hover cards count as text beside the brief (A1822). Severity rules unchanged from A1621 and A1823.
- Three extra checks from the Lead are answered first: the deliberate-failure leak check, tick order, timing and sampling (including World 21's two "caught by an engine stop" mutations), and the World 23 order check.
- I (QA session) re-read the file lines and engine source behind every Must fix and behind the findings the Lead asked about. Rating changes and the answers to the Lead's questions are logged as decisions A1990 to A1995.
- No engine run. `npm run typecheck` passes and `npx tsx tools/verify-content.ts` on this branch reports no problems and 12 warnings (unchanged, none in these worlds). No em dash or en dash in any of the four worlds, their solutions, the glossary entries or the pattern cards.

## Counts by world

| World | Quests read | Must fix | Should fix | Note |
|---|---|---|---|---|
| Pack 2 World 20, Strategy (`patterns/worlds/20-strategy`) | 7 of 7 | 0 | 21 | 11 |
| Pack 2 World 21, Factory Method (`patterns/worlds/21-factory-method`) | 7 of 7 | 2 | 21 | 8 |
| Pack 2 World 22, Facade (`patterns/worlds/22-facade`) | 7 of 7 | 1 | 20 | 16 |
| Pack 2 World 23, Combos (`patterns/worlds/23-combos`) | 7 of 7 | 0 | 18 | 18 |
| **Total** | 28 | **3** | **80** | **53** |

Per-quest counts are given in the finding ids below (each id names its quest and file).

## Result in one line

Three Must fix items, all in the same shape as before: World 21's concept quest and card state its deliberate failure with the exact word "level" (two places), and World 22's Hit Feedback hint 1 states something false. Everything else is Should fix or Note. The new finding of this round is in the tests: **World 21's `AmmoAndAim` (and the same pattern in Worlds 20, 22 and 23) reads arrays and label pointers without a check, so a plausible wrong solution stops the engine on the test's own read, and the app now tells the learner "Your code stopped the engine".** Mutations m20 and m23 in World 21 should not be counted as caught. No test in these worlds depends on tick order or wall-clock time; the one sampling gap is in World 23's trap hall.

---

## Check 1: does any text give away a world's deliberate failure?

| World | Deliberate failure | Result |
|---|---|---|
| 20 Strategy | `p20-mover-rules`: a rule object made once from the class and kept, so `SetRuleClass` that only records the class leaves the old rule answering. Only `NewClassMovesTheNextStep` fails. | Clean beside the brief. "From the next step on" is the requirement, not the cause (Note T-N3). Words like stale, old, leftover, outlive appear only in hint rungs 2 and 3, the Alternative and Q6. |
| 21 Factory Method | `p21-wave-spawner` (A1752): spawn first and set the level after leaves a level 4 slime with 10 health, because the critter works out its health in `BeginPlay`. | **Leak, twice.** Q01 `:46` and the Q03 card `:53` say "such as the shooter or a level, setting it on the next line is too late" (F1, F2, Must). A1752 intends the shooter as the taught case and the level as the transfer. The `spawn-actor-deferred` hover card and Q03's slime and imp example add Should items (F9, F7, F8). |
| 22 Facade | `p22-checkpoint-desk` (A1775): the newest checkpoint is not in the last slot after the slots wrap. Only `KeepsTheThreeNewest` fails. | Clean beside the brief, hover cards, Parsons, editor step and card. Hint rung 2 ("Is the newest still in the last slot?") states it outright; accepted by A1775 as the paid first statement, a Note. The brief, concepts and rubric state the failing assertion ("however many were ever saved", A7, Should, the O7 kind). |
| 23 Combos | None (A1801: no build quest, so the one-failure rule is relaxed). | Nothing to leak. The nearest trap, a loot drop cut short when the fighter is sent out inside the health callback, is stated openly in the concept Example (`01:62`), plan piece `blow` (`03:64`) and rubric (`03:136`): deliberate teaching. |

Boss and refactor quests have no hidden failure in any of the four worlds.

## Check 2: tick order, timing and sampling

**Tick order.** No test in these four worlds depends on same-group tick order.
- Worlds 20, 21 and 22 (Q02, Q04, Q05): the director, launchers and movers have `bCanEverTick = false`; everything runs from `FTimerManager` timers or direct calls. World 22's boss ticks only the gauntlet; `ADojoTestActor` does not tick.
- World 23: `UWorld::Tick` runs TG_PrePhysics (`LevelTick.cpp:1750`), then the timer manager (`:1816`), then TG_PostUpdateWork (`:1877`). The herald ticks in TG_PostUpdateWork, so "heard together at the end of the frame" is deterministic. The only same-group pair is the ghost director's `Tick` with the two drum pads' `Tick`s, which the engine walks from a `TSet<FTickFunction*>` (`TickTaskManager.cpp:1221, 1296`). A pad hit counts the same frame or the next depending on that order, but no assertion reads a pad within a frame of a hit (the last hit is at 3.9 s and 8.9 s; reads are at 5.5 s and after the 10.5 s timer). No mutation I can derive depends on it.
- Nothing reads an unordered container in order.

**Wall clock.** None. `FDojoTestWorld::Tick` advances a fixed 1/60 s and `TickUntil` reads world time.

**Whole-second sampling.** One real gap and two soft spots.
- **World 23 trap hall (C18, Should).** The 5.3 s check added for mutation t02 (`p23-boss-trap-hall.Test.cpp:207-210`) does close t02, and cannot give a false failure. It samples one half-second cycle only (at 5.0 and 5.3). A mutation that spots wrongly only on the even-second looks (windows 0.25 to 0.75, 2.25 to 2.75, 4.25 to 4.75) survives both samples. Fix: loop the check at every x.3 and x.8 up to 12 s.
- **World 22 boss label (A14, Should).** `Test.cpp:240-241` samples 30.5 s, where the float sum is 30.4997 and the remaining time 29.5003. `CeilToInt` gives 30 and `RoundToInt` also gives 30, so a learner who rounds to nearest passes by landing on the .5 tie; floor is caught. Sample at 30.7 s (ceil 30, round 29).
- **World 22 boss wrong delta.** A variant that adds a constant 1/60 instead of `DeltaSeconds` passes because the test always uses the default delta (Note).
- Everything else has margins of at least 0.2 s (World 20: 0.25 s; World 21: 0.5 s; World 23: 0.2 s, apart from a 0.033 s step-boundary margin). World 23 has one undefined tie, the fire timer and the round timer at exactly 12.0 s, which no reachable state distinguishes (Note C-N8).

**World 21's two engine-stop mutations: do not count m20 and m23 as caught.** In `p21-boss-ember-range.Test.cpp`, `AmmoAndAim` guards `GetCritters().Num() == 1` (`:173`) and then fires six frost bolts and reads `Master->GetCritters()[0]->Health` at `:177` with no size check.
- m20 (a launcher with 0 shots may still fire) lets a ninth ember bolt hurt the last critter (45 to 33). Six frost bolts (42) then kill it and win the round, so `GetCritters()` is empty and the `[0]` read is out of bounds.
- m23 (every bolt hits for 12) kills the last critter on the fourth frost bolt, and the same read crashes.
- The named assertions that should have failed first ("The ember launcher stops at 8 shots") are lost, because a crash writes no report. A learner would see "Your code stopped the engine while the test AmmoAndAim was running", caused by the test's unchecked read. Call it 23 of 25 caught by a readable assertion, and re-run both after the guard (F21).
- The same class of problem, listed per world: World 21 boss `:166, :169, :184, :217, :220, :227` (`GetLaunchers()[0]`/`[1]` with a master that builds fewer than two launchers), `:193-194` (`GetCritters()[0]`/`[1]` after `RestartRound`), `:64` (`Label->Text`); World 20 boss `Label->Text` at `:109, 133, 162, 214, 242, 307, 337` and `GetMover(0)` at `:116`, `GetMover(2)` at `:146`; World 22 Q05 `:274` (`GetBursts()[0]` after a `TestTrue` that does not return) and the boss `LabelOf` (`:38`); World 23 `Label->Text` in all three bosses, trap hall `:203, :209` (`GetBallista()->HasTarget()`) and ghost drill `:61, :83, :116-117`. World 22's `desk-back-one-past` was also "caught" by a crash (see A13): count it as detected by crash only.
- The null player controller is the unfair one in two worlds: the test world has none, `AActor::EnableInput(nullptr)` does nothing and leaves `InputComponent` null (`Actor.cpp:4893-4915`), so the natural `EnableInput(PC); InputComponent->BindKey(...)` crashes the first `BeginPlay`. The spec of both the World 20 boss (T19) and the World 22 boss (A21) says "EnableInput with the player controller" without warning.

## Check 3: World 23 order. Does each boss rely only on what a learner has met by then?

Course order, from the pack `order` fields: Pack 1, then Pack 2 Worlds 1 to 23, then Pack 3, then Pack 4. A quest unlocks when its prerequisites are passed and its `terms[]` are familiar. World 23 uses nothing from Pack 3 or Pack 4 (no `m*` or `s*` id appears), and nothing from Worlds 14 to 22 (no `Quests/p14` to `Quests/p22` reference).

| Boss | Piece | Taught | Reached by prerequisites |
|---|---|---|---|
| Arena night | Component, Observer, Event Queue | Worlds 9, 1, 6 | yes |
| Arena night | HealthComponent, LootComponent, KnockOut and the herald | `p9-arena-parts`, `p6-knockout-herald` | yes, direct |
| Arena night | NewObject, AddInstanceComponent, RegisterComponent, FindComponentByClass | World 9 concept, Pack 1 | yes (closure and term gate) |
| Arena night | SetTimer with a first delay | Pack 1 timers | by `timer-manager` term gate only |
| Arena night | TMap, BindKey | Pack 1 | not gated; plans only (BindKey is taught by no Pack 2 quest, Note C-N13) |
| Ghost drill | Command, Game Loop, Double Buffer | Worlds 5, 2, 4 | yes |
| Ghost drill | DrillDummy, DrillOrder, DrumPad | `p5-drill-orders`, `p4-drum-pad` | yes, direct |
| Ghost drill | accumulator and the 0.4 s frame cap | `p2-frame-time`, `p2-boulder-refactor` | yes (closure) |
| Trap hall | State, Subclass Sandbox | Worlds 7, 8 | yes |
| Trap hall | Trap family, Spike trap, Ballista and its modes | `p8-trap-family`, `p7-ballista` | yes, direct |
| Trap hall | TSubclassOf, TActorIterator, Abstract | Pack 1, `p8-many-kinds` | yes (term gate and closure) |

Verdict: **the pieces and patterns are in the real order.** Every "reused unchanged" piece is on the "Compiles against" line, in `pieces:` and in the prerequisites. The problem is the gate in front of the world (C2): the first quest's prerequisite is `p13-boss-modded-vault`, and A1808 said to repoint it once Worlds 14 to 22 merged. Worlds 14 to 22 are not one chain (Worlds 14 to 19 chain; 20 and 22 start from `p13-bytecode-when-not`; 21 from `p10-type-object-when-not` and `p12-prototype-when-not`), so a learner can skip nine worlds and reach the last Patterns world. Pointing at `p22-boss-gauntlet` alone would gate only World 22. Fix: `prerequisites: [p19-boss-dusk, p20-boss-practice-yard, p21-boss-ember-range, p22-boss-gauntlet]`.

A1805's follow-up list (a later pattern each boss should add), against what exists:

| Boss | Suggested pattern | What is actually there |
|---|---|---|
| Arena night | Object Pool (fighters) | fighters are real actors rebuilt each night: plausible |
| Arena night | Object Pool (loot drops) | drops are only counted, nothing is spawned |
| Arena night | Service Locator | fits: `Fighter->Herald = Herald` hands the herald over |
| Arena night | Dirty Flag | the label reads cheap counts |
| Ghost drill | Object Pool (recorded commands) | commands are 8-byte structs in a `TArray`, nothing to pool |
| Ghost drill | Data Locality | already a packed `TArray` of two-field structs |
| Ghost drill | Dirty Flag | the label already updates only when a step ran |
| Trap hall | Strategy | fits: one fixed `NearestFighterInReach` rule |
| Trap hall | Spatial Partition | two fighters; World 18's own when-not says use the engine's queries |
| Trap hall | Object Pool (bolts) | a bolt is an int counter, no bolt actors exist |

Four of the ten suggestions have nothing to apply to, which the world's own "signs of too much structure" rule warns against (C17). A1805 is also not on the board (C16).

---

## Must fix

**F1. World 21 Q01: the concept quest states the deliberate failure with the exact example.**
`01-ask-for-a-result.md:46`: "If the actor needs something from its maker at that moment, such as the shooter or a level, setting it on the next line is too late." A1752 makes the failure of `p21-wave-spawner` exactly this: the level set on the next line, after `BeginPlay` already ran. The launchers build teaches the right order with the shooter, and the wave spawner is meant to be the transfer to a new attribute (A1752). Naming "a level" removes the transfer. A learner writes `SpawnActorDeferred` for the level on the first try and never meets `CritterWakesWithItsLevel`.
Fix: delete "or a level"; keep "such as the shooter".

**F2. World 21 Q03 (the card): the same leak, with the recipe, in the quest right before Q04.**
`03-factory-card.md:53`: "A maker that has something to give the new actor, such as a shooter or a level, spawns it deferred, sets what it needs, then calls `FinishSpawning`, so the actor's `BeginPlay` already sees its values."
Fix: same as F1.

**A1. World 22 Q02: hint 1 is false.**
`02-build-hit-feedback.md:626`: "Every number in the hit depends on whether it is heavy. What do you decide first, before you touch any of the three systems?" Only the cue and the flash depend on a hit being heavy (`:38, :41`). The sparks (`:39`) and the HUD line (`:40`) depend on damage alone. A learner may scale the sparks or the line by heaviness, then fail on `25` and `40` for no reason they can see. A false statement in a hint is a Must fix (A1882). Rated Should by the reviewer; raised here (A1994).
Fix: "Decide first which of the cue and the flash depend on the hit being heavy."

---

## Should fix

### World 20, Strategy

- **T1. Q1 answer-length tells** (`01-one-function-every-aim.md:26-33, 115-124, 130-139, 140-149`): the correct choice is the longest in all four items (81/55, 92/46, 79/67, 63/38), at indices 2, 1, 1, 0.
- **T2. Q1 prerequisite** (`:10`): `p13-bytecode-when-not`; Worlds 18 and 19 now point at the previous world's last quest. Repoint to `p19-boss-dusk` (A1738 asked for it).
- **T3. Q2 editor step** (`02-build-target-rules.md:31, 40`; Q5 `:40` has the same): the launcher has only a `USceneComponent` root (`DojoP20Launcher.cpp:297`), so nothing shows in the viewport; the step never says how to place it or how the Level Blueprint reaches it.
- **T4. Q2 hints** (`:560-562`): rungs 1 and 2 are two sentences each; rung 1 restates the NAME_None rules (`:27`) and adds an out-of-range case no test can reach.
- **T5. Q3 overbroad engine claim** (`03-strategy-card.md:53`, and `spot-interface` at `:131-138`): "Details can make only objects, not something that implements an interface" and "cannot be created inline". UHT rejects `Instanced` on a `TScriptInterface` property (`EpicGames.UHT/Types/UhtProperty.cs:2401`), so bugLine 1 does fail. But the Details inline picker explicitly lists `EditInlineNew` classes that implement the interface for interface properties (`Editor/PropertyEditor/Private/UserInterface/PropertyEditor/SPropertyEditorEditInline.cpp:25, 80-88, 251`), and UHT sets `InstancedReference` on interface properties whose interface is `DefaultToInstanced` (`UhtInterfaceProperty.cs:93-95`). A learner concludes the engine can never inline-create an interface implementer. Rated Should on the O11 precedent (A1992). Say "UHT does not allow Instanced on an interface property, so point it at an abstract UObject class".
- **T6. Q3 answer-length tells** (`:26-33, 96-105, 111-120`): longest correct choice at index 1 in `predict` (78 vs 35-37), `three-parts` (94 vs 43-50) and `state-or-this` (77 vs 31-40).
- **T7. Q4 hints** (`04-build-mover-rules.md:505-507`): rung 1 two sentences, rung 3 two sentences and hands over both fixes.
- **T8. Q4 editor step** (`:39-40`): the mover is invisible (scene root only) and the Level Blueprint needs a reference plus a custom event.
- **T9. Q5 requirement no test enforces** (`05-refactor-turret.md:31-32`, rubric `:292`): "Remove AimStyle, the switch, and the loop" is checked by nothing (A1740). A learner can keep `AimStyle` and the loop, add `if (!Rule) return NAME_None`, and pass all three tests. `AimStyle` is a UPROPERTY, so `TestNull(..., FindFProperty<FProperty>(ADojoP20Turret::StaticClass(), TEXT("AimStyle")))` enforces it.
- **T10. Q5 wrong engine suggestion** (Alternative, `:298`): "or a redirect of the old property". A property redirect renames or moves a property; it cannot turn an `int32` into an instanced object. Say "keep the old number as a deprecated property and convert it in PostLoad".
- **T11. Q5 hints** (`:284-286`): all three are two sentences; rung 3 restates `:30-31`.
- **T12. Q5 editor step** (`:40`): same as T3.
- **T13. Q6 answer-length tells** (`06-strategy-when-not.md:26-33, 72-81, 82-91, 105-114`): the correct choice is the longest in all four (67/63, 71/56, 127/44, 88/56); `when-not-private-data` is 127 characters against 30-44.
- **T14. Boss test needs names the spec never gives** (`07-boss-practice-yard.md:25-37`; A1989 left this as a follow-up): the spec names only `RoundSeconds`, `FireInterval`, `HitDamage`, `PressCycleRule`, `PressNextRound` and the class name. The test also needs the header `Quests/p20-boss-practice-yard/DojoP20PracticeYard.h`, a public `Label`, `Dummies`, `RuleClasses`, `FDojoP20DummyPlan` with `DummyName`, `StartLocation`, `StartHealth`, `MoveRuleClass`, and `IsRunning`, `GetRoundNumber`, `GetHits`, `GetStandingCount`, `GetResult`, `GetShotLog`, `GetMover`, `GetLauncher` (`Test.cpp:44-71, 109`).
- **T15. Boss label text** (`:31`): "`<rule class name>`". The test wants `GetClass()->GetName()`, for example `DojoP20NearestRule` (`Test.cpp:109`); a learner who uses the display name (as Q2's editor text does) or a U-prefixed name fails.
- **T16. Boss requirement no test enforces** (`:61`, rubric `:124`): "a dummy that is down stops". No assertion reads a downed dummy's position, so a director that keeps stepping downed dummies passes every test. Sample the crate's location twice, a step apart, after it falls.
- **T17. Boss Feel contradicts the fixed numbers** (`:45`): "a player who swaps to the right rule at the right moment clears it earlier" cannot happen: every rule lands all 12 hits, so the round clears at the 12th shot (t=24) for any rule or swap (`Test.cpp:129, 177-185`).
- **T18. Boss rubric lacks dependency direction** (`:121`): bullet 1 says "reused unchanged"; only spec `:33` says the launcher and movers know nothing about the director.
- **T19. Boss null-controller crash** (`:31`): see Check 2. `EnableInput(nullptr)` leaves `InputComponent` null (`Actor.cpp:4893-4915`); the test world has no controller. Add "in the tests there may be no player controller, so check before binding".
- **T20. Pattern card answer-length tells** (`content/patterns.json` strategy `recall-1` 109 characters vs 43/20/25, `recall-4`, `scenario-1`, `scenario-3`).
- **T21. Tests crash on unchecked reads** (see Check 2): boss `Label->Text` (`Test.cpp:109, 133, 162, 214, 242, 307, 337`) and `GetMover(0)`, `GetMover(2)` (`:116, :146`).

### World 21, Factory Method

- **F3. Q01 answer-length tells** (`01-ask-for-a-result.md:26-31, 76-83, 101-110, 112-120`): the correct choice is the longest in 4 of 5 items (93 vs 46, 89 vs 34, 83 vs 64, 129 vs 33).
- **F4. Q01 `spot-null` shows Q02's gap** (`:89-100`): the snippet is `Fire`'s body from Q02 minus the null check.
- **F5. A design claim that the signatures cannot carry** (`01:44`, `02:453`, `03:50`, `07:40`): "a launcher that fires three bolts in a fan" is the case for a virtual `CreateBolt`, but `CreateBolt` returns one bolt, `Fire` is non-virtual and counts one shot, and the boss master aims only the returned bolt. Extension 1 ("overrides `CreateBolt` to make a fan of bolts") would leave two orphan bolts that are never aimed or destroyed. Use "a bolt that needs extra setup or comes from a pool".
- **F6. Q02 editor step** (`02-build-launchers.md:31`): launchers and bolts have only a scene root; the step never says how the Level Blueprint gets a reference. Print the bolt's location too, since "50 units in front" cannot be seen.
- **F7. Q03 reproduces Q04's task** (`03-factory-card.md:69-72, 102-113, 124-136`): `pick-neighbour` is the wave spawner ("prepare the new critter before it begins play"), `spot-hardcode` shows Q04's `Create` signature, and the Example shows `TSubclassOf<ADojoP21Critter> CritterClass`. Use bolts and turrets.
- **F8. Pattern card** (`content/patterns.json` `factory-method-scenario-2` `:3050`, `recall-2` `:3002`): "An enemy wave spawner... fully configure its kind data before BeginPlay runs", explained as "SpawnActorDeferred, applying the kind, then FinishSpawning". That is Q04's job and solution, reachable before Q04. Use a pool or a counter.
- **F9. Q04 hover card** (`glossary.json:1310`, `spawn-actor-deferred`, in Q04 `terms[]`): "so anything BeginPlay reads must be set before that... you get the actor, set its properties, and then call FinishSpawning(Transform)". The failure's reason and fix in general words; Q02 teaches the same. Rated Should; the Lead may judge it Must on the A1822 and P1 (spot-check 6) precedent (A1993). Cut "so anything BeginPlay reads must be set before that".
- **F10. Q02 hints** (`:438-440`): two sentences each; hint 1 hands over the fix ("what would be different if the launcher did that step first and set the shooter afterwards").
- **F11. Q03 answer-length tells** (`:26-31, 87-96, 114-122`): longest correct in `when-virtual` (110 vs 55) and `pool-swap` (95 vs 56).
- **F12. Q04 hints** (`04-build-wave-spawner.md:407-409`): two sentences each; hint 2 names the whole answer ("a spawn that splits those two steps and leaves a window").
- **F13. Q04 editor step** (`:37`): the critters have only a scene root, so "in a row along the X axis" and "no gap" cannot be seen; only Health is printed. No way to reach the placed spawner. Print each critter's X.
- **F14. Q05 requirement no test enforces** (`05-refactor-turret.md:34`, rubric `:373`, hint 2): "`MakeBolt`... counts it in `ShotsFired`". A learner who keeps `ShotsFired++` in the three firing functions passes all four tests. Add a support turret whose `MakeBolt` returns a bolt it spawned without counting, and assert `ShotsFired` stays 0.
- **F15. Q05 hints** (`:366-368`): two sentences each; hint 2 restates the brief.
- **F16. Q05 editor step** (`:42`): same invisible-actor problem as F6; "no bolt appears at all" is always true because bolts have no mesh. The observable is `Shots Fired` and `Make Calls`.
- **F17. Q06 answer-length tells** (`06-factory-when-not.md:26-31, 83-92`): `predict` 102 vs 44, `when-not-forward` 130 vs 44.
- **F18. Boss test needs names and formats the spec never gives** (`07-boss-ember-range.md`; `Test.cpp:19-65, 78, 123, 160-188`): `LauncherClasses`, `Wave`, `RoundSeconds` and `Label` (a pointer with `->Text`), `PressFire(int32)`, `RestartRound()`, `IsRunning`, `GetCritters`, `GetLaunchers`, `GetDefeatedCount`, `GetShotsLeft` (0-based), `GetWinSeconds`; exact label strings `Critters 4/4  Shots left 8 8`, `WIN` plus `Shots used 14`, `TIME UP`. A learner who writes "14 shots" fails. `RoundSeconds` being settable also conflicts with "Core numbers are fixed" (`:36`).
- **F19. Boss Feel against fixed numbers** (`:36`, `:44`, rubric `:127`): the tests pin 8 shots and the health values; Feel says "tune the shots and health" and bullet 8 asks for "the tuned ammo".
- **F23. Boss rubric lacks the dependency direction** (`:120`): bullet 1 says nothing of it; only the `master` piece's `why` says no launcher, bolt, spawner or critter knows the range.
- **F20. Boss requirements no test enforces**: launcher places (0,0,0) and (0,100,0) and their facing, critters 3 and 4 at 750 and 900 (only 450 and 600 are asserted); "starting a round destroys the old launchers, critters, and spawner" (no actor count after `RestartRound`); "the old timer cannot end it" (rubric bullet 7, `Test.cpp:236`): in `TimeUpAndRestart` the old timer has already fired, in `TwoRounds` a stale timer would fire at 30 s which is never reached, in `AmmoAndAim` the restart is at t=0 and both timers expire together. No test can tell. Also the 30 second default (the tests overwrite `RoundSeconds`).
- **F21. Test-caused crashes, and m20 and m23** (see Check 2): `p21-boss-ember-range.Test.cpp:177` and the other unchecked reads.
- **F22. Q07 Blueprint plan is not buildable as written:** the Blueprint reference plan is not buildable as written (`07-boss-ember-range.md:107`): "subtracts the bolt's Damage from its Health", but `Health` is `UPROPERTY(BlueprintReadOnly)` (`04-build-wave-spawner.md:69`) and "the pieces need no changes" (`07:32`). Keep a per-critter health array in the master, or make `Health` BlueprintReadWrite.

### World 22, Facade

- **A2. Q01 answer-length tells** (`01-every-system-every-hit.md:32, 73, 88, 98, 108`): the correct choice is the longest in all 5 items; `answerIndex` is 1,1,0,1,1.
- **A3. Q01 prerequisite** (`:10`): `p13-bytecode-when-not`; repoint to `p21-boss-ember-range` (A1773 expected it).
- **A4. Q02 hints** (`02-build-hit-feedback.md:626-628`): two sentences each (plus the false hint 1, Must A1).
- **A5. Q02 rounding and "pointing up" are never tested**: the tests use only 25, 40, 3, 500 and 0, so every spark count is exact or clamped (25 is 5, 40 is 8, 3 clamps to 2, 500 clamps to 32). Ceil or truncation passes, and so does truncating the `-25` line. `Bursts[].Normal` is never asserted. Brief `:39-40` demands both. Add a hit of 22 (4 sparks; ceil gives 5), a hit of 24.6 (line `-25`), and an assertion that `Normal` is `FVector::UpVector`.
- **A6. Q03 answer-length tells** (`03-facade-card.md:32, 77, 92, 102`): longest correct in all 4 (124/107/119/92), `answerIndex` 1 every time; `patterns.json` recall-4 and scenario-4 the same.
- **A7. Pattern card contradicts the world**: `facade-recall-1` asks "Which engine class is a broad facade over many engine services such as spawning, sound, and saving?" and the answer is `UGameplayStatics`; Q03 `:48`, Q06 `:40` and `kismet-system-library.long` teach it as a collection of small fronts "rather than one facade". Reword the recall.
- **A8. Q04 brief, concepts and rubric state the failing assertion** (`04-build-checkpoint-desk.md:24, 18, 331`): "the desk always hands back the newest checkpoint it keeps... however many were ever saved" is the literal assertion of `KeepsTheThreeNewest` (`:270`). It names neither the slot layout nor the fix; same standing as O7 (spot-check 6, A1953). Drop "however many were ever saved" from the concepts and rubric.
- **A9. Q04 hints** (`:324-326`): two sentences each; rung 3 gives the whole fix ("how do you step back past slot 0?").
- **A10. Q04 negative `StepsBack` passes by luck** (`:237`): `-1` is tested only after one save, where the unguarded wrapped formula lands on slot 1, which was never written, so `LoadGameFromMemory` returns nullptr and the call returns false anyway. Brief `:31` requires false for negative. Also call `LoadBack(-1)` after three saves, where it wraps to slot 0 and finds G1.
- **A11. Q05 editor step** (`05-feedback-refactor-callers.md:40`): never says how the Level Blueprint reaches the placed turret, trap and cube (scene root only), and does not name the cube.
- **A12. Q05 test-caused crash** (`:274`): `GetBursts()[0]` after a `TestTrue` that does not return. Guard with `if (!TestTrue(... SparksOf(World).Num() >= 1)) return false;`.
- **A13. Q04 lazy `Slots` sizing makes learner crashes unreadable**, and the desk mutations are "caught" by crash: `Slots` is empty until the first save (`04:144`, `ClearCheckpoints` does `Reset()` at `:168`), so an unguarded `Slots[...]` on a cleared desk crashes `ClearForgetsAll`; `(NextSlot - 1 - StepsBack) % SlotCount` with `NextSlot == 0` gives -1 and crashes `NewestFirst`; `Slots[SavedCount - 1 - StepsBack]` reads index 3 on the fourth save and crashes `KeepsTheThreeNewest`, the very test meant to teach. Size `Slots` eagerly, or give a safe reader `const TArray<uint8>* BytesIn(int32 Slot) const`. Both iterations "caught" mutations `desk-clear-keeps-count` and `desk-back-one-past` stopped the engine: count them as detected by crash, not as assertion catches, and re-run `desk-back-one-past` after the sizing change (the "20 of 20" claim is 18 assertion catches plus 2 crash catches).
- **A14. Boss label sampling** (`Test.cpp:240-241`): see Check 2.
- **A15. Boss test needs names the spec never gives** (`p22-boss-gauntlet.Test.cpp:30-31, 38, 98-148`): public `Label` and `Runner`, `IsRunning`, `GetHealth`, `GetGatesOpen`, `GetElapsed`, `GetDummyHealth`; the C++ plan names only `ADojoP22Gauntlet`, `PressStrike`, `RunnerFell`, `RestartRound`, `GetDummySpot` and "a text label".
- **A16. Boss health clamp unstated** (`07-boss-gauntlet.md:26`): the pit takes 30 from 100, so the fourth fall is -20; the test (`:218`) requires `GetHealth() == 0`.
- **A17. Boss "through the facade" not enforced** (`:30`, `fronts` piece): a master that drives the desks directly with the same numbers passes all three tests, because the sound desk, spark pool and HUD ticker are world subsystems that exist either way and the bus opens to 0.8 whenever `UDojoP22HitFeedback` initializes. Q05 already uses `SetHeavyDamage(20)` to prove this; do the same here.
- **A18. Boss label content, tie-break and fallbacks untested**: the label is checked only as `GATE 1/3  HEALTH 100  60 s` and `... 30 s`; never tested: the gate number after a gate opens, the health after a fall, the "earlier dummy on a tie" rule (`:26`), the E and R key binding, the pawn fallback. The runner stands 60 behind one dummy, so only one dummy is ever in reach.
- **A19. Boss Blueprint plan has no CLEAR** (`:95-108`): the `round` piece shows only TIME UP and R; `gates` never says gate 3 ends the round and there is no gates-to-round edge, unlike the C++ plan (`:88, 93`).
- **A20. Boss Feel and rubric** (`:42` against `:34`, rubric `:120`): Feel asks to "tune the extensions" for "fifteen seconds to spare" though pace depends only on the fixed numbers; bullet 8 demands "the tuned extension numbers" for optional extensions. Also rubric `:113-120` lacks the dependency direction ("neither facade knows the gauntlet exists" is only in `master.why`, `:50`).
- **A21. Boss null-controller crash**: the spec says "EnableInput with the player controller" (`:28`); the reference guards it (`DojoP22Gauntlet.cpp:173`) but the spec does not.

### World 23, Combos

- **C1. Q01 answer tells** (`01-patterns-together.md:27-31, 32, 77, 98-103`): all three items have `answerIndex` 1, and in `predict` and `pointer-or-copy` the correct choice is the longest.
- **C2. Q01 prerequisite** (`:10`): `[p13-boss-modded-vault]`. See Check 3: set it to `[p19-boss-dusk, p20-boss-practice-yard, p21-boss-ember-range, p22-boss-gauntlet]`.
- **C3. Q02 "arrival order" not delivered by plan 2** (`02-breakdown-fair-stalls.md:106-108, 131`, against `:37, 126`): the spec and rubric demand settling in arrival order; plan 2 keeps one mailbox per stall and visits the stalls in turn, so arrival order across stalls is lost; the Alternative admits "only as good as the till's visit order" and still says "Both plans pass". Add to plan 2's `settle` "collects every stall's waiting requests and sorts them by a posting counter" and say the counter, not the time, gives order within a frame.
- **C4. Q03 boss test needs names the spec never gives** (`03-boss-arena-night.md:25-35`): `Roster`, `Script`, `Label`, `FDojoP23FighterPlan{FighterName, Team, MaxHealth, LootItem, LootCount, StartLocation}`, `FDojoP23ScriptedStrike{Turn, Attacker, Target, Damage}`, `GetHerald`, `GetFighter(FName)`, `GetPurse(FName)`, `GetKnockoutsFor(int)`, `GetStandingCount`, `GetResult`, `GetRoundNumber`, `IsRunning`, `PressNextRound`, `GetAnnouncements()` with `.Fallen/.Winner/.Seconds`; and behaviours the spec does not state (the director spawns its own herald, the log stores world time).
- **C5. Q03 tests do not enforce the rubric** (`:136-137`; test lines 88-149): a director that credits the score inside the blow, computes the purse from the plan's count, or calls `Herald->Announce()` itself passes every assertion. A director that binds `OnDepleted` after `ListenTo` passes too, because the invocation list is walked in add order. One test that sets `GetHerald()->SetActorTickEnabled(false)`, plays a killing blow and expects `GetKnockoutsFor == 0` until it is re-enabled would pin it.
- **C6. Q03 test-caused crash**: `Night->Label->Text` at `Test.cpp:84, 126, 149, 211` has no null check.
- **C7. Q04 plans never keep the window's start state** (`04-breakdown-instant-replay.md:44, 80, 96`): the recorder keeps only the last 10 s of moves, and no piece in either plan keeps the duelists' state at the start of that sliding window, so moves alone cannot replay a window whose older moves were dropped. Add a piece "a keyframe of every duelist taken as the window slides" to both plans.
- **C8. Q05 boss test needs names the spec never gives** (`05-boss-ghost-drill.md:23-35`): `Label`, `LiveSteps`, `FixedStepSeconds`, a public `Tick(float)` (the test calls `Drill->Tick(5.f)`, line 169), `GetRecording()` with `.Step/.Move`, `GetStepCount`, `IsLive`, `IsRunning`, `GetResult`, `GetRoundNumber`, `GetLiveDummy/GetGhostDummy/GetLivePad/GetGhostPad`.
- **C9. Q05 Feel against fixed numbers, and a test the spec does not support** (`:37` against `:45`): `:37` fixes a 0.1 s step and scoring 10.5 s after the round starts; `:45` says "tune the step length"; `TunablesAreHonoured` (test lines 190-208) changes `LiveSteps` to 10 and the step to 0.2 and expects scoring at 4.5 s (2 x steps x length + 0.5). A learner who keeps the spec's literal 10.5 s fails with no way to know why.
- **C10. Q05 label** (`:31`): `Round N  PHASE  Live L  Ghost G` never says L and G are the pads' scores or when LIVE, REPLAY and DONE begin; the test needs `Live 50  Ghost 50` (line 110).
- **C11. Q05 "at most one step of the rest"** (`:27`): keeping zero satisfies "at most one", but the test (`Test.cpp:172-173`) needs exactly one kept (14 steps, not 13).
- **C12. Q05 test-caused crash**: `Test.cpp:61` (`PlayFirstRoundAt` dereferences `GetLiveDummy()`, `GetLivePad()`, `GetGhostPad()` unchecked), `:116-117`, `:83`.
- **C13. Q07 boss test needs names the spec never gives** (`07-boss-trap-hall.md:23-35`): `Traps` (`FDojoP23TrapPlan{TrapClass, Location, RestSeconds}`), `Roster` (`FDojoP23HallFighterPlan{Location, StartHealth}`), `Label`, `GetBallista()`, `GetTrap(int)`, `GetFighter(int)`, `GetBolts`, `GetStandingCount`, `GetResult`, `GetRoundNumber`, `IsRunning`, `PressNextRound` (test lines 50-51, 82-93, 153).
- **C14. Q07 "nearest" is not enforced, and two stated rules are untested**: the roster is always nearest-first (Ava at 100, Bo at 400, in both rounds), so "first standing fighter in the roster" passes; the tie rule (`:31`) is never exercised; "empty" class (`:27`) is untested (only an abstract class is, test line 232). Put Bo first in round 2, add an equidistant pair, add an empty `TrapClass`.
- **C15. Q07 test-caused crash**: `Test.cpp:203, 209` (`Hall->GetBallista()->HasTarget()` with no null check) and the `Label->Text` reads at `:93, 151, 178`.
- **C16. A1805 is not on the board**: `grep A1805` finds nothing in `docs/plan.md` or `docs/problems.md`, and Worlds 14 to 22 are merged. Add a board line or drop it.
- **C17. A1805 suggestions with nothing to apply to** (see the table in Check 3): four of the ten add a pattern the boss has no use for, which the world's own "signs of too much structure" rule warns against.
- **C18. Trap hall sampling gap** (`p23-boss-trap-hall.Test.cpp:207-210`): see Check 2.

---

## Note

**World 20.** Q1 `:26-33` says a new case in a switch on an int needs the turret's header and picking function; only the .cpp. Q1 `terms` includes `tobjectptr`, unused. Q4 "from the next step on" is the failing assertion in words (requirement, same standing as O7). Q4 hint 2 names the cause (a post-failure rung). Q5 prerequisites list `p20-mover-rules`, which the turret does not use. Boss rubric bullets 5 and 6 and the `fire` piece say "10 health", "29 seconds", "2 seconds" with no "by default" (A1987 made them tunable defaults). Boss Blueprint plan `:107` "The T event": key events need Auto Receive Input or Enable Input, which the plan never says. Blueprint `swap` uses a modulo on the array length, so an empty list divides by zero. No test runs a Patrol rule across a round reset. Q6 `spot-leftover-rule` is correct. Q2 hint 1 names an out-of-range index the tests cannot produce.

**World 21.** The Q04 starter's `LevelAtBeginPlay` comment ("the level this critter saw at the moment it began play") and `ExposeOnSpawn` (`04:72-74, 61, 205`) exist to produce the failing message and hint at the failure; consider "Level at start". `world.json` summary "prepares it before it comes to life" is the general pattern. Q01 prerequisites skip World 20 (allowed by A1750). Q04 Alternative `:422`: "as in the last quest" should be the launchers quest. Q03 `pick-neighbour` distractors are throwaways. Q05 `FireSpread` with a partial refusal is untested. Q02 comments use "creator" before the card; Q07 `SpawnMaster` does not null-check `SpawnActorDeferred`. The World 22 iterations entry counts engine crashes as caught too (A13).

**World 22.** Q01 `fill-direction` accepts only "know nothing", "do not know" and "know nothing at all". Q02 `:574` compares `GetPlayed().Last()`, which is already `HeavyHit` from the 500-damage hit, so a front that plays nothing for the fourth hit passes (assert `Num() == 4`); the Parsons `Count` line could sit before the sound line; Alternative `:641` "nowhere to keep ... a threshold a designer can change" is overbroad (a library can read a `UDeveloperSettings` or a config value), and so is Q05 Alternative `:370`. Q03 `engine-model` "short front ... no shared state" is loose. Q04 never checks that `Where` is untouched on failure; the Parsons block is the given `SaveCheckpoint` (A874 precedent); rubric bullets 4 and 5 cannot be tested. Q05 hints `:355-357` two, two and one sentences; "neither includes or calls" is checked only by review; `gameplay-statics` in `terms` unused. Q06: three of four items have the answer at index 1. Boss: the Hades "same damage numbers and hit flash" claim is unverified; `terms` lists `savegame` and `gameplay-statics`, which the spec never mentions. Q04 hint rung 2 states the failure outright (accepted by A1775).

**World 23.** `world.json:4` says "each need three jobs done at once"; the trap hall has two patterns (`07:7`, A1807). `delegate` and `timer-manager` (01, 02), `findcomponentbyclass` (03) and `tactoriterator` (07) are in `terms[]` but never appear in the text, so their hover cards cannot show. The concept Example (`01:58-64`) is the arena night's central seam with the answer in its comment (a taught quest, not beside the brief). Q06 plan 1 `:77` has two timekeepers. Q04 `:119` "tagging by sequence number suits a screen that reads from another thread" is loose. Q05 `:27, :63` say "real time" where `DeltaSeconds` is dilated and clamped game time, and the 0.4 s cap is a World Settings default (`BaseGame.ini:199 MaxUndilatedFrameTime=0.4`, `WorldSettings.cpp:336-344`). Trap hall reach (`07:31`) does not say 3D or ground distance. Orders at exactly 12.0 s tie with the round timer (heap order at equal expiry is undefined; no reachable state differs). Borrowed structure: arena night is research Part 4 #5 with Event Queue for Command, the ghost drill is #6, the trap hall is #9 less its UI and pool; no wording is copied and A1806 declares structure-only. `BindKey` and "sequence number" are used by plans but taught by no Pack 2 quest. `07:35` Extension 1 "flame jet from the earlier quest" lives in `p8-trap-family` (DojoP8FlameJet) but is not on the "Compiles against" line. Plan label "Event Tick, in a late tick group" (`02:108`) is correct only if Class Defaults sets the group.

---

## What checked out

- **Ids and order:** every glossary id, prerequisite, `related`, `firstQuestId` and `useCaseQuestIds` entry resolves. Every `terms[]` term is taught by an earlier concept quest in all four worlds; the verifier shows no term-order warning for them.
- **Shape:** hints are three rungs with no code in all four worlds; rubrics have 5 or 6 bullets and 8 for each boss; every build has an Alternative; each breakdown has two reference plans and each plan covers every required piece (9 for arena night, 8 for the other two); the pattern name does not appear in Q1, Q2 or Q4 prose of World 20, nor before the card in World 22.
- **Engine facts confirmed in 5.8:**
  - World 20: the Details inline picker excludes Abstract and requires `EditInlineNew` (`SPropertyEditorEditInline.cpp:79-82`, `PropertyEditorHelpers.cpp:553`); the `Instanced` specifier sets `CPF_InstancedReference` (`UhtPropertyMemberSpecifiers.cs:325`); `NewObject` on an empty class is fatal (`UObjectGlobals.cpp:3284`) and on an abstract class raises an ensure and a warning (`:3290-3295`); the `GameplayModMagnitudeCalculation`, `UNavigationQueryFilter` and `UEnvQuery::Options` examples exist.
  - World 21: `UWorld::SpawnActorDeferred<T>` (`World.h:3851`), `AActor::FinishSpawning` (`Actor.h:3117`), `PostSpawnInitialize` skips `ExecuteConstruction` when deferred (`Actor.cpp:4358, 4415`), `SpawnActor` on an abstract class warns and returns null (`LevelActor.cpp:486`), `BeginDeferredActorSpawnFromClass` and `FinishSpawningActor` (`GameplayStatics.h:67, 71`), the Spawn Actor from Class node expansion (`K2Node_SpawnActorFromClass.cpp:451-555`).
  - World 22: `CreateSaveGameObject`, `SaveGameToMemory`, `LoadGameFromMemory` (`GameplayStatics.cpp:2361-2512`); `InitializeDependency` (`SubsystemCollection.cpp:366-396`); `DoesSupportWorldType` covers Game, Editor and PIE (`WorldSubsystem.cpp:31`); `PlaySoundAtLocation` returns on a null sound (`GameplayStatics.cpp:1705`); `SpawnSystemAtLocation` has `bAutoDestroy = true` (`NiagaraFunctionLibrary.h:93`).
  - World 23: the 0.4 s frame cap (`BaseGame.ini:199`, `WorldSettings.cpp:336-344`); timer catch-up inside one tick (`TimerManager.cpp:1235, 1248`); dynamic multicast order not promised (`ScriptDelegates.h:1595` uses `RemoveAtSwap`); `BlueprintProtected`, `Add Component by Class`, `BlueprintSpawnableComponent`; abstract spawn logs a Warning (`LevelActor.cpp:488`).
- **Originality:** no copied wording and no dashes. The 5-word scans found only test-macro boilerplate and generic phrases. Structural borrowing is logged at C-Note (research Part 4) only, a judgement call.
- **Tests enforce the briefs** apart from the findings above. The Worlds 20 to 22 timing margins are at least 0.25 s, and the boss arithmetic checks out by hand in all four worlds (World 21: 8 ember bolts defeat three critters, 8 frost bolts two, a win is 8 ember plus 6 frost = 14 shots; World 23: 5 Coin and 1 Bandage, TEAM 2 WINS then TEAM 1 WINS; 3 bolts CLEARED then 4 bolts and Bo at 65 HELD). Engine proofs on UE 5.8.4 report all references passing, starters failing as designed and all mutations caught except the ones noted in Check 2.
- **Not verified:** the Level Blueprint editor steps at runtime, the app's hint gating before the first run, anything that needs the engine, the Hades claim in the Facade boss, and the book itself. F1, F2, A1 and the crash findings rest on reading the file lines and the source.
