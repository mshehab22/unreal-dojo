---
id: p22-boss-gauntlet
title: "Boss: the training gauntlet"
order: 7
kind: boss
difficulty: 4
patterns: [facade]
skills: [planning, facade]
terms: [world-subsystem, save-game-to-memory, subsystem-dependency, gameplay-statics]
prerequisites: [p22-hit-feedback, p22-checkpoint-desk, p22-feedback-refactor, p22-facade-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A gauntlet of gates, dummies, and a pit that plays every hit through one facade and saves every gate through another
  - A master that never touches the sound desk, the spark pool, the HUD ticker, or a save object
  - Two rounds that sound, spark, and end exactly alike
pieces:
  - p22-hit-feedback
  - p22-checkpoint-desk
---

# Spec

The gauntlet master runs a run through three gates. The runner starts at the origin with 100 health. Gate 1 stands at X 1000, gate 2 at X 2000, and gate 3 at X 3000. Each gate is held by three training dummies, 300 in front of it, at Y -200, 0, and 200, each with 60 health. Only the dummies of the gate ahead can be struck; the ones behind a closed gate cannot be reached.

The runner is any actor a designer picks, or the player's pawn when none is picked. Pressing E strikes the nearest standing dummy of the gate ahead within 200 of the runner on the ground plane, the earlier dummy on a tie, for 25 damage, and plays it as a 25 damage hit through the hit feedback facade; the strike that breaks a dummy plays as a 60 damage hit, which is heavy. A strike with no dummy in reach plays a miss at the runner. When the last of a gate's three dummies breaks, the gate opens and the checkpoint desk saves a checkpoint named `Gate1`, `Gate2`, or `Gate3` at the gate, with the runner's health. The pit, a call the level makes when the runner falls, takes 30 health, never below 0, and puts the runner back at the newest checkpoint, or at the start before the first gate opens, without restoring the health the checkpoint saved; at 0 health the runner is down. Reference game: Hades, whose training room is the model for the dummies.

The round ends when gate 3 opens (`CLEAR 23.4 s`, the time to one decimal), after 60 seconds (`TIME UP`), or when the runner is down (`DOWN`). While it runs, the label shows `GATE 1/3  HEALTH 100  60 s` with the gate ahead, the health, and the whole seconds left, rounded up. Round 1 starts when play begins; R starts the next round only after one has ended, and starting a round stands every dummy up, restores 100 health, puts the runner at the start, and clears the checkpoint desk. E and the pit do nothing between rounds. A C++ master receives keys only after `EnableInput` with the player controller. In the tests there may be no player controller at all, and `EnableInput` with nothing leaves the input component empty, so check that a controller exists before binding keys.

The master is `ADojoP22Gauntlet` and its public surface is what the tests read and call: a `Label` text render component, a `Runner` property, `PressStrike`, `RunnerFell` and `RestartRound`, and `IsRunning`, `GetHealth`, `GetGatesOpen`, `GetElapsed`, `GetDummySpot(Index)` and `GetDummyHealth(Index)`, where `Index` counts the nine dummies gate by gate. The label's text is exactly as written above, including `CLEAR 23.4 s`, `TIME UP` and `DOWN`.

The master never includes or calls the sound desk, the spark pool, the HUD ticker, or a save object: every hit and miss is one call on `UDojoP22HitFeedback`, and every checkpoint one call on `UDojoP22CheckpointDesk`. The pieces need no changes.

Compiles against earlier quests: p22-hit-feedback (`Quests/p22-hit-feedback/DojoP22HitFeedback.h`) and p22-checkpoint-desk (`Quests/p22-checkpoint-desk/DojoP22CheckpointDesk.h`).

Core numbers are fixed: three gates 1000 apart, three dummies per gate 300 in front of it and 200 apart, 60 health per dummy, 25 per strike, 200 to reach, 100 health for the runner, 30 per fall, and a 60 second round.

Extensions, in order of importance:

1. A best time board: the three best clear times, kept by a third small front over saving that writes them to a slot on disk, so they survive closing the game.
2. Weapon kinds: a light and a heavy strike from two keys, with different damage and reach, both still one call on the feedback facade.
3. A camera shake on heavy hits added inside the feedback facade, so every heavy hit in the game shakes with no change to the master.

Feel: judge the fixed numbers, not the extensions: a runner who learns to break each dummy with the fewest strikes should clear the gauntlet with time to spare, and a runner who falls twice should still make it. Say in your submission whether they do.

# Required Pieces

```yaml
- id: master
  kind: class
  label: A master that runs the round, owns the gates, the dummies, and the runner's health, and shows the label
  why: One owner of the run; neither facade knows the gauntlet exists.
- id: dummies
  kind: data
  label: Nine dummies, three per gate at fixed spots, each with 60 health
  why: The run's state lives with the master, not in the feedback or checkpoint fronts.
- id: strike
  kind: step
  label: E strikes the nearest standing dummy of the gate ahead within 200, the earlier on a tie, or plays a miss
  why: The player's one verb, and every hit or miss is one call on the feedback facade.
- id: gates
  kind: step
  label: Breaking a gate's last dummy opens it and saves a checkpoint there with the runner's health
  why: One call on the checkpoint desk per gate; the master never sees a save object.
- id: pit
  kind: step
  label: The pit takes 30 health and loads the newest checkpoint, or the start before any; at 0 the runner is down
  why: The desk's LoadLatest is the whole of loading for the master.
- id: round
  kind: step
  label: CLEAR at gate 3, TIME UP at 60 seconds, DOWN at 0 health; R starts a clean round only after one ends
  why: A second round must play exactly like the first.
- id: fronts
  kind: step
  label: The master calls only the two facades for feedback and checkpoints, never the systems behind them
  why: The point of the world; a new kind of hit or save changes a facade, not the master.
```

# Reference Plans

```yaml
- id: cpp-master
  title: A C++ gauntlet master calls the two facades
  pieces:
    - { id: master, kind: class, label: "ADojoP22Gauntlet with a text label and the runner in Details, the fixed numbers in a namespace of rules, and ticking on for the clock", covers: [master] }
    - { id: dummies, kind: data, label: "A TArray<int32> of nine healths and GetDummySpot(Index) working out each dummy's spot from its gate and place", covers: [dummies] }
    - { id: strike, kind: step, label: "PressStrike looks at the gate ahead's three dummies, keeps the nearest standing one strictly nearer within 200, and calls PlayHitFeedback with 25 or 60, or PlayMissFeedback at the runner", covers: [strike, fronts] }
    - { id: gates, kind: step, label: "When the gate ahead's dummies are all at 0 or less, OpenGate counts it and calls SaveCheckpoint with GateN, the gate's spot, and the health", covers: [gates, fronts] }
    - { id: pit, kind: step, label: "RunnerFell takes 30, ends the round as DOWN at 0, and otherwise calls LoadLatest, keeping the start when it returns false", covers: [pit, fronts] }
    - { id: round, kind: step, label: "Tick adds DeltaSeconds and ends the round as TIME UP at 60; the third gate ends it as CLEAR; RestartRound calls StartRound only between rounds, which also calls ClearCheckpoints", covers: [round] }
  edges:
    - { from: dummies, to: strike, label: "the dummies E chooses from" }
    - { from: strike, to: gates, label: "the last dummy of a gate" }
    - { from: gates, to: pit, label: "the checkpoint the pit loads" }
    - { from: gates, to: round, label: "gate 3 ends the run" }
    - { from: master, to: round, label: "start and end" }
- id: blueprint-master
  title: A Blueprint gauntlet master calls the two facades
  pieces:
    - { id: master, kind: class, label: "BP_Gauntlet actor with a Text Render component and variables for the runner, Health, Gates Open, Elapsed, and a Running flag", covers: [master] }
    - { id: dummies, kind: data, label: "An integer array of nine healths and a pure function that makes a dummy's spot from its index", covers: [dummies] }
    - { id: strike, kind: step, label: "The E event loops over the gate ahead's three dummies, keeps the nearest standing one in reach, and calls Play Hit Feedback or Play Miss Feedback on the Dojo P22 Hit Feedback subsystem", covers: [strike, fronts] }
    - { id: gates, kind: step, label: "A branch after each strike checks the gate's three healths and calls Save Checkpoint on the Dojo P22 Checkpoint Desk subsystem", covers: [gates, fronts] }
    - { id: pit, kind: step, label: "A Runner Fell custom event subtracts 30, never below 0, shows DOWN at 0, and otherwise calls Load Latest and sets the runner's location from it", covers: [pit, fronts] }
    - { id: round, kind: step, label: "Event Tick adds Delta Seconds and shows TIME UP at 60; opening the third gate shows CLEAR with the time; the R event behind a Branch on Running resets the healths, the runner, and calls Clear Checkpoints", covers: [round] }
  edges:
    - { from: dummies, to: strike, label: "the dummies E chooses from" }
    - { from: strike, to: gates, label: "the last dummy of a gate" }
    - { from: gates, to: pit, label: "the checkpoint the pit loads" }
    - { from: gates, to: round, label: "gate 3 ends the run" }
    - { from: master, to: round, label: "start and end" }
```

# Integration Rubric

- The hit feedback and checkpoint desk pieces are reused unchanged, the master never includes or calls the sound desk, the spark pool, the HUD ticker, or a save object, and neither facade knows the gauntlet exists.
- Three gates at X 1000, 2000, and 3000 are each held by three dummies 300 in front at Y -200, 0, and 200 with 60 health, and only the gate ahead's dummies can be struck.
- E strikes the nearest standing dummy of the gate ahead within 200, the earlier on a tie, for 25, played as a 25 damage hit, or as a 60 damage heavy hit when it breaks the dummy; with none in reach it plays a miss at the runner.
- Breaking a gate's last dummy opens the gate and saves a checkpoint named for it at the gate with the runner's health.
- The pit takes 30 health and puts the runner at the newest checkpoint, or the start before any; at 0 health the round ends as DOWN.
- Opening gate 3 ends the round as CLEAR with the time to one decimal, 60 seconds ends it as TIME UP, and the label shows the gate ahead, the health, and the seconds left while it runs.
- Round 1 starts with play, R starts later rounds only after one ends, and a round start stands the dummies up, restores the health and the runner's spot, and clears the checkpoints, so round 2 plays like round 1.
- The submission says what each facade hides from the master and why neither grew a call for the gauntlet alone, and says what in the fixed numbers made the run feel fair or not.
