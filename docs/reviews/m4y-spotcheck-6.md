# M4.y spot-check 6, 2026-11-04

A sixth look, at the four Pack 2 worlds merged since spot-check 5: World 16 (Object Pool), World 17 (Dirty Flag), World 18 (Spatial Partition) and World 19 (Data Locality). Branch `claude/m4y-spotcheck-6`, cut from main bc9a13c. Docs only: no content, solution or test file was changed. Method is that of `docs/reviews/m4y-spotcheck-2.md` to `m4y-spotcheck-5.md`.

## Method

- Coverage: every quest was read, not a sample. 28 of 28 quests (7 per world), each with its `world.json`, reference solutions and `*.Test.cpp` graders, the glossary entries behind `terms[]` and every hover card, the pattern card in `content/patterns.json`, and the world's decisions (A1650 to A1659, A1670 to A1679, A1690 to A1699, A1710 to A1719).
- One fresh read-only reviewer per world, four in parallel. Every engine claim in prose, hints, comments, explanations, editor steps and glossary cards was checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8`), because engine proofs test the solutions and not the prose (A1622). Originality was checked by a 5-word-run scan against `research/*.md` plus the reviewers' knowledge of Nystrom's chapters (the book PDF is not on this machine; the structure findings below are judgement calls of the L1 kind from spot-check 5, decision D13).
- Hover cards count as text beside the brief (A1822). Severity rules unchanged from A1621 and A1823.
- Two extra checks from the Lead are answered first: the deliberate-failure leak check in every world, and whether World 18's `TwoRoundsPlayAlike` should be tightened.
- I (QA session) re-read the file lines and engine source behind every Must fix. All four held. I kept the reviewers' ratings except where a decision below says otherwise (A1953, A1955).
- No engine run. `npm run typecheck` passes (exit 0) and `npx tsx tools/verify-content.ts` on this branch reports no problems and 12 warnings (unchanged). No em dash or en dash in any of the four worlds, their solutions, the new glossary entries or the pattern cards.

## Counts by world

| World | Quests read | Must fix | Should fix | Note |
|---|---|---|---|---|
| Pack 2 World 16, Object Pool (`patterns/worlds/16-object-pool`) | 7 of 7 | 1 | 16 | 9 |
| Pack 2 World 17, Dirty Flag (`patterns/worlds/17-dirty-flag`) | 7 of 7 | 0 | 10 | 15 |
| Pack 2 World 18, Spatial Partition (`patterns/worlds/18-spatial-partition`) | 7 of 7 | 1 | 17 | 14 |
| Pack 2 World 19, Data Locality (`patterns/worlds/19-data-locality`) | 7 of 7 | 1 | 17 | 14 |
| **Total** | 28 | **3** | **60** | **52** |

Per quest (Must/Should/Note), where the reviewer gave it: World 16 Q01 1/1, Q02 0/2, Q03 0/2, Q04 0/3, Q05 0/1, Q06 0/3, Q07 0/3, pattern card 0/1. World 17 Q01 0/1/2, Q02 0/1/1, Q03 0/1/3, Q04 0/1/3, Q05 0/2/2, Q06 0/1/2, Q07 0/2/2, pattern card 0/1/0. World 18 Q1 0/3/3, Q2 0/3/2, Q3 0/2/2, Q4 1/3/2, Q5 0/2/2, Q6 0/1/1, boss 0/3/1, pattern card 0/0/1. World 19 Q01 0/2/2, Q02 0/3/3, Q03 0/4/2, Q04 0/3/3, Q05 1/2/1, Q06 0/1/1, Q07 0/2/1, shared 0/0/1.

## Result in one line

Three Must fix items, none of them a copied wording or a worked-out solution: a wrong garbage-collection fact in Object Pool (Q01 teaches that a stored pointer keeps a destroyed actor alive, and Q06 says the opposite), a hover card that states the Spatial Partition swarm's deliberate failure, and an editor step in Data Locality that promises a console message the engine never prints. The deliberate failures in Object Pool, Dirty Flag and Data Locality are clean beside the brief; the repeat finding from last round came back once, in World 18. The recurring Should fix kinds are all back (answer-length tells in every world, hints over one sentence, boss tests that need names the spec never gives, Feel against fixed numbers).

---

## Check 1: does any text give away a world's deliberate failure?

Each world has one engineered failure, in its stub build quest. I checked, for each: the brief, header and class comments in the starter, hints, `terms[]` hover cards, editor steps, Parsons distractors, the rubric, and the concept quests of the same world.

| World | Build quest and its deliberate failure | Result |
|---|---|---|
| 16 Object Pool | `p16-shell-fuse`: a shell that rests without clearing its fuse timer still bursts. Only `AShellSentBackEarlyStaysQuiet` fails. | Clean beside the brief. The word timer first appears in hint rung 3, the Alternative and Q06. One gap: the brief states the failing test's outcome (O7, Should). |
| 17 Dirty Flag | `p17-tower-rig`: `SetLocalOffset` marks only the moved joint, so a child's kept position stays old when its parent moves. Only `ChildrenFollowTheirParent` fails. | Clean. No visible text before the first run says "children follow" or names the propagation. Hint rung 1 says a joint is read after its parent has moved, by design (A1680); logged as a Note. |
| 18 Spatial Partition | `p18-moth-swarm`: the given `Step` flies moths without refiling them. Only `StaysRightAsMothsFly` fails. | **Leak.** The `uniform-grid` hover card in Q4's `terms[]` states it (P1, Must). Earlier concept text says the same in general words (P3, Should). |
| 19 Data Locality | `p19-firefly-meadow`: a handle that is an array index goes stale when `RemoveAtSwap` moves the last record. Only `EveryHandleKeepsItsFirefly` fails. | Clean. The words handle, index, stale and serial appear in no earlier quest or hover card. Two soft nudges only (L11 and a Note on "is now"). |

Boss quests and refactor quests have no hidden failure in any of the four worlds. The Dirty Flag boss states its one trap (removing worn-off oil before reading the guard) plainly in the spec and tests it.

## Check 2: should World 18's `TwoRoundsPlayAlike` be tightened?

**Yes. The author's own doubt is right, and the reason is stronger than the order dependence.**

How the mutation `meadow-swarm-ticks-too` (the swarm keeps its own tick on while the meadow also calls `Step`) is caught today. The only check that can see it is `TickAndCheck` (`p18-boss-moth-meadow.Test.cpp:113-124`): on a frame that scores a second, it compares `GetLastDrawn()` with a count recomputed from the moth positions at the moment the test looks. If the swarm ticks after the meadow in that frame, the moths have moved a second time between scoring and the check, so the two counts differ. If the swarm ticks first, the meadow steps and scores the already doubled positions, and the check sees the same positions it scored with: **no test fails**.

Why the order cannot be relied on:
- Both actors tick in the same group with no prerequisite between them. The engine keeps enabled tick functions in a `TSet<FTickFunction*>` (`Engine/Private/TickTaskManager.cpp:1941`) and walks it with a `TSet::TIterator` (for example `:1221`, `:1296`, `:1481`), so the order follows the set's sparse array, not the order the actors were spawned in.
- Round 2 destroys and respawns all 300 lanterns and the swarm (`StartRound`, `ClearMeadow`), so slots in that sparse array are reused. The order in round 2 can differ from round 1.
- A learner can therefore pass or fail this on a machine, an engine build or a seed change that has nothing to do with their code.

What is not tested at all: the spec says the swarm's tick is switched off and the master calls `Step` (`07-boss-moth-meadow.md:85` for C++, `:102` for Blueprint). No test reads `IsActorTickEnabled()` or compares a moth's movement with one `Step`. A meadow that calls `Step(2 * DeltaSeconds)` also moves the moths twice as fast and passes the same way, as long as it scores with the moths where they are.

Recommended tightening (one test change, no spec change): in `TickAndCheck`, before `TestWorld.Tick(1)` copy the moths' `Position` and `Velocity` (both are public on `FDojoP18Moth`), tick one frame, take the elapsed time from `GetElapsed()` before and after, and check that no moth moved farther than `|Velocity| * DeltaSeconds` plus a small tolerance. A bounce clamps a moth and shortens its move, so only an upper bound is safe, and a double step (about twice as far) fails it in either tick order, with a message a learner can act on ("a moth moved farther in one frame than one Step allows; is the swarm still ticking itself?"). Keep the existing recount; it catches the scoring bugs. Do not use `IsActorTickEnabled()` alone: it would reject the legitimate design where the swarm keeps ticking and the meadow never calls `Step`, which the brief does not forbid in so many words. If the Lead prefers the strict reading, say it in the spec and test the flag instead.

The mutation list in `docs/iterations.md` (line 2384) should keep the note that the catch was order-dependent until the test is changed, and the mutation should be re-run in both tick orders after the change.

---

## Must fix

**P1. World 18 Q4: the `uniform-grid` hover card states the swarm's deliberate failure.**
`content/packs/patterns/worlds/18-spatial-partition/04-build-moth-swarm.md:10` lists `uniform-grid` in `terms[]`. `content/glossary.json` `uniform-grid.long` says: "Things that move must be refiled when they cross into another cell, and things that are destroyed must leave." Q4's deliberate failure is that the given `Step` flies the moths without refiling them (A1694); the failing test is `StaysRightAsMothsFly`. A learner reads the card while writing `FileAll`, `CellOf` and `FindNear`, sees `MothCells` in the header, adds the refile to `Step` on the first pass, never meets the failing test and never reaches the reveal. Same kind as last round's Singleton `world` card (A1911, A1927).
Fix: delete that sentence from the card. Q3's card keeps teaching it, which A1694 accepted; see P3 for the concept-quest wording. Reviewer note: lower confidence than last round, because the general teaching earlier in the world is deliberate (A1952).

**O1. World 16 Q01: a wrong garbage-collection fact, which Q06 contradicts.**
`01-spawn-cost.md:43`: "The memory is not freed then. The actor waits until a later garbage collection finds that nothing points at it any more." The correct answer to `destroy-memory` (`:86`) repeats it: "In a later garbage collection, once nothing points at it any more".
Engine: `Destroy` calls `MarkAsGarbage` on the actor and its components (`Runtime/Engine/Private/LevelActor.cpp:1055-1057`), and the collector treats a garbage-flagged object as unreachable and nulls the `UPROPERTY` references to it (`Runtime/CoreUObject/Private/UObject/GarbageCollection.cpp:3665-3668`, `KillReference`). A stored pointer does not keep a destroyed actor in memory. `06-object-pool-when-not.md:44` says exactly that ("Destroyed actors are the exception, because the collector clears references to them"), and A1655 already fixed the same sentence in Q02's Alternative.
A learner would get wrong: that a pointer to a destroyed actor stays valid and keeps it alive, so they skip `IsValid` and misread Q06's held-record bug.
Fix: "a later garbage collection frees it and clears every reference to it", and choice C "In a later garbage collection, which also clears references to it".

**L1. World 19 Q05: an editor step promises a console message the engine never prints.**
`05-refactor-embers.md:41`: "`obj list class=DojoP19Ember`: ... after it the console says it does not recognize the class, because the class is gone."
Engine: `ParseObject<UClass>` returns false for an unknown class and logs nothing (`CoreUObject/Private/UObject/UObjectGlobals.cpp:1332-1395`). In `UEngine::Exec` "OBJ LIST" (`Engine/Private/UnrealEngine.cpp:9643`) the class is parsed with `ParseObject`, and when `CLASS=` is given but no class is found the listing block is skipped (`:9693-9700`). The command still prints its header line and "0 Objects", and no "not recognized" text exists on that path. A Live Coding patch also keeps a removed `UCLASS` registered until the editor restarts, so the result may be a non-empty list.
A learner would get wrong: waits for an error that does not come, sees an empty list, and cannot tell "the class is gone" from "the command failed".
Fix: "after it the list is empty: 0 Objects." Rated Must because it is a wrong engine behaviour taught as true; the harm is low and the Lead may downgrade it (A1954).

---

## Should fix

### World 16, Object Pool

- **O2. Q01 answer-length tells** (`01-spawn-cost.md:28-31, 74-77, 84-87, 112-116`): the correct choice is the longest in `predict`, `spawn-work`, `destroy-memory` and `measure-first`, and `answerIndex` is 1, 1, 2, 1. Equalise lengths and spread positions.
- **O3. Q02 hints** (`02-build-rocket-rack.md:466-468`): two sentences each. Rung 1 restates the brief's "refuse, then put out of play", rung 2 restates "every switch Acquire turned on is off again", rung 3 names the answer ("Which of the switches stops it moving?"). One sentence per rung.
- **O4. Q02 editor step** (`02-build-rocket-rack.md:34`): the Level Blueprint calls `Acquire` on its own Begin Play. Level script actor and level actors begin play in level order (`WorldSettings.cpp` `NotifyBeginPlay`), so the rack may not have spawned its rockets yet, `Acquire` returns nullptr and the expected "true four times, then false" never prints. Unverified at runtime, same risk as spot-check 5 T7. Start the step with a Delay of 0.2 seconds.
- **O17. Q04 editor step** (`04-build-shell-fuse.md:34`): the same Begin Play ordering risk as O4, and the step must also say "store each result in a variable" so the Level Blueprint can fire each shell later.
- **O5. Q03 answer-length tells** (`03-object-pool-card.md:27-31, 86-90, 96-100, 127-131`).
- **O6. Q03 borrowed structure** (judgement call, the L1 kind): the "when the pool is full" list (`:51-55`) has four items in the research chapter's order (size it, refuse, recycle the oldest, grow), and `:42` and `:49` follow the same section's "in use query derived from existing state" and "looks almost right" (`research/patterns-inventory.md` 2.18). No wording matches. Reorder or reframe around the rack and the show, and drop the "one flag per slot" clause.
- **O7. Q04 brief, rubric and concepts state the failing test's outcome three times** (`04-build-shell-fuse.md:28, 491, 16`): "A resting shell never bursts, and a woken shell bursts only after it is fired again, however its last use ended", with "in the middle of its flight, for example when the show is stopped". This is the exact assertion of `AShellSentBackEarlyStaysQuiet`. Rated Should, not Must, because it states the requirement and not the timer, `ClearTimer` or the fix, and A1653 and A1659 chose this so the test is fair (A1953). If the Gameplay Moment precedent is applied (spot-check 5 Must 3), keep it in the brief only and make the rubric say "A resting shell stays quiet until fired".
- **O8. Q04 hints** (`:484-486`): 3, 2 and 2 sentences. Rung 3 ("A destroyed actor's pending timer never fires, but a resting shell is alive. What should resting do about a fuse that is still burning?") is nearly the fix. One sentence per rung; keep the reasoning for the after-pass text.
- **O9. Q05 hints** (`05-refactor-ripples.md:389-391`): two or three sentences; rung 1 restates the two failing tests.
- **O10. Q06 answer-length tells** (`06-object-pool-when-not.md:26-31, 75-81, 85-92, 118-124`), `answerIndex` 2, 2, 1, 2.
- **O11. Q06 overbroad Niagara claim** (`:125`, and Q03 concept bullet 18): "Niagara already pools its effects". Pooling is off unless asked: `SpawnSystemAtLocation` and `SpawnSystemAttached` default to `ENCPoolMethod::None` (`Plugins/FX/Niagara/Source/Niagara/Public/NiagaraFunctionLibrary.h:93, 96`), and `None` means created fresh, not taken from the pool (`NiagaraComponentPoolMethodEnum.h:10-13`). A learner would spawn effects with the defaults and assume they are pooled. Say "Niagara can pool its effects when you spawn them with AutoRelease".
- **O12. Q06 predict reuses the research scenario** (`:26-31`, and `object-pool-scenario-2` in `patterns.json`): one boss spawned once, with the research's distractors. D13 counts example names. Use a non-boss example.
- **O13. Boss test needs names the spec never gives** (`07-boss-finale.md`): the spec names only `RocketsInRack` and `ShellsInPool`; `p16-boss-finale.Test.cpp` calls `StartShow`, `AbortShow`, `IsRunning`, `GetBurstCount`, `GetDudCount`, `GetRack`, `GetShellPool` and reads `Runner->Label->Text`, and requires the in-progress label to start with `SHOW: cue` (`Test.cpp:63-66, 70, 104, 160-162, 197-204`). Spec line 27 says only "the next cue, the bursts, and the duds". Add the public interface and the progress prefix to the spec (same kind as T10 and L11 in spot-check 5).
- **O14. Boss Feel against fixed numbers** (`:35`, `:43`, rubric `:120`): line 35 fixes 12 cues half a second apart, a 1.2 second rocket fuse and a 2 second shell fuse; line 43 says "tune the cues"; rubric bullet 8 asks for "its tuned show". Make Feel a judgement on the fixed show and bullet 8 "the smallest rack and pool for the fixed show with no duds".
- **O15. Boss rubric lacks dependency direction** (`:113-120`): only the `runner` piece's `why` (`:51`) says the rack, pool, rockets and shells know nothing about the runner. Add it to bullet 1.
- **O16. Pattern card answer-length tells** (`content/patterns.json` object-pool recall-1, recall-4, scenario-2, scenario-4).

### World 17, Dirty Flag

- **D1. Q01 answer-length tell** (`01-recompute-every-frame.md:87-90`): the correct choice (85 characters) is two to three times longer than the others (29 to 38).
- **D2. Q02 hints** (`02-build-guard-rating.md:354-356`): rungs 1 and 2 are two sentences; rung 1 restates brief line 27, rung 2 lists the data shapes.
- **D3. Q03 answer-length tells** (`03-dirty-flag-card.md:26-31, 93-97, 107-112`): the correct choice is the longest, and the distractors are other patterns or absurd lines.
- **D4. Q04 hints** (`04-build-tower-rig.md:356-358`): rung 3 is three sentences and hands over the mechanism (a forward pass marking later joints, or a parent comparison) and restates the Alternative.
- **D5. Q05: a stated requirement no test enforces** (`05-refactor-ladder.md:29, 237` against the tests at `:180-194`): "A removal that is refused changes nothing and sets no note." `RefusedRemovalsChangeNothing` reads only `GetScoreCount` and `GetRating`, so a `RemoveScore` that sets the note before its index check passes all three tests. Add `GetRecomputeCount()` equal to 0 after the refused removals and before the read.
- **D6. Q05 hints** (`:228-230`): two sentences each; rung 3 restates `:29`.
- **D7. Q06 answer-length tells in all four items** (`06-dirty-flag-when-not.md:27-31, 72-76, 82-86, 104-108`): the correct choice is the longest, so a learner scores 4 of 4 by length.
- **D8. Boss Feel against fixed numbers** (`07-boss-night-watch.md:35, 43, 126`): line 35 fixes armour at 15 and oil at 10 for 12 seconds; Feel says "tune the oil's length and the armour's worth"; bullet 8 requires "the tuned oil length and armour value". The tests pin both (`Test.cpp:76-79`), so tuning breaks them.
- **D9. Boss test needs behaviour and names the spec never states** (`Test.cpp:65, 70, 100, 137-138, 185, 201-203, 296, 330, 337`): the label must be rewritten the moment a round starts; `FirstGustSeconds`, `GustInterval`, `RoundSeconds`, `StartingGuard`, `MostShakyChecks` and `Rig` must be public properties (which conflicts with "Core numbers are fixed", `:35`); `PressArmour`, `PressOil` and `PressNextRound` are called by name. Add one spec sentence.
- **D10. Pattern card answer-length tells** (`patterns.json` dirty-flag recall-3 and scenario-4).

### World 18, Spatial Partition

- **P2. Q1 pattern named before it is built** (`01-every-pair.md:44, 110`; `navigation-octree.long`, `physics-broadphase.long`, `uniform-grid.long`): "a good example of the Spatial Partition pattern", "It is a spatial partition the engine keeps for you", "The simplest spatial partition". The rule is name the pattern right after it is built, never before, and A1692 says Q1 carries no pattern name.
- **P3. Q1 concept text names Q4's fix** (`:40`): "when a moth flies across one, its index has to leave the list it was in and join the list of the cell it entered, or questions about its new place will not find it." That is Q4's fix in moth and index words, two quests early. A1694 accepts the general teaching; this wording is not general. Related: Q2 `:17, :306`, Q3 `:16, :42`, `fill-refile` and `patterns.json` recall-1. Write it in general terms or move it to the after-pass text.
- **P4. Q1 answer-length tells** (`:84-89, 94-99, 104-109`), the correct choice at index 1 in 4 of 5 items.
- **P5. Q2 Parsons `find-near` has interchangeable lines** (`02-build-lantern-grid.md:549-551`): `Low` and `High` can swap and `int32 Measured = 0;` can sit before either; the grader uses exact order.
- **P6. Q2 editor step has invisible actors** (`:32`): the keeper and lanterns have only a scene root, "the far lit lantern" cannot be told apart, and the step never says how the Level Blueprint gets a reference to a placed actor.
- **P7. Q2 hints** (`:523-525`): rung 1 gives the whole algorithm in two sentences; rung 3 restates "on the ground plane".
- **P8. Q3 answer-length tells** (`03-spatial-partition-card.md:27-31, 83-86, 116-121`).
- **P9. Q3 overbroad explanation** (`:89`, and `patterns.json` recall-4): "Choosing four of the eight directions covers each neighbor pair exactly once." Only a set that takes one direction from each opposite pair does. Say "four directions, one from each opposite pair".
- **P10. Q4 hover cards give the stub's gaps** (`fintpoint.long`, `uniform-grid.long`): the `fintpoint` card holds the `CellOf` expression and the grid card the `FindNear` plan. Rated Should: the worked Q2 already shows `CellOf` (`02-build-lantern-grid.md:141`), so the card adds nothing new there (A1955). Show a different example in the `fintpoint` card.
- **P11. Q4 hints** (`04-build-moth-swarm.md:420-422`): two sentences each.
- **P12. Q4 Parsons `file-all`** (`:444-445`): `Cells.Reset();` and `MothCells.SetNum(Moths.Num());` can swap.
- **P13. Q5 Parsons `weave-cells`** (`05-refactor-thread-weaver.md:361-374`): the `Mine` and `Theirs` loops can swap; `Pair`, `Ahead` and `Measure` appear in the lines but exist nowhere in the starter or the brief.
- **P14. Q5 hints** (`:340-342`): two sentences each; rung 3 repeats "rounded down" from `:30`.
- **P15. Q6 tells** (`06-spatial-partition-when-not.md:27-31, 74-80, 84-90`): all four items have the answer at index 1 and the correct choice is far the longest in three; `patterns.json` recall-4, recall-1, scenario-2 and scenario-4 have the same shape.
- **P16. Boss test needs names the spec never gives** (`07-boss-moth-meadow.md`): the C++ plan names `ADojoP18Meadow`, `PressLight` and `RestartRound`; the test also calls `Keeper`, `Label`, `IsRunning`, `GetScore`, `GetLastDrawn`, `GetScoredSeconds`, `GetLanterns` and `GetSwarm` (`Test.cpp:18-37, 80-82, 116-123`).
- **P17. Boss Blueprint plan has no burn piece** (`:97-111`): `light` stores the time in a float array, but nothing reads it and there is no piece that puts lanterns out after 8 seconds, unlike the C++ plan (`:87`). A learner following that plan cannot pass `LightsTheNearestUnlit`.
- **P18. Boss Feel against the rubric** (`:42`, `:123`): bullet 8 requires "the tuned extension numbers", but the extensions are optional.

Related, not counted here: the meadow test's tick-order dependence (`Test.cpp:113-124`) is a test-strength finding, answered in Check 2 above and logged as A1951.

### World 19, Data Locality

- **L2. Q01 answer-length tells** (`01-scattered-memory.md:28-32, 86-91, 95-101`).
- **L3. Overbroad cache claim** (`glossary.json` `cache-line.long`, around `:5099`; Q01 `:12`, Q02 concepts `:17`): "a loop over records packed side by side in a TArray runs far faster than a loop that follows a pointer". Unqualified; a 24-record array never shows the gain, and Q06 says so. Say "can run much faster once the data no longer fits in the caches".
- **L4. Q02 hints** (`02-build-firefly-swarm.md:353-355`): two sentences each; rung 2 restates the brief at `:28`.
- **L5. Platform-specific line size taught as fact** (Q02 `:67` static_assert message, Q01 `:56`): "two to a cache line", "two fit in each 64 byte cache line". The product ships on macOS and the engine's own `PLATFORM_CACHE_LINE_SIZE` is 128 on Mac ARM64 (`Core/Public/Mac/MacPlatform.h:63`); `WindowsPlatform.h:206` is 64. Say "about two per 64 byte line on PC".
- **L6. Q02 dependency direction** (`concepts` `:19`, rubric `:359-364`): "The swarm depends on nothing", but it depends on the firefly record. State the direction: the swarm depends on its records, the records point at nothing.
- **L7. Q03 unsupported size claim** (`03-data-locality-card.md:38`): "it can decide whether a hundred moving things fit in a frame or a hundred thousand" is a 1000-fold claim with no basis. Say "a large share of a frame".
- **L8. Q03 `FString` size** (`:26`): "a 200 character description" is presented as making each record much larger. An `FString` member is a 16 byte header; the characters live on the heap. The record grows by about 32 bytes (FName 8, FString 16, double 8), so 32 becomes 64. A learner would think `FString` fields store their text inline.
- **L9. Q03 answer-length tells** (`:26-31, 85-89, 94-99, 121-126`; `patterns.json:2690, :2778, :2818`).
- **L10. Q03 borrowed structure** (judgement call, D13): the card follows Nystrom's chapter order (contiguous values, packed with swap-removal, hot and cold, separate arrays instead of base pointers, then the engine's version) and matches `research/patterns-inventory.md` 2.16 item for item. Zero 5-word matches. Reorder or log it as accepted.
- **L11. Q04 brief nudges the guard** (`04-build-firefly-meadow.md:28`): "You may add private members, and fields to the records if you need them." The obvious index-handle version needs neither, so the sentence tells the learner extra state is required. Word it neutrally ("the header and records may be changed") or move it to the Alternative.
- **L12. Q04 hints** (`:363-365`): hints 1 and 2 are two sentences; hint 3 states the whole design.
- **L13. Q04 Parsons** (`:383-400`): the move and burn lines are independent while the grader is exact; the prompt fixes the order, so only a note unless the Lead wants a Parsons block for the learner's own function.
- **L14. Q05 hints** (`05-refactor-embers.md:401-403`): all two sentences; hint 2 restates `:33`, hint 3 repeats `:34`.
- **L15. Q05 `KindledAt`** (`:28`, rubric `:409`): "which only the readers ever look at", yet none of the five readers reads `KindledAt`. Say "which the step never reads".
- **L16. Q06 answer-length tells** (`06-data-locality-when-not.md:26-32, 78-85, 87-95, 117-125`).
- **L17. Boss rubric lacks dependency direction** (`07-boss-dusk.md:113-120`): bullet 1 says "reused unchanged"; the "swarm and meadow know nothing about the hunt" rule is only in the `hunt` piece (`:51`).
- **L18. Boss test needs names the spec never gives**: "the champion" and the label component are never defined (the World 9 and World 13 bosses say "any actor a designer picks, or the player's pawn when none is picked"), and `p19-boss-dusk.Test.cpp` needs `ADojoP19DuskHunt`, public `Champion` and `Label`, `IsRunning`, `StartRound`, `GetReleased`, `GetCaughtCount`, `GetMissedCount`, `GetMeadow` and `GetSwarm`.

---

## Note

**World 16.** Q01 `:10` prerequisite `p13-bytecode-when-not` skips Worlds 14 and 15, which are merged (A1651 says to repoint; Worlds 17 to 19 use p13 too). Q02 concept `:17` and the `set-actor-hidden-in-game` hover name the likely miss (ticking) in a worked quest, which is fine. Q02 Parsons `:493-495` hide, collision and tick lines are interchangeable, the prompt fixes the order. Q04 Parsons is the given `Acquire` on purpose (A874). `Fire(0)` or a negative fuse sets no timer. Q05 brief `:35` and rubric 2 require "not ticking", no test checks it, and `:28` says "twice a second" while the editor step loops every 0.4 seconds. Q02, Q04, Q05 spawn actors with no mesh, so nothing shows in the viewport. `object-pool-recall-2` "exactly one line is wrong" has a second defensible line. The ladder goes worked, stub, refactor stub (no faded); the verifier accepts it. The boss reference game claim "for the whole evening" is unverified.

**World 17.** Q01 prerequisite still p13 (A1678 says repoint to `p16-boss-finale` for strict order). Q01 `:33` "at most six different answers" ignores the answer before the first change. Q02 Alternative `:368` makes the guard rating a case world 06 files under "use a running total". Q03 `:38-53, :63` follows the chapter's structure (three ways to clean the flag in the chapter's order, same loading-screen example); no wording matches, log it as the L1 kind. Q03 `:61` says push-model replication marks a property dirty and "only marked properties are checked for sending"; true only for properties registered as push based (`Engine/Public/Net/UnrealNetwork.h:146`, `bIsPushBased = false` by default), so say "properties set up as push based". Q03 and Q06 `terms` list `mutable-member` and `tick` that the quests never use. Q04 hint 1 says "The failing test reads a joint after its parent has moved", the failure by design (A1680), acceptable only while it stays this vague. Q04 `:38` never says how the Level Blueprint refers to the placed rig. Q04 labelled a stub but the header already gives the three private caches and `EnsureCaches` (A1673). Q05 `:229` "can call only const functions and can change only mutable members" is absolute; a const member function can still change what a pointer member points to. Q05 `:131` sort lambda uses `A` and `B`. Q06 cart-count predict matches research scenario 2 almost one to one; `:78` says the best-three sum "must be worked out again" while Q5's Alternative offers an incremental sorted three. Boss rubric bullet 1 only implies the dependency direction (spec `:31`). Boss extension 3 adds a `Sums G/T` label line that a learner may not realise is optional.

**World 18.** Q1 `:42` and `overlap-query.short` say an overlap query returns shapes "inside" the sphere; it returns any shape that touches it. Q1 prerequisite is p13 (A1693 says repoint). Q1 `tmap` in `terms` not needed. Q2 `Measured` can be faked: the tests check only `Measured >= Found.Num()` and `< 100`. Q3 `spot-dangling` bugLine 4 versus line 5. Q3 follows the chapter's sequence (grid, move, half the neighbors, trees); no wording or example is shared. Q4 `MothCells` and its write in the `file-all` Parsons give a quiet hint that the cell must be remembered; `navigation-octree` and `tmap` in `terms` are padding. Q5 `:26` says "a few thousand threads" but the test pond of 1,500 lanterns gives about 220; the distractor `FVector(Pair.Key, 0.0)` (`:376`) would not compile; `profiling` in `terms` is unused. Q6 never shows a profile. Boss tests never read the mid-round label, never test the tie-break, the E key binding or the pawn fallback; extinguishing before scoring in the same tick is required by the tests but stated only in the C++ plan (`:87`); the Blueprint plan's tie-break is not possible from `FindLanternsNear`, which returns cell order.

**World 19.** Q01 `:45` "Every actor ... its own root component, and its own tick function, which the world dispatches one by one": an actor need not have a root component and only ticking actors are dispatched. Q01 `:47` "two whole fireflies per cache line" should read "on average". Q02 `:32` `stat game` shows overall World Tick Time and not the one tick's cost; 1000 `DrawDebugPoint` calls dominate. Q02 `@explain` at `:165` says growth happens "again and again" when adding; growth is geometric. Q02 Parsons independent pairs, prompt fixes the order. Q03 `swap-or-shift` (`:94`) "without moving the 9,996 records after it", but `RemoveAtSwap` moves one. Q03 "base class pointers bring back scattered memory" is not guaranteed for objects allocated in sequence. Q04 `:28` "where in the array the firefly a handle names is now": cut "now" if the failure should bite. Q04 `:34` the first spot is unspecified and the Level Blueprint needs a meadow reference. Q04 `tarray` hover says "Do not add or remove items while looping over the same array" but the given `Step` removes inside an index loop; say "range-for". Q05 prerequisite is p13 (A1711). Q06 `spot-map` and "a TMap lookup jumps around memory as much as the pointers did" is overbroad; a small hot map sits in cache. Boss "within 400 units" is fixed while Feel says "tune the spots". The `cache-line` `unrealDocsUrl` points at the Unreal Insights page.

---

## What checked out

- **Ids and order:** every glossary id, prerequisite, `related` id, `firstQuestId` and `useCaseQuestIds` entry resolves in all four worlds. Every `terms[]` term is taught by an earlier concept quest (A72); the verifier shows no term-order warning for these worlds.
- **Shape:** hints are three rungs with no code in all four worlds; rubrics have 6 or 5 bullets and 8 for each boss; worked quests have 3 to 5 `@explain` marks; build quests have an Alternative; bosses have a named reference game and two plans; the pattern name does not appear before the card in Worlds 16, 17 and 19 (World 18 is P2). Comments sit above every class and function.
- **Engine facts confirmed in 5.8:** `stat game` lists SpawnActor and Actor BeginPlay (`EngineStats.h:43-44`); a bound `FTimerDelegate` does not run once its UObject is gone (`TimerManager.cpp:410-430`) and `Destroy` and `EndPlay` clear no timers; `ENCPoolMethod` has None, AutoRelease and ManualRelease; `SetActorEnableCollision`, `SetActorHiddenInGame`, `SetActorTickEnabled` behave as the hovers say; `bComponentToWorldUpdated` and `ConditionalUpdateComponentToWorld` (`SceneComponent.h:163, 1054`); `MarkRenderStateDirty` sets a flag and recreates the state at end of frame (`ActorComponent.cpp:2695-2710`); timers stop while the world is paused (`LevelTick.cpp:1812-1816`); the broadphase default is a tree (`PBDRigidsEvolution.h:65`); `FNavigationOctree : TOctree2` (`NavigationOctree.h:141`); `FScenePrimitiveOctree` is a `TOctree2` (`PrimitiveSceneInfo.h:243`); `GetTypeHash` exists for `TIntPoint` (`IntPoint.h:536`); a weak pointer made from a destroyed actor keeps its index and serial, so `Remove` works (`WeakObjectPtr.h:165-175`); `RemoveAtSwap` moves one element (`Array.h:2367-2380`); `FMassEntityHandle` is an index plus serial (`MassCore/Public/Mass/EntityHandle.h:12-30`); `FVector` is three doubles and `FVector3f` three floats (`MathFwd.h:47, 73`); `obj gc` exists (`UnrealEngine.cpp:9340`); the Q06 float-precision claim at 300 km (about 2 cm spacing) is right.
- **Tests enforce the briefs** apart from D5, P19 and the unspecified names (O13, D9, P16, L18): Q02 and Q04 of Object Pool cover every resting and woken property, Q05 gives 4 pass and 2 fail on the starter as the brief says, the boss timings hold; Dirty Flag Q2 and Q4 enforce everything their briefs state; Data Locality's four test sets match their briefs and the boss arithmetic (27 missed by dusk, the tenth release at 19 s) holds. The engine proofs on UE 5.8.4 (A1718 and the iterations entries) passed with the references passing, the starters failing and all mutations caught except the order-dependent one in Check 2.
- **Originality:** no copied wording and no em dashes. The 5-word scans against `research/*.md` found only automation-test boilerplate. Structural borrowing is logged at O6, D (Note on Q03), P (Q3 Note) and L10, all judgement calls.
- **Not verified:** the Level Blueprint BeginPlay order in a real level (O4), the editor behaviour of the Level Blueprint steps, the app's real hint gating before the first run, whether the app shows test names or messages before the first run, the book itself, the reference game's show length, and any engine behaviour at runtime. M1 and L1 rest on reading the source.
