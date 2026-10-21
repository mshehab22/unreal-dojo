# System: ui-quests

Owner: builder-ui-quests. Folder: `src/renderer/src/screens/quests/` and `components/quests/`. Research: `research/gamified-learning-platforms.md` sections 3 and 5 (session shape).

## Screens

Concept: Predict question first (guess, no penalty), then the card (TermText), an editable example in a Monaco scratch buffer with a syntax-check button, then 3 to 5 questions (multiple choice, fill blank, which pattern, spot the bug, explain in one sentence with the model answer revealed after grading). Terms enter the scheduler on completion.

Drill: 6 to 10 items mixed; item renderers for recall, pattern discrimination, Parsons reorder (drag lines into order, distractors marked after), explain in one sentence (AI graded, free). Shows "due for review" on misses, never "lost". Ends with the next due date and keeps the streak.

Breakdown: spec on the left (TermText, acceptance criteria); React Flow board in the center with piece cards (kind: class, component, data, event, step; a purpose label required on each; edges for "owns", "listens to", "spawns", "then"); no hints during the attempt; Submit shows the learner's plan beside one reference plan, asks for at least one revision note, then grades; the result shows required pieces covered, concerns, strengths, and the alternative note. Pieces exposed as unknown are pushed to the next drill.

Build and refactor: three-column layout. Left: brief with hover terms, concepts, pattern chips, rubric, "See it in the editor" checklist, scaffold level badge. Center: Monaco with file tabs, hover provider (glossary), completion (quest terms), autosave every few seconds and on blur, worked-level marked lines with the self-explanation gate. Right: Run (free; never counts against the spree), Submit, Open Editor, build progress (loop mode, phase, elapsed, last log line, cancel), tests list, filtered build log, hint spells (remaining and XP cost), Seer Stone offer after two failed submits, Parsons fallback offer after two failed submits. Keyboard: Cmd/Ctrl+Enter Run, Cmd/Ctrl+Shift+Enter Submit, Cmd/Ctrl+S save.

Loot: animated score, XP itemized (base, difficulty multiplier, first-pass, spree bonus, hint costs), level and role changes, card unlocks and tier upgrades flipping in, skill changes up and down, spree, streak, chest if any, next due dates; then the review: summary, rubric lines met or not, findings grouped by severity with "why?" (free), reflection question with a one-sentence answer box; then the alternative with its tradeoff note; buttons: Improve, See it run, Next.

Boss: breakdown first, then a piece picker (the learner chooses the order), each piece opens as a build quest, then the integration build with the integration rubric.

## Done criteria

- Playwright flow with the sample content through concept, drill, breakdown, build (fail with a hint, then pass), loot, next quest.
- The editor stays responsive during a build (all process work is in main).
- Every reward moment has one motion; nothing else animates.
