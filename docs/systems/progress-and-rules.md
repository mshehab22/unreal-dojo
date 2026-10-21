# System: progress-and-rules

Owner: builder-rules. Folder: `src/main/services/progress/`, `src/shared/types/progress.ts`. Research: `research/gamified-learning-platforms.md` sections 3, 4, 5.

## Purpose

Everything the app remembers about the learner and every rule that turns an attempt into XP, mastery, cards, schedule, and unlocks. Pure rule functions with no I/O, each unit tested from the tables below.

## Save file (`<userData>/progress.json`, atomic write, schema version)

PlayerProgress: version, playerName, studio { name, modules[] }, xp, role, streak { count, lastActivityAt, freezes (max 2), milestones[] }, spree { current, best, armor }, seerStones (max 2), patternCards { id -> { tier: bronze|silver|gold, useCasesPassed: questId[] } }, skills { id -> { points, mastery: attempted|familiar|proficient|mastered } }, quests { id -> QuestProgress }, attempts[], reviewLog[] (per item: itemId, at, quality, intervalDays, ease, stability?), schedule { itemId -> dueAt }, hoverCounts { termId -> count }, daily { date, offered[], chosen?, done, monthBadges[] }, createdAt, updatedAt.

QuestProgress: status (locked|available|in_progress|passed), bestScore, attempts, hintsRevealed, solutionViewed, savedFiles, breakdownPlan?, revisionNote?, lastAttemptAt.

## Rules

Pass: build and refactor need compiled + all tests pass + review score >= 70; score = 0.6 tests + 0.4 review (review = tests when tests-only). Breakdown: grader score >= 70 with every required piece present after revision. Concept: 80% of questions. Boss integration: integration rubric score >= 70.

XP (first pass only; repeats 0; rematch 50%; drills flat 10 per completed drill):
| Quest difficulty vs learner level band | multiplier on base xp |
| far above | 1.30 |
| above | 1.12 |
| at level | 1.00 |
| below | 0.60 |
| far below | 0.25 |
Band = difficulty (1..5) compared to floor(level / 4) + 1 clamped to 1..5. Hint spells cost 15% of base each. Solution viewed without a Seer Stone: XP for the quest is 0 and a rematch is scheduled within 3 days. Fail but compiled: 5% effort XP, once per quest.

Levels: xp to next = round(200 * 1.35^(level-1)). Roles at levels 1, 4, 8, 12, 16, 20, 25, 30, 40, 50: Apprentice, Scripter, Builder, Systems Smith, Pattern Seeker, Architect, Engine Whisperer, Lead, Principal, Legend.

Pattern cards: unlocked on first pass of a quest listing the pattern; tier by distinct use-case quests passed: 1 bronze, 3 silver, 5 gold.

Skills: on pass each listed skill gains difficulty points (bosses x2). Mastery from the scheduler: attempted (seen), familiar (one successful recall), proficient (3 successful spaced recalls), mastered (interval >= 30 days). A missed mixed-drill item drops mastery one level and is shown as "due for review".

Spree: consecutive first-try Submit passes on build and refactor; Run never counts; armor absorbs one miss; best spree never lost. Bonus: +5% XP on the passing submit while a spree is 5 or more.

Streak: a completed drill or passed quest within every 3 days; freezes consumed automatically, max 2 held, 1 earned per boss; milestones 7, 30, 100 celebrated; no repairs.

Scheduler: SM-2 (ease 2.5 start, min 1.3; intervals 1, 3, then interval * ease; quality from score: 95+ = 5, 85+ = 4, pass = 3, miss = 1 or 2). Items: glossary terms, pattern cards, parsons blocks, scenario questions. Daily due cap 20; overflow slides to the next day. Hovered-but-unpassed terms are injected first (hover count >= 3). Every review appends to reviewLog so FSRS can be dropped in later.

Drill composition (6 to 10 items): due items mixed across topics; at least one pattern discrimination item, one Parsons reorder, one explain-in-one-sentence (AI graded, free). Test-out: a world's mixed drill at proficient on every term unlocks skipping its worked and faded quests; bosses never skip.

Daily quest: three offers (drill, concept, short build with `scaffold: worked` and no new class so the fast loop applies); one chosen per calendar day; chest on completion (freeze, armor, Seer Stone, studio cosmetic, XP potion +50% for 30 minutes); finishing every day of a month earns a badge; missing days costs nothing.

Unlocks: a quest is available when all `prerequisites[]` are passed and all `terms[]` are at least familiar (or the learner tested out of the world). The first quest of each pack's first world is always available. Pack 4 unlocks after the bosses of the Pack 1 Communication world (`foundations` / `communication`, world 5) and the Pack 2 Component world (`patterns` / `component`), named by world id in `PACK_GATES` (A68, A510); while either world does not exist, Pack 4 stays locked and the verifier warns (A511).

Rematch: a due pattern or term surfaces as a quest from a different world than the one it was earned in when one exists.

## Done criteria

- Unit tests for every table and rule above, including band math, XP floors, tier upgrades, mastery up and down, streak with freezes across day boundaries, daily cap and overflow, unlock graph with test-out, rematch world selection.
- Save and load round-trip with a corrupt-file recovery test.
- Rule constants live in one file (`rules.ts`) with comments; the UI reads them through IPC, never duplicates them.

## Architecture (keep current)

Last updated by M1.6b (content-backed progress and drill methods).

### Layers
- Pure rule classes (no I/O, time and randomness passed in): `PassRules`, `XpRules`, `HintSpellRules`, `LevelRules`, `PatternCardRules`, `SkillRules`, `MasteryRules`, `SpreeRules`, `StreakRules`, `SeerStoneRules`, `ChestRules`, `TestOutRules`, `RematchSelector`, `UnlockGraph`, `DrillScheduler`, `DailyQuestService`, and the scheduler `Sm2Scheduler` behind the `ReviewScheduler` interface (FSRS replaces it by implementing the same interface; the review log already holds every review).
- Every constant lives in `rules.ts` with a comment; `createRulesSnapshot()` is what `getRules` answers.
- `ProgressService` is the only stateful piece: it holds the loaded save, applies the rules to attempts, reviews, drills, hints, solution views, and the daily quest, and saves after every change (memory never runs ahead of the disk). Every public method that changes the save runs as one queued step (read, compute, commit) after the previous one finishes, so overlapping IPC calls never lose an update; a failed step does not block the queue. A save that cannot be opened gives a refused service (`openOrRefuse`) whose every progress call answers the `save-failed` error and which never writes. It takes a `Clock` and a `RandomSource` (`SystemClock` and `MathRandomSource` in the app; fixed ones in tests).
- `ProgressStore` loads and saves `<userData>/progress.json` through `AtomicJsonFile` on a `FileSystem` (`NodeFileSystem` in the app, `tests/support/MemoryFileSystem.ts` in tests, which can crash mid-write or before the rename).

### Files (`src/main/services/progress/`)
- `rules.ts`: constants and the rules snapshot.
- `Clock.ts`, `SystemClock.ts`, `RandomSource.ts`, `MathRandomSource.ts`: injected time and randomness.
- `calendarDays.ts`: local calendar day helpers (streak, daily quest, due cap).
- `RuleQuest.ts`: the narrow quest shape the rules read (id, title, kind, difficulty, xp, pack and world with their orders, order, scaffold, prerequisites, terms, patterns, skills). The content layer maps its `Quest` into it. `contentFacts.ts` mirrors `QuestKind` and `ScaffoldLevel` until the content types merge (A136).
- One file per rule class listed above, plus `ProgressService.ts`, `ProgressStore.ts`, `AtomicJsonFile.ts`, `FileSystem.ts`, `NodeFileSystem.ts`, `progressSchema.ts` (zod), `createNewProgress.ts`.

### Save file
- Write: the JSON goes to `progress.json.tmp` and is flushed (fsync), the current `progress.json` is copied to `progress.json.bak`, then the temp file is renamed over `progress.json`. A crash at any step leaves the old or the new file whole. Writes are serialized.
- Migrations: `migrateSave.ts` upgrades a parsed save step by step to `SAVE_VERSION` before the schema check (version 1 to 2 adds `revealedHints`).
- Load: missing file gives a fresh save (or the backup if only the backup exists). A file that is not JSON or fails the zod schema is moved to `progress.json.corrupt-<time>` and the backup is used; if the backup is bad too, a fresh save starts. A save whose `version` is newer than the app, and a file the disk will not read (locked, no permission), are refused with `save-failed`, never quarantined or overwritten; the app still opens (A133).
- Disk: on Windows, reads, renames, and copies retry EPERM, EACCES, and EBUSY with backoff of about 1.5 seconds (`retryWhileLocked.ts`); on macOS and Linux the folder is flushed after the rename. Fields added after version 1 default to empty.
- Loot items: chests open the moment they are earned (no unopened chests are stored); the outcome carries `chest`. The active potion is `xpPotionUntil`, held cosmetics are `studio.cosmetics`, freezes `streak.freezes`, armor `spree.armor`, stones `seerStones` (A138).
- The save shape is `PlayerProgress` in `src/shared/types/progress.ts`. M1.6 added `memory` (SM-2 state and mastery per item), `drillQueue`, `rematches`, `testedOutWorldIds`, `xpPotionUntil`, `studio.cosmetics`, `daily.completedDates`, and on `QuestProgress` `seerStoneSpent` and `effortXpGranted` (A120).

### Flows
- Attempt (`recordAttempt`): price XP (band, first pass, repeat, rematch, hints, effort, spree, potion), update the quest, cards (any pass), skills (first pass or rematch), spree (first Submit of a never-passed build or refactor), streak (on a pass), boss rewards (freeze, armor, studio module), daily completion and chest, level and role, the attempt record, newly unlocked quests, next due dates.
- Review (`reviewItem`): SM-2 review (a success before the due day is logged but does not count), append to the review log, update the schedule and item memory, remove the item from the Drill me queue, recompute the item's skill mastery (the weakest item of the skill) and report the change.
- Drill (`finishDrill`): flat drill XP, streak, daily completion and chest, and any world whose terms are all proficient becomes tested out.
- World Map (`getQuestAvailability`): today's scheduled due items (`DrillScheduler.scheduledDueToday`, never "Drill me" or hover-injected items) surface as rematches of passed quests in other worlds, then the unlock graph answers (a rematch is flagged once its due time has come). Passing a rematch reviews the due items the quest uses, so it cannot be farmed.
- Daily candidates: `DailyQuestService.candidatesFrom(quests, availability)` gives open concept quests and short builds (`scaffold: worked`, `addsNewClass` false).

### Content-backed methods (M1.6b)
- `ProgressContentService` answers `getQuestAvailability`, `getTestOutStatus`, `revealHint`, `submitConcept`, `submitBreakdown`, `reviseBreakdown`, `getDailyQuest`, `startDrill`, `answerDrillItem`, and `finishDrill`. It reads the content catalog through `ProgressContentSource` (`listPacks`, `getWorld`, `getAuthoredQuest`, `getPatternCards`; `ContentCatalog` meets it), builds a view per content load (cached on the outline list), and applies everything through `ProgressService`.
- `toRuleQuests.ts` maps pack outlines to `RuleQuest[]` (A311). `DrillItemBank.ts` indexes every way to ask about each scheduled item: terms through concept questions, patterns through which-pattern questions and card recall and scenarios, Parsons blocks keyed `parsons.<questId>.<blockId>` (A310). `ItemGrader.ts` grades answers in main (A314, A315). `DrillSessionStore.ts` keeps open sessions in memory (A319). `ProgressGraders.ts` is the explain and breakdown grader interface, with tests-only graders until the review service is wired (A318).
- Hints: `QuestProgress.revealedHints` keeps the revealed indexes (save version 2, migrated by `migrateSave.ts`, A500). `revealHint(questId, hintIndex?)` answers an already revealed hint again at no cost (A501). `getQuest` and `getWorld` answer through `ProgressContentService` and add `revealedHints` (texts) to build and refactor quests; unrevealed hints never leave main (A502).
- Every quest-specific call checks the quest exists (`quest-not-found`) and is not locked (`quest-locked` with the map's reason).
- Concept submit: questions graded in main, 80% passes, each of the quest's terms reviewed once with quality from the score inside the same queued step as the attempt. Breakdown: the first plan is kept as `submittedPlan`, the closest reference plan is shown, the revision is graded; a boss breakdown records no pass (A316, A317).
- Drills: due (today's due items within what is left of the day's cap of 20, A321, filled from met items to 6 to 10, with the three required formats when content has them, never the same question twice, A323), test-out (a world's taught terms and its patterns with an unlocked card, only when eligible; tests the world out when every taught term stays proficient, A313, A322), Parsons fallback (after two failed submits, pays nothing). Drill XP, streak credit, and the daily drill offer count only when the drill held a scheduled due item; otherwise it is practice (A320).
- Pack gates: `PACK_GATES` in `rules.ts` names the gated pack by order (Pack 4 has no folder yet) and the required worlds by pack id and world id. `UnlockGraph` resolves each to its boss quests; a required world with no boss in the loaded content keeps the pack locked with "the <world> world's boss (not released yet)" in the reason. `tools/verifier/checks/packGateCheck.ts` reports a gate world that is missing or has no boss (warning; error with `--release`).
- Unlocks: only terms some concept quest teaches gate a quest, and a concept quest is never gated by its own terms (A312).

### IPC wired
M1.6: `getProgress`, `getRules`, `setPlayerName`, `saveQuestDraft`, `resetQuest`, `recordTermHover`, `queueDrillItem`, `chooseDailyOffer`, `resetProgress`, `getDrillSummary`. M1.6b: the ten content-backed methods above. Every progress and drill method is now wired. `src/main/index.ts` opens the progress service, then builds `ProgressContentService` on the content catalog.

### Tests
`tests/progress/*.test.ts`, one file per rule area, plus `progressStore.test.ts` (round trip, two simulated crashes, corrupt recovery, real disk) and `progressService.test.ts` (end to end on an in-memory disk). Shared builders in `tests/support/`.
