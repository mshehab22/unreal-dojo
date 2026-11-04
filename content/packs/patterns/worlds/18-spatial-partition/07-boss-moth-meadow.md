---
id: p18-boss-moth-meadow
title: "Boss: the moth meadow"
order: 7
kind: boss
difficulty: 4
patterns: [spatial-partition]
skills: [planning, spatial-partition]
terms: [uniform-grid, spawnactor, tick, tweakobjectptr, overlap-query]
prerequisites: [p18-lantern-grid, p18-moth-swarm, p18-thread-refactor, p18-spatial-partition-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A meadow of 300 lantern actors and 2,000 moths that are only structs, each filed in its own grid
  - A master that asks each question of the structure that answers it cheaply
  - Two rounds from the same seeds that play exactly alike
pieces:
  - p18-lantern-grid
  - p18-moth-swarm
---

# Spec

The meadow master runs a round at dusk. When a round starts it scatters 300 paper lanterns (`ADojoP18Lantern`, from the lantern seed 81) over a square meadow 2,000 units each way around itself and files them in a lantern grid (`FDojoP18Grid`) with 250 unit cells; then it spawns one moth swarm (`ADojoP18MothSwarm`) with 2,000 moths from the moth seed 18 over the same square. The master flies the swarm itself, once per frame, so the moths and the score move in step: each frame a moth moves by one step of that frame's time and no more.

The keeper is any actor a designer picks, or the player's pawn when none is picked. Pressing E lights the nearest unlit lantern within 150 units of the keeper on the ground plane; if two are equally near, the earlier lantern in scatter order wins; with none in range nothing happens. A lit lantern burns for 8 seconds and then goes out, and is already out when the second that ends its burn is scored; it can be lit again after that. At every whole second of the round, every moth within 250 units of at least one burning lantern is drawn, each moth counted once however many lanterns it is near, and the number drawn is added to the score. The round lasts 30 seconds: 30 whole seconds are scored, and then it is dusk. While a round runs, the label shows `SCORE 0  LIT 0  30 s` with the real score, the lanterns burning, and the whole seconds left, rounded up; at dusk it shows `DUSK  SCORE 1234` with the final score. Reference game: Flower, where thousands of petals and blades of grass answer the wind only near the player, every frame.

How rounds start: round 1 starts when play begins, and R starts the next round, only after dusk; E does nothing at dusk. Starting a round destroys every lantern and the swarm of the last round, scatters fresh ones from the same seeds, and zeroes the score, so a round played the same way scores the same. A C++ master receives keys only after `EnableInput` with the player controller.

The tests drive a C++ class named `ADojoP18Meadow` and read it through `Keeper` and `Label` (a text render component whose text is the label), `PressLight`, `RestartRound`, `IsRunning`, `GetScore`, `GetLastDrawn`, `GetScoredSeconds`, `GetElapsed`, `GetLanterns` and `GetSwarm`.

The pieces need no changes. The lantern grid finds the lanterns near the keeper, and the swarm's `FindNear` finds the moths near each burning lantern; the master asks from the side with fewer askers, a handful of burning lanterns, rather than asking 2,000 times from the moths.

Compiles against earlier quests: p18-lantern-grid (`Quests/p18-lantern-grid/DojoP18Grid.h`, `Quests/p18-lantern-grid/DojoP18Lantern.h`) and p18-moth-swarm (`Quests/p18-moth-swarm/DojoP18MothSwarm.h`).

Core numbers are fixed: 300 lanterns from seed 81, 2,000 moths from seed 18, a meadow 2,000 units each way, 250 unit lantern cells, 150 to light, 250 to draw, 8 seconds of burning, and a 30 second round.

Extensions, in order of importance:

1. Moths drawn to the light: each second, a drawn moth turns toward the nearest burning lantern, so lanterns lit close together pull a cloud between them; the swarm gains a way to set one moth's heading, and its grid follows the moths as always.
2. Threads between flames: burning lanterns within 300 of each other are joined by the thread weaver from the refactor, and a moth within 50 of a thread counts double.
3. A grid view: a debug draw of the lantern cells and the swarm cells a question visits, with the number of things measured, so a designer can see why a cell size is fast or slow.

Feel: play the fixed round and judge whether a keeper who reads the moth clouds and lights lanterns ahead of them scores clearly more than one who lights whatever is nearest; if you build the extensions, say what made a cloud worth chasing.

# Required Pieces

```yaml
- id: master
  kind: class
  label: A master that runs the round, owns the lanterns, the lantern grid, and the swarm, and keeps the score
  why: One owner of the round; neither the lanterns nor the swarm know the meadow exists.
- id: lanterns
  kind: data
  label: 300 lanterns scattered from seed 81 and filed in a lantern grid with 250 unit cells
  why: The keeper's question, which lantern is near me, is answered from the cells near the keeper.
- id: swarm
  kind: data
  label: One swarm of 2,000 moths from seed 18, flown by the master once per frame
  why: The moths are structs the physics scene never sees; only the swarm's grid can find them.
- id: light
  kind: step
  label: E lights the nearest unlit lantern within 150, the earlier on a tie, and a lantern burns 8 seconds
  why: The player's one verb, answered by the lantern grid instead of a loop over 300 actors.
- id: draw
  kind: step
  label: Each whole second, the moths within 250 of any burning lantern are counted once each and added to the score
  why: Asking from the few burning lanterns into the swarm's grid keeps a second's scoring to a handful of questions.
- id: round
  kind: step
  label: 30 scored seconds and then dusk; R starts a fresh round from the same seeds only after dusk
  why: A second round must play exactly like the first.
- id: label
  kind: step
  label: The label shows the score, the lanterns burning, and the seconds left, then DUSK and the score
  why: The player reads the round from it, and the tests read it too.
```

# Reference Plans

```yaml
- id: cpp-master
  title: A C++ meadow master asks both grids
  pieces:
    - { id: master, kind: class, label: "ADojoP18Meadow with a text label, the keeper, the seeds and counts, and numbers for the ranges, the burn, and the round in Details; it ticks", covers: [master] }
    - { id: lanterns, kind: data, label: "StartRound spawns 300 ADojoP18Lantern actors at spots drawn from an FRandomStream with seed 81, keeps them in a UPROPERTY array, and Adds each to an FDojoP18Grid of 250", covers: [lanterns] }
    - { id: swarm, kind: data, label: "SpawnActorDeferred of ADojoP18MothSwarm with Count, Seed, and HalfSize set before FinishSpawning, then SetActorTickEnabled false so the master's Tick calls Step", covers: [swarm] }
    - { id: light, kind: step, label: "PressLight asks the lantern grid's FindNear around the keeper with 150, keeps the nearest unlit lantern, earlier index on a tie, sets bLit, and remembers the time", covers: [light] }
    - { id: burn, kind: step, label: "Tick puts out every lantern lit 8 or more seconds ago before it scores", covers: [light] }
    - { id: draw, kind: step, label: "ScoreSecond calls the swarm's FindNear around each burning lantern with 250 and marks moths in a bool array so each is counted once", covers: [draw] }
    - { id: round, kind: step, label: "Tick scores each whole second until 30, then stops; RestartRound calls StartRound only at dusk, which destroys the old lanterns and swarm and rebuilds from the seeds", covers: [round, label] }
  edges:
    - { from: lanterns, to: light, label: "the cells near the keeper" }
    - { from: swarm, to: draw, label: "the cells near each flame" }
    - { from: light, to: draw, label: "which lanterns burn" }
    - { from: burn, to: draw, label: "a burnt lantern draws nothing" }
    - { from: draw, to: round, label: "the score" }
    - { from: master, to: round, label: "start and dusk" }
- id: blueprint-master
  title: A Blueprint meadow master drives the pieces through their Blueprint API
  pieces:
    - { id: master, kind: class, label: "BP_MothMeadow actor with a Text Render component and variables for the keeper, the seeds, the ranges, the burn, the round length, Elapsed, and a Running flag", covers: [master] }
    - { id: lanterns, kind: data, label: "A For Loop of 300 spawns Dojo P18 Lantern actors at spots from Random Float in Range from Stream, kept in an array, and a spawned Dojo P18 Lantern Keeper with Cell Size 250 that Registers each", covers: [lanterns] }
    - { id: swarm, kind: data, label: "Spawn Actor from Class of Dojo P18 Moth Swarm with its Count, Seed, and Half Size pins, which the swarm exposes on spawn, then Set Actor Tick Enabled false and call Step from the master's Event Tick", covers: [swarm] }
    - { id: light, kind: step, label: "The E event calls Find Lanterns Near on the lantern keeper with the keeper's location and 150, keeps the nearest unlit one, and stores the time in a parallel float array", covers: [light] }
    - { id: burn, kind: step, label: "Event Tick puts out every lantern whose stored time is 8 or more seconds old, before the second is scored", covers: [light] }
    - { id: draw, kind: step, label: "Each whole second a For Each over burning lanterns calls Find Near on the swarm and adds the indices to an integer Set, whose length is the moths drawn", covers: [draw] }
    - { id: round, kind: step, label: "Event Tick adds Delta Seconds to Elapsed, scores at each whole second, and at 30 clears Running; the R event behind a Branch on Running destroys and rebuilds", covers: [round, label] }
  edges:
    - { from: lanterns, to: light, label: "the lanterns near the keeper" }
    - { from: swarm, to: draw, label: "the moths near each flame" }
    - { from: light, to: draw, label: "which lanterns burn" }
    - { from: burn, to: draw, label: "a burnt lantern draws nothing" }
    - { from: draw, to: round, label: "the score" }
    - { from: master, to: round, label: "start and dusk" }
```

# Integration Rubric

- The lantern and swarm pieces are reused unchanged; the master scatters, files, flies, and scores, and neither piece knows the meadow exists.
- Every round scatters 300 lanterns from seed 81 into a lantern grid of 250 unit cells, and 2,000 moths from seed 18, in the same square meadow.
- E lights only the nearest unlit lantern within 150 of the keeper on the ground plane, the earlier lantern on a tie, and nothing with none in range or at dusk.
- A lantern burns for 8 seconds, then goes out, and can be lit again.
- Each whole second, every moth within 250 of a burning lantern is counted once, however many lanterns it is near, and the count is added to the score.
- The lantern grid answers the keeper's question and the swarm's grid answers each flame's question; no step measures every moth against every lantern.
- Round 1 starts with play, dusk comes after 30 scored seconds, R starts later rounds only at dusk, and a round start rebuilds from the same seeds, so round 2 plays like round 1.
- The submission says which side each question is asked from and why, and, if an extension is built, what made a cloud worth chasing.
