---
id: s5-boss-beetle-pit
title: "Boss: a night in the beetle pit"
order: 6
kind: boss
difficulty: 5
patterns: [object-pool, state, observer, type-object]
skills: [planning, timers, delegates, spawning]
terms: [actor-component, data-asset, curve-float, timer-manager, dynamic-multicast-delegate, unbinding-delegates]
prerequisites: [s5-wave-plan, s5-pool, s5-wave-director, s5-wave-banner]
xp: 400
estimatedMinutes: 90
concepts:
  - A plan, hatches, a pool, a director, and a banner assembled into one pacing system, each part reused as it is
  - A keeper that only connects the parts and keeps the board, owning none of the pacing rules
  - A second night that plays exactly like the first and spawns no new beetle
pieces:
  - s5-wave-plan
  - s5-pool
  - s5-wave-director
  - s5-wave-banner
---

# Spec

The hero stands in the middle of the training pit, facing one of its four hatches. The hatches sit 8 meters away, one ahead of the hero, one to the right, one behind, and one to the left, and the director tries them in that order; they are placed on the world axes around the keeper, at +X, +Y, -X and -Y, and the hero starts facing +X. A night is five waves: the first has 3 beetles, and a curve that is 1 at wave 1 and 2 at wave 5 makes them 3, 4, 5, 5, and 6. One beetle comes out every second, never more than 3 are loose at once, and between waves the pit rests for 3 seconds. A hatch opens only when it is at least 6 meters from the hero and more than 45 degrees away from where the hero faces. The pool holds at most 4 beetles.

Keys, all on the hero:

- Space swats the nearest loose beetle within 45 degrees of where the hero faces, at any distance; between beetles at the same distance, the one the pool made first wins.
- Q and E turn the hero 90 degrees left and right.
- R starts the next night, only after the finale.

Space, Q, and E do nothing outside a running night.

The gate of the pit is shut while a wave runs and open during a rest. The board shows `Swats 7` and `Gate shut` (or `Gate open`), one per line. When the last beetle of wave 5 is swatted the night ends, the gate opens, and the board adds `CLEARED in 41.2 s`, the time since the night began. A banner over the pit follows the director, the way the banner piece writes it.

Reference game: Left 4 Dead's AI Director, which sends the horde out of sight and paces calm stretches between the peaks. The system combines four Pack 2 patterns: Object Pool ("Lend it out, take it back") for the beetles that are woken instead of spawned; State ("One mode at a time") for the director's wave, rest, and done; Observer ("The lens, then the first payoff") for the banner, the gate, and the finale, which listen instead of asking; and Type Object ("Kinds as data") for the night that lives in an asset.

How nights start: night 1 starts when play begins. Starting a night turns the hero back to the way it faced at the start of play, sets the swats to 0, shuts the gate, puts every loose beetle to sleep, and starts the director from wave 1. The second night must create no new beetle. A C++ keeper receives keys only after `EnableInput` with the player controller; a test world has no player controller, so bind the keys only when there is one, because without a controller `EnableInput` does nothing and the actor has no input component to bind to.

The keeper carries the pool as a component and spawns the hatches, the director, and the banner itself. The plan is set in Details, and so is the hero, which is any actor.

Compiles against earlier quests: s5-wave-plan (`Quests/s5-wave-plan/DojoS5WavePlan.h`, `Quests/s5-wave-plan/DojoS5Hatch.h`), s5-pool (`Quests/s5-pool/DojoS5PoolComponent.h`, `Quests/s5-pool/DojoS5Beetle.h`), s5-wave-director (`Quests/s5-wave-director/DojoS5WaveDirector.h`), and s5-wave-banner (`Quests/s5-wave-banner/DojoS5WaveBanner.h`). The pieces need no additions.

What the tests read and call is public on `ADojoS5PitKeeper`, declared in `Quests/s5-boss-beetle-pit/DojoS5PitKeeper.h`: the properties `Hero` (an `AActor` pointer), `Plan`, `Pool` (the pool component) and `Board` (a text render component whose `Text` holds the board); the keys `PressSwat()`, `PressTurn(bool bRight)`, where true is E and turns right, and `RestartNight()`; and the readers `IsRunning`, `IsGateOpen`, `GetSwats`, `GetFinishSeconds`, `GetDirector`, `GetBanner` and `GetHatches`, which gives the four hatches in the order above as an array of plain `ADojoS5Hatch*` pointers. The tests set `Hero` and `Plan` before play begins, and they read the banner's text from its `Display`. The board's lines are separated by a plain `
`, not the platform line ending.

Core numbers are fixed: 5 waves, a first wave of 3 doubling by wave 5, one beetle a second, 3 loose at most, 3 seconds of rest, hatches 8 meters out, 6 meters minimum distance, 45 degrees of view, a pool of 4.

Extensions, in order of importance:

1. A second pit beside the first with its own keeper, hatches, and director, sharing only the plan asset.
2. A big beetle kind that counts as two against the live limit, described in an asset of its own, so the director asks the kind instead of counting heads.
3. Pacing from the player: when a wave is cleared in under half its beetle count in seconds, the next rest is one second shorter.

Feel: with the fixed numbers, play wave 5 and judge whether the hero always has a beetle to turn to without three loose for more than 2 seconds. The submission gives one sentence on what you saw.

# Required Pieces

```yaml
- id: keeper
  kind: class
  label: A keeper that builds the pit and connects the hero's keys and the board to the director and the pool
  why: The one place that turns keys into calls, owning none of the pacing rules.
- id: setup
  kind: step
  label: Spawning four hatches around the pit and the director and the banner and handing the director the plan and the pool and the hero
  why: The pieces only work once they know each other, in the right direction.
- id: swat
  kind: step
  label: Space swats the nearest loose beetle the hero faces and Q and E turn the hero
  why: The player's verbs, which also decide which hatches are out of sight.
- id: board
  kind: event
  label: The board and the gate and the banner change on the director's events and never poll
  why: The player's record of the night, with no Tick.
- id: finale
  kind: step
  label: The director finishing the last wave ends the night with the time
  why: A goal that comes from another piece's state.
- id: fresh
  kind: step
  label: R starts a fresh night only after the finale and wakes beetles the pool already has
  why: A second night must play like the first and cost no new actors.
```

# Reference Plans

```yaml
- id: cpp-keeper
  title: A C++ keeper that carries the pool and spawns the rest of the pit
  pieces:
    - { id: keeper, kind: class, label: ADojoS5PitKeeper with the hero and the plan set in Details and a pool component of its own, covers: [keeper] }
    - { id: setup, kind: step, label: BeginPlay spawns the four hatches in turn order and the director and the banner then calls Setup and Watch and StartNight, covers: [setup] }
    - { id: swat, kind: step, label: PressSwat picks the nearest awake beetle inside the view cone and calls Defeat and PressTurn adds 90 degrees of yaw, covers: [swat] }
    - { id: listen, kind: event, label: The keeper binds the director's three events to handlers that set the gate and rewrite the board and the banner listens by itself, covers: [board] }
    - { id: finale, kind: step, label: The clear handler checks the director's Done state and records the time, covers: [finale] }
    - { id: fresh, kind: step, label: RestartNight behind a finished flag resets the hero and the swats then calls StopNight and StartNight, covers: [fresh] }
  edges:
    - { from: keeper, to: setup, label: BeginPlay }
    - { from: swat, to: keeper, label: Defeat on a beetle }
    - { from: keeper, to: listen, label: director events }
    - { from: listen, to: finale, label: last clear }
    - { from: finale, to: fresh, label: R only after }
- id: blueprint-keeper
  title: The level Blueprint wires the pieces through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and the plan and the placed hatches and director and banner and a burrow actor with the pool, covers: [keeper, setup] }
    - { id: swat, kind: step, label: The Space event loops over Get Awake Beetles comparing the dot product with the hero's forward vector and calls Defeat and Q and E add yaw, covers: [swat] }
    - { id: listen, kind: event, label: Custom events bound to the director's three events set a Gate Open Boolean and rewrite a Text Render, covers: [board] }
    - { id: finale, kind: step, label: The clear event checks Get State for Done and prints the time, covers: [finale] }
    - { id: fresh, kind: step, label: The R event behind a branch on a Finished Boolean calls Stop Night and Start Night, covers: [fresh] }
  edges:
    - { from: swat, to: level, label: Defeat }
    - { from: level, to: listen, label: bound events }
    - { from: listen, to: finale, label: last clear }
    - { from: finale, to: fresh, label: R only after }
```

# Integration Rubric

- The plan, hatches, pool, beetle, director, and banner are reused without changes; every pacing rule stays in the director and every reuse rule in the pool.
- The keeper subscribes to the director and the banner subscribes by itself; neither the director nor the pool points at the keeper or the banner.
- Beetles come out only of hatches out of the hero's sight, one per second, never more than 3 at once, and the keeper never spawns or destroys a beetle itself.
- Space swats only the nearest beetle the hero faces, the earlier one winning ties, and Q, E, and Space do nothing outside a running night.
- The gate and the board change only on events and the keeper's own key presses, and nothing runs in Tick.
- The finale comes from the director finishing the last wave, and the board shows the time.
- Every binding made in BeginPlay is removed in EndPlay, and a keeper removed from the level takes what it spawned with it.
- R starts a fresh night only after the finale, the second night plays exactly like the first and creates no new beetle, and the submission gives one sentence on how wave 5 felt.
