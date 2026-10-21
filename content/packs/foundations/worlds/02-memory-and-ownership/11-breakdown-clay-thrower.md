---
id: f2-clay-thrower
title: Plan a clay disc thrower
order: 11
kind: breakdown
difficulty: 3
patterns: [object-pool]
skills: [planning, memory]
terms: [spawnactor, tsubclassof, destroy, tweakobjectptr, endplay, object-pool]
prerequisites: [f2-target-rack]
xp: 90
estimatedMinutes: 15
concepts:
  - Deciding who creates, owns, tracks, and removes each short-lived actor
  - Choosing between spawning fresh actors and reusing a fixed set
---

# Spec

A trap house throws clay discs for the player to shoot. Pressing the throw button launches one disc in an arc: it travels 1200 units forward, peaks 400 units up, and lands 2.5 seconds later. No more than 3 discs may be in the air at once; a throw while 3 are up is refused. A disc that is shot shatters at once and counts as a hit; a disc that lands counts as a miss and leaves play. A spotter camera always follows the newest disc still in the air and moves to the next newest when its disc is gone. A small HUD counter shows hits and misses.

You are planning, not coding. Name every actor that comes and goes, who makes it, who holds a reference to it and of what kind, and who removes it.

Acceptance:

- A disc that has shattered or landed is never shown, followed, or counted again.
- The spotter never keeps a disc alive and never follows a disc that is gone.
- The thrower never has more than 3 discs in the air, whatever the player presses.
- The disc class, flight time, distance, height, and air limit are tunable without a rebuild.
- Leaving the level leaves no discs behind.

# Required Pieces

```yaml
- id: thrower
  kind: class
  label: A thrower that launches discs and enforces the air limit
  why: One owner decides when a throw is allowed and where discs come from.
- id: disc
  kind: class
  label: A disc that flies an arc and ends as a hit or a miss
  why: The short-lived actor every other piece reacts to.
- id: disc-supply
  kind: step
  label: Where each thrown disc comes from and where it goes after
  why: Either fresh spawns with their own lifetime or a reused set; the plan must say which and who cleans up.
- id: flight
  kind: step
  label: Move the disc along its arc for its flight time
  why: The disc must travel and land on its own without the thrower steering it every frame.
- id: outcome
  kind: event
  label: The thrower learns whether each disc was hit or landed
  why: Hits and misses are counted where the throws are counted.
- id: spotting
  kind: step
  label: Spotter follows the newest disc through a reference that does not own it
  why: The spotter must let go of a disc the moment it is gone.
- id: tunables
  kind: data
  label: Disc class, flight time, distance, height, and air limit as editable values
  why: Designers tune the throw without code.
- id: hud-counter
  kind: class
  label: HUD counter for hits and misses
  why: Shows the result and proves the outcome reaches the player.
```

# Reference Plans

```yaml
- id: spawn-and-expire
  title: The thrower spawns a fresh disc per throw and each disc expires on its own
  pieces:
    - { id: thrower, kind: class, label: ADojoF2Thrower with Throw and a UPROPERTY array of discs in the air, covers: [thrower] }
    - { id: disc, kind: class, label: ADojoF2ArcDisc built on the clay disc with a lifespan equal to its flight time, covers: [disc] }
    - { id: spawn, kind: step, label: Throw spawns from a TSubclassOf disc class and the disc destroys itself when its lifespan ends or it is shot, covers: [disc-supply] }
    - { id: arc, kind: step, label: A projectile movement component on the disc with launch speed worked out from distance and height, covers: [flight] }
    - { id: check, kind: event, label: The thrower checks its array on a short timer and reads GetFate on each disc that is no longer valid before dropping it, covers: [outcome] }
    - { id: spotter, kind: step, label: The thrower tells the spotter to watch the newest valid disc and the spotter holds it in a TWeakObjectPtr, covers: [spotting] }
    - { id: settings, kind: data, label: Editable class and numbers on the thrower and flight time on the disc, covers: [tunables] }
    - { id: hud, kind: class, label: Counter widget that the thrower updates after each check, covers: [hud-counter] }
  edges:
    - { from: thrower, to: spawn, label: spawns a disc per allowed throw }
    - { from: spawn, to: disc, label: the disc owns its own end }
    - { from: disc, to: arc, label: flies itself }
    - { from: thrower, to: check, label: finds discs that ended }
    - { from: check, to: hud, label: updates hits and misses }
    - { from: thrower, to: spotter, label: points it at the newest disc }
    - { from: settings, to: thrower, label: read on each throw }
- id: reuse-a-set
  title: The thrower keeps a fixed set of discs and lends them out
  pieces:
    - { id: thrower, kind: class, label: ADojoF2Thrower owning a rack of 6 discs spawned in BeginPlay, covers: [thrower, disc-supply] }
    - { id: disc, kind: class, label: ADojoF2PooledDisc that hides itself and reports its result instead of being destroyed, covers: [disc] }
    - { id: arc, kind: step, label: The disc's own timer moves it along the arc and ends the flight after the flight time, covers: [flight] }
    - { id: result, kind: event, label: The disc calls back into the thrower's ReportResult with hit or miss and the thrower takes it back, covers: [outcome] }
    - { id: spotter, kind: step, label: Spotter keeps a TWeakObjectPtr and is told to watch again whenever a disc is lent out or returned, covers: [spotting] }
    - { id: settings, kind: data, label: A thrower settings data asset with the class and numbers, covers: [tunables] }
    - { id: hud, kind: class, label: Counter widget reading the thrower's hit and miss counts after each result, covers: [hud-counter] }
    - { id: cleanup, kind: step, label: The thrower's EndPlay destroys every disc it owns, covers: [disc-supply] }
  edges:
    - { from: thrower, to: disc, label: lends a resting disc on each allowed throw }
    - { from: disc, to: arc, label: flies itself }
    - { from: disc, to: result, label: reports hit or miss }
    - { from: result, to: thrower, label: takes the disc back }
    - { from: thrower, to: spotter, label: retargets on every change }
    - { from: thrower, to: hud, label: updates the counts }
    - { from: settings, to: thrower, label: read at BeginPlay }
    - { from: thrower, to: cleanup, label: runs when the thrower leaves play }
```

# Rubric

- Every short-lived actor has a named creator and a named remover, and leaving the level removes them all.
- The spotter's reference is weak; it never keeps a disc alive and checks validity before use.
- The air limit is enforced in one place, before a disc is created or lent out.
- The plan says how the thrower learns each outcome, without searching the level every frame.
- The disc class and the numbers are editable data, with the class as a TSubclassOf or in a data asset.
- The dependency direction is stated: the HUD and spotter are told by the thrower; discs do not know the HUD.

# Alternative Note

Both plans pass. Spawning a fresh disc per throw is simpler and is the right start: each disc owns its whole life, and the thrower only has to notice when one ends. Reusing a fixed set saves the cost of spawning when throws are frequent, at the price of making the disc report back to the thrower, which ties the disc to its owner. A plan that reuses discs but has them hide themselves without telling anyone also fails the acceptance list, because the thrower can no longer count misses. Pack 1 World 5 adds delegates, which let a disc announce its end without knowing who listens.
