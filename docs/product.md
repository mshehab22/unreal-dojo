# Unreal Dojo: product

## Vision

The fastest way to get good at Unreal Engine C++ is to practice it the way you practice an instrument: short, frequent, deliberate, with immediate feedback, and with the hard parts coming back until they are automatic. Unreal Dojo is a desktop app that makes that practice feel like a game without lying about what it is: you write real Unreal C++, it is compiled and tested by the real engine, and a mentor reviews it.

Who it is for: a programmer who knows some C++ (or is willing to learn it alongside) and wants to become a strong Unreal gameplay programmer: engine classes and macros, the gameplay framework, delegates, data-driven design, and the game programming patterns in their Unreal form. Mohammad is learner zero; the product is built so it can be published free to others later.

What success looks like for a learner: after a world they can explain every term in it in a sentence, plan a mechanic on a whiteboard before touching code, write it in Unreal C++ without a tutorial, and name the pattern they used and why.

## Three skills, trained separately then together

1. Concepts: terms, engine classes and functions, patterns. Learned through concept cards (prediction first, then the card, then recall questions), hover definitions everywhere, and spaced recall drills.
2. Breakdown: decomposing a finished mechanic or system into classes, components, data, events, and an implementation order, with a purpose label on each piece. There is more than one right answer; the app shows a reference plan after the attempt and scores the learner's revision.
3. Implementation: writing the pieces in Unreal C++ inside the app, compiled and tested by the engine, reviewed by an AI mentor against a rubric and Unreal conventions, then seen running in the sandbox map.

Patterns run through all three. Every one of Nystrom's 19 patterns (plus Strategy, Factory, Facade) gets a mini-arc: predict and card, recognize (which pattern fits, spot it in UE code), apply in two different mechanics, refactor messy code into it, and a "when not to use it" check. The full study, Unreal mappings, use cases, and teaching order are in `research/patterns-inventory.md`.

## Learning design rules (from the research, see `research/gamified-learning-platforms.md`)

- Attempt before explanation. Concept quests open with a prediction question (no penalty). Breakdown quests take the plan first, then show a reference, then score the revision.
- Retrieval over rereading. Drills are the heartbeat: 6 to 10 due items per session mixed across topics, including one pattern discrimination item, one Parsons reorder (shuffled UE statements with distractor lines), and one explain-in-one-sentence item.
- Spacing with a scheduler. SM-2 style now, with a per-item review log so FSRS can replace it later. Due counts are capped per day; overflow slides.
- Scaffolding fades inside each world: worked (complete a marked gap after writing why each marked line exists), faded (subgoal labels present, bodies missing), stub, blank. The verifier checks the fade.
- Purpose labels on every breakdown piece (subgoal labeling). The grader matches meaning, not strings.
- Explanations are free, answers are priced. "Why is this a finding?" costs nothing. Hints cost XP. Viewing a reference solution costs the quest's XP (or a Seer Stone) and schedules a rematch within 3 days.
- Two meters. XP measures effort and only rises. Skill mastery (Attempted, Familiar, Proficient, Mastered) can fall on a missed mixed drill and is shown as "due for review", never as a loss.
- See it run. Every build quest ends with the mechanic visible in the sandbox map, optional after the first pass of a world.
- One alternative after a pass: an idiomatic Unreal version with a one-paragraph tradeoff note.
- Test out: pass a world's mixed drill at Proficient to skip its worked and faded quests. Bosses are never skippable.

## Quest kinds

| Kind | Learner does | Graded by | Length |
| --- | --- | --- | --- |
| concept | Predict, read the card and editable example, answer 3 to 5 recall questions | Auto | 2 to 5 min |
| drill | Mixed due items: recall, pattern discrimination, Parsons reorder, explain in one sentence | Auto, AI for the explain item | 3 to 5 min |
| breakdown | Plan a finished mechanic or system on a board with labeled pieces; revise after seeing a reference | AI grader with required-pieces floor and reference plans | 8 to 20 min |
| build | Write UE C++ for one piece; Run (free), Submit (engine build, tests, review, loot) | Unreal automation tests, AI review, rubric | 15 to 45 min |
| refactor | Apply a named pattern or principle to working but messy UE code without changing behavior | Tests still pass, AI review on the pattern | 15 to 30 min |
| boss | A whole mechanic or system: breakdown, then its build pieces in the learner's chosen order, then an integration build | Per piece, plus an integration rubric | multi-session |

## Session shape (25 to 45 minutes)

Warm-up drill (keeps the streak on its own) → predict → breakdown attempt and revision (on sessions that start a mechanic) → concept cards only for the gaps the attempt exposed → build one piece at the world's current scaffold level, with a Parsons fallback after two failed submits → loot screen with the review's reflection question. Timing variants and the boss variant are in `research/gamified-learning-platforms.md` section 5.

## Curriculum

Four packs, all Unreal C++. Order inside a pack follows dependency; packs interleave on the map so patterns and mechanics alternate.

Pack 1, Unreal C++ Foundations (6 worlds): objects and reflection; memory and ownership under garbage collection; containers and strings; the gameplay framework; communication (delegates, interfaces, timers, Tick); data and tools (Data Assets, Data Tables, curves, soft references, logging, ensure and check). Each world: concept quests for its terms, 3 to 4 build quests on the fade ladder, 1 breakdown of a small mechanic, 1 boss mechanic.

Pack 2, Patterns in Unreal (8 worlds following Nystrom's teaching order in `research/patterns-inventory.md` Part 3): lens and first payoff (architecture chapter as lesson zero, then Observer, A370); time (Game Loop, then Update Method and Double Buffer, A472); communication (Command, Event Queue); behavior and modes (State, Subclass Sandbox, Component); data-driven kinds (Type Object, Flyweight, Prototype, Bytecode); access and restraint (Singleton, Service Locator); performance (Object Pool, Dirty Flag, Spatial Partition, Data Locality); and a combos world with the cross-pattern bosses from Part 4.

Pack 3, Mechanics Lab (8 worlds using the GameDev.tv ladder as structure only; original exercises from `research/gamedevtv-exercise-design.md` section 6): Enhanced Input; transforms and movement; collision; spawning and timers; tracing; delegates (boss: the multi-quest Quest System); Mechanic Maker (breakdown and build of ready mechanics); Gameplay Moment (breakdown and build of a 2-minute moment).

Pack 4, Systems Lab (6 worlds, breakdown-first, unlocked after Pack 1 world 5 and Pack 2 world 4): inventory and equipment; ability system (then a note on GAS); save and load; interaction and dialogue; spawning director; AI perception and behavior. Each names the patterns it combines and ships at least two reference breakdowns.

Repetition rules checked by the verifier: from world 3 of each pack on, every world has a quest that reuses an earlier pattern or concept and names it; every glossary term appears in at least one concept quest and one build quest; every pattern has at least three build use cases across the packs; every quest is reachable through the prerequisite graph.

## Game design

Grounded in the meta-analysis (narrative with a developing avatar and cooperative competition moved outcomes; points and badges alone did not), Boot.dev's economy, Duolingo's streak research, and Codewars' difficulty curve.

- Studio and avatar: the learner runs a small studio. The avatar is the lead programmer; each shipped mechanic adds a module to the studio's engine room and a line to the shipped-titles wall. Worlds are contracts from fictional clients with a one-paragraph brief. Fiction stays thin.
- XP and roles: first-pass XP scales steeply with difficulty relative to the learner's level; repeats pay 0; rematches pay 50%; drills pay flat small XP. Level thresholds grow 1.35x. Roles: Apprentice, Scripter, Builder, Systems Smith, Pattern Seeker, Architect, Engine Whisperer, Lead, Principal, Legend.
- Pattern cards: unlocked on the first pass of a quest for that pattern; bronze, silver, gold at 1, 3, 5 distinct use cases passed. The card shows the pattern, its Unreal form, and when not to use it.
- Hint spells: 3 per quest, 15% of base XP each, revealed in order.
- Seer Stone: view the reference solution after two failed submits; costs the quest's XP unless a stone is spent; schedules a rematch within 3 days. Held stones capped at two.
- Sharpshooter spree: consecutive first-try Submit passes; Run never counts; a spree once earned is never lost; armor (from bosses) absorbs one miss. Bonus is modest.
- Streak: a completed drill or passed quest within every 3 days; two freezes max, earned from bosses; celebrations at 7, 30, 100; no repairs for sale; no guilt copy.
- Daily quest: one of three (drill, concept, short build that needs no full engine build); finishing every daily quest in a calendar month earns a badge; missing days costs nothing.
- Mastery meter per skill that can fall, shown as due for review. Skill tree grouped by prefix (ue.objects, ue.memory, ue.containers, ue.framework, ue.delegates, ue.data, ue.input, ue.collision, patterns.*, design.*, breakdown.*, systems.*).
- Prerequisite-tag unlocking: a quest opens when its terms are at least Familiar and its prerequisite quests are passed. The map is a graph.
- Loot screen after every submit: XP itemized with modifiers, card upgrades, skill changes, spree, streak, next due dates, then the review and its reflection question.

Deliberately out: leagues and leaderboards (need accounts, documented harm), hearts or attempt caps, flat XP for repetition or presence, charging for questions, streak repairs, guilt notifications, thick fiction.

## Monetization (kept open, not built in v1)

Free core. Options the architecture allows without rework: paid content packs (packs load from folders), a hosted AI review so learners need no Claude Code or API key, a classroom mode. Any of these needs accounts, which are out of v1. Originality is a hard requirement because of this: no book or course text in the product.

## Non-goals (v1)

Rendering Unreal inside the app; accounts, cloud sync, multiplayer; auto-update; embedding book text; plain C++ exercises outside Unreal.
