---
id: example-boss-lighthouse
title: "Boss: the lighthouse keeper"
order: 8
kind: boss
difficulty: 4
patterns: [observer, component, update-method]
skills: [planning, timers, collision, delegates]
terms: [timer-manager, overlap-event, multicast-delegate, tarray]
prerequisites: [example-build-blank-proximity-lantern, example-refactor-lantern-tick, example-breakdown-campfire]
xp: 300
estimatedMinutes: 60
concepts:
  - Combining owned references, timers, and overlap events in one system
pieces:
  - example-build-worked-lantern
  - example-build-faded-flicker
  - example-build-stub-lantern-switch
  - example-build-blank-proximity-lantern
---

# Spec

A storm level has one lighthouse and six shore lanterns. The lighthouse beam turns a full circle every 8 seconds. Every lantern the beam passes lights for 3 seconds. A ship crossing the bay is safe while at least 4 lanterns are lit; when fewer are lit for 2 seconds in a row it runs aground and the level resets. The keeper (the player) can relight one lantern by standing next to it, with a 5 second cooldown per lantern. Reference game: Don't Starve, where the fire you keep fed is what holds the dark back.

Core numbers are fixed: 8 second turn, 3 second glow, 4 lanterns minimum, 2 second grace, 5 second relight cooldown.

Extensions, in order of importance:

1. Wind gusts that blow out the two lanterns nearest the ship every 20 seconds.
2. A HUD row of six pips mirroring the lantern states.
3. A second ship on a different route.

Feel: tune the turn speed until choosing which lantern to relight feels like a decision, not a reflex.

# Required Pieces

```yaml
- id: beam
  kind: class
  label: Lighthouse with a rotating beam
  why: Drives the rhythm of the whole level.
- id: lantern
  kind: class
  label: Shore lantern with a timed glow and relight cooldown
  why: The unit every other piece reacts to.
- id: lantern-events
  kind: event
  label: OnLanternLit and OnLanternDimmed
  why: The safety check and the HUD learn about lanterns through events.
- id: safety
  kind: component
  label: Safety tracker counting lit lanterns with a grace timer
  why: Owns the fail rule so the ship and the lanterns stay simple.
- id: ship
  kind: class
  label: Ship that follows a route and runs aground on failure
  why: The visible stake.
- id: relight
  kind: step
  label: Keeper relights a lantern by proximity
  why: The player's one verb.
- id: numbers
  kind: data
  label: Turn time, glow time, minimum, grace, cooldown as editable data
  why: The feel criterion needs tuning without code.
```

# Reference Plans

```yaml
- id: tracker-on-game-state
  title: Safety tracker lives on the game state
  pieces:
    - { id: lighthouse, kind: class, label: ADojoLighthouse with a beam sweep, covers: [beam] }
    - { id: lantern, kind: class, label: ADojoShoreLantern reusing the proximity lantern, covers: [lantern, relight] }
    - { id: events, kind: event, label: Lantern lit and dimmed delegates, covers: [lantern-events] }
    - { id: tracker, kind: component, label: UDojoSafetyTracker on the game state, covers: [safety] }
    - { id: ship, kind: class, label: ADojoShip on a spline route, covers: [ship] }
    - { id: tuning, kind: data, label: Editable numbers on each actor, covers: [numbers] }
  edges:
    - { from: lighthouse, to: lantern, label: beam overlap lights the lantern }
    - { from: lantern, to: events, label: broadcasts state changes }
    - { from: events, to: tracker, label: tracker counts lit lanterns }
    - { from: tracker, to: ship, label: tells the ship to run aground }
- id: tracker-on-ship
  title: The ship owns the safety rule
  pieces:
    - { id: lighthouse, kind: class, label: ADojoLighthouse with a beam sweep, covers: [beam] }
    - { id: lantern, kind: class, label: ADojoShoreLantern with glow and cooldown timers, covers: [lantern] }
    - { id: keeper, kind: step, label: Keeper overlap relights through the lantern's own handler, covers: [relight] }
    - { id: events, kind: event, label: Lantern lit and dimmed delegates, covers: [lantern-events] }
    - { id: ship, kind: class, label: ADojoShip with a safety component counting lanterns, covers: [ship, safety] }
    - { id: tuning, kind: data, label: A lighthouse level data asset, covers: [numbers] }
  edges:
    - { from: lighthouse, to: lantern, label: beam overlap lights the lantern }
    - { from: keeper, to: lantern, label: relights when off cooldown }
    - { from: lantern, to: events, label: broadcasts state changes }
    - { from: events, to: ship, label: ship's safety component counts lit lanterns }
```

# Integration Rubric

- Lanterns broadcast; neither the ship nor the tracker is referenced by a lantern.
- Every repeating rhythm (glow, grace, cooldown) is a timer; nothing polls in Tick.
- Delegates bound in BeginPlay are unbound in EndPlay.
- The fixed numbers are editable properties or one data asset, with the given defaults.
- The lantern from the earlier quests is reused, not rewritten.
- Running aground resets the level through one clear entry point.
- Two lanterns lit by the beam in the same frame are both counted.
- The feel criterion was tuned and the chosen turn time is noted in the submission.
