# M4.y spot-check 5, 2026-11-04

A fifth look, at the four worlds merged on the night of 2026-11-03: Pack 4 World 3 (Save and load), Pack 2 World 14 (Singleton), Pack 2 World 15 (Service Locator) and Pack 3 World 8 (Gameplay Moment). Branch `claude/m4y-spotcheck-5`, cut from main 92d3ec3. Docs only: no content, solution or test file was changed. Method is that of `docs/reviews/m4y-spotcheck-2.md` to `m4y-spotcheck-4.md`.

## Method

- Sampling: Pack 4 World 3 (8 quests), Pack 2 World 14 (7) and Pack 2 World 15 (7) were read whole. Pack 3 World 8 has 9 quests, so 8 were drawn (seeded shuffle, mulberry32, seed **20261105**): all but `01-breakdown-blackout-escape`, whose front matter and two plans were read only enough to judge the world's prerequisites. 30 of 31 quests read.
- One fresh read-only reviewer per world, four in parallel. Each read the quests, the reference solutions and tests in `tools/solutions/`, the glossary entries behind `terms[]`, the world's decisions, and (for the two pattern worlds) the pattern card. Every engine claim in prose, hints, comments, explanations and editor steps was checked against the installed UE 5.8 source (`C:/Program Files/Epic Games/UE_5.8`), because engine proofs test the solutions and not the prose (A1622). Originality was compared with `research/*.md` by a 5-word-run scan plus the reviewers' knowledge of the book and course. The two pattern worlds were also compared with the Singleton and Service Locator chapters from memory (the book PDF is not on this machine).
- Hover cards count as text beside the brief (A1822). Severity rules unchanged from A1621 and A1823.
- Two extra checks from the Lead are answered first below: the engine crash message beside the Save and load quests, and Pack 3 World 8's prerequisites.
- I (QA session) re-read the file lines or engine source behind every Must fix and behind the two crash-message findings. All held, except that I lowered two reviewer ratings to Should fix (A1914, A1915).
- No engine run. `npm run typecheck` passes and `npx tsx tools/verify-content.ts` on this branch reports no problems and 12 warnings (the previous set; the 25 World 6 term-order warnings were cleared by fix round 4).

## Counts by world

| World | Quests read | Must fix | Should fix | Note |
|---|---|---|---|---|
| Pack 4 World 3, Save and load (`systems/worlds/03-save-and-load`) | 8 of 8 | 1 | 15 | 18 |
| Pack 2 World 14, Singleton (`patterns/worlds/14-singleton`) | 7 of 7 | 1 | 11 | 12 |
| Pack 2 World 15, Service Locator (`patterns/worlds/15-service-locator`) | 7 of 7 | 0 | 13 | 11 |
| Pack 3 World 8, Gameplay Moment (`mechanics/worlds/08-gameplay-moment`) | 8 of 9 | 1 | 13 | 13 |
| **Total** | 30 | **3** | **52** | **54** |

## Result in one line

No copied wording, no em dashes, every glossary id, prerequisite and `related` id resolves, and the engine facts the solutions rely on are right. Three Must fix items: a hover card that states the Singleton world's deliberate failure, a starter comment plus brief plus rubric that state the Gameplay Moment clock's deliberate failure, and a save-game comment ("only the proxy archive can write it") that is false and sits next to an engine message naming a different class. The recurring Should fix kinds are back (hints over one sentence, answer-length tells, invisible actors in editor steps, Feel versus fixed numbers).

---

## Check 1: the engine's fatal reason beside the Save and load quests

**Verdict: the hints still read correctly beside the crash message, with one false comment, one wrong word ("assertion") in the concept quest, and a name mismatch that no quest bridges.**

What the learner sees (A1860 to A1863) when a Save and load build quest crashes the engine: "Your code stopped the engine while the test <name> was running, so no test report was written (exit code N). The engine said: FArchive does not support FObjectPtr serialization. Use FArchiveUObject instead." The string is `Core/Private/Serialization/Archive.cpp:523` (`UE_LOGF(LogSerialization, Fatal, ...)`, a fatal log, not an assertion).

- When it fires: a `TObjectPtr` property (the lantern's `Keeper` in `s3-saveable`) written through a plain `FMemoryWriter` or `FMemoryReader`. They derive from `FMemoryArchive`, which does not override the object-pointer operators. It fires even when the reference is null (`PropertyObject.cpp:201-228`). A raw `UObject*` property would instead hit `check(0)` in `MemoryArchive.h:53-57`, which the app reads as "a check in the code failed".
- The name mismatch: the quest teaches `FObjectAndNameAsStringProxyArchive`, which derives from `FNameAsStringProxyArchive`, not from `FArchiveUObject` (`ObjectAndNameAsStringProxyArchive.h:21`). A learner who follows the message literally and reaches for `FArchiveUObject` gets a bare base class that writes nothing. No quest names the bridge.
- Where a crash can happen in the world: Q05 (plain archive; the inner `Writer` passed to `Serialize` instead of the proxy; `Execute_OnRestoredFromSave` without the `Implements` check), Q03 (`Actors[SaveId]` on a missing key, `TMap::operator[]` check), Q06 (an unchecked `Cast` of a missing slot's null), Q07 (null `Panel`, recursive restore). A wrong slot index cannot crash on desktop (`GetSaveGamePath` ignores `UserIndex`).
- Beside the message, these read correctly: Q03 hints and Parsons text, Q05 Parsons distractor 2, Q06 brief, rubric and Parsons, Q07 failure-path wording.
- These do not: see Must fix 1 below (`05-build-saveable.md:179`) and Should fix S1 to S3 (`04-savegame-properties.md:43,119,123` "asserts"; `05-build-saveable.md:360` hint 2 is ambiguous exactly where the message misleads; one sentence in the Q04 card would connect "Use FArchiveUObject" to the proxy).
- Not verified: the exact stdout text as the app shows it (A1860 flags this too).

## Check 2: Pack 3 World 8's prerequisites, with World 7 not on main

**Verdict: nothing in the world assumes World 7, but the chain is missing the tracing skill and the two worlds A1601 said to add once merged.**

- `m8-moment-plan` requires only the bosses of Worlds 1, 2, 3 and 6 (`m1-boss-drone-handoff`, `m2-boss-clockwork-hall`, `m3-boss-vault-room`, `m6-boss-quest-system`). A script walking the prerequisite graph gives 92 ancestors across Pack 1 Worlds 1 to 5 and Pack 3 Worlds 1, 2, 3 and 6. It reaches no Pack 2 quest, no World 4 quest and no World 5 quest.
- World 7 (Mechanic Maker) has no id on main. Nothing in the 8 quests refers to its vocabulary ("pitch", "graybox", "decompose", "Mechanic Maker"); the method words (inventory, gap map, spike, fake, cut, vertical slice, cut list) are taught by Q02 and Q06. So the missing World 7 does not break the world.
- Skill by skill: SpawnActor, timers, `FHitResult`, overlap, delegates, checkpoints, input, movement and runtime components are all in the chain. **Tracing is not**, and it is exactly what Q03's two gaps use. The brief at `03-build-searchlight.md:32` says "Tracing is taken as known from the tracing world", but no prerequisite points there (Should fix M1).
- A1601 asked for the last quests of Worlds 4, 5 and 7 to be added when they merge. Worlds 4 and 5 are on main now: add `m4-boss-fuse-yard` and `m5-boss-watchtower` to `01-breakdown-blackout-escape.md:10`. Adding the second alone pulls in World 4 through `m5-tower-plan`, but A1601 names both. World 7 stays out until it merges.
- The A72 warnings A1601 predicted for `line-trace` are gone: `m5-lines-and-hits` now teaches it and comes before World 8 in course order. The term gate still covers only `line-trace`; `dot-product` and `collision-query-params`, which Q03's gaps also need, are not in any World 8 quest's `terms[]` (their cards have `firstQuestId` `m5-lines-and-hits`).

---

## Must fix

1. **Save and load, `05-build-saveable.md:179`** (the `Lantern.h` comment shown beside the brief): "saved as a reference, which only the proxy archive can write." Overbroad and misleading: any object-aware archive (the `FArchiveUObject` family) can write it, which is what the engine message says when the learner's plain archive crashes; the proxy is not even in that family (Check 1). A learner who meets "Use FArchiveUObject instead" next to a comment saying "only the proxy" has two incompatible rules. Fix: "saved as a reference, which a plain memory archive cannot write, so the archive must be object-aware."
2. **Singleton, `content/glossary.json:553` (`world`), in Q04's `terms[]` (`04-build-start-lights.md:10`).** The card's `long` ends "In the editor there may be several worlds at once, such as the editor world and one play-in-editor world per player, which is a reason never to cache a world pointer in static data." That is the world's deliberate failure (A1444: a static flag shared across worlds). The Q04 brief says "a track is a world" (`04:28`) and "one of them fails on purpose". The card is on screen in the quest, so the failing test `TwoTracksEachRunTheirOwn` is spoiled before the first run. Fix: cut the clause from the card; keep the lesson in the quest's after-pass text.
3. **Gameplay Moment, `08-build-moment-clock.md:66` (the starter's `DojoM8MomentClock.h` class comment), `:96` and brief item 4 (`:28`), rubric bullet 4 (`:395`).** The class comment says "the first of an escape, a catch, or the time limit wins, and the answer then never changes." That is the guard whose absence is the world's deliberate failure (A1604: a `Finish` that records whatever it is told). A1604 says the starter's comments name nothing; this one does. `:96` ("frozen at the instant it ended") and the brief and rubric repeat it. A learner writes the guard on the first try, never fails `AnEscapeFreezesTheTime` or `TheFirstEndingWins`, and never meets the reveal. Fix: comment "Keeps the time of a moment and reports how it ended."; `:96` "Seconds since the moment started, up to the moment it ended."; brief item 4 to match; if the Lead wants the failure to bite, rubric bullet 4 becomes "Each ending shows its own label and time" with the guard left to the after-pass text.

## Should fix

### Pack 4 World 3, Save and load (`systems/worlds/03-save-and-load`; paths relative to it)

- **S1** `04-savegame-properties.md:43,119,123`: "it stops on an assertion", "A plain memory archive asserts". For a `TObjectPtr` it is a fatal log (Check 1); only a raw `UObject*` reaches `check(0)`. Fix: "stops the engine with a fatal error", and add one sentence connecting the engine's "Use FArchiveUObject" to the proxy archive.
- **S2** `05-build-saveable.md:360` (hint 2): "`AActor::Serialize` takes the archive" is ambiguous when the learner has built both a `Writer` and a proxy, and the crash message gives no hint that the wrong variable was passed. Fix: "Pass the outermost archive, the proxy, to `Serialize`."
- **S3** `05-build-saveable.md:361` (hint 3) gives the full `IDojoS3Restorable::Execute_OnRestoredFromSave(Owner)` call and the `Implements<UDojoS3Restorable>()` check: code in a hint, repeated in the Parsons block. Hint 1 (`:359`) is two sentences and "Only the first one differs" is ambiguous.
- **S4** `05-build-saveable.md:104-105` with `:358-361`: the faded quest's solution is the Q04 card's example (`DojoExCapture` and `DojoExRestore`) line for line, and the `savegame-property` hover card and the starter comments repeat the recipe (writer, proxy, `ArIsSaveGame`, `ArNoDelta`, `Serialize`). Fix: change the card's example (an `FString` or struct round trip) or narrow the starter comments and hints.
- **S5** `04-savegame-properties.md:50`: "it simply keeps its default when loading bytes that never held it". Tagged loading leaves an absent property untouched, so in a live actor (this world's use) it keeps its current value; the card's own `:45` says so. Fix: "keeps whatever value the actor holds".
- **S6** `04-savegame-properties.md:114-123` (`why-proxy`): the correct choice is 117 characters against 23, 48 and 44. Fix: equalise.
- **S7** `03-build-save-record.md:244-246`: hints are two sentences each; hint 1 restates the brief; hint 2 lists the toolkit (`Find`, `Remove`, `AddUnique`).
- **S8** `06-build-save-system.md:489-490`: hint 3 is two sentences; hint 2 only lists API names.
- **S9** `07-build-door.md:28` and `:42`: `IsOpen` and `GetPanelYaw` are not specified as `UFUNCTION`s, but the editor step needs a "Get Panel Yaw" node; a door that passes every test has none. Fix: `UFUNCTION(BlueprintPure)` on both.
- **S10** `07-build-door.md` test at `:210` (`bCanEverTick` false) is not in the brief or rubric. Fix: add "the door does not tick" to the brief.
- **S11** `07-build-door.md:231-232`: hints 1 and 2 are two sentences each.
- **S12** `07-build-door.md:250-263` (Parsons): A1426 says the block is the constructor; the file shows `SetOpen` calling `ApplyPanel()`, and the distractor note says "set from bOpen in one place". That names the shared place hint 3 later reuses, so the obvious first version is half of the fix. Fix: use the constructor, or update A1426 and drop "in one place".
- **S13** `08-boss-vault-checkpoint.md:44` against `:52`: "Core numbers are fixed" and "Feel: tune the step length and the two reaches". The recurring contradiction. The fixed route is 15 presses minimum (reference about 17), so "about twenty" already holds. Fix: make Feel a judgement on the fixed numbers.
- **S14** `08-boss-vault-checkpoint.md:49` (extension 2): "using `AsyncSaveGameToSlot` so the frame never waits". `SaveGameToMemory` serializes on the calling thread (`GameplayStatics.cpp:2410`); only the file write is asynchronous. The reviewer rated this Must fix; I rated it Should because it is an optional extension and the hitch it denies, the disk write, is real (A1915). Fix: "so the frame does not wait for the disk".
- **S15** `08-boss-vault-checkpoint.md:49` also needs a save-system addition (an async path), which "the pieces need no additions" at `:42` does not allow. Say so.

### Pack 2 World 14, Singleton (`patterns/worlds/14-singleton`)

- **T1** `01:117`, `03:44` and `patterns.json:1884`: "The engine makes one world subsystem for each world" is overbroad. `WorldSubsystem.cpp:30-35` creates it only for Game, Editor and PIE worlds, and `ShouldCreateSubsystem` can veto any subsystem (`Subsystem.h:49-56`). A learner may skip the null check on `GetSubsystem`. Fix: "for each game world, unless the subsystem declines".
- **T2** Answer-length tells (correct choice longest or the only one with a "because"): Q01 predict `01:28-31`, `static-lifetime` `01:70-75`, `two-needs` `01:100-105`; Q03 predict `03:27-31`, `two-problems` `03:80-86`; Q06 `when-not-manager` `06:70-75`, `when-not-scope` `06:80-85`, `when-not-helpers` `06:90-96`; `patterns.json` recall-4. `answerIndex` is also clustered on 1.
- **T3** `02:338-340`: hints are a statement plus a question each; hint 1 restates the brief (`02:28`).
- **T4** `04:292-294`: all three hints are two sentences.
- **T5** `05:350-352`: hint 3 repeats the brief's bullets almost word for word; all three are two sentences.
- **T6** `04:303` (rubric bullet 6): "The lights depend only on their own world" states the fix outcome beside the brief. Fix: "No other class knows about the rule".
- **T7** `04:34` (editor step) calls Begin Countdown from the Level Blueprint's Begin Play and expects true and false. `AWorldSettings::NotifyBeginPlay` (`WorldSettings.cpp:370-375`) dispatches in actor order; if the level script actor runs before the lights, both calls return false and Is Green never shows. A1446 already notes the ordering for the boss. Fix: put Begin Countdown after a `Delay` of 0.2.
- **T8** `06:36-63` and the predict at `06:26`: a "DartManager" that moves each dart, checks it left the track and destroys it follows Nystrom's BulletManager and `isOnScreen` argument, and research use case 2 (`research/patterns-inventory.md:411`), which A1442 says was only a one-line mention. D13 counts example names. Fix: a non-projectile example (a marshal or tyre manager).
- **T9** `07:43` (Feel): "tell from the label alone whether the practice lap they just drove would have beaten their best ranked lap" cannot be met with the fixed label (`07:27`): no label shows a single practice lap time. Fix: add the last lap time to the label spec or change the clause.
- **T10** `tools/solutions/p14-boss-time-trial/p14-boss-time-trial.Test.cpp` asserts label wording the spec never states: lines 99 (`Lap 2/3`), 156 (`False starts 1`), 108 and 130 (`Best ranked 10.0`), 93 and 117 (`RANKED`, `PRACTICE`), 251 (`TIME UP`). Put the strings in the spec or loosen the tests.
- **T11** `07:113-120` (rubric): the dependency direction (finish line and lights know nothing about the director) is only in the piece `why` at `07:51`.

### Pack 2 World 15, Service Locator (`patterns/worlds/15-service-locator`)

- **L1** Chapter structure and example names (judgment call, A1582): `UDojoP15TracingAnnouncer` (`04:43-83`) is the chapter's logged-audio decorator with "log" changed to "count"; `UDojoP15NullAnnouncer` is its null service; `Provide` (`02:183`, boss) is its `provide`; the card's "when the service is missing" list (`03:48-52`) is the chapter's three answers in the chapter's order; the scope paragraph (`03:63`) and boss extension 3 (`07:43`) are its protected static getter on a base class; "A phone book for services" (`world.json`, `03:4`) follows research line 2.15's metaphor. No 5-word run matches the research, but D13 counts example names. Fix: rename `Provide`, reword `03:63` and extension 3, or log the call as accepted.
- **L2** `01:10` `prerequisites: [p13-bytecode-when-not]` skips World 14; A1587 says to repoint it once World 14 merges, and it has (`p14-singleton-when-not`). The "locator versus singleton" items in `03:103-112` and `patterns.json` recall-3 and scenario-3 cannot be answered by a learner who has not done World 14.
- **L3** `02:352` hint 1 restates the brief at `02:27`.
- **L4** `content/glossary.json` `uinterface.long`: "You test for support with Implements<UInteractable>()" is the check `Provide` needs, i.e. hint rung 2 (`02:353`), shown through the hover card.
- **L5** `04:39` (editor step): after key T the desk's provider is the tracer, so the cast to the recording announcer fails and "One, Two, Three" cannot be read the same way. Fix: keep the recording announcer in a variable when it is constructed.
- **L6** `04:300` hint 3 is two sentences and gives both fixes; hint 2 restates hint 1.
- **L7** `05:247` (rubric bullet 2): "its header no longer includes the speaker's". The header only forward-declares (`05:97`); the include is in the .cpp (`05:133`).
- **L8** `05:241-242` hints 2 and 3 repeat the brief (`05:29-30`); hint 3 hands over the whole task.
- **L9** `03:57`: "asking for a missing feature asserts: the assert policy" (also A1588). `IModularFeatures::GetModularFeature` is `static_cast<T&>(*GetModularFeatureImplementation(Type, 0))` and the implementation returns nullptr for a missing type (`IModularFeatures.h:44-55`, `ModularFeatures.cpp:33-51`): a null dereference, not a `check`. The engine's own comment says "Will assert or crash", so I rated this Should (A1914). Fix: "asking for a missing feature is a crash".
- **L10** `07:37` against `07:45` and rubric `07:128`: "a rival hit every 4 seconds" is fixed, but Feel says "tune the rival" and the rubric asks for "the tuned rival interval".
- **L11** `tools/solutions/p15-boss-tournament-booth/p15-boss-tournament-booth.Test.cpp:349-380` (`TunablesAreHonoured`) needs public `RoundSeconds`, `RivalInterval` and `WinPoints` properties, which the spec (numbers "fixed") does not say. Add one sentence to the spec.
- **L12** `07:121-128` (rubric): the dependency direction is not stated; nothing says the announcers, scoreboards and tracer know nothing about the director.
- **L13** Answer-length tells in 11 places: Q01 `01:99-103`, Q03 `03:80-86` and `03:106-110`, Q06 `06:27-31` and `06:77-82`, and `patterns.json` recall-1, recall-5, scenario-2 and scenario-4.

### Pack 3 World 8, Gameplay Moment (`mechanics/worlds/08-gameplay-moment`)

- **M1** Prerequisites (Check 2): add `m4-boss-fuse-yard` and `m5-boss-watchtower` at `01-breakdown-blackout-escape.md:10`, and add `dot-product` and `collision-query-params` to `03-build-searchlight.md:10` `terms[]`.
- **M2** `08-build-moment-clock.md:6,23,129-196`: the "blank" quest is a stub. Every other blank in Pack 3 gives `// Declare X here.` lines; Q08 hands over the full header and a .cpp skeleton with a "Your code:" prompt per function (`:158`, `:168`, `:195` also give away more of the failure). Fix: ship one-line `// Define ... here.` files and a public-interface list, or relabel it a stub.
- **M3** `08-build-moment-clock.md:256-257` (`WaitsUntilStarted`): "An escape before the start changes nothing" is a test requirement the brief (`:21`, `:28`) and rubric do not state, and A1604 does not list it.
- **M4** `08-build-moment-clock.md:417-428` (Parsons `clock-label`): the Waiting, Running and Escaped case blocks can be reordered with no change in meaning.
- **M5** `05-build-exit-gate.md:462` (Parsons `gate-let-out`): the distractor `OnEscaped.Broadcast(Candidate);` is textually identical to a real line (`:459`). Change it (wrong arity, or before the assignment).
- **M6** `03-build-searchlight.md:514` (Parsons `searchlight-tick`): the distractor `Broadcast(this, bNowSeeing)` after `bSeeing = bNowSeeing;` behaves identically, so the stated mistake (`:515`) does not occur.
- **M7** `09-boss-blackout-escape.md:38` fixes "800 range, 20 degree half angle, 45 degrees a second", `:46` says "tune the beam's speed and width", rubric bullet 8 (`:120`) requires "the tuned beam speed and width", and the test `TheTowerSweeps` hard-codes 45. Fix: make Feel a judgement on the fixed numbers, and bullet 8 to match.
- **M8** Editor steps with invisible actors (every actor in World 8 is a scene root or collision shape with no mesh): Q03 `:36` (the runner class is `DojoM3Runner`, unnamed, invisible, and cannot be moved in Play without F8), Q04 `:36` ("the fuse disappears" cannot be seen; the log's Get Powered Count is never printed), Q05 `:36` (no trigger to print Get Escape Count), Q07 `:38` ("drag the runner out of the beam"), Q08 `:38` ("Call Set Powered on the gate" has no trigger). Fix: `show Collision`, a key event, name `DojoM3Runner`, say "press F8 to eject".
- **M9** Hints: Q03 `:486-488`, Q04 `:518-520`, Q05 `:418-420`, Q07 `:403-405`, Q08 `:386-388` are two or three sentences, several restate the brief, Q03 hints 2 and 3 name `GetSafeNormal2D`, `LineTraceSingleByChannel`, `ECC_Visibility` and `AddIgnoredActor` (code in prose), and Q08 hint 1 says "Four things can end a moment" and lists three.
- **M10** Answer-length tells: Q02 `02-inventory-and-gaps.md:24-29,65-72,75-81,89-95` (correct choice longest by a wide margin in all four), Q06 `06-slice-and-order.md:24-30,65-71,74-81` (all three); `answerIndex` is 1, 0, 1, 2 and 1, 1, 2.
- **M11** `06-slice-and-order.md:84-95` (`stale-bind`, bugLine 3): the real defect is the missing teardown of the old box; line 3 only reassigns `Box`, and lines 4 and 5 are as defensible.
- **M12** `01-breakdown-blackout-escape.md:31,67-70` uses "gaps ... spike it, fake it, or cut it" before Q02 defines gap, spike, fake and cut. Add one defining sentence each.
- **M13** `09-boss-blackout-escape.md:41` (extension 1, a second searchlight feeding the one meter) does not work with the meter's single `bSeenNow` bool (`07-build-alert-meter.md:410`): light A losing sight cancels light B still seeing. Say the meter must count lights.

## Note

**Save and load**
- `01:21` says the door opens "with a lever"; the boss uses the Q key and no plan has a lever. `savegame` is not in Q01's `terms[]` though "slot" and "save object" are used.
- `02:36` and `04:54`, and the `savegame-property` card: "Every UPROPERTY on it is written"; Transient properties are skipped (`Property.cpp:1060-1068`). `02:48`: the async calls still serialize on the calling thread (`GameplayStatics.cpp:2410`).
- `03:246`: `Find` and `Remove` are documented in `Map.h.inl`.
- Nowhere explains what the `true` on `FObjectAndNameAsStringProxyArchive` does (`bLoadIfFindFails`); `04:24-30` predict is a weak tell.
- `05:41`: the editor step prints values that look identical for `Lit` (the default and key 2 are both false); tell the learner to tick Lit and set Oil to 4 first. The faded quest has no `@explain` marks.
- `06:28` "on actors that are not being destroyed" is untested (`TActorIterator` skips pending-kill, `EngineUtils.h:443`); `06:42` needs F8 and the Outliner; rubric bullet 5 "added in Initialize, removed in Deinitialize" is untested.
- `07`: the `frotator` card gives the solution's exact `FRotator(0.f, 90.f, 0.f)` (harmless); the leftover slot after an early `return false` is cleaned at the next run.
- `08:36`: the board needs one entry per line with CLEAR last; the spec does not say so. `08:49` also conflicts with "pieces need no additions" (S15).
- `content/glossary.json:3707` (`savegame` long): "Saving actor pointers does not work across sessions" is slightly broad (a placed actor can resolve by path); the `uinterface` card says "or by casting to the I type" while a Blueprint-only implementer fails the cast.

**Singleton**
- Q01 (`01:40`) and Q03 (`03:40-42`, `03:89`), the `static-variable` card and the `scope-standings` item say outright that a static is shared by every world, which pre-teaches the Q04 failure ("fails on purpose for most people" is optimistic). Reads as teaching and transfer, not a leak.
- Ambiguous bug lines: `03:114-126`, `patterns.json` recall-2 (`:1905`) and `06:111-124`.
- `03:51` and `patterns.json:1884`: the game mode exists "once per game or per world"; `GetAuthGameMode` "will always return null on a client" (`World.h:3883-3887`).
- Glossary: `play-in-editor` (`:3676`) and `engine-subsystem` (`:513`) have no `firstQuestId`; `subsystem` short calls it an "engine-managed singleton"; `world-subsystem` says "resets whenever a new level loads", untrue for streamed sublevels; the `world` card's "one play-in-editor world per player" assumes Run Under One Process (default true).
- Q04 starter includes `EngineUtils.h`, a nudge; Q07 extension 1 ("since the last crossing") needs a reset the `Pass` standings lack; the Blueprint boss plan omits Enable Input for R and P; `patterns.json` scenario-1 answers `service-locator` (World 15) and scenario-2 answers only half its question.
- Test counts: A1448 reports "3 of 3, 2 of 2, 11 of 11"; the files hold 4, 4 and 4 tests. The proof postdates the re-review, so the content proven is current.
- The Nystrom comparison found no copied wording; structure follows the chapter's regret list, and threading and static-initialisation order are not mentioned.

**Service Locator**
- `06:31` predict choice D is about health, copied from `patterns.json` scenario-4 (prompt is about a gong's volume). `06:48` and `03:115-124`: only the class default object has no world (`Actor.cpp:709-721`), not every constructor. `03:58`: `IOnlineSubsystem::Get()` uses `GetModuleChecked` for the module. `console-command` in `03` terms is barely taught.
- The `beginplay` card ("caching a pointer to the game mode") nudges the cached-announcer failure; drop it from Q04's terms or reword.
- `04:313`: "a native interface cannot be called there [Blueprint]" is overbroad (a `BlueprintCallable` interface function can be). Editor steps `04:39` and `05:39` say "Place a ..." but not how to reference the actor in the Level Blueprint; `05:39` "the Lines stay empty" is hard to see.
- `patterns.json` `useCaseQuestIds` lists two builds that both use the announcer; the boss spec does not say how to bind a key; `world-subsystem.short` resets claim.

**Gameplay Moment**
- `05:433` and `08:401` say "Pack 2's State world"; its title is "One mode at a time", and the chain reaches no Pack 2 quest.
- Q03 is labelled worked but holds the two hardest gaps of the five builds (cone maths plus trace with params): the ladder is not monotone.
- `02:9` lists `overlap-event`, `timer-manager` and `dynamic-multicast-delegate` in `terms[]` but the card teaches none of them (padding for the A72 check).
- `06:27` "first minute" against the card's "first thirty seconds" (`:38`).
- `08:427-428`: a float with `%d` does not compile in 5.8 (`TCheckedFormatString`, `UnrealString.h.inl:1376`), it does not print a whole number.
- Rubrics: `07` bullet 2 and `08` bullet 1 do not state that the light does not know the meter (the brief does). Q01's rubric (`:108`) and the `clock` piece's why (`:62`) prime the Q08 failure two quests early (acceptable planning guidance).
- Boss plan 1 edges (`09:90-94`) mix announce and call direction; `04:545-546` and `05:458-459` Parsons: setting the flag before `Broadcast` could be swapped; `05:433` "never get out" is true only until the hero steps out and back in.

## What checked out

- Originality: 5-word-run scans of every quest against all of `research/` found only code boilerplate and generic phrases. Neither the book's example names nor numbers appear. The structure points are L1 and T8.
- Em dashes: none in the world files, solution folders, glossary entries or pattern cards read.
- Terms: every id in `terms[]` and every prerequisite resolves; no hover card names a Save and load door failure or a Gameplay Moment clock failure (the Singleton `world` card is Must fix 2).
- Engine facts confirmed in 5.8 (examples): slot path `Saved/SaveGames/<Name>.sav` and `LoadGameFromSlot` returns null on a missing slot; `Implements<T>` takes the U class (`Class.h:5372-5376`); `AddOnActorDestroyedHandler` and the broadcast before `Destroyed()` (`World.h:3070`, `LevelActor.cpp:923`); world subsystems are created for Game, Editor and PIE worlds only; `TScriptInterface` clears a failed interface check; `SetTimer` on a running handle replaces the timer; a pawn destroyed under a controller with no player state destroys the controller (`Controller.cpp:421-438`); `FCollisionQueryParams(FName, bool, const AActor*)` (`CollisionQueryParams.h:231`).
- Shape: ladders correct (worked, faded, stub, blank) apart from M2; rubrics 5 to 6 bullets (8 for bosses); every boss has a named reference game, three ordered extensions and two labelled plans; spot-the-bug lines defensible apart from the ones noted.
- Not verified: Level Blueprint BeginPlay order in a real level (source only); the UHT-generated `Execute_` check; the crash message's exact text in the app; the book itself.

## Checks on this branch

`npm run typecheck`: passes. `npx tsx tools/verify-content.ts`: no problems, 12 warnings (the previous set).
