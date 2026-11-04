---
id: m4-boss-fuse-yard
title: "Boss: the fuse yard"
order: 10
kind: boss
difficulty: 5
patterns: []
skills: [planning, spawning, time, delegates]
terms: [spawn-collision-handling, spawn-actor-deferred, on-destroyed, timer-manager, frandomstream, overlap-event]
prerequisites: [m4-yard-plan, m4-scatter, m4-fuse, m4-chain, m4-keeper, m3-checkpoint, m3-scale-plate, m2-bumper]
xp: 300
estimatedMinutes: 75
concepts:
  - A yard laid out by a seeded scatter around obstacles, so every round is the same puzzle
  - A round that ends when the last fuse is out, judged on the next timer update after the last blast
pieces:
  - m4-scatter
  - m4-fuse
  - m4-chain
---

# Spec

The fuse yard lies along the level's X axis, with the yard actor at the origin. The runner, World 3's `ADojoM3Runner` set on the yard in Details, starts each round at the origin. Each round the yard lays out, fresh:

- A plate, World 3's `ADojoM3Plate`, at X 200, needing 1 thing.
- Two pillars, World 2's `ADojoM2Wall` at their default size, at X 900 and X 1500.
- A field of bombs: a scatter centered at X 1200 over an area 1600 long and 1000 wide, spawning `ADojoM4Bomb` with seed 5 and 14 tries, so no bomb stands inside a pillar or another bomb.
- A chain with a reach of 350 and a spark of 0.4 seconds, watching every bomb in the field.

The bombs start unlit and the board reads `ARMED 13 bombs` with the real number laid out. When the runner steps on the plate, and only the yard's runner, the bomb nearest the plate is lit with a 1 second fuse, the board reads `BURNING 0 blown`, and the chain does the rest; the board counts each blast as it happens. A step on the plate while the yard burns, or after it is over, does nothing. When a blast leaves no bomb burning, the round is over and the board reads `CHAIN 9 of 13` with the real numbers. The yard judges that on the next timer update after the blast, with `SetTimerForNextTick`, because the chain's sparks are lit by another listener of the same blast and the order of listeners is not promised.

R (`PressRestart`) lays out a fresh yard, but only after the round is over; before that R does nothing. A fresh yard destroys every bomb, pillar, plate, scatter, and chain and lays them out again with the same seed, and puts the runner back at the origin, so the second round is the same puzzle and burns the same way. A C++ yard receives keys only after `EnableInput` with the player controller.

The scatter, the bomb, and the chain are reused unchanged; so are the runner, the plate, and the wall from earlier worlds. The yard listens to the plate's zone with its own handler beside the plate's, and to each bomb's `OnDestroyed` beside the chain.

Reference game: Bomberman, where one blast sets off the next and the layout decides how far it goes.

Compiles against earlier quests: m4-scatter (`Quests/m4-scatter/DojoM4Scatter.h`), m4-fuse (`Quests/m4-fuse/DojoM4Bomb.h`), m4-chain (`Quests/m4-chain/DojoM4Chain.h`), m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`), m3-scale-plate (`Quests/m3-scale-plate/DojoM3Plate.h`), and m2-bumper (`Quests/m2-bumper/DojoM2Wall.h`).

Core numbers are fixed: seed 5, 14 tries, a reach of 350, a spark of 0.4 seconds, a first fuse of 1 second, the plate at 200, the pillars at 900 and 1500, and the field centered at 1200.

Extensions, in order of importance:

1. A best chain: each round may also use a different seed, chosen by a key, and the board keeps the best fraction blown across seeds.
2. The keeper from this world as a refill line: a keeper at the yard's edge keeps three bombs at the field's border, so a late chain can reach new fuel.
3. A blast that pushes the runner: a runner within the reach of a blast is sent back to its respawn point, so stepping on the plate and running is part of the round.

Feel: once the core round passes, change the reach and the spark on the yard you placed in your level, in Details, leaving the class defaults as the spec fixes them, until a good chain feels like dominoes, fast enough to be exciting and slow enough to follow with your eyes.

# Required Pieces

```yaml
- id: layout
  kind: class
  label: A yard that lays out the plate, the pillars, the scattered bombs, and the chain at fixed spots each round
  why: The one place that knows the layout and rebuilds it.
- id: seed
  kind: data
  label: A fixed seed for the scatter
  why: The same seed is the same puzzle, so a second round can be compared with the first.
- id: trigger
  kind: event
  label: The runner's step on the plate lights the bomb nearest the plate, once per round
  why: The round's only input.
- id: spread
  kind: event
  label: The chain lights watched bombs in reach when a watched bomb leaves play
  why: The mechanic itself, already built as a piece.
- id: end
  kind: step
  label: A check on the next timer update after each blast that ends the round when no bomb is burning
  why: Every listener of the blast must have run before the yard decides it is over.
- id: restart
  kind: step
  label: R lays out a fresh yard only after the round is over
  why: A second round must play exactly like the first.
- id: board
  kind: event
  label: The board changes at the start, at the first spark, at each blast, and at the end
  why: The player's view of the chain, with no polling.
```

# Reference Plans

```yaml
- id: cpp-yard
  title: A C++ yard actor lays out the pieces and listens to them
  pieces:
    - { id: yard, kind: class, label: ADojoM4FuseYard with the runner set in Details and a board as a component, covers: [layout] }
    - { id: seed, kind: data, label: Seed and BombCount are properties the yard copies onto a scatter it spawns deferred, covers: [seed] }
    - { id: trigger, kind: event, label: A second handler on the plate's Zone lights the nearest bomb when OtherActor is the runner and the yard is armed, covers: [trigger] }
    - { id: spread, kind: event, label: The yard calls Watch on the chain for every bomb the scatter spawned, covers: [spread] }
    - { id: end, kind: step, label: The yard's own OnDestroyed handler counts the blast and sets a timer for next tick that ends the round when no bomb IsLit, covers: [end] }
    - { id: restart, kind: step, label: PressRestart returns false until the round is over and then destroys the chain first and every bomb after unbinding and lays the yard out again, covers: [restart] }
    - { id: board, kind: event, label: RefreshBoard runs from StartRound and the plate and blast handlers and the end check only, covers: [board] }
  edges:
    - { from: yard, to: seed, label: configures the scatter }
    - { from: yard, to: spread, label: Watch }
    - { from: trigger, to: spread, label: first Light }
    - { from: spread, to: end, label: blasts }
    - { from: end, to: board, label: RefreshBoard }
    - { from: restart, to: yard, label: StartRound }
- id: blueprint-yard
  title: The level Blueprint lays out the pieces and listens to them
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the runner and the plate and the chain and an array of bombs and Burning and Over Booleans, covers: [layout] }
    - { id: seed, kind: data, label: The build graph spawns the scatter with Spawn Actor From Class and sets its Seed and Count before calling Scatter, covers: [seed] }
    - { id: trigger, kind: event, label: A bound event on the plate's Zone On Component Begin Overlap checks Other Actor against the runner and Burning and lights the nearest bomb, covers: [trigger] }
    - { id: spread, kind: event, label: A For Each Loop over the scatter's spawned actors casts each to the bomb and calls Watch on the chain, covers: [spread] }
    - { id: end, kind: step, label: A bound event on each bomb's On Destroyed adds to a counter and calls Set Timer for Next Tick by Event whose event ends the round when no bomb Is Lit, covers: [end] }
    - { id: restart, kind: step, label: The R key behind a branch on Over destroys every spawned actor and runs the build graph again, covers: [restart] }
    - { id: board, kind: event, label: A custom event sets the Text Render text and is called from the build graph and the plate and blast events and the end check, covers: [board] }
  edges:
    - { from: level, to: seed, label: build graph }
    - { from: level, to: spread, label: build graph }
    - { from: trigger, to: spread, label: first Light }
    - { from: end, to: board, label: custom event }
    - { from: restart, to: level, label: build graph }
```

# Integration Rubric

- The scatter, bomb, and chain are reused without changes, and so are the runner, plate, and wall from earlier worlds.
- The pieces hold no pointer to the yard; the yard spawns them, configures the scatter before it begins play, and binds the events it needs.
- The bombs come from a seeded scatter that refuses blocked spots, so none stands inside a pillar and the same seed lays out the same yard.
- Only the yard's runner sets the yard off, once per round, by lighting the bomb nearest the plate.
- The chain spreads the blast, and the yard ends the round on the next timer update after a blast that leaves no bomb burning, never in the middle of a chain.
- R does nothing until the round is over; a fresh yard destroys and lays out every piece again, so the second round burns exactly like the first.
- The board changes only at the start, at the first spark, at each blast, and at the end, with the real counts.
- Nothing ticks; the seed, the number of tries, the reach, the spark, and the first fuse are properties a designer can tune; every timer is cleared in `EndPlay` or when the yard is cleared; the submission gives the reach and spark it tuned in Details with one sentence on why.
