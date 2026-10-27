---
id: m6-quest-system-plan
title: Plan a village quest system
order: 1
kind: breakdown
difficulty: 4
patterns: [observer, state]
skills: [planning, delegates]
terms: [dynamic-multicast-delegate, adddynamic, unbinding-delegates, world-subsystem, data-asset, timer-manager]
prerequisites: [f5-boss-beacon-drill]
xp: 100
estimatedMinutes: 20
concepts:
  - Deciding who owns quest state and who only listens
  - Keeping items, gates, and givers ignorant of the quests that use them
---

# Spec

A village has a quest board and a few people who give quests. Today's quests: find three lost tools for the smith; then, once that is done, run a courier route through three gates in order within 20 seconds; and a secret quest nobody gives, which starts the moment the player finds the first of two hidden gems. The board lists each quest with its state and progress, hides the secret until it starts, and announces when every quest that is not secret is done. Each giver shows a word over their head that always matches their quest's state. A failed courier run can be retried from the first gate. Designers will add more quests of the same two kinds (collect items, reach a goal) without code.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- Items, gates, and givers know nothing about quests' rules; a gate can be used by something that is not a quest.
- Nothing polls quest state every frame.
- A new quest of either kind is a new asset, not new code.
- A second day plays exactly like the first after a reset.

# Required Pieces

```yaml
- id: quest-data
  kind: data
  label: Quest definitions as assets with kind and item tag and count and time limit and required quest and a secret flag
  why: Designers add quests without code.
- id: tracker
  kind: class
  label: One owner of every quest's state that announces each change and each counted item
  why: One place to start, complete, fail, and reset quests.
- id: items
  kind: class
  label: Items that announce they were collected
  why: Collect quests need to hear about pickups without items knowing quests.
- id: course
  kind: class
  label: Gates that announce a visit and a course that counts them in order
  why: The courier run needs an order the gates themselves do not know.
- id: clocks
  kind: step
  label: One clock per timed quest that fails it unless the quest completes first
  why: Several timed quests may run at once.
- id: givers
  kind: class
  label: Givers that start their quest and keep their label current by listening
  why: The player's way in, always showing the true state.
- id: board
  kind: event
  label: A board that rewrites itself on every change and calls the finale
  why: The player's overview, with the secret hidden until found.
- id: wiring
  kind: step
  label: Something that connects items and the course to the tracker and resets the day
  why: Someone must translate item and gate events into quest progress.
```

# Reference Plans

```yaml
- id: tracker-subsystem
  title: A world subsystem tracker and a director that wires events to it
  pieces:
    - { id: data, kind: data, label: UDojoQuestData data asset with Kind and ItemTag and Count and TimeLimitSeconds and Requires and bSecret, covers: [quest-data] }
    - { id: tracker, kind: class, label: UDojoQuestTracker world subsystem with a state map and OnQuestStateChanged and OnQuestProgress delegates, covers: [tracker] }
    - { id: item, kind: class, label: ADojoQuestItem with an OnCollected delegate carrying the item and whoever took it, covers: [items] }
    - { id: course, kind: class, label: ADojoCheckpoint with OnReached and ADojoCourse that binds every gate with AddUniqueDynamic and broadcasts OnFinished, covers: [course] }
    - { id: clocks, kind: step, label: The tracker keeps a TMap of quest to FTimerHandle set with a timer delegate carrying the quest, covers: [clocks] }
    - { id: giver, kind: class, label: ADojoQuestGiver that binds to OnQuestStateChanged in BeginPlay and filters for its own quest and unbinds in EndPlay, covers: [givers] }
    - { id: director, kind: class, label: ADojoQuestDirector that binds each item's OnCollected to ReportItem and the course's OnFinished to CompleteGoal and rewrites a text board on every tracker event, covers: [wiring, board] }
  edges:
    - { from: item, to: director, label: OnCollected }
    - { from: course, to: director, label: OnFinished }
    - { from: director, to: tracker, label: ReportItem and CompleteGoal }
    - { from: tracker, to: giver, label: OnQuestStateChanged }
    - { from: tracker, to: director, label: state and progress events }
    - { from: data, to: tracker, label: added at the start of the day }
- id: quest-objects
  title: Each quest is a component that owns its own state
  pieces:
    - { id: data, kind: data, label: A quest data table with one row per quest and a row name for the quest it requires, covers: [quest-data] }
    - { id: quest, kind: class, label: UDojoQuestComponent one per quest on a quest board actor with its own state and OnChanged delegate and its own timer handle, covers: [tracker, clocks] }
    - { id: item, kind: class, label: Items with an OnCollected delegate that every collect quest component with a matching tag binds to at the start of the day, covers: [items] }
    - { id: course, kind: class, label: Gates with OnReached and a course actor with OnFinished that the goal quest component binds to, covers: [course] }
    - { id: chain, kind: step, label: Each quest component binds to the OnChanged of the quest it requires and becomes available when that one completes, covers: [tracker] }
    - { id: giver, kind: class, label: Givers that bind to one quest component's OnChanged and call its Start, covers: [givers] }
    - { id: board, kind: class, label: The quest board actor binds to every component's OnChanged and rewrites its widget and resets every component for a new day, covers: [board, wiring] }
  edges:
    - { from: item, to: quest, label: OnCollected }
    - { from: course, to: quest, label: OnFinished }
    - { from: quest, to: chain, label: OnChanged of the required quest }
    - { from: quest, to: giver, label: OnChanged }
    - { from: quest, to: board, label: OnChanged }
    - { from: data, to: board, label: one component per row }
```

# Rubric

- One place owns each quest's state, and every change is announced by an event.
- Items and gates only broadcast; they hold no reference to quests, givers, or the board.
- Each timed quest has its own clock, and the plan says what happens to it when its quest ends.
- Givers and the board listen and never poll; every listener unbinds when it leaves play.
- Quests come from assets or rows, so a new quest needs no code.
- The plan says how a new day resets states, progress, clocks, the course, and the items.

# Alternative Note

Both plans pass. A single tracker keeps every rule in one class, which makes resets and tests simple, and listeners bind to one event for all quests; the cost is that every quest kind's rules live in that class, so a third kind means editing it. One component per quest spreads the rules out and lets each quest carry its own events and clock, which scales to many kinds, at the cost of many bindings to set up and tear down every day. A plan where an item calls the quest it belongs to, or where the board checks every quest in Tick, fails the first two acceptance lines.
