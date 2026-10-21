---
id: f5-quest-tracker
title: Plan a quest step tracker
order: 11
kind: breakdown
difficulty: 3
patterns: [observer]
skills: [planning, communication]
terms: [dynamic-multicast-delegate, uinterface, timer-manager, world-subsystem, blueprintassignable]
prerequisites: [f5-follower]
xp: 90
estimatedMinutes: 15
concepts:
  - Choosing a channel for each link between quest objects and the tracker
  - Keeping quest objects ignorant of the quest that uses them
---

# Spec

A quest asks the player to light the three beacons of the yard within 90 seconds of lighting the first one. The quest log on the HUD shows "Beacons lit 1 of 3" and updates the moment a beacon lights. When all three are lit in time, the log shows "Complete", a chime plays, and the next quest unlocks. If the time runs out, every beacon goes dark and the counter returns to 0, with "Failed, try again" in the log. Beacons are also used by other systems (a night cycle lights them automatically), so they must not know about quests.

You are planning, not coding. Name the classes and how each pair talks: direct call, delegate, interface, timer, or Tick, and why.

Acceptance:

- A beacon has no reference to the quest, the tracker, or the HUD.
- The HUD never checks the quest every frame.
- The 90 second limit starts at the first beacon, not when the level loads.
- A failed attempt leaves every beacon dark and the count at 0.
- The number of beacons and the time limit are tunable without a rebuild.

# Required Pieces

```yaml
- id: beacon
  kind: class
  label: A beacon that can be lit and put out and announces both
  why: The thing every other piece reacts to, used by quests and by the night cycle.
- id: tracker
  kind: class
  label: A quest tracker that counts lit beacons for the active quest
  why: One owner of the quest's progress and result.
- id: beacon-news
  kind: event
  label: How beacons tell the tracker they lit or went out
  why: The beacon must not know who listens.
- id: time-limit
  kind: step
  label: A 90 second limit started by the first beacon
  why: The quest's pressure, with no per-frame cost.
- id: fail-reset
  kind: step
  label: On failure, put every beacon out and reset the count
  why: A second attempt must start clean.
- id: log-update
  kind: event
  label: The HUD log learns of progress and results through an event
  why: The log updates exactly when something changes and never polls.
- id: completion
  kind: step
  label: On completion, play the chime and unlock the next quest
  why: The payoff, and the hand-off to the next quest.
- id: tunables
  kind: data
  label: Beacon count and time limit as editable values
  why: Designers balance the quest without code.
```

# Reference Plans

```yaml
- id: tracker-listens
  title: The tracker binds to each beacon's event
  pieces:
    - { id: beacon, kind: class, label: ADojoF5Beacon with OnLit and OnDimmed dynamic multicast delegates, covers: [beacon, beacon-news] }
    - { id: tracker, kind: class, label: UDojoF5QuestTracker component on the game state that binds to every quest beacon at quest start, covers: [tracker] }
    - { id: clock, kind: step, label: The tracker starts a non-looping 90 second timer on the first OnLit and clears it on completion, covers: [time-limit] }
    - { id: reset, kind: step, label: On the timer the tracker calls PutOut on each beacon and resets its count, covers: [fail-reset] }
    - { id: progress, kind: event, label: OnQuestProgress and OnQuestFinished delegates on the tracker that the HUD log binds to, covers: [log-update] }
    - { id: done, kind: step, label: On completion the tracker plays the chime and calls the quest list to unlock the next quest, covers: [completion] }
    - { id: data, kind: data, label: A quest data asset with the beacon list and the time limit, covers: [tunables] }
  edges:
    - { from: beacon, to: tracker, label: OnLit and OnDimmed reach the bound tracker }
    - { from: tracker, to: clock, label: starts on the first light }
    - { from: clock, to: reset, label: on timeout }
    - { from: tracker, to: progress, label: broadcasts each change }
    - { from: tracker, to: done, label: when all are lit }
    - { from: data, to: tracker, label: read at quest start }
- id: beacons-report
  title: Beacons report to a world subsystem through an interface
  pieces:
    - { id: beacon, kind: class, label: ADojoF5Beacon that implements IDojoF5QuestObject and reports lit and dimmed to whatever quest subsystem exists, covers: [beacon] }
    - { id: subsystem, kind: class, label: UDojoF5QuestSubsystem world subsystem that receives reports and holds the active quest's count, covers: [tracker] }
    - { id: report, kind: event, label: The beacon broadcasts OnStateChanged and a small quest component on it forwards that to the subsystem, covers: [beacon-news] }
    - { id: clock, kind: step, label: The subsystem's timer manager runs a 90 second timer from the first report, covers: [time-limit] }
    - { id: reset, kind: step, label: On timeout the subsystem calls PutOut through the quest object interface on each reported beacon, covers: [fail-reset] }
    - { id: progress, kind: event, label: A BlueprintAssignable OnQuestChanged on the subsystem bound by the HUD log, covers: [log-update] }
    - { id: done, kind: step, label: The subsystem plays the chime and unlocks the next quest when the count reaches the target, covers: [completion] }
    - { id: data, kind: data, label: Editable count and time limit on a quest definition data asset, covers: [tunables] }
  edges:
    - { from: beacon, to: report, label: state changes }
    - { from: report, to: subsystem, label: forwarded reports }
    - { from: subsystem, to: clock, label: first report starts it }
    - { from: clock, to: reset, label: on timeout }
    - { from: subsystem, to: progress, label: broadcasts }
    - { from: subsystem, to: done, label: on target }
    - { from: data, to: subsystem, label: read at quest start }
```

# Rubric

- Beacons announce through events and know nothing about quests, trackers, or the HUD.
- The tracker or subsystem owns the count, the timer, and the result in one place.
- The time limit is a timer started by the first light, never a Tick.
- Failure puts every beacon out through a call on the beacons and resets the count.
- The HUD binds to an event on the tracker and never polls.
- Each link in the plan names its channel (delegate, interface, call, timer) and why.

# Alternative Note

Both plans pass. Binding the tracker to each beacon is the most direct and the easiest to debug, but the tracker must find the beacons at quest start. Having beacons report to a world subsystem means any beacon placed in any level joins without wiring, at the cost of one more class and an interface for putting beacons out. A plan in which beacons hold a pointer to the tracker or the HUD fails the first rubric line: the night cycle would then drag quest code along with every beacon.
