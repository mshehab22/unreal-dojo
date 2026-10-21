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

One complete example per kind lives in `content/examples/` (concept, breakdown, build at each scaffold level, refactor, boss) and parses under the verifier; copy from those:

- `01-concept-uproperty.md`: concept, with every question type.
- `02-build-worked-lantern.md`: build at worked level, with `// @explain:` marked lines and two Parsons blocks.
- `03-build-faded-flicker.md`, `04-build-stub-lantern-switch.md`, `05-build-blank-proximity-lantern.md`: build at faded, stub, and blank.
- `06-refactor-lantern-tick.md`: refactor.
- `07-breakdown-campfire.md`: breakdown with two reference plans.
- `08-boss-lighthouse.md`: boss with build pieces and an 8 bullet integration rubric.

The examples are format references: they are not in a pack, have no reference solution in `tools/solutions/`, and are not compiled by `--engine` (A103). Their tests use the sandbox's `FDojoTestWorld` helper the way real quests do. Section order per kind, the front matter fields, and every data shape are in `docs/systems/content-engine.md` under "Markdown format". Run `npx tsx tools/verify-content.ts --quest <id>` to check one quest while writing it.

Includes in real quests (A260): the sandbox puts quest files in `Source/Dojo/Quests/<quest-id>/` and tests in `Source/Dojo/Tests/`, and only the module root is on the include path, so tests and any quest that reuses an earlier quest's class include `"Quests/<quest-id>/<File>.h"`. A file includes its own header by bare name. Pack 1 uses quest ids `f1-<slug>` to `f6-<slug>`, classes `ADojoF<world><Name>`, and test names `Dojo.F<world>.<Quest>.<Case>` (A261).

### Glossary entries (`content/glossary.json`)

Ids are kebab-case (`actor-component`). `short` is one sentence ending in a period, for the hover card. `long` is one paragraph in our own words. `unrealDocsUrl` is locale-free and pinned to the engine version: `https://dev.epicgames.com/documentation/unreal-engine/<path>?application_version=5.8`. API links use 5.8's flat paths (`API/Runtime/<Module>/<Symbol>`). Every `related` id must exist in the file. `category` is a display label copied exactly from the existing set (mostly lowercase words such as `framework` or `object model`; acronyms such as `AI` and `UI` stay uppercase); reuse one before adding a new one. Leave `firstQuestId` out until the quest exists. Set `linkMode: "code-only"` on any entry whose term is also an everyday English word (`check`, `ensure`, `Cast`, `Destroy`, `Category`, `Super`), so it links only inside inline code (A62). Aliases must be specific to the entry: never a bare English or C++ keyword such as `override`, `virtual`, `assert`, or `Remove`.

### Drill items (pattern `recall[]` and `scenarios[]`, concept `questions[]`)

Every item has `id` (kebab-case, unique within its quest or pattern card; pattern items use `<pattern-id>-recall-<n>` and `<pattern-id>-scenario-<n>`), `type`, `prompt`, and `explanation` (shown after answering). Extra fields per type:

- `multiple-choice`: `choices[]` (3 or more, distinct), `answerIndex` (0-based).
- `fill-blank`: `prompt` holds exactly one `___`; `acceptedAnswers[]` lists every spelling that counts as correct.
- `which-pattern`: `choices[]` are pattern ids from `content/patterns.json`, `answer` is one of them, `distractorNotes[]` is `{ choice, why }` for every wrong choice (why it looks right and why it is not).
- `spot-the-bug`: `code` (C++ snippet, no leading or trailing blank line), `bugLine` (1-based line in `code`), `fix` (one sentence, no code dump).
- `explain-in-one-sentence`: `modelAnswer`, `rubric[]` (the points a learner's sentence must hit).

Spot-the-bug code has exactly one wrong line; a missing line is not a bug line, so write the code so the mistake sits on a line that is present. Spread `answerIndex` across positions (the drill runner also shuffles, A61). Intents and every other card field are written from scratch around an Unreal example, never as a rewording of a book or Gang of Four intent line.

Pattern cards list ids in Part 3 teaching order, with Strategy, Factory Method (`factory-method`), and Facade after the 19 book patterns. Scenarios are mostly `which-pattern`; a scenario may answer a neighboring pattern to sharpen the contrast, and a "when not" scenario is written as `multiple-choice`, never as a which-pattern item whose answer is the pattern to avoid.

## Pack briefs

Pack 1, Unreal C++ Foundations: worlds and topics in `docs/product.md`. Use `research/unreal-concepts-inventory.md` for the concept order and glossary ids. World 1 is the vertical slice: 6 concept quests, 4 build quests on the fade ladder, the "dash with cooldown" breakdown from the GameDev.tv research section 6, one boss.

Pack 2, Patterns in Unreal: follow `research/patterns-inventory.md` Part 3 order exactly; each pattern gets the mini-arc (predict and card from the chapter study, recognize items from its recall and scenario questions, two build use cases from its use-case list in different mechanics, one refactor, one when-not item); combos world uses Part 4 bosses. Lesson zero is the architecture chapter as a concept quest.

Pack 3, Mechanics Lab: the 8 modules with the 96 original exercise ideas and 16 bosses from the GameDev.tv research section 6, pruned to 4 to 6 build quests per world plus breakdowns of the 15 ready mechanics. World 6 boss is the Quest System (two reference breakdowns, pieces, integration rubric with 8 bullets, difficulty 5).

Pack 4, Systems Lab: the 8 systems specced in the GameDev.tv research section 6, each a boss-shaped world (breakdown, pieces, integration) naming the patterns it combines.

## Done criteria per world

Verifier green with `--engine` on the Windows desktop (or logged as unverified on the Mac); a fresh reviewer agent spot-check for copied wording, solution leaks, UE API accuracy, and the fade ladder; an `iterations.md` entry listing the quests and their observables.

Bosses (A67): every boss ships a C++ reference integration of one of its reference plans in `tools/solutions/<boss-id>/`, with automation tests that drive simulated time through two full rounds and assert the observables named in the spec. The verifier builds and runs it with `--engine`.
