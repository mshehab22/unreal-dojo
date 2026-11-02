---
id: m1-controls-plan
title: Plan the controls of a drone yard
order: 1
kind: breakdown
difficulty: 3
patterns: [state]
skills: [planning, input]
terms: [pawn, player-controller, possession, subsystem]
prerequisites: [f4-boss-course-setup]
xp: 100
estimatedMinutes: 20
concepts:
  - Deciding which controls belong to which pawn and which belong to the whole session
  - Layering controls so a pause or a handoff sits above them without touching them
---

# Spec

A training yard has a hero the player walks and two drones. The hero walks with W, A, S, D. The scanner drone turns on the spot with A and D. The cannon drone charges a shot while Space is held, and fires when Space is let go: a light shot for a short hold, a heavy one for a full charge. Standing within 250 units of a drone, F takes it over; F again hands control back to the hero. Tab pauses everything: while paused, none of the movement keys, Space, or F do anything, but Tab still works. A drill is done when the scanner has turned a quarter circle, the cannon has fired a heavy shot, and the hero is back in control. R starts a new drill, only after the last one is done, with everything fresh.

You are planning, not coding. Name the classes, the input actions and mapping contexts, and who adds and removes each context. For every key, say which layer owns it and what sits above it.

Acceptance:

- A pawn that is not being controlled answers to no keys, and each pawn's controls arrive and leave with the controller.
- The pause stops every control without any pawn knowing the pause exists.
- Hitting a key held down while control changes must not fire it by accident.
- A second drill plays exactly like the first.

# Required Pieces

```yaml
- id: pawn-controls
  kind: class
  label: Each pawn brings its own action, mapping context, and bindings
  why: Controls that follow the pawn mean a handoff needs no extra input code.
- id: layers
  kind: data
  label: A priority order for the layers, pawn controls at the bottom, handoff keys above, pause on top
  why: Layers decide which context is offered a key first.
- id: ownership
  kind: step
  label: Who adds and removes each context as control changes hands
  why: A context left on the player keeps answering keys for a pawn nobody controls.
- id: handoff
  kind: step
  label: The handoff key takes over the nearest drone in reach and hands control back
  why: The player's way between pawns, with a reach rule and a tie rule.
- id: pause
  kind: class
  label: A pause that swallows the controls without touching them
  why: Menus and pauses must work over any pawn.
- id: drill
  kind: event
  label: The finish check made when control returns to the hero
  why: The drill needs no polling because control returning is the moment it can finish.
- id: round
  kind: step
  label: A restart that clears and spawns everything fresh, only after the drill
  why: A second drill must start from the same state as the first.
```

# Reference Plans

```yaml
- id: pawn-owned
  title: Every pawn owns its controls and a director owns the handoff
  pieces:
    - { id: walker, kind: class, label: ADojoM1Walker with a two-dimensional Move action and its own context added when a controller arrives and removed when it leaves, covers: [pawn-controls, ownership] }
    - { id: drones, kind: class, label: A scanner pawn with a one-dimensional Turn action and a cannon pawn with a Charge action on a Hold trigger and each with its own context in the same way, covers: [pawn-controls, ownership] }
    - { id: pause, kind: class, label: A pause component that adds a high-priority context mapping the blocked keys to a do-nothing action that consumes them, covers: [pause, layers] }
    - { id: director, kind: class, label: A director actor with its own context for F and Tab and R at a priority between the pawns and the pause, covers: [layers, handoff, round] }
    - { id: finish, kind: event, label: The director checks the scanner's turn and the cannon's last shot when it hands control back to the hero, covers: [drill] }
  edges:
    - { from: director, to: walker, label: Possess }
    - { from: director, to: drones, label: Possess }
    - { from: director, to: pause, label: Toggle }
    - { from: walker, to: pause, label: sits below }
- id: controller-owned
  title: A player controller owns the modes and the pawns only bind
  pieces:
    - { id: controller, kind: class, label: A player controller subclass with a table of mode name to mapping context and priority, covers: [layers, ownership, handoff] }
    - { id: pawns, kind: class, label: Pawns that only bind their actions in SetupPlayerInputComponent and hold no context at all, covers: [pawn-controls] }
    - { id: modes, kind: step, label: The controller swaps the pawn mode context whenever it possesses a different pawn, covers: [ownership] }
    - { id: paused, kind: step, label: A pause mode in the same table at the highest priority that maps the blocked keys to a consuming action, covers: [pause] }
    - { id: drill-check, kind: event, label: The controller checks the scanner and the cannon when it takes the hero back, covers: [drill] }
    - { id: restart, kind: step, label: The controller respawns the pawns and possesses the hero on R after the drill, covers: [round] }
  edges:
    - { from: controller, to: pawns, label: Possess }
    - { from: controller, to: paused, label: add and remove context }
    - { from: modes, to: pawns, label: swaps contexts }
```

# Rubric

- Each pawn's controls arrive with its controller and leave with it, and the plan says who calls AddMappingContext and RemoveMappingContext.
- The layer order is stated with priority numbers or an order: pawn controls lowest, the handoff keys above them, the pause above everything.
- The pause works by a layer that consumes keys, not by every handler checking a flag.
- The plan says what happens to a key that is held down while a context is added.
- The drill ends at a stated moment without polling, and the plan says what a new drill resets.
- Every binding is made where the pawn gets its input component, and nothing binds keys in a constructor.

# Alternative Note

Both plans pass. Pawn-owned controls keep each machine self-contained, so a new drone brings everything with it and the controller stays generic; the cost is a little repeated add-and-remove code in every pawn. Controller-owned modes keep the layers in one table and make pawns trivial, so changing a priority is one edit; the cost is that the controller must know every kind of pawn's context and a new pawn means editing it. A plan where the pause is a flag checked by every handler, or where a pawn adds the pause context for itself, fails the second acceptance line.
