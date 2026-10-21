---
id: f2-boss-clay-range
title: "Boss: the clay range"
order: 12
kind: boss
difficulty: 4
patterns: [object-pool]
skills: [planning, memory, spawning]
terms: [tsubclassof, spawnactor, destroy, isvalid, tweakobjectptr, endplay, tobjectptr]
prerequisites: [f2-dummy-spawner, f2-clay-disc, f2-spotter, f2-target-rack, f2-clay-thrower, f1-popup-target, f1-training-dummy]
xp: 320
estimatedMinutes: 75
concepts:
  - Every actor in a round has one creator, one owner, and one remover
  - Strong, weak, and pooled references working side by side
pieces:
  - f2-dummy-spawner
  - f2-clay-disc
  - f2-spotter
  - f2-target-rack
---

# Spec

The yard opens a clay range. A round is 10 discs, thrown one every 2 seconds from a trap house. Each disc is a clay disc from this world that stays in play for 3 seconds and then falls. The spotter always watches the newest disc still in play. Pressing Space shatters the disc the spotter is watching, for 10 points; Space with nothing watched does nothing. A disc that falls spawns a penalty dummy from the dummy spawner, and no new disc is thrown while any penalty dummy is still standing; pressing F strikes the oldest standing penalty dummy, and it goes down after 3 strikes as before. Every third shattered disc in a row earns a bonus: the target rack (3 targets) lends out one target for 4 seconds, raised; T hits it, a hit that does not break it drops it and the range raises it again at once, and breaking it (2 hits) scores 25; when the 4 seconds end it is recalled whether broken or not. A fallen disc breaks the streak. The round ends once the tenth disc has shattered or fallen and any lent bonus target has had its 4 seconds. Then the range stops throwing, removes every penalty dummy, recalls the lent target, stops the spotter watching, and shows the score on its label.

How rounds start: round 1 starts when play begins, and R starts the next round, only while no round is running; Space, F, and T only act during a round. A C++ range receives keys only after `EnableInput` with the player controller.

How the range knows what happened to a disc: Space goes through the range, which records the hit and then calls Shatter, so nothing ever reads a disc that has left play. A tracked disc that turns invalid without a recorded hit fell. Do not read anything from a destroyed disc: in UE 5.8 the next garbage collection sets every reflected reference to it to null. Reference game: the clay shooting mode of Duck Hunt, where a pair of discs and a short window are the whole challenge.

The most a round can score is 175: 10 shattered discs at 10, plus 3 bonus targets at 25.

The point of the boss is ownership. Discs remove themselves; the range only watches them. Penalty dummies are made by the spawner and removed by the range at the end of the round. Bonus targets are never spawned or destroyed during play; the rack lends and recalls them. The pieces need one addition, and their rules stay as they are: the dummy spawner gains `DestroyAll`, which destroys every dummy it made and starts its line again. The range keeps its own list of the penalty dummies it asked for, oldest first, to find the oldest standing one.

Compiles against earlier quests: f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`), f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`), f2-clay-disc (`Quests/f2-clay-disc/DojoF2ClayDisc.h`), f2-dummy-spawner (`Quests/f2-dummy-spawner/DojoF2DummySpawner.h`), f2-spotter (`Quests/f2-spotter/DojoF2Spotter.h`), and f2-target-rack (`Quests/f2-target-rack/DojoF2TargetRack.h`).

Core numbers are fixed: 10 discs, a throw every 2 seconds, 3 seconds in play, 10 points a disc, 3 strikes per penalty dummy, a bonus after every 3 shattered in a row, 3 targets in the rack, 4 seconds per bonus target, 2 hits and 25 points per bonus target.

Extensions, in order of importance:

1. Doubles: every fifth throw launches two discs at once, and the spotter watches the one that will fall first.
2. A hard mode whose penalty dummy class is a sturdier Blueprint child, picked through the spawner's class property.
3. A shard effect that only loads the first time a disc shatters, through a soft reference.

Feel: tune the throw interval until a fallen disc feels like a stumble you can recover from, not the start of a pile of penalty dummies that ends the round.

# Required Pieces

```yaml
- id: range-driver
  kind: class
  label: The range that runs the round clock and throws discs
  why: One owner decides when a throw happens, counts the throws, and ends the round.
- id: disc-tracking
  kind: step
  label: Know which discs are in play, record each hit when it happens, and treat a disc that vanished without a hit as fallen
  why: The newest disc must be watched, a fallen disc must trigger a penalty, and a destroyed disc cannot be asked how it ended.
- id: spotter-feed
  kind: step
  label: Point the spotter at the newest disc still in play
  why: Space acts on what the spotter watches, so the spotter must never point at a disc that is gone.
- id: player-input
  kind: step
  label: Space shatters the watched disc, F strikes the oldest penalty dummy, T hits the bonus target, all only during a round, and R starts the next round between rounds
  why: The player's verbs, each calling one piece's own function, and the way round 2 begins.
- id: penalty
  kind: step
  label: A fallen disc spawns a penalty dummy and throws pause while any stand
  why: The cost of a miss, and the reason the spawner is in the round.
- id: bonus
  kind: step
  label: Every third shattered disc in a row lends a raised target for 4 seconds, raising it again after a hit that did not break it, then recalls it
  why: The reward, and the reason the rack is in the round.
- id: round-end
  kind: step
  label: Once the tenth disc and any bonus are done, stop throwing, remove penalty dummies, recall the target, and show the score; reset the score and counts when the next round starts
  why: A second round must start clean, and every actor made during the round must have been removed by its owner.
- id: tunables
  kind: data
  label: Disc count, throw interval, points, bonus streak, and bonus time as editable values
  why: The feel criterion is met by tuning, not by rebuilding.
```

# Reference Plans

```yaml
- id: cpp-range
  title: A C++ range actor owns the round
  pieces:
    - { id: range, kind: class, label: ADojoF2ClayRange with StartRound called from BeginPlay and EndRound and a bRoundRunning flag and references to the spotter and a spawner and a rack set in Details, covers: [range-driver, tunables] }
    - { id: discs, kind: step, label: A UPROPERTY array of discs in play from which a shot disc is removed before Shatter and a 0.1 second timer treats any entry that is no longer valid as fallen, covers: [disc-tracking] }
    - { id: feed, kind: step, label: After every throw and every check the range calls Watch on the spotter with the newest disc still valid, covers: [spotter-feed] }
    - { id: keys, kind: step, label: Range calls EnableInput in BeginPlay and binds Space to ShootSpotted and F to StrikePenalty and T to HitBonus which act only while bRoundRunning and R to RestartRound which acts only between rounds, covers: [player-input] }
    - { id: penalty, kind: step, label: A Fell fate calls SpawnDummy and the throw step skips while any spawned dummy is not knocked down, covers: [penalty] }
    - { id: bonus, kind: step, label: A streak counter reset by every fallen disc calls Deploy on the rack and HitBonus raises the target again after a hit that did not break it and a 4 second timer calls Recall, covers: [bonus] }
    - { id: end, kind: step, label: The check step calls EndRound once ten discs are thrown and none are in play and no bonus is lent and EndRound clears the timers and calls DestroyAll and Recall and Watch with nullptr and shows the score while StartRound zeroes the score and counts, covers: [round-end] }
  edges:
    - { from: range, to: discs, label: spawns and tracks each disc }
    - { from: discs, to: feed, label: newest valid disc }
    - { from: discs, to: penalty, label: a fallen disc }
    - { from: discs, to: bonus, label: a third shatter in a row }
    - { from: keys, to: feed, label: Space acts on the watched disc }
    - { from: range, to: end, label: after the tenth disc }
- id: blueprint-range
  title: The level Blueprint drives the round through the four C++ pieces
  pieces:
    - { id: level, kind: class, label: Level Blueprint with Start Round called from Event BeginPlay and a Round Running variable and a throw timer and variables for every number, covers: [range-driver, tunables] }
    - { id: discs, kind: step, label: A Blueprint array of discs in play from which the Space event removes the disc before calling Shatter and a 0.1 second timer treats every entry that fails IsValid as fallen, covers: [disc-tracking] }
    - { id: feed, kind: step, label: The last valid entry of that array is passed to the spotter's Watch after every change, covers: [spotter-feed] }
    - { id: keys, kind: step, label: Keyboard events Space and F and T behind a branch on Round Running call Shatter and Strike and Hit and the R event calls Start Round behind a branch on Round Running being false, covers: [player-input] }
    - { id: penalty, kind: step, label: A Fell fate calls SpawnDummy and a branch on the throw timer waits while any dummy stands, covers: [penalty] }
    - { id: bonus, kind: step, label: A streak variable reset by every fallen disc calls Deploy and a T hit that does not break the target calls Raise again and a 4 second Set Timer by Event calls Recall on that target, covers: [bonus] }
    - { id: end, kind: step, label: When ten discs are thrown and none are in play and no bonus is lent the Blueprint clears its timers and calls DestroyAll and Recall and shows the score and Start Round zeroes the score and counts, covers: [round-end] }
  edges:
    - { from: level, to: discs, label: spawns a disc per throw }
    - { from: discs, to: feed, label: newest valid disc }
    - { from: discs, to: penalty, label: a fallen disc }
    - { from: discs, to: bonus, label: a third shatter in a row }
    - { from: keys, to: feed, label: Space acts on the watched disc }
    - { from: level, to: end, label: after the tenth disc }
```

# Integration Rubric

- Each kind of actor has one creator and one remover: discs remove themselves, penalty dummies are removed by the spawner at round end, and bonus targets are only lent and recalled.
- The spotter is the only thing Space acts through, and it never points at a disc that is gone.
- References match ownership: the range or Blueprint tracks discs in play and checks each with IsValid, records hits as they happen instead of reading destroyed discs, and the spotter holds its disc weakly.
- The pieces are reused; the only addition is DestroyAll on the spawner, with no rewrite of their rules.
- Every fixed number is an editable property or instance editable variable with the given default.
- No actor is spawned or destroyed in Tick, and nothing ticks to poll; the round runs on timers or delays and on input.
- Round 1 starts with play and R starts later rounds only between rounds; after a round the level holds no penalty dummies and no visible targets, keys do nothing, and a second round plays the same as the first.
- The tuned throw interval is written in the submission with one sentence on why it felt fair.
