---
id: m2-hall-plan
title: Plan a clockwork hall
order: 1
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, movement]
terms: [tick, deltatime, timer-manager, scene-component, ftransform]
prerequisites: [f5-boss-beacon-drill]
xp: 80
estimatedMinutes: 20
concepts:
  - Choosing the space and the clock each moving thing works in
  - Deciding who holds the hazards, who measures hits, and how often
---

# Spec

A training hall is a corridor 2000 units long, running along the level's X axis. The hero starts at the gate and has to reach the far end. Four hazards guard the way:

- A crusher swings across the lane between two ends, forever, at a steady speed.
- A boulder rolls across the lane along its own forward, so a designer who turns it in the editor turns its path; a new boulder replaces the old one every 4 seconds.
- A bouncing ball rolls in a channel between two walls and bounces off each of them.
- A dart is fired from the side every 3 seconds, curves toward the hero, and cannot turn faster than a set rate, so a quick hero can dodge it.

A hazard within 100 units of the hero is a hit: the hero goes back to the gate and the hit is counted. Reaching the exit ends the round with the time and the number of hits. R starts a fresh round, but only after a round has ended. A board shows the hits and then the finish line.

You are planning, not coding. Name the classes, the data, and the order of events; for each hazard, say which space its motion is measured in and what keeps its speed the same on a slow computer and a fast one.

Acceptance:

- Hazards only move: no hazard holds the hero, the score, or the hall.
- Every hazard travels equally far in a second at 30 and at 120 frames per second.
- Nothing measures hits every frame.
- A second round plays exactly like the first.

# Required Pieces

```yaml
- id: hazards
  kind: class
  label: One class per hazard kind, each with its own rule of motion
  why: A crusher, a boulder, a bouncing ball, and a dart move for different reasons, and each rule should be testable alone.
- id: spaces
  kind: step
  label: Which space each motion is measured in
  why: Turning a boulder in the editor should turn its path, while a wall bounce is a fact about the world.
- id: framerate
  kind: step
  label: The frame's duration applied to every motion
  why: The same hall must play the same on any machine.
- id: ends
  kind: step
  label: How the crusher turns round at each end of its swing
  why: The crusher's whole job is to be somewhere between two points.
- id: bounce
  kind: step
  label: A swept move for the ball and a bounce off whatever it hit
  why: The ball must not pass through a wall, and it should leave a wall the way a ball would.
- id: chase
  kind: step
  label: A dart that turns toward the hero but is capped on how fast
  why: A dart that can turn without limit can never be dodged.
- id: hits
  kind: step
  label: A hit test on a timer that sends the hero back to the gate
  why: Hits are a rule about the hero and the hazards together, and they do not need a frame each.
- id: round
  kind: class
  label: A hall that builds the hazards, counts hits, ends the round, and starts the next
  why: Someone has to own the round, the score, and the schedule for boulders and darts.
- id: tunables
  kind: data
  label: Speeds, distances, the hit radius, and the intervals as settings
  why: A designer tunes the hall without opening the code.
```

# Reference Plans

```yaml
- id: hall-checks
  title: The hall holds the hazards and checks the hits
  pieces:
    - { id: hazards, kind: class, label: Four actor classes for a patrol and a sled and a bumper and a dart each ticking its own motion, covers: [hazards] }
    - { id: spaces, kind: step, label: The sled and patrol use their own forward set by the level while the bumper and dart use world directions, covers: [spaces] }
    - { id: framerate, kind: step, label: Every Tick multiplies the speed by DeltaSeconds, covers: [framerate] }
    - { id: ends, kind: step, label: The patrol keeps its distance from the start and turns round at each end, covers: [ends] }
    - { id: bounce, kind: step, label: The bumper moves with a sweep and reflects its heading off the hit surface, covers: [bounce] }
    - { id: chase, kind: step, label: The dart turns toward its target by at most a capped rate each frame, covers: [chase] }
    - { id: hall, kind: class, label: A hall actor that spawns the hazards and owns a looping timer for the hit test and counts the hits, covers: [round, hits] }
    - { id: settings, kind: data, label: Hazard settings are properties the hall sets when it spawns each one, covers: [tunables] }
  edges:
    - { from: hall, to: hazards, label: spawns and configures }
    - { from: hall, to: settings, label: reads the numbers }
    - { from: hazards, to: framerate, label: every Tick }
    - { from: ends, to: spaces, label: along the path direction }
- id: hero-sensor
  title: The hero carries a hit sensor and the hall only keeps score
  pieces:
    - { id: hazards, kind: class, label: Four actor classes tagged as hazards each ticking its own motion, covers: [hazards] }
    - { id: spaces, kind: step, label: Each hazard states in a property whether its direction is local or world, covers: [spaces] }
    - { id: framerate, kind: step, label: Every Tick multiplies the speed by DeltaSeconds, covers: [framerate] }
    - { id: ends, kind: step, label: The crusher tracks its distance from the start and reverses at each end, covers: [ends] }
    - { id: bounce, kind: step, label: The ball sweeps its move and mirrors its direction about the hit normal, covers: [bounce] }
    - { id: chase, kind: step, label: The dart rotates toward the hero with a constant degrees per second limit, covers: [chase] }
    - { id: sensor, kind: component, label: A sensor component on the hero that checks distance to tagged hazards on a timer and broadcasts a hit, covers: [hits] }
    - { id: hall, kind: class, label: A hall actor that listens to the sensor and counts hits and spawns the hazards and runs the round, covers: [round] }
    - { id: settings, kind: data, label: A data asset of hazard numbers read by the hall, covers: [tunables] }
  edges:
    - { from: sensor, to: hall, label: OnHazardHit }
    - { from: hall, to: hazards, label: spawns with settings }
    - { from: settings, to: hall, label: read at the start of a round }
```

# Rubric

- Each hazard is its own class that only moves; none holds a pointer to the hero, the hall, or the score.
- The plan says which space each motion uses and why turning a boulder in the editor should turn its path but a wall bounce is measured in the world.
- Every motion is scaled by the frame's duration, and the plan says how the crusher turns round at an end.
- The ball's move is swept and its bounce comes from the surface it hit; the dart's turn rate is capped.
- The hit test runs on a timer, not in Tick, and the plan says who holds the hit count.
- The plan says how a new round resets the hazards, the hits, the timers, and the hero.

# Alternative Note

Both plans pass. Giving the hall the hazards makes the hit rule one short loop in one place, and the hall already knows every hazard because it spawned them; the cost is that the hall must be told about any hazard added later. Putting a sensor on the hero lets any actor with the tag hurt the hero without the hall knowing it exists, and the same sensor could serve a different level; the cost is one more component to bind, unbind, and test. A plan where a hazard checks the hero in its own Tick, or where the hall moves the hazards by setting their positions every frame, breaks the first and third acceptance lines.
