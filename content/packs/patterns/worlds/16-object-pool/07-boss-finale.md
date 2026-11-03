---
id: p16-boss-finale
title: "Boss: the harbor finale"
order: 7
kind: boss
difficulty: 4
patterns: [object-pool]
skills: [planning, object-pool]
terms: [object-pool, spawnactor, timer-manager, tick, set-actor-hidden-in-game, beginplay]
prerequisites: [p16-rocket-rack, p16-shell-fuse, p16-ripple-refactor, p16-object-pool-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - One runner sets up the evening's rockets and shells when play begins, and nothing is spawned after that
  - Every cue borrows from the rack or the pool, and every burst goes straight back
  - A full rack or pool is a dud, counted and shown, never a spawn
  - Stopping the show sends everything back at once, and nothing sent back mid-flight bursts later
pieces:
  - p16-rocket-rack
  - p16-shell-fuse
---

# Spec

The show runner plays the harbor festival's finale. When play begins it sets up one rocket rack holding `RocketsInRack` rockets, 4 by default, and one shell pool holding `ShellsInPool` shells, 4 by default, both at its own spot. Those eight are every rocket and shell of the evening: nothing is spawned or destroyed after that, however many shows are played.

A show is 12 cues, half a second apart, the first at the moment the show starts. Counting from 0, even cues fire a rocket and odd cues fire a shell. A rocket cue borrows a rocket from the rack at the runner's spot and launches it straight up at 1500 units per second with a 1.2 second fuse. A shell cue borrows a shell from the pool at the runner's spot and fires it with a 2 second fuse. When the rack or the pool has nothing to lend, the cue is a dud: counted, and nothing else happens. Every rocket and shell that bursts is counted and handed back to its rack or pool at once, so the next cue can borrow it. The show is over when all 12 cues have come and nothing is out: the label shows `SHOW OVER: <bursts> bursts, <duds> duds`. While a show runs, the label shows the next cue, the bursts, and the duds. Reference game: the August fireworks shows of Animal Crossing: New Horizons, where shell after shell bursts over the island for the whole evening.

How shows start and stop: show 1 starts when play begins. R starts the next show from its first cue with the counts at zero, only while no show runs. X aborts the running show: no more cues come, every rocket and shell still out goes back to its rack or pool at once, and the label shows `ABORTED: <bursts> bursts, <duds> duds`; nothing that went back bursts afterwards, at rest or in a later show. X while no show runs does nothing. A C++ runner receives keys only after `EnableInput` with the player controller.

Every piece is the earlier quests' own: the rockets come from an `ADojoP16RocketRack` with `Acquire` and `Release` and are launched with `Launch` and read with `HasBurst`; the shells come from an `ADojoP16ShellPool` with `Acquire` and `Release` and are fired with `Fire` and read with `HasBurst`. The runner spawns the rack and the pool and sets their sizes before they begin play. The pieces need no changes.

Compiles against earlier quests: p16-rocket-rack (`Quests/p16-rocket-rack/DojoP16Rocket.h`, `Quests/p16-rocket-rack/DojoP16RocketRack.h`) and p16-shell-fuse (`Quests/p16-shell-fuse/DojoP16Shell.h`, `Quests/p16-shell-fuse/DojoP16ShellPool.h`).

Core numbers are fixed: 12 cues half a second apart, even cues rockets and odd cues shells, a 1500 unit per second launch, a 1.2 second rocket fuse, a 2 second shell fuse, and 4 rockets and 4 shells by default.

Extensions, in order of importance:

1. Ripples: every burst splashes the water from the refactor at the spot below it, so the water's own reuse runs under the show.
2. A recycling rack: when the rack is empty, the cue takes back the rocket that has flown longest and fires it again, instead of being a dud; the label counts recycled rockets instead of duds.
3. Sizes from data: the cue list, the fuses, and the rack and pool sizes come from a Data Asset, and a warning is logged the first time a show produces a dud, naming the size that ran out.

Feel: tune the cues so that the sky is never empty and never so full that a burst is lost among others, and find the smallest rack and pool that play the tuned show with no duds.

# Required Pieces

```yaml
- id: runner
  kind: class
  label: A runner that sets up the rack and the pool, plays the cues, and keeps the counts
  why: One owner for the evening; the rack, the pool, the rockets, and the shells know nothing about it.
- id: setup
  kind: step
  label: The rack and the pool are spawned with their sizes when play begins, and nothing is spawned after that
  why: Every spawn of the evening happens before the first cue.
- id: cues
  kind: step
  label: Twelve cues half a second apart, rockets on even cues and shells on odd ones, each borrowing from its rack or pool
  why: The show borrows and never makes.
- id: take-back
  kind: step
  label: Every burst is counted and handed back at once
  why: A rocket or shell that is not handed back is a dud waiting to happen.
- id: duds
  kind: step
  label: A cue that finds its rack or pool empty is a counted dud and spawns nothing
  why: The limit is a design choice the player can see, not a hidden spawn.
- id: stop-start
  kind: step
  label: X sends everything back at once and nothing sent back bursts later; R starts a clean show only while none runs
  why: A second show must play like the first, with the same eight actors.
```

# Reference Plans

```yaml
- id: cpp-runner
  title: A C++ show runner borrows every burst from its rack and pool
  pieces:
    - { id: runner, kind: class, label: "ADojoP16ShowRunner with a text label, numbers for the rack and pool sizes, the cues, the launch, and both fuses in Details, and UPROPERTY arrays of the rockets and shells it has out", covers: [runner] }
    - { id: setup, kind: step, label: "BeginPlay spawns the rack and the pool with SpawnActorDeferred, sets RocketCount and PoolSize, calls FinishSpawning, binds R and X, and starts show 1", covers: [setup] }
    - { id: cues, kind: step, label: "StartShow fires cue 0 at once and sets a looping 0.5 second timer for FireCue, which calls Acquire on the rack or the pool by the cue's number and Launch or Fire on what it gets", covers: [cues] }
    - { id: take-back, kind: step, label: "Tick walks the rockets and shells out, counts each one whose HasBurst is true, calls Release on its rack or pool, and drops it from the list", covers: [take-back] }
    - { id: duds, kind: step, label: "FireCue counts a dud when Acquire returns nullptr and returns without spawning", covers: [duds] }
    - { id: stop-start, kind: step, label: "AbortShow clears the cue timer and calls Release on everything still out; StartShow returns early while a show runs; the shells' own rest puts out their fuses", covers: [stop-start] }
  edges:
    - { from: setup, to: cues, label: "the rack and the pool lend every cue" }
    - { from: cues, to: duds, label: "an empty rack or pool" }
    - { from: cues, to: take-back, label: "every burst goes back" }
    - { from: take-back, to: cues, label: "the next cue can borrow it" }
    - { from: runner, to: stop-start, label: "R and X" }
    - { from: runner, to: setup, label: "owns the rack and the pool" }
- id: blueprint-runner
  title: A Blueprint show runner wires the pieces through their Blueprint API
  pieces:
    - { id: runner, kind: class, label: "BP_ShowRunner actor with a Text Render component, variables for the sizes, the cue count, the launch, and the fuses, arrays of the rockets and shells out, and a Running flag", covers: [runner] }
    - { id: setup, kind: step, label: "Begin Play spawns BP_Rack and BP_ShellPool, Blueprint children of the rack and the pool whose class defaults set the sizes, with Spawn Actor from Class, then calls Start Show", covers: [setup] }
    - { id: cues, kind: step, label: "Start Show calls Fire Cue at once and starts a looping Set Timer by Event of 0.5 seconds; Fire Cue uses a Branch on the cue number being even to call Acquire and Launch, or Acquire and Fire", covers: [cues] }
    - { id: take-back, kind: step, label: "Event Tick loops over the arrays in reverse, and for each Has Burst adds a burst, calls Release, and removes it from the array", covers: [take-back] }
    - { id: duds, kind: step, label: "An Is Valid on Acquire's result adds a dud when it fails", covers: [duds] }
    - { id: stop-start, kind: step, label: "The X event clears the timer, calls Release on every entry of both arrays, and sets the label; the R event sits behind a Branch on Running", covers: [stop-start] }
  edges:
    - { from: setup, to: cues, label: "the rack and the pool lend every cue" }
    - { from: cues, to: duds, label: "an empty rack or pool" }
    - { from: cues, to: take-back, label: "every burst goes back" }
    - { from: take-back, to: cues, label: "the next cue can borrow it" }
    - { from: runner, to: stop-start, label: "R and X" }
    - { from: runner, to: setup, label: "owns the rack and the pool" }
```

# Integration Rubric

- The rocket rack, rocket, shell, and shell pool pieces are reused unchanged, and the runner reaches them only through their own functions.
- The rack and the pool are spawned with their sizes when play begins, and no actor is spawned or destroyed during any show.
- Twelve cues come half a second apart from the start of a show, rockets on even cues and shells on odd ones, with the fixed launch and fuses.
- Every rocket and shell that bursts is counted and handed back to its rack or pool at once.
- A cue that finds its rack or pool empty is a counted dud that spawns nothing.
- The show is over when every cue has come and nothing is out, and the label shows the bursts and duds.
- X sends everything back at once and nothing sent back bursts afterwards; R starts a show with zeroed counts only while none runs.
- The submission says why nothing is spawned during a show and what a dud costs the player, and gives the smallest rack and pool that play its tuned show with no duds.
