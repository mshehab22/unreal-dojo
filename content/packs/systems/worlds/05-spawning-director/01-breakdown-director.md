---
id: s5-director-plan
title: Plan a director that paces waves
order: 1
kind: breakdown
difficulty: 4
patterns: [component]
skills: [planning, data, delegates, timers]
terms: [data-asset, curve-float, actor-component, dynamic-multicast-delegate, timer-manager, spawnactor]
prerequisites: [f5-boss-beacon-drill, p9-boss-prop-gauntlet]
xp: 120
estimatedMinutes: 25
concepts:
  - Keeping the shape of every wave in data, so a harder night is a new asset
  - Deciding which piece owns the beetles, which owns the pacing, and who only listens
  - Knowing how many beetles are loose from events, not by searching the level
---

# Spec

A training pit has four hatches in its walls, and clockwork beetles crawl out of them in waves. A night is five waves. Wave 1 has 3 beetles, and a difficulty curve makes later waves bigger, up to twice the first by wave 5. One beetle comes out every second, but never more than 3 are loose at once: when 3 are out, the next one waits until one is swatted. A beetle never comes out of a hatch the player is looking at, or one that is closer than 6 meters, because a monster that appears in plain view or right behind you feels unfair.

When every beetle of a wave has been swatted, the pit rests for 3 seconds and the gate opens; then the gate shuts and the next wave begins. After the last wave the night is over. A banner over the pit says which wave is running, when it is cleared, and how long the rest lasts.

Swatted beetles are not destroyed. The pit keeps them and sends them out again later, so a whole night creates only a handful of actors.

Designers will make a harder night, and a second pit with its own hatches, and neither may need new code.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- A harder night is a new asset, not new code.
- Once the pit holds enough beetles, playing on creates and destroys none.
- The pacing piece knows nothing about the banner or the gate.
- Nothing checks the level every frame: spawns and rests run on timers, and the banner and the gate hear events.

# Required Pieces

```yaml
- id: wave-data
  kind: data
  label: The shape of a night as an asset with a first wave size and a difficulty curve and an interval and a live limit and a rest time and a last wave
  why: Designers tune a night without code, and the director reads every number from it.
- id: hatches
  kind: class
  label: Hatches in the level that say whether they are out of the player's sight and far enough away
  why: Where beetles come from, and the rule that keeps a spawn fair.
- id: pool
  kind: component
  label: A pool that wakes a sleeping beetle and spawns a new one only when none are asleep
  why: Beetles are reused instead of spawned and destroyed for every wave.
- id: director
  kind: class
  label: A director with one current state out of idle and wave and rest and done
  why: The pit does different things while a wave runs and while it rests, and one owner decides which.
- id: budget
  kind: step
  label: Counting live beetles and beetles still to come from the beetles' defeat events
  why: The live limit needs to know what is loose, and someone must decide when a wave is over.
- id: pacing
  kind: step
  label: Timers for the spawn interval and the rest between waves
  why: Time passes without anything ticking.
- id: announcements
  kind: event
  label: Events that announce a wave starting and a wave cleared and a rest starting
  why: The banner and the gate react without the director knowing them.
- id: banner
  kind: class
  label: A banner that rewrites itself from the events
  why: The player's view of the night.
```

# Reference Plans

```yaml
- id: actor-director
  title: A director actor with an enum state, two timers, and a pool component
  pieces:
    - { id: plan, kind: data, label: UDojoS5WavePlan data asset with a base count and a curve asset that scales it per wave and the interval and the live limit and the rest and the last wave, covers: [wave-data] }
    - { id: hatch, kind: class, label: ADojoS5Hatch actors with a minimum distance and a view angle that answer IsOutOfSight for a viewer, covers: [hatches] }
    - { id: pool, kind: component, label: UDojoS5PoolComponent holding every beetle it made and waking a sleeping one before spawning, covers: [pool] }
    - { id: director, kind: class, label: ADojoS5WaveDirector with a state enum and the wave number and the live count and the count still to spawn, covers: [director, budget] }
    - { id: timers, kind: step, label: A looping spawn timer during a wave and a one shot rest timer between waves, covers: [pacing] }
    - { id: events, kind: event, label: OnWaveStarted and OnWaveCleared and OnRestStarted broadcast after the director holds its new state, covers: [announcements] }
    - { id: banner, kind: class, label: A banner actor that binds to the three events and rewrites its text and unbinds when it leaves play, covers: [banner] }
  edges:
    - { from: plan, to: director, label: read per wave }
    - { from: hatch, to: director, label: asked before each spawn }
    - { from: director, to: pool, label: Acquire and Release }
    - { from: pool, to: director, label: each beetle's defeat event }
    - { from: timers, to: director, label: spawn and next wave }
    - { from: director, to: events, label: broadcasts }
    - { from: events, to: banner, label: all three }
- id: game-mode-director
  title: A director component on the game mode with state objects and one row per wave
  pieces:
    - { id: rows, kind: data, label: A data table with one row per wave holding its count and interval and live limit and rest instead of a curve, covers: [wave-data] }
    - { id: points, kind: class, label: Target points tagged as spawn points whose visibility the director checks with the player's camera, covers: [hatches] }
    - { id: pool, kind: component, label: A world subsystem that keeps a pool per enemy class for every spawner in the level, covers: [pool] }
    - { id: director, kind: component, label: A director component on the game mode holding the current state object out of Resting and Fighting and Done, covers: [director] }
    - { id: fighting, kind: step, label: The Fighting state counts spawned and defeated enemies and its own timer and asks to switch to Resting when both counts meet, covers: [budget, pacing] }
    - { id: channel, kind: event, label: An event channel subsystem that carries wave messages to anyone who subscribes, covers: [announcements] }
    - { id: banner, kind: class, label: A UMG widget that subscribes to the channel, covers: [banner] }
  edges:
    - { from: rows, to: director, label: one row per wave }
    - { from: points, to: fighting, label: chosen per spawn }
    - { from: fighting, to: pool, label: take and return }
    - { from: director, to: channel, label: publishes }
    - { from: channel, to: banner, label: wave messages }
```

# Rubric

- The numbers of a night live in one asset, and the director reads them instead of holding copies.
- One piece owns the beetles and reuses them; the director asks it for a beetle and gives each one back after its defeat.
- The director has one current state, and the plan says what each state does with a spawn, a defeat, and a timer.
- The plan says how the director knows when a wave is over.
- The director announces wave changes with events, and the banner and the gate only listen and unbind when they leave play.
- The plan says what a second pit with its own hatches needs.

# Alternative Note

Both plans pass. The director actor keeps everything about one pit in one place you can drop into a level, with its hatches and its pool beside it, which suits a game with a few arenas; the cost is that two pits each keep their own pool. The game mode component with a pool subsystem shares beetles between every spawner in the level and lets a data table list each wave by hand, which suits a long campaign; the cost is more pieces to find and an extra hop for every message. The parts you will build come from four Pack 2 ideas, each named when you reach it: the plan is data a designer edits, the director has modes, the banner listens, and the beetles are reused. A plan where the director writes the banner's text, where something counts the beetles in the level every frame, or where each wave is a class of its own fails the acceptance lines.
