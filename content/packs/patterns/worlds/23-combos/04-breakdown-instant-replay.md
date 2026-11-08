---
id: p23-breakdown-instant-replay
title: Plan the arena's instant replay
order: 4
kind: breakdown
difficulty: 4
patterns: [command, game-loop, double-buffer]
skills: [planning, command, game-loop, double-buffer]
terms: [tick, deltatime, timer-manager, tarray, ustruct]
prerequisites: [p23-boss-arena-night, p5-command-when-not, p2-game-loop-when-not, p4-double-buffer-when-not]
xp: 100
estimatedMinutes: 25
concepts:
  - Planning a recording that replays the same way at any frame rate
  - Recording what the player asked for, not what the screen showed
  - Separating a fixed simulation clock from the frame clock
  - Keeping a screen from ever reading a half-written snapshot
---

# Spec

The arena's big screen shows an instant replay of the last 10 seconds of a duel each time a duelist is knocked out. Each duelist acts by moves: step left, step right, strike, and guard. The live duel keeps going on the floor while the replay plays on the screen.

Spectators run the game on very different machines, from 30 to 144 frames a second, and a replay must show exactly the same duel on all of them. It plays at normal speed or at half speed, and a viewer can pause it and step it forward one tick at a time.

The big screen draws what the duel looked like at a moment, as one finished picture, and must never draw a picture that is half from one moment and half from the next, even though the duel updates its duelists one after another.

The recording of 10 seconds must be small: the game keeps the last 10 seconds only, for each of 40 duelists on the floor at once, and discards older moves.

Acceptance:

- Two machines at 30 and 144 frames a second show the same duel for the same recording, every duelist in the same place at each recorded tick.
- At half speed the replay shows each recorded tick for twice as long and skips none.
- A pause stops the replay without losing its place, and one step forward moves it exactly one recorded tick.
- A picture on the screen never has one duelist at tick 40 and another at tick 41.
- Anything older than 10 seconds is gone, and recording 40 duelists for a minute grows nothing after the first 10 seconds.

# Required Pieces

```yaml
- id: moves
  kind: data
  label: A move as a small value naming the duelist, the move, and the tick it ran on
  why: A recording of moves is tiny and replays the same duel, where a recording of pictures is large and cannot be replayed.
- id: clock
  kind: step
  label: A fixed simulation clock that runs whole ticks of the same length however long a frame was
  why: The duel and its replay must advance in the same units on every machine.
- id: recorder
  kind: class
  label: A recorder that keeps the last 10 seconds of moves and drops older ones
  why: Memory must stop growing once the window is full.
- id: replay-run
  kind: step
  label: A replay that runs the recorded moves on its own copy of the duelists through the same clock, at a chosen speed
  why: Replaying through the same clock is what makes the duel come out identical.
- id: controls
  kind: step
  label: Pause, half speed, and one step forward, each changing how many ticks the replay is asked for
  why: The viewer controls the replay by changing the number of ticks it runs, not by changing the ticks.
- id: snapshot
  kind: data
  label: Two copies of the duelists' places, one being written and one being shown
  why: The screen can only show a finished picture when writing and showing are different copies.
- id: swap
  kind: step
  label: At the start of each frame the finished copy becomes the one shown and the other starts being written
  why: The moment of the swap is the only moment the two copies change roles.
- id: keyframe
  kind: data
  label: A keyframe of every duelist's place and state, kept up to date as the window slides forward
  why: The moves from before the window are gone, so a replay can only start from a stored state of the duel at the window's start.
```

# Reference Plans

```yaml
- id: actor-clock
  title: A clock in an actor's Tick, two arrays of places swapped each frame
  pieces:
    - { id: moves, kind: data, label: "A USTRUCT of duelist id, an enum for the move, and the tick number", covers: [moves] }
    - { id: clock, kind: step, label: "An actor's Tick adds the frame's delta to an accumulator and runs whole ticks of 0.05 seconds, up to a limit for a long frame", covers: [clock] }
    - { id: recorder, kind: class, label: "A ring buffer of moves sized for 200 ticks, which overwrites the oldest tick as a new one starts", covers: [recorder] }
    - { id: replay-run, kind: step, label: "A replay copy of the duelists, reset to the state at the window's start, which applies each recorded move on its tick through the same clock function", covers: [replay-run] }
    - { id: controls, kind: step, label: "A speed multiplier of 1, 0.5, or 0 added into the accumulator, and a single-step flag that runs exactly one tick", covers: [controls] }
    - { id: snapshot, kind: data, label: "Two TArrays of places; the simulation writes the back one and the screen reads the front one", covers: [snapshot] }
    - { id: swap, kind: step, label: "The first thing in each frame's Tick swaps the two arrays with Swap and clears the new back one", covers: [swap] }
    - { id: keyframe, kind: data, label: "A stored copy of every duelist's place and state; each time the ring buffer overwrites its oldest tick, that tick's moves are applied to the copy first", covers: [keyframe] }
  edges:
    - { from: moves, to: recorder, label: "what is kept" }
    - { from: recorder, to: keyframe, label: "what slides out of the window is applied to it" }
    - { from: keyframe, to: replay-run, label: "where the replay starts" }
    - { from: clock, to: replay-run, label: "drives the replay in the same ticks" }
    - { from: controls, to: clock, label: "changes how many ticks are asked for" }
    - { from: replay-run, to: snapshot, label: "writes the back copy" }
    - { from: swap, to: snapshot, label: "turns the back copy into the shown one" }
- id: timer-clock
  title: A looping timer at the tick rate, with snapshots tagged by a sequence number
  pieces:
    - { id: moves, kind: data, label: "A Blueprint struct of duelist, move, and tick number, kept in an array variable", covers: [moves] }
    - { id: clock, kind: step, label: "A looping Set Timer by Event at 0.05 seconds; the timer manager runs a missed tick again inside a long frame, so the event counts the ticks it has run in the current frame and ignores any beyond a limit", covers: [clock] }
    - { id: recorder, kind: class, label: "An array that removes every move older than 200 ticks each time a tick is recorded", covers: [recorder] }
    - { id: replay-run, kind: step, label: "The same tick event also advances the replay while one is running, applying the moves tagged with the replay tick to the replay copies", covers: [replay-run] }
    - { id: controls, kind: step, label: "Pause skips the replay's part of each tick, half speed runs it on every second tick, and a step runs it once by hand", covers: [controls] }
    - { id: snapshot, kind: data, label: "Two struct arrays of places and a sequence number written last in each; the screen shows the array whose number is the larger and finished", covers: [snapshot] }
    - { id: swap, kind: step, label: "The simulation finishes writing one array, sets its sequence number, and writes the other one next", covers: [swap] }
    - { id: keyframe, kind: data, label: "A struct array copy of every duelist's place and state; each time a move older than 200 ticks is removed, it is applied to the copy first", covers: [keyframe] }
  edges:
    - { from: moves, to: recorder, label: "what is kept" }
    - { from: recorder, to: keyframe, label: "what slides out of the window is applied to it" }
    - { from: keyframe, to: replay-run, label: "where the replay starts" }
    - { from: clock, to: replay-run, label: "the replay advances on the same tick" }
    - { from: controls, to: replay-run, label: "changes how many ticks it gets" }
    - { from: replay-run, to: snapshot, label: "writes the other array" }
    - { from: swap, to: snapshot, label: "the sequence number marks it finished" }
```

# Rubric

- Moves are recorded as small values with the tick they ran on, never as pictures of the screen.
- The simulation advances in fixed ticks that do not depend on the length of a frame, with a limit on how many a long frame may run.
- The replay applies the recorded moves through the same clock as the live duel, so it comes out the same on every machine.
- Speed, pause, and step change how many ticks the replay is asked for and never change the recorded ticks.
- The screen reads one finished copy of the places while the simulation writes the other, and the roles change at one known moment.
- The recorder keeps only the last 10 seconds and its memory stops growing once the window is full, and the replay starts from a stored state of the duelists at the start of the window, because the moves before it are gone.

# Alternative Note

Both plans pass. A clock in a Tick with an accumulator gives full control of the limit and the order of work in a frame, and is the plainer thing to test. A looping timer needs less code and the timer manager already catches up missed ticks, but the order of a timer against other work in a frame is only as predictable as the timer manager's order, so the sequence number is needed to be sure which copy is finished. Swapping two arrays costs nothing; tagging by sequence number lets a reader tell which copy is finished without waiting for a swap.
