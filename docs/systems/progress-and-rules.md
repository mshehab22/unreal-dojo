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

Unlocks: a quest is available when all `prerequisites[]` are passed and all `terms[]` are at least familiar (or the learner tested out of the world). The first quest of each pack's first world is always available. Pack 4 unlocks after Pack 1 world 5 and Pack 2 world 4 bosses.

Rematch: a due pattern or term surfaces as a quest from a different world than the one it was earned in when one exists.

## Done criteria

- Unit tests for every table and rule above, including band math, XP floors, tier upgrades, mastery up and down, streak with freezes across day boundaries, daily cap and overflow, unlock graph with test-out, rematch world selection.
- Save and load round-trip with a corrupt-file recovery test.
- Rule constants live in one file (`rules.ts`) with comments; the UI reads them through IPC, never duplicates them.
