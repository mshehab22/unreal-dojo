# System: content-authoring

Owners: author-foundations (Pack 1), author-patterns (Pack 2), author-mechanics (Pack 3), author-systems (Pack 4). Folder: `content/`, `tools/solutions/`. Read before writing anything: `research/gamedevtv-exercise-design.md` (sections 3, 6, 7), `research/patterns-inventory.md` (the pattern you are writing, Part 3 order, Part 4 bosses), `research/gamified-learning-platforms.md` section 3, `research/unreal-concepts-inventory.md`, and `docs/product.md`.

## Non-negotiables

- Original wording and code. Sources give structure and concepts, never text, names, numbers, or example strings.
- Valid UE 5.8 C++: CoreMinimal first, the right base header, `.generated.h` last, GENERATED_BODY, real specifiers, correct delegate signatures, UPROPERTY on every UObject pointer, TObjectPtr, forward declarations in headers, quest-prefixed class names (`ADojoM3PressurePlate`), no `MODULE_API` macro.
- Every build and refactor quest ships a reference solution in `tools/solutions/<quest-id>/` and automation tests that the verifier compiles and runs with `--engine`. The starter must not already pass.
- Every quest lists `terms[]` that exist in the glossary and `prerequisites[]` that exist. New terms go into `content/glossary.json` in the same task, with an Epic docs link.
- No em dashes anywhere.

## Author rules (from `research/gamedevtv-exercise-design.md` section 7, adopted in full)

One sentence naming the finished behavior opens every build quest. One new idea per quest. An exact observable for verification, asserted by the test and seen in the editor. Ramp inside the quest (naive then better, with the reason). One deliberate failure per world, revealed only after the step that fails. Experiments are A/B on one setting and become a recall question. Hints are a ladder of three with no code. Name the pattern right after it is built, never before. State the dependency direction in every two-actor quest and put it in the rubric. Reuse on purpose from world 3 on. Model conventions in starters. Bosses have fixed numbers, a named reference game, three extensions in order of importance, and a feel criterion. Mechanic and system quests start with a breakdown with at least two reference plans. Difficulty, time estimate, and a 5 to 6 bullet rubric (8 for bosses). Teach tooling in the world that needs it. Supply widgets when a quest needs UI. 

## Learning-science rules (from the platforms research)

Predict question before every concept card. Scaffold fades inside each world: worked, faded, stub, blank (the verifier checks). Worked-level quests mark 3 to 5 lines for the self-explanation gate. Each world has a Parsons block for at least two of its functions with one or two Unreal distractor lines. One explain-in-one-sentence item per concept quest with a model answer. One alternative with a tradeoff note per build quest. Breakdown pieces carry purpose labels; reference plans label every piece.

## File formats

One complete example per kind lives in `content/examples/` (concept, breakdown, build at each scaffold level, refactor, boss) and parses under the verifier; copy from those. Section order per kind is in `docs/systems/content-engine.md`.

## Pack briefs

Pack 1, Unreal C++ Foundations: worlds and topics in `docs/product.md`. Use `research/unreal-concepts-inventory.md` for the concept order and glossary ids. World 1 is the vertical slice: 6 concept quests, 4 build quests on the fade ladder, the "dash with cooldown" breakdown from the GameDev.tv research section 6, one boss.

Pack 2, Patterns in Unreal: follow `research/patterns-inventory.md` Part 3 order exactly; each pattern gets the mini-arc (predict and card from the chapter study, recognize items from its recall and scenario questions, two build use cases from its use-case list in different mechanics, one refactor, one when-not item); combos world uses Part 4 bosses. Lesson zero is the architecture chapter as a concept quest.

Pack 3, Mechanics Lab: the 8 modules with the 96 original exercise ideas and 16 bosses from the GameDev.tv research section 6, pruned to 4 to 6 build quests per world plus breakdowns of the 15 ready mechanics. World 6 boss is the Quest System (two reference breakdowns, pieces, integration rubric with 8 bullets, difficulty 5).

Pack 4, Systems Lab: the 8 systems specced in the GameDev.tv research section 6, each a boss-shaped world (breakdown, pieces, integration) naming the patterns it combines.

## Done criteria per world

Verifier green with `--engine` on the Windows desktop (or logged as unverified on the Mac); a fresh reviewer agent spot-check for copied wording, solution leaks, UE API accuracy, and the fade ladder; an `iterations.md` entry listing the quests and their observables.
