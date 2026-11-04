# M4.y spot-check 3, 2026-11-03

A third look at the three worlds merged since spot-check 2 (`docs/reviews/m4y-spotcheck-2.md`, merged). Branch `claude/m4y-spotcheck-3`, cut from main 0eec77e (the brief named 8bc8b5a; that commit is an ancestor of main and 0eec77e only adds the Lead's board commit). Docs only: no content, solution or test file was changed.

## Method

- Sampling: seeded shuffle (mulberry32, seed **20261104**) of each world's quest files, as in spot-check 2. A world with 8 or fewer quests is taken whole. Pack 3 Worlds 4 and 5 have 10 quests each, so 8 were drawn; Pack 4 World 4 has 6 and was read whole.
- One fresh read-only reviewer per world read the sampled quests, their reference solutions and tests in `tools/solutions/`, the glossary entries behind `terms[]`, the research files and the world's decisions. Every engine API claim in prose, hints, comments and editor steps was checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8`), because engine proofs test the solutions and not the prose (A1622). Originality was compared with `research/*.md` by a 5-word run scan plus the reviewers' knowledge of the course.
- The reviewers were also told the Should-fix kinds that recurred last time: editor steps the learner cannot see, hints holding code or running long, text beside the brief that touches the deliberate failure, answer-length tells, stub quests that are really faded, and interchangeable Parsons lines.
- I (QA session) re-read the file lines or the engine source for every Must fix and for the Should fix items that turn on one line (the scatter editor step, the boss tune-versus-fixed contradiction). All held. Nothing was dropped and no severity was changed.
- No engine run. `npm run typecheck` passes. `npx tsx tools/verify-content.ts` on this branch: no problems, 12 warnings (the known pattern-coverage warning and similar).

## Counts by world

| World | Sampled | Must fix | Should fix | Note |
|---|---|---|---|---|
| Pack 3 World 4, Spawning and timers (`mechanics/worlds/04-spawning`) | 8 of 10 | 1 | 8 | 5 |
| Pack 3 World 5, Tracing (`mechanics/worlds/05-tracing`) | 8 of 10 | 3 | 9 | 9 |
| Pack 4 World 4, Interaction and dialogue (`systems/worlds/04-interaction-and-dialogue`) | 6 of 6 | 1 | 7 | 6 |
| **Total** | 22 | **5** | **24** | **20** |

Not sampled: Pack 3 World 4 quests 01 (breakdown) and 07; Pack 3 World 5 quests 03 and 10 (the boss). Every Pack 4 World 4 quest was read.

## Result in one line

No copied wording, no em dashes, every glossary term, prerequisite and `related` id resolves, and no wrong signature or include in the solutions. Five Must fix items: three wrong or overbroad Unreal facts or logic statements (timer next-tick, overlap-events default, a drill explanation that contradicts its own quest), and two places where text beside the brief gives away the deliberate failure (two glossary hover cards, plus a rubric line and a concept line in the tracing sentry quest). The recurring Should fix kinds from spot-check 2 are all back.

Abbreviations below: `M4` is `content/packs/mechanics/worlds/04-spawning`, `M5` is `content/packs/mechanics/worlds/05-tracing`, `S4` is `content/packs/systems/worlds/04-interaction-and-dialogue`. Line numbers are on main 0eec77e.

---

## Pack 3 World 4, Spawning and timers (author-mechanics)

Sampled 8 of 10 (not 01, 07). Boss complete (Bomberman named, fixed numbers, 3 ordered extensions, core-only feel criterion, 8 bullets, two labelled plans). Starters fail. Ladder is worked, faded, faded, stub, blank. Engine behaviour checked in `TimerManager.cpp`, `Actor.cpp`, `LevelActor.cpp`: `ClearTimer`, `SetTimer` on a busy handle, `GetTimerRemaining` of -1, `OnDestroyed` after `EndPlay`, `DontSpawnIfColliding`, default `AlwaysSpawn` all as the quests say.

**Must fix**
- `M4/04-holding-timers.md:46`: "`SetTimerForNextTick(this, &AThing::Fire)` waits exactly one frame". The engine does not promise that. With `TimerManager.GuaranteeEngineTickDelay` at its default of 0, a next-tick timer is queued for the current frame (`TimerManager.cpp:58-62`, `:759`), and the CVar text says such timers "could run during the same engine tick". `LevelTick.cpp:1816` ticks the timer manager after `TG_PrePhysics`, so a call from an actor's Tick fires later in the same frame. It does hold from inside a timer callback (the boss's `OnDestroyed` handler is reached that way). Fix: "on the next timer update, normally the next frame, and always after the code that set it has finished".

**Should fix**
- `M4/03-build-scatter.md:21,36` (brief and editor steps): "press Play, crates appear ... Change Seed and press Play again". Nothing calls `Scatter()`: the header and cpp have no `BeginPlay`, and neither does the solution. The steps only print `Get Skipped`, so Play shows nothing and the count reads 0. (Verified: only the test and declaration mention `Scatter()`.) Fix: add "in the level Blueprint, call Scatter on Begin Play" as the rack's steps do, or add a `BeginPlay` to the starter and solution.
- `M4/08-build-chain.md:114-143`: labelled `stub` but really faded. Every body carries "Your code: ..." step comments (L116, L140-141) that repeat the brief's rules; the stub example ships empty bodies. Fix: empty the bodies and keep the rules in the brief.
- Hints longer than one sentence, some restating the brief: `M4/03-build-scatter.md:311` (restates brief steps 1 and 2), `M4/05-build-fuse.md:353-354`, `M4/06-build-bomb-rack.md:240`, `M4/08-build-chain.md:287-288` (three sentences at L288), `M4/09-build-keeper.md:225-226` (restates "looping timer ... first call on the next frame"). Fix: one sentence each, each narrower than the last.
- `M4/06-build-bomb-rack.md:258-273` (Parsons `rack-slot`): `Bombs.Add(Bomb);` can go before `StartFuse`, before `FinishSpawning`, or last. The grader compares exact order. The brief's `Loaded++` is also not in the block. Fix: drop the line or fold the add into the `FinishSpawning` line.
- `M4/04-holding-timers.md:23-30` (predict question): "Four times" holds only for one timer phase. `TimerManager.cpp:1235-1237` computes `trunc((now - expire) / rate) + 1`; for a 0.45 s frame it is 5 when the expiry falls in the first 0.05 s of the frame. Fix: add "a timer set just before that frame".
- `M4/04-holding-timers.md:53-65` (card example): `StopWatering` is `StopTimer`'s own callback and logs `GetTimerRemaining(StopTimer)`. `TimerManager.cpp:921` returns 0.0 for an executing timer, so the line always prints "0.0 s left", clashing with the nearby "-1" teaching. Fix: log from another function or drop the line.
- `M4/04-holding-timers.md:71-82` (spot-the-bug `shared-handle`): `bugLine: 4` is defensible only because line 4 is the second call; the timer that "never fires" is on line 3 and the neutral handle name `TurretTimer` lets a learner pick line 3. Fix: name the handle `FireTimer` so line 4 is the odd one.
- Answer tells in `M4/02-spawning-with-care.md`: `deferred-why` (L87-95; correct choice about 71 characters against about 46 and 37) and `seed` (L101-109; about 87 against 22 and 57). Fix: equalise the lengths.

**Note**
- `M4/03-build-scatter.md` is worked and `M4/06-build-bomb-rack.md` is faded, yet the rack's gap (one loop body, three step comments) is no larger than the scatter's. `M4/05-build-fuse.md` and the rack carry no `// @explain:` marks, which the faded example has (optional).
- `M4/10-boss-fuse-yard.md:31,71-77,128` state the end-check mechanism and its reason (`SetTimerForNextTick`, listener order not promised; the `end` piece's `why`). This is the boss's trap handed over in the spec; it matches how the World 3 boss works, so it is a design call.
- `M4/10-boss-fuse-yard.md:46`: extension 2 uses "the keeper from this world" but `m4-keeper` is not in `prerequisites` (L10).
- `M4/04-holding-timers.md:9` lists `deltatime` in `terms[]` but the text never mentions it.
- `M4/02-spawning-with-care.md:52` and `M4/09-build-keeper.md:240` point to "the patterns pack's Object Pool world"; `content/packs/patterns/worlds/` has no such world yet.
- Glossary `spawn-actor-deferred` `short` says "before its construction and BeginPlay run". The native constructor has already run; the construction script and `BeginPlay` are what is deferred. The `long` text is right.

---

## Pack 3 World 5, Tracing (author-mechanics)

Sampled 8 of 10 (not 03, 10). Trace, sweep, overlap and async signatures, the multi-trace comment ("overlapping hits then first blocking hit"), `bBlockingHit` false for touches, `MakeBox` half extents, `GetReflectionVector`, the Pawn profile ignoring Visibility and `DrawDebugLine` lifetime all verified against 5.8 source by the reviewer, who also re-derived the laser, feeler and piercer test coordinates. Ladder is worked, faded, faded, stub, blank, with the piercer stub really faded-light. No wrong engine claim in prose.

**Must fix**
- `M5/09-tracing-habits.md:115` (explanation of `true-is-not-enough`): "only a hit on the player, or a clear line to the player, means it is seen." False in this world: `M5/04-build-sightline.md` defines seen as the first thing the ray meets being the candidate (`bBlocked` plus the hit actor), and the world's own deliberate failure is a hero the trace passes through, which returns a clear line. Fix: "only a hit whose actor is the player means it is seen."
- `M5/04-build-sightline.md:308` (rubric bullet 4) and `:15` (concepts) name the deliberate failure beside the brief. The rubric says "a hero in the open is seen, whatever collision settings the hero's capsule has", which tells the learner the capsule's collision settings matter; the concept says "the trace has to ask the right question". The reviewer brief and A1483 say these panels state outcomes only. Fix: rubric "A pillar or another character in the line hides the hero, and a hero in the open is seen"; concept "Seeing is an angle test first and a trace second".
- `content/glossary.json:2350` (`line-trace` long) and `:2392` (`collision-query-params` long) name the fix: "By-object-type versions test against object types like Pawn" and "FCollisionObjectQueryParams says which object types a by-object trace should look for". Both terms are in the sightline's `terms[]`, so the hover cards show before the failure (hover cards count as text beside the brief, A1822). Fix: drop those sentences; the `object-type-query` entry already carries the idea.

**Should fix**
- `M5/04-build-sightline.md:21,34,309`: "A line is drawn on every look" and "Walk behind it: a red line and false". The starter and the solution return early on range and cone (`DojoM5Eye.cpp:32-39`) before the `DrawDebugLine` at line 54, so out-of-cone and out-of-range looks draw nothing. Fix: draw before those returns, or change the step to "false, and no line, because the cone test stops the look before the trace" and soften the brief and rubric.
- `M5/06-build-feeler.md:35` (editor steps): "two cubes ... 100 units apart" is ambiguous (default cubes are 100 wide, so centres 100 apart leave no gap; the test uses a 100 unit gap between faces). The steps also say `Get Stop Location` and `Get Impact Point` "differ by exactly the radius" but only tell the learner to print the Boolean and `Get Clear Distance`. Fix: "a gap of 100 units between the cube faces (centres 200 apart)" and add a Print String of both values for the wall run.
- `M5/08-build-laser.md:41` (editor steps): default 100 unit cubes turned 45 degrees about Z with the beam through the centre present a vertex, so the reflection side is undefined (the test panels are flat slabs of 20, 300, 200). The beam is drawn for 1 second once at `BeginPlay`, so it can be missed. Fix: "scale each cube to a thin wall (for example X 0.2, Y 3, Z 2) before turning it 45 degrees", and use `slomo 0.2` or fire again on a key.
- `M5/07-build-piercer.md:116-119,124-139`: the stub's `Fire` body ships a four-step recipe that repeats brief item 1 almost word for word, and each getter carries a comment; the stub example ships empty bodies. Fix: leave the bodies empty.
- Hints restate the brief: `M5/08-build-laser.md:233` (the three stop cases) and `:234` (mirrored heading and "starts at the impact, a little off the surface"), `M5/07-build-piercer.md:278` (pierced versus stopper rule), `M5/06-build-feeler.md:293` (brief step 1). Hints are mostly two sentences. Fix: make hint 1 point at the problem without restating the spec, for example "what happens if the next trace starts exactly on the surface it just hit?"
- Parsons blocks with interchangeable lines (the grader compares exact order): `M5/04-build-sightline.md:322-323` (the two `AddObjectTypesToQuery` lines swap; the `Objects` block and the `Params` block can also come in either order, and `FHitResult Hit;` can sit anywhere before the trace), `M5/07-build-piercer.md:305-306` (`StoppedBy = ...` and `ShotLength = ...` swap). Fix: add dependencies by using the earlier value in a later required line, or drop one of each pair. The piercer distractors are plain C++ logic, not Unreal lines.
- Answer tells: `M5/09-tracing-habits.md:108-132` (all three correct choices far the longest; `answerIndex` 0, 1, 0), `M5/05-shapes-and-queries.md:24-29,104-111,114-121,137-143` (longest in 4 of 4; `answerIndex` 1 in all four), `M5/02-lines-and-hits.md:23-29,113-119` (longest). Fix: pad distractors to similar length and vary the index.
- `M5/01-breakdown-watchtower.md:110`: edge `{ from: settings, to: tower, label: read at the start of a round }` points the wrong way (the label says the tower reads the settings; plan 1 has `tower -> settings`). Plan 2 also has no `beam -> tower` edge although the tower counts zaps, and no `settings -> eye` although the sentries read the data asset. Fix: reverse the edge and add the two.
- Dependency direction is missing from the rubrics of `M5/06-build-feeler.md:299-304`, `M5/07-build-piercer.md:284-289` and `M5/08-build-laser.md:239-244` (only the sightline has it, `:309`). The author rules require it in every two-actor quest. Fix: replace one bullet, for example "the laser reads tags and the surfaces know nothing about it".
- Number from the research: `M5/08-build-laser.md:28` (`MaxBounces = 5`), `:116`, `:176`, `:199` and the tests. `research/gamedevtv-exercise-design.md:712` lists "Laser Mirror ... reflects ... up to five times". Fix: use 4 and update the zigzag test (5 points, last at -480).

**Note**
- `M5/04-build-sightline.md` title and class "A sentry's eye" matches the course exercise name "Sentry eye" (research line 431), and the deliberate failure (the character does not block Visibility) is the course's own 5.1.1 failure (research line 417). Concept level only; consider a different title.
- `M5/09-tracing-habits.md:52` lists "camera pull-in" and "ground snap", the exact names of research section 6.5 ideas 5 and 1.
- No 5-word verbatim run with `research/*.md` apart from the include line `Misc/AutomationTest.h`. `M5/05-shapes-and-queries.md:41` (multi-trace sentence) is a close paraphrase of Epic's `World.h` comment (sorted, blocking hit last, nothing after it).
- `M5/01-breakdown-watchtower.md:34` says "decided on a timer a few times a second, not every frame", which is the answer to the `09-tracing-habits.md` predict question. House style (World 4 does the same).
- `M5/04-build-sightline.md` and `M5/06-build-feeler.md` are faded and have no `// @explain:` marks; other worlds' faded quests mostly have none either.
- `M5/08-build-laser.md:16` (concept) and `:241` (rubric) mention "a start that is not inside the surface it just hit"; this is not the world's deliberate failure.
- Glossary `collision-query-params` and `object-type-query` link to the Blueprint tutorial "using-a-single-line-trace-raycast-by-object...". An API page would fit the C++ structs better.
- `M5/world.json` summary says everything is "wired into a tower"; the piercer is not (A1488).
- `M5/07-build-piercer.md:293`: the claim that an object-type multi trace "would not tell an overlap from a block" is not verified; in the engine the object-type multi query turns blocks into touches at the pre-filter.

---

## Pack 4 World 4, Interaction and dialogue (author-systems)

Sampled all 6. Both breakdown plans cover every required piece; boss has fixed numbers, a reference game, three ordered extensions and 8 bullets; Parsons blocks have 2 distractors and non-interchangeable lines; starters fail. Ladder is worked, faded, stub, blank, with 4 `@explain` marks in quest 02 only. World 3 is absent from the folder and no prerequisite points at it (A1500).

**Must fix**
- `S4/02-build-interactable.md:155`: the self-explanation model reason is false. `Body->SetGenerateOverlapEvents(true); // @explain: Overlap events are off unless a component asks for them ...`. `UPrimitiveComponent`'s constructor calls `SetGenerateOverlapEvents(true)` (`Engine/Source/Runtime/Engine/Private/Components/PrimitiveComponent.cpp:398`, verified), and `UBoxComponent` and `UShapeComponent` do not change it. Only some components (skeletal mesh, arrow, billboard) switch it off. The learner is graded against this reason. Fix: "Overlap events are already on for a box, but the interactor finds the door only through them, so the code states the dependency instead of relying on the default."

**Should fix**
- `S4/04-build-dialogue-runner.md:24` (also `:17`): the brief names the deliberate failure's trigger, "`UDojoS4DialogueChain` starts a follow-up when a conversation ends"; concept line 17 ("refuses to start one conversation on top of another") names the symptom. A1503 claims "the brief only lists the events". Fix: say only that two ready-made listeners are given and that the tests use them; reword the concept without the refusal.
- `S4/06-boss-village-gate.md:41` vs `:51`: line 41 says the core numbers are fixed (reach 200, places 600/1200/1800); the Feel line says to tune "the reach and the places". The reach is set in `UDojoS4Interactor`'s constructor and "the pieces need no additions". (Verified: both lines read as quoted.) World 1's boss (`06-boss-expedition-pack.md:46`) has the same shape. Fix: "once the core round passes, change the reach in the component's Details and move the placed actors; the class defaults stay as fixed".
- `S4/03-build-interactor.md:37` (editor steps): likely prints nothing for the first prompt. The interactor calls `Refresh()` in its own `BeginPlay` and broadcasts only on change; the Level Blueprint binds in its own `BeginPlay`, and the level script actor usually sits after the placed hero in the actor list, so the hero's first notice fires before anything is bound and `Open door` never prints. Not run in the editor, so likely rather than confirmed. Fix: after binding, also print Get Focus Prompt, or say the first prompt may already have fired.
- `S4/04-build-dialogue-runner.md:40`: the steps do not say to promote the Construct Object results to variables, but the 1-key event needs them (`05-build-villager.md:39` does say it). Fix: add "store both in variables".
- Hints are not one sentence each, and two do not climb: two-sentence hints at `S4/02-build-interactable.md:429` (and `:431`, hint 3 about calling `Execute_GetPrompt`, which the learner never writes in the door gaps), `S4/03-build-interactor.md:653-654`, `S4/04-build-dialogue-runner.md:793`, `S4/05-build-villager.md:220`; `05:222` (hint 3) is a vague C4458 warning that does not say which pointers. Fix: one sentence per hint, each narrower than the last and on the gap; hint 3 of quest 05 could name the `CanInteract_Implementation` guard.
- `S4/04-build-dialogue-runner.md:802`: the rubric bullet "listeners hold the only references to the runner" is false and confusing. The villager (quest 05) and the director (boss) hold runner pointers and are not listeners. The intended direction rule is that the runner holds no reference to a listener, villager or hero. Fix: "the runner holds no pointer to any listener, villager or hero".
- `S4/01-breakdown-interaction.md:105` and `S4/06-boss-village-gate.md:112`: breakdown plan 2 covers the required piece `flag-reactions` with `save` ("holds the flag set and announces each new flag") and no piece says who reacts to a flag and unlocks the gate, which the rubric (line 123) demands. Boss plan 2's `mode` piece sets a Talking Boolean but never says how the hero stops walking, which rubric bullet 5 requires. Fix: add a gate-reaction piece (or label `controller` or `widget` with it); add `SetIgnoreMoveInput` through the player controller to the `mode` label.
- `tools/solutions/s4-boss-village-gate/DojoS4GateDirector.cpp:195-199`: `HandleKey` writes `if (...) Call();` on one line, five times, breaking the project's one-statement-per-line rule in a model solution. Fix: braces on separate lines.

**Note**
- `DojoS4Villager.cpp:21` and `DojoS4Door.cpp:49,52` build prompts with `FText::FromString(FString::Printf(...))` and literals, while the `ftext` glossary entry says dialogue should be `FText` for localization. The villager prompt is the clearest case for `FText::Format`; add a one-line comment or use it.
- `S4/04-build-dialogue-runner.md:768` says the test relies on the spy being bound before the chain; the `broadcast` glossary entry says listener order must not be depended on. Dynamic delegates run in bind order, so the test is sound, but the two texts disagree. Reword the test comment.
- `S4/06-boss-village-gate.md:29` lists the board prompts without `Prompt: Close door`, which the finale board shows (boss test line 210).
- `S4/06-boss-village-gate.md:35` names "Skyrim's guard conversations" as the game where what you learned decides your answers; Skyrim guards mostly have barks. A reference game with topic or knowledge gating would be safer.
- Gates: the breakdown requires only `s1-boss-expedition-pack`, which `content-authoring.md:74` allows. The first build `s4-interactable` does not list `p10-type-object-when-not` and `p1-observer-when-not` as World 1 and 2 do (covered transitively through the s1 boss); `p7-state-when-not` is added at the runner.
- Structure mirrors research section 6 item 5 (event names `OnDialogueStarted`, `OnChoiceMade`, `OnDialogueEnded` and the piece list). Structure, not text; no example strings, numbers or exercise names from the course.

---

## Across the worlds

- **Engine facts in prose** again came out wrong only on a source read: the `SetTimerForNextTick` guarantee (M4), the overlap-events default (S4), and one logic statement against its own quest (M5 09). Keep the source check (A1622).
- **Hover cards leak the fix** (new kind, M5 glossary lines 2350 and 2392). The glossary entry for a general term such as a line trace or query params is written for every use of the term, so it must not describe one quest's solution. Worth a pass over all entries in a quest's `terms[]` when a world is written.
- **Hints** are the most common Should fix in all three worlds: more than one sentence, restating the brief, or hint 3 off the gap (M4 five quests, M5 four, S4 four). Same as spot-check 2.
- **Stub quests that are really faded** (M4 08, M5 07, and last round M2 07 and M1 09): a stub that keeps step comments in empty bodies. Four rounds running, so it is a pattern of the authors' stub template rather than a one-off.
- **Interchangeable Parsons lines** (M4 06, M5 04 and 07): the grader compares exact order, so a correct alternative order fails. A lint could check that every adjacent pair of block lines has a data dependency; I have not tried it.
- **Answer-length tells** (M4 02, M5 02, 05, 09): third round with the same finding. A verifier warning for "the longest choice is correct in more than half of a quest's items" would catch it.
- **Editor steps** (M4 03 never calls `Scatter()`, M5 06 and 08 ambiguous cubes and a one-second beam, S4 03 the first prompt): fewer than last round, and mostly small gaps rather than invisible carriers. The ones marked likely or not run need the editor.
- **Text beside the brief on the deliberate failure** (M5 04 rubric and concept, S4 04 brief and concept, M5 hover cards): five hits across two worlds, down in kind from last round but still the rule most often broken.
- **Boss Feel versus fixed numbers** (S4 06, last round S1 06): the same contradiction, so a single sentence in the author brief would settle it.
- **Research numbers**: M5 08 reuses "five bounces" and M5 04 reuses the course's "Sentry eye" name and failure (last round M3 05 reused three hits).
- Not verified anywhere: starters failing as designed, the editor steps, anything that needs the engine or the editor.
