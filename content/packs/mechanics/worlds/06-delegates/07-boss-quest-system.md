---
id: m6-boss-quest-system
title: "Boss: the quest system"
order: 7
kind: boss
difficulty: 5
patterns: [observer, state]
skills: [planning, delegates, time, data]
terms: [dynamic-multicast-delegate, adddynamic, unbinding-delegates, world-subsystem, timer-delegate, data-asset]
prerequisites: [m6-quest-system-plan, m6-quest-item, m6-checkpoints, m6-quest-tracker, m6-quest-giver]
xp: 360
estimatedMinutes: 90
concepts:
  - Several quests running at once, chained, timed, and secret, all driven by events
  - A director that only translates events, with every rule owned by the tracker
pieces:
  - m6-quest-item
  - m6-checkpoints
  - m6-quest-tracker
  - m6-quest-giver
---

# Spec

It is quest day in the village. Three quests come from quest assets, in board order: Lost tools (collect 3 Tool items), Courier run (a goal: pass three gates in order within 20 seconds, offered only after Lost tools is done), and Hidden cache (a secret: collect 2 Gem items). Two givers stand 400 apart, one for each of the first two quests. Five items wait on their spots at the start of every round.

The hero walks around and presses E. E reaches the nearest giver or the nearest item some quest wants, within 200 units: talking to a giver asks the tracker to start its quest; reaching an item collects it, and its collection is reported to the tracker. A giver wins a tie with an item, and between equally near givers the earlier one wins. Items no quest wants are ignored, so a tool cannot be wasted before its quest starts; a gem is always wanted, because the secret quest is waiting to be found. While the courier run is active, every gate within 100 units of the hero counts as reached, checked every 0.1 seconds, and the course counts them only in order. When the courier run starts or restarts, the course starts again from the first gate. When its 20 seconds run out, it fails, its giver reads RETRY, and talking to the giver starts it again.

The board shows one line per quest, such as `Lost tools: 2/3`, `Courier run: ACTIVE`, `Courier run: LOCKED`, `NEW`, `DONE`, or `FAILED`, and hides the secret until it starts. When every quest that is not secret is done, the round ends and the board adds `ALL QUESTS DONE in 41.2 s`. The secret is a bonus and never holds the finale back. Reference game: Stardew Valley's help-wanted board, where small requests run side by side and the board is the record.

How rounds start: round 1 starts when play begins, and R starts the next round, only after the finale; E does nothing outside a round. Starting a round resets every quest to its first state with no progress and no clocks, resets the course, and puts a fresh item on every spot. A C++ director receives keys only after `EnableInput` with the player controller.

Compiles against earlier quests: m6-quest-item (`Quests/m6-quest-item/DojoM6QuestItem.h`), m6-checkpoints (`Quests/m6-checkpoints/DojoM6Checkpoint.h`, `Quests/m6-checkpoints/DojoM6Course.h`), m6-quest-tracker (`Quests/m6-quest-tracker/DojoM6QuestData.h`, `Quests/m6-quest-tracker/DojoM6QuestTracker.h`), and m6-quest-giver (`Quests/m6-quest-giver/DojoM6QuestGiver.h`). The pieces need no additions.

Core numbers are fixed: 3 tools, 2 gems, 3 gates, a 20 second courier run, 200 to interact, 100 to reach a gate, a gate check every 0.1 seconds.

Extensions, in order of importance:

1. A third quest kind, survive: stay inside an area for 15 seconds, added as a new kind in the tracker and a new piece that reports it.
2. A quest chain that offers a reward quest only when both Lost tools and the secret are done.
3. A rank on the finale line (S, A, or B) chosen from the day's time, with the cutoffs kept in a data asset a designer can tune.

Feel: tune the courier time limit until the run feels like a dash you can make on the second try, not the first.

# Required Pieces

```yaml
- id: day-driver
  kind: class
  label: A director that adds the day's quests and connects items and the course to the tracker
  why: The one place that translates piece events into quest reports, owning no quest rules.
- id: interact
  kind: step
  label: E reaches the nearest giver or wanted item within 200 with givers winning ties
  why: The player's one verb, with a reach rule and a tie rule.
- id: items
  kind: event
  label: Each item's OnCollected reaches the director, which reports the tag to the tracker
  why: Items stay ignorant of quests.
- id: course
  kind: event
  label: Gates within 100 are touched while the courier run is active and the course's finish completes the goal
  why: An ordered goal built from gates that know no order.
- id: timed
  kind: step
  label: The courier run fails after 20 seconds unless finished and restarts its course on every start
  why: A timed quest with a clean retry.
- id: board
  kind: event
  label: The board rewrites itself on every tracker event and hides the secret until it starts
  why: The player's record of the day, with no polling.
- id: finale
  kind: step
  label: Every quest that is not secret done ends the round with the time and R starts a fresh day only after
  why: A second day must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ quest director wires the pieces to the tracker
  pieces:
    - { id: director, kind: class, label: ADojoM6QuestDirector with the quest assets and givers and item spots and course and course quest set in Details, covers: [day-driver] }
    - { id: interact, kind: step, label: PressInteract finds the nearest giver and the nearest item the tracker WantsItem for within 200 and calls Interact on the giver when it is at least as near or Collect on the item, covers: [interact] }
    - { id: items, kind: event, label: StartRound spawns an item per spot and binds its OnCollected to a UFUNCTION that calls ReportItem with the item's tag, covers: [items] }
    - { id: course, kind: event, label: A 0.1 second looping timer calls Touch on gates within 100 while the course quest is Active and the course's OnFinished calls CompleteGoal, covers: [course] }
    - { id: timed, kind: step, label: The tracker's per-quest clock fails the run and the director's state handler calls ResetCourse whenever the course quest becomes Active, covers: [timed] }
    - { id: board, kind: event, label: Handlers bound to OnQuestStateChanged and OnQuestProgress rebuild the board text skipping secret quests that are Locked or Available, covers: [board] }
    - { id: finale, kind: step, label: The board rebuild ends the round when every quest that is not secret is Completed and R calls ResetQuests and respawns the items only when not running, covers: [finale] }
  edges:
    - { from: items, to: director, label: OnCollected }
    - { from: course, to: director, label: OnFinished }
    - { from: director, to: timed, label: ReportItem and CompleteGoal reach the tracker }
    - { from: timed, to: board, label: OnQuestStateChanged }
    - { from: board, to: finale, label: all done }
    - { from: interact, to: items, label: Collect }
- id: blueprint-director
  title: The level Blueprint wires the pieces through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the quest assets and givers and item spots and the course and a Running Boolean, covers: [day-driver] }
    - { id: interact, kind: step, label: The E event loops over givers and spawned items comparing distances within 200 and calls Interact or Collect after checking Wants Item, covers: [interact] }
    - { id: items, kind: event, label: Each spawned item's On Collected is bound with Bind Event to a custom event that calls Report Item on the tracker subsystem, covers: [items] }
    - { id: course, kind: event, label: A 0.1 second looping Set Timer by Event calls Touch on gates within 100 while Get State of the courier quest is Active and On Finished is bound to call Complete Goal, covers: [course] }
    - { id: timed, kind: step, label: A custom event bound to On Quest State Changed calls Reset Course when the courier quest turns Active, covers: [timed] }
    - { id: board, kind: event, label: The same custom event and one bound to On Quest Progress rebuild a Text Render's text from Get Quests and Get State and Get Progress, covers: [board] }
    - { id: finale, kind: step, label: The rebuild sets Running to false with the time when every quest that is not secret is Completed and the R event behind a branch on Running calls Reset Quests and Reset Course and respawns the items, covers: [finale] }
  edges:
    - { from: items, to: level, label: On Collected }
    - { from: course, to: level, label: On Finished }
    - { from: level, to: timed, label: Report Item and Complete Goal }
    - { from: timed, to: board, label: On Quest State Changed }
    - { from: board, to: finale, label: all done }
    - { from: interact, to: items, label: Collect }
```

# Integration Rubric

- The item, checkpoints, tracker, and giver are reused without changes; every quest rule stays in the tracker.
- Items and gates only broadcast; the director subscribes to them, and the givers and the board subscribe to the tracker.
- E reaches the nearest giver or wanted item within 200, givers winning ties and the earlier giver winning between givers, and unwanted items are skipped.
- Gates count only in order, only while the courier run is active, and the course restarts on every start of the run.
- The courier run fails at 20 seconds unless finished, and a run finished before 20 seconds stays Completed.
- The board updates only on tracker events, hides the secret until it starts, and the finale ignores the secret.
- Every binding made in BeginPlay or StartRound is removed in EndPlay or dies with its sender, and the gate check is a timer, not Tick.
- R starts a fresh day only after the finale, and a second day plays exactly like the first; the submission gives the tuned time limit with one sentence on why.
