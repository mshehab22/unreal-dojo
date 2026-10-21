---
id: f1-dash-with-cooldown
title: Plan a dash with a cooldown
order: 11
kind: breakdown
difficulty: 2
patterns: [component, observer]
skills: [planning]
terms: [character, character-movement-component, launch-character, input-action, actor-component, timer-manager, multicast-delegate, editanywhere]
prerequisites: [f1-practice-bell]
xp: 90
estimatedMinutes: 15
concepts:
  - Splitting a mechanic into classes, components, data, events, and steps
  - Deciding where the cooldown lives so other abilities can reuse it
---

# Spec

The player's character can dash. Pressing the dash input throws the character 600 units along the direction the camera faces, flattened so a dash never lifts off the ground. For 0.15 seconds after the press the player's movement input is ignored, so the dash cannot be steered. Dashing again is refused for 1.2 seconds. A dash that meets a wall ends there: the character stops against it instead of sliding along it at dash speed. A round wedge on the HUD fills back up while the cooldown runs and is full when a dash is ready.

You are planning, not coding. Several of the pieces use engine features later worlds teach in depth (input actions, timers, delegates); here you only decide what the pieces are, who owns what, and who tells whom.

Acceptance:

- Pressing dash during the cooldown does nothing at all: no movement, no sound, no reset of the cooldown.
- The 600 units, 0.15 seconds, and 1.2 seconds are tunable by a designer without a rebuild.
- The HUD wedge never asks every frame whether the dash is ready; it is told.
- The cooldown can be reused by a second ability, such as a shield, without copying code.
- Dashing at a wall at an angle ends the dash at the wall; the character does not slide along it at dash speed.

# Required Pieces

```yaml
- id: dash-input
  kind: step
  label: Bind a dash input action to the dash
  why: The player needs one button, and the binding is where pressing becomes a request to dash.
- id: dash-executor
  kind: class
  label: Something on the character that performs the dash
  why: One place must turn a request into a launch along the flattened camera direction.
- id: cooldown
  kind: component
  label: A cooldown that can start and answer whether it is ready
  why: The refusal rule must live somewhere reusable, not inside the dash code.
- id: movement-lock
  kind: step
  label: Ignore movement input for the lock window
  why: Without it the player can steer mid-dash and the dash loses its shape.
- id: wall-stop
  kind: step
  label: Stop the dash on a blocking hit
  why: The movement component never lets the character pass through a wall, but a launched character hitting one at an angle slides along it and keeps its speed.
- id: dash-events
  kind: event
  label: Dash started and cooldown ready events
  why: The HUD and effects learn about the dash by listening, not by checking every frame.
- id: tunables
  kind: data
  label: Distance, lock time, and cooldown as editable values
  why: Designers tune the feel without asking a programmer to rebuild.
- id: hud-wedge
  kind: class
  label: HUD cooldown wedge that listens to the events
  why: Shows the player when the next dash is ready and proves the events work.
```

# Reference Plans

```yaml
- id: dash-component
  title: A dash component owns the dash and its cooldown
  pieces:
    - { id: input, kind: step, label: Character binds the dash input action to the dash component's TryDash, covers: [dash-input] }
    - { id: dash, kind: component, label: UDojoDashComponent with TryDash that launches its owner character, covers: [dash-executor] }
    - { id: cooldown, kind: component, label: UDojoCooldownComponent with StartCooldown and IsReady backed by a timer, covers: [cooldown] }
    - { id: lock, kind: step, label: Dash component ignores move input on the controller and restores it when a short timer ends, covers: [movement-lock] }
    - { id: wall, kind: step, label: Dash component listens to the owner's hit event and zeroes the velocity while a dash is active, covers: [wall-stop] }
    - { id: events, kind: event, label: OnDashStarted on the dash component and OnCooldownReady on the cooldown component, covers: [dash-events] }
    - { id: settings, kind: data, label: EditAnywhere distance and lock time on the dash component and duration on the cooldown component, covers: [tunables] }
    - { id: wedge, kind: class, label: Cooldown wedge widget bound to both events, covers: [hud-wedge] }
  edges:
    - { from: input, to: dash, label: a press calls TryDash }
    - { from: dash, to: cooldown, label: asks IsReady and then starts the cooldown }
    - { from: dash, to: lock, label: starts the lock window }
    - { from: dash, to: wall, label: arms the wall stop for the dash }
    - { from: dash, to: events, label: broadcasts the dash start }
    - { from: cooldown, to: events, label: broadcasts ready when its timer ends }
    - { from: events, to: wedge, label: the wedge empties and refills }
    - { from: settings, to: dash, label: values read when dashing }
- id: dash-on-character
  title: The character dashes and borrows a reusable cooldown
  pieces:
    - { id: input, kind: step, label: SetupPlayerInputComponent binds the dash action to ADojoDashCharacter::Dash, covers: [dash-input] }
    - { id: character, kind: class, label: ADojoDashCharacter with a Dash function that launches itself with LaunchCharacter, covers: [dash-executor] }
    - { id: cooldown, kind: component, label: UDojoCooldownComponent added to the character in the constructor, covers: [cooldown] }
    - { id: lock, kind: step, label: Character skips its move handler while a lock flag set by a timer is on, covers: [movement-lock] }
    - { id: sweep, kind: step, label: Character sweeps its capsule along the dash path first and shortens the launch to the first blocking hit, covers: [wall-stop] }
    - { id: events, kind: event, label: OnDashStarted on the character and OnCooldownReady on the cooldown component, covers: [dash-events] }
    - { id: settings, kind: data, label: A dash settings data asset holding distance and lock time and cooldown, covers: [tunables] }
    - { id: wedge, kind: class, label: Cooldown wedge widget that binds to the character and its cooldown component, covers: [hud-wedge] }
  edges:
    - { from: input, to: character, label: a press calls Dash }
    - { from: character, to: cooldown, label: checks IsReady and starts it }
    - { from: character, to: lock, label: sets the lock flag and its timer }
    - { from: character, to: sweep, label: measures the free distance before launching }
    - { from: character, to: events, label: broadcasts the dash start }
    - { from: cooldown, to: events, label: broadcasts ready }
    - { from: events, to: wedge, label: the wedge refills }
    - { from: settings, to: character, label: values read at BeginPlay }
```

# Rubric

- The cooldown is its own component (or clearly reusable piece) with a start call and a ready query, not a timestamp buried in the dash code.
- A press during the cooldown is refused before anything moves, and the refusal does not restart the cooldown.
- Distance, lock time, and cooldown are named as editable data.
- The HUD learns about dashes and readiness through events; nothing polls in Tick.
- The plan states a wall stop, by sweep before launching or by reacting to a hit.
- The dependency direction is stated: the dash and cooldown know nothing about the HUD.

# Alternative Note

Both reference plans pass. The first keeps the character thin and lets any pawn gain a dash by adding a component, which suits a game where enemies dash too. The second keeps the dash on the character, which is simpler when only the player dashes, and its sweep stops the dash before it starts instead of after the hit. Either way, the cooldown component is the piece worth extracting: the same start and ready pair will serve a shield, a grenade, and a door that cannot be spammed. A plan that uses the Gameplay Ability System also passes if it names where the cooldown, the lock, and the events live, though that system is a much heavier tool than this mechanic needs.
