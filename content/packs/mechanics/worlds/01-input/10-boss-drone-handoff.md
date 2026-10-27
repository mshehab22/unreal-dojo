---
id: m1-boss-drone-handoff
title: "Boss: the drone handoff"
order: 10
kind: boss
difficulty: 5
patterns: [state]
skills: [planning, input]
terms: [input-mapping-context, local-player-subsystem, input-consumption, etriggerevent, setup-player-input-component, possession, player-controller]
prerequisites: [m1-controls-plan, m1-turntable, m1-move-pad, m1-pause-context, m1-charge-meter]
xp: 360
estimatedMinutes: 90
concepts:
  - Controls that follow the pawn, layered under a director's keys and a pause
  - A director that only hands control over and checks the drill, while each pawn owns its input
pieces:
  - m1-turntable
  - m1-move-pad
  - m1-pause-context
  - m1-charge-meter
---

# Spec

It is drill day in the drone yard. The hero is an `ADojoM1Walker` at the origin. The scanner is an `ADojoM1Turntable` waiting 500 units ahead of the hero, along X. The cannon is an `ADojoM1Charger` waiting 500 units behind. The player starts every round controlling the hero.

F is the handoff key. While the hero is in control, F takes over the nearest drone within 250 units of the hero; between two equally near drones the scanner wins, and with no drone in reach F does nothing. While a drone is in control, F hands control back to the hero. A pawn that is not in control answers to no keys. Tab opens and closes a pause. While the pause is open, W, A, S, D, Space, and F do nothing, so the pawn in control cannot move, turn, charge, or be handed back, but Tab still works. The pause belongs to the director, not to any pawn.

A drill is done at the moment control returns to the hero if the scanner has turned at least 90 degrees from where it started (either way) and the cannon's last shot was Heavy. Then the round ends, handoff does nothing, and the status line reads `DRILL DONE in 41.2 s` with the time since the round began. Before that the status line is the mode label: `HERO`, `SCANNER`, or `CANNON`, with ` PAUSED` added while the pause is open.

R starts the next round, only after the drill is done; before that, R does nothing. Starting a round destroys the old hero and drones, spawns a fresh hero, scanner, and cannon at their places, closes the pause, and gives the hero to the player. A second round plays exactly like the first. Reference game: Kerbal Space Program's switch of control between vessels, with the game's pause menu over it all.

Compiles against earlier quests: m1-turntable (`Quests/m1-turntable/DojoM1Turntable.h`, and `Quests/m1-turntable/DojoM1InputRig.h` for tests), m1-move-pad (`Quests/m1-move-pad/DojoM1Walker.h`), m1-pause-context (`Quests/m1-pause-context/DojoM1PauseSwitch.h`), and m1-charge-meter (`Quests/m1-charge-meter/DojoM1Charger.h`). The pieces need no additions.

Core numbers are fixed: 500 to each drone, 250 to take one over, 90 degrees to turn, and the pieces' own numbers (300 units a second, 90 degrees a second, a one second full charge).

Layers: the pawns' own controls sit at priority 0, the director's keys (F, Tab, R) at 5, and the pause above them both.

Extensions, in order of importance:

1. Taking over the cannon only while Shift is held, using a Chorded Action trigger on the handoff mapping.
2. Letting the player press a key to rebind the handoff key at runtime, by writing a new mapping into a runtime copy of the director's context.
3. A prompt string that shows F or the gamepad button depending on which device the last input came from.

Feel: tune the reach and the full charge time until taking over a drone feels like walking up to it, not like hunting for a spot.

# Required Pieces

```yaml
- id: drill-director
  kind: class
  label: A director that spawns the hero and both drones and owns the handoff, pause, and restart keys
  why: The one place that moves control and judges the drill, owning no pawn input.
- id: layers
  kind: data
  label: Context priorities with pawn controls at 0, the director's keys above them, and the pause above both
  why: Layer order decides which context is offered each key first.
- id: handoff
  kind: step
  label: F takes over the nearest drone within 250 with the scanner winning ties and hands control back
  why: The player's way between pawns, with a reach rule and a tie rule.
- id: pause
  kind: step
  label: Tab opens a pause that blocks movement, Space, and F but not Tab
  why: A pause that works over any pawn without the pawn knowing.
- id: finish
  kind: event
  label: The drill ends when control returns to the hero after a 90 degree turn and a heavy shot
  why: Control returning is the moment the drill can finish, so nothing polls.
- id: round
  kind: step
  label: R starts a fresh round only after the drill and a second round plays like the first
  why: A second round must start from clean pawns.
- id: status
  kind: event
  label: The status line shows the mode label with PAUSED and then the drill time
  why: The player's record of what is happening, built from state and never polled.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director with its own context and a pause component
  pieces:
    - { id: director, kind: class, label: ADojoM1DroneHandoff with the hero and both drones and its own actions for F and Tab and R, covers: [drill-director] }
    - { id: layers, kind: data, label: The director adds its context at priority 5 and its pause component sits at priority 10 above the pawns at 0, covers: [layers] }
    - { id: handoff, kind: step, label: PressHandoff finds the nearest drone within 250 by distance from the hero and possesses it or possesses the hero again, covers: [handoff] }
    - { id: pause, kind: step, label: A UDojoM1PauseSwitch component whose blocked keys include F and which PressPause toggles, covers: [pause] }
    - { id: finish, kind: event, label: ReturnToHero checks the scanner's yaw and the cannon's last shot right after possessing the hero, covers: [finish] }
    - { id: round, kind: step, label: StartRound closes the pause and destroys the old pawns and spawns fresh ones and PressRestart calls it only when the drill is done, covers: [round] }
    - { id: status, kind: event, label: GetStatusLine builds the text from the controlled pawn and the pause and the stored round time, covers: [status] }
  edges:
    - { from: director, to: handoff, label: Possess }
    - { from: director, to: pause, label: Toggle }
    - { from: handoff, to: finish, label: control returned }
    - { from: finish, to: round, label: drill done }
- id: controller-handoff
  title: A player controller subclass owns the keys and the modes
  pieces:
    - { id: controller, kind: class, label: A player controller subclass that binds F and Tab and R in SetupInputComponent and owns the hero and both drones, covers: [drill-director, handoff] }
    - { id: layers, kind: data, label: A table of mode to mapping context and priority that the controller applies when it possesses a pawn, covers: [layers] }
    - { id: pause, kind: step, label: A paused mode in the table above every other priority that maps the blocked keys to a consuming action, covers: [pause] }
    - { id: finish, kind: event, label: OnPossess of the hero checks the scanner's yaw and the cannon's last shot, covers: [finish] }
    - { id: round, kind: step, label: R respawns the three pawns through the controller only when the drill is done, covers: [round] }
    - { id: status, kind: event, label: A status function the HUD calls that reads the controller's mode and the pause, covers: [status] }
  edges:
    - { from: controller, to: layers, label: add and remove context }
    - { from: controller, to: finish, label: OnPossess }
    - { from: finish, to: round, label: drill done }
```

# Integration Rubric

- The four pieces are reused without changes: each pawn adds and removes its own context as its controller changes, and no pawn knows the director or the pause.
- The layers are pawn controls at 0, the director's keys at 5, and the pause above both, and the submission says why the pause must be above the director's layer.
- F takes over the nearest drone within 250, the scanner wins a tie, nothing happens out of reach, and F hands control back from a drone.
- While paused, W, A, S, D, Space, and F do nothing and Tab still works; the pause is a layer that consumes keys, not a flag that handlers check.
- The drill ends only at the moment control returns to the hero, with the scanner turned at least 90 degrees and the cannon's last shot Heavy, and the status line then reads the round time.
- R does nothing before the drill is done; after it, a fresh hero and drones are spawned, the pause is closed, and the second round plays exactly like the first.
- Every context the director adds is removed in EndPlay, and nothing in the director is checked every frame in Tick.
- The reach, the drone distance, and the turn goal are properties a designer can change; the submission gives the tuned reach and one sentence on why.
