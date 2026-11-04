---
id: m4-yard-plan
title: Plan a fuse yard
order: 1
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, spawning, time]
terms: [spawnactor, tsubclassof, timer-manager, timer-handle, destroy, overlap-event]
prerequisites: [m3-boss-vault-room]
xp: 80
estimatedMinutes: 20
concepts:
  - Choosing who spawns, who times, and who hears an actor leave
  - Deciding how a round knows it is over when the last event can trigger more events
---

# Spec

The training hall gets a fuse yard: a field of bombs a runner sets off from a plate at the entrance.

- Each round the bombs are scattered at random across the field, but never inside the two pillars that stand in it or inside each other, and the same layout must come back whenever the round is replayed.
- Each bomb has a fuse. A burning bomb shows its seconds left and blows when they run out, leaving play. Lighting a burning bomb again can make it blow sooner, never later.
- When a bomb blows, every bomb within a set reach is lit with a short spark, so one blast can walk across the field.
- Stepping on the plate lights the bomb nearest to it, once per round.
- When the last burning bomb has blown and nothing more is lit, the round is over and the board shows how many of the bombs went off. A key lays out the yard again, but only after a round is over.

You are planning, not coding. Name the classes, which one spawns the bombs and how a blocked spot is handled, which timers exist and who holds their handles, who hears a bomb leave play, and how the yard decides the round is over.

Acceptance:

- Nothing ticks; every wait is a timer and every reaction is an event.
- The bomb, the spreading rule, and the scatter each work alone, with no pointer to the yard.
- No bomb ever stands inside a pillar or another bomb.
- A second round with the same seed plays exactly like the first.

# Required Pieces

```yaml
- id: scatter
  kind: class
  label: A scatterer that spawns at seeded random points and skips points where the new actor would be blocked
  why: The layout must be random-looking, replayable, and never inside something solid.
- id: bomb
  kind: class
  label: A bomb with a fuse timer and a countdown timer, each with its own handle
  why: The fuse decides when it blows and the countdown shows it; two jobs, two clocks.
- id: sooner
  kind: step
  label: Lighting a burning bomb again never makes it wait longer
  why: A spark must never hold back a bomb that was about to blow.
- id: spread
  kind: class
  label: A rule that hears a bomb leave play and lights the bombs in reach
  why: The chain is the mechanic, and it reacts to bombs leaving rather than checking them.
- id: trigger
  kind: event
  label: The plate lights the bomb nearest to it, once per round
  why: The round's only input.
- id: end
  kind: step
  label: How the yard knows nothing is burning any more
  why: A blast can light more bombs, so the end is only known after every reaction to the last blast.
- id: round
  kind: class
  label: A yard that lays everything out, counts the blasts, ends the round, and lays it out again
  why: Someone owns the round, the score, and the restart.
```

# Reference Plans

```yaml
- id: chain-and-yard
  title: A chain actor spreads blasts and the yard only keeps the round
  pieces:
    - { id: scatter, kind: class, label: A scatter actor with a box area and a seed that spawns with DontSpawnIfColliding and counts the skips, covers: [scatter] }
    - { id: bomb, kind: class, label: A bomb actor with a one shot fuse timer that destroys it and a looping 0.1 second label timer, covers: [bomb] }
    - { id: sooner, kind: step, label: A second Light on a burning bomb can bring its blast forward and never pushes it back, covers: [sooner] }
    - { id: chain, kind: class, label: A chain actor that binds every watched bomb's OnDestroyed and lights the watched bombs within reach of where it stood, covers: [spread] }
    - { id: trigger, kind: event, label: The yard's second handler on the plate's begin overlap lights the nearest bomb while the yard is armed, covers: [trigger] }
    - { id: end, kind: step, label: The yard also binds each bomb's OnDestroyed and sets a timer for next tick that ends the round when no bomb is lit, covers: [end] }
    - { id: yard, kind: class, label: A yard actor that spawns the plate and pillars and a deferred scatter and the chain and rebuilds them on restart, covers: [round] }
  edges:
    - { from: yard, to: scatter, label: spawns with the seed }
    - { from: yard, to: chain, label: Watch each bomb }
    - { from: chain, to: bomb, label: Light }
    - { from: bomb, to: end, label: OnDestroyed }
    - { from: trigger, to: bomb, label: first Light }
- id: bombs-spread
  title: Each bomb spreads its own blast and a director counts
  pieces:
    - { id: scatter, kind: class, label: The director tests each random point with an overlap query using a bomb sized sphere and only spawns at clear points, covers: [scatter] }
    - { id: bomb, kind: class, label: A bomb with a fuse handle and a label handle and an OnBlown event it broadcasts before destroying itself, covers: [bomb] }
    - { id: sooner, kind: step, label: The bomb's own Light decides a second lighting so no caller can delay it, covers: [sooner] }
    - { id: spread, kind: class, label: Each bomb asks a sphere overlap query for bombs within reach and lights them as it blows, covers: [spread] }
    - { id: trigger, kind: event, label: The plate's begin overlap is bound by the director which lights the bomb closest to the plate, covers: [trigger] }
    - { id: end, kind: step, label: The director counts lit and blown bombs from their events and ends the round when the lit count reaches zero, covers: [end] }
    - { id: director, kind: class, label: A director that lays out the yard with a seeded stream and keeps the score and the restart, covers: [round] }
  edges:
    - { from: director, to: scatter, label: lays out }
    - { from: bomb, to: spread, label: on blow }
    - { from: spread, to: bomb, label: Light }
    - { from: bomb, to: end, label: OnBlown }
    - { from: trigger, to: bomb, label: first Light }
```

# Rubric

- The plan names who spawns the bombs, where the seed lives, and what happens at a blocked spot.
- Every timer in the plan has an owner and a handle, and the bomb's fuse and countdown are separate timers.
- The plan says what happens when a burning bomb is lit again, and which class decides it.
- The spreading rule reacts to a bomb leaving play, through an event, and holds no pointer to the yard.
- The plan says how the yard knows the round is over when the last blast can still light more bombs.
- The plan says how a new round clears and lays out the yard again so it plays like the first.

# Alternative Note

Both plans pass. A chain actor keeps the spreading rule in one place, so one setting changes the whole yard, and the bombs stay simple; the cost is that every bomb must be registered with it. Bombs that spread their own blast need no registry and work for any bomb dropped in the level, but each one then carries the reach and spark, and counting the end needs an event of the bomb's own. A plan where the yard checks every bomb's fuse in Tick, or where the end is declared inside the same listener that hears the last blast, breaks the first acceptance line or ends a round that is still burning.
