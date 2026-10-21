---
id: f2-boss-clay-range
title: "Boss: the clay range"
order: 12
kind: boss
difficulty: 4
patterns: [object-pool]
skills: [planning, memory, spawning]
terms: [tsubclassof, spawnactor, destroy, isvalid, tweakobjectptr, endplay, tobjectptr]
prerequisites: [f2-dummy-spawner, f2-clay-disc, f2-spotter, f2-target-rack, f2-clay-thrower]
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

The yard opens a clay range. A round is 10 discs, thrown one every 2 seconds from a trap house. Each disc is a clay disc from this world that stays in play for 3 seconds and then falls. The spotter always watches the newest disc still in play. Pressing Space shatters the disc the spotter is watching, for 10 points; Space with nothing watched does nothing. A disc that falls spawns a penalty dummy from the dummy spawner, and no new disc is thrown while any penalty dummy is still standing; pressing F strikes the oldest standing penalty dummy, and it goes down after 3 strikes as before. Every third shattered disc in a row earns a bonus: the target rack (3 targets) lends out one target for 4 seconds, T hits it, and breaking it (2 hits) scores 25; when the 4 seconds end it is recalled whether broken or not. The round ends after the tenth disc has shattered or fallen. Then the range removes every penalty dummy, recalls every lent target, and shows the score. Reference game: the clay shooting mode of Duck Hunt, where a pair of discs and a short window are the whole challenge.

The most a round can score is 175: 10 shattered discs at 10, plus 3 bonus targets at 25.

The point of the boss is ownership. Discs remove themselves; the range only watches them. Penalty dummies are made by the spawner and removed by the range at the end of the round. Bonus targets are never spawned or destroyed during play; the rack lends and recalls them. The four pieces need these additions, and their rules stay as they are: the dummy spawner gains a way to destroy every dummy it made (`DestroyAll`), and the range needs a way to find the oldest standing dummy (read through the spawner's list or kept by the range).

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
  label: Know which discs are in play and how each one ended
  why: The newest disc must be watched, and a fallen disc must trigger a penalty.
- id: spotter-feed
  kind: step
  label: Point the spotter at the newest disc still in play
  why: Space acts on what the spotter watches, so the spotter must never point at a disc that is gone.
- id: player-input
  kind: step
  label: Space shatters the watched disc, F strikes the oldest penalty dummy, T hits the bonus target
  why: The player's three verbs, each calling one piece's own function.
- id: penalty
  kind: step
  label: A fallen disc spawns a penalty dummy and throws pause while any stand
  why: The cost of a miss, and the reason the spawner is in the round.
- id: bonus
  kind: step
  label: Every third shattered disc in a row lends a target for 4 seconds, then recalls it
  why: The reward, and the reason the rack is in the round.
- id: round-end
  kind: step
  label: Remove penalty dummies, recall targets, and show the score
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
    - { id: range, kind: class, label: ADojoF2ClayRange with StartRound and EndRound and references to a spawner and a rack set in Details, covers: [range-driver, tunables] }
    - { id: discs, kind: step, label: A UPROPERTY array of thrown discs checked on a short timer and each ended disc's GetFate read before it is dropped, covers: [disc-tracking] }
    - { id: feed, kind: step, label: After every throw and every check the range calls Watch on the spotter with the newest disc still valid, covers: [spotter-feed] }
    - { id: keys, kind: step, label: Range binds Space to Shatter on the spotter's GetTarget and F and T to Strike and Hit, covers: [player-input] }
    - { id: penalty, kind: step, label: A Fell fate calls SpawnDummy and the throw step skips while any spawned dummy is not knocked down, covers: [penalty] }
    - { id: bonus, kind: step, label: A streak counter calls Deploy on the rack and a 4 second timer calls Recall, covers: [bonus] }
    - { id: end, kind: step, label: EndRound calls DestroyAll on the spawner and Recall on every lent target and shows the score, covers: [round-end] }
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
    - { id: level, kind: class, label: Level Blueprint with a throw timer and variables for every number, covers: [range-driver, tunables] }
    - { id: discs, kind: step, label: A Blueprint array of disc references filtered with IsValid on each throw and each disc's fate read before removal, covers: [disc-tracking] }
    - { id: feed, kind: step, label: The last valid entry of that array is passed to the spotter's Watch after every change, covers: [spotter-feed] }
    - { id: keys, kind: step, label: Keyboard events Space and F and T in the level Blueprint call Shatter and Strike and Hit, covers: [player-input] }
    - { id: penalty, kind: step, label: A Fell fate calls SpawnDummy and a branch on the throw timer waits while any dummy stands, covers: [penalty] }
    - { id: bonus, kind: step, label: A streak variable calls Deploy and a Delay of 4 seconds calls Recall on that target, covers: [bonus] }
    - { id: end, kind: step, label: Round end calls DestroyAll and Recall and prints the score, covers: [round-end] }
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
- References match ownership: the range or Blueprint holds discs strongly only as long as it needs their fate, and the spotter holds its disc weakly.
- The pieces are reused; the only addition is DestroyAll on the spawner (and a lookup for the oldest standing dummy), with no rewrite of their rules.
- Every fixed number is an editable property or instance editable variable with the given default.
- No actor is spawned or destroyed in Tick, and nothing ticks to poll; the round runs on timers or delays and on input.
- After the round ends, the level holds no penalty dummies and no visible targets, and a second round plays the same as the first.
- The tuned throw interval is written in the submission with one sentence on why it felt fair.
