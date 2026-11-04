---
id: m8-boss-blackout-escape
title: "Boss: the Blackout Escape"
order: 9
kind: boss
difficulty: 5
patterns: [observer, state]
skills: [planning, input, collision, delegates, timers, tracing]
terms: [spawnactor, line-trace, overlap-event, timer-manager, dynamic-multicast-delegate, enhanced-input, input-mapping-context]
prerequisites: [m8-moment-plan, m8-searchlight, m8-fuse-box, m8-exit-gate, m8-alert-meter, m8-moment-clock, m1-move-pad, m1-turntable]
xp: 400
estimatedMinutes: 100
concepts:
  - Five pieces that know nothing of each other, joined into one playable moment by a director that owns no rule
  - A round that starts clean every time, with the player's pawn released before the old pieces go
pieces:
  - m8-searchlight
  - m8-fuse-box
  - m8-exit-gate
  - m8-alert-meter
  - m8-moment-clock
---

# Spec

It is the Blackout Escape from the plan. The moment is played on a flat yard laid out along X (forward) and Y (right), with the director at the origin. The player walks the walker from the input world with W, A, S, D at its own speed (300 units a second).

Every round starts fresh, and the director spawns the whole yard: the hero at the origin, three fuses at (600, 0), (600, 600), and (0, 600), a fuse box needing 3 fuses, an exit gate at (0, 1200) whose zone is 300 wide in X and 200 deep in Y, a searchlight at (300, 300), an alert meter, and a moment clock. Starting a round destroys everything from the round before, after letting the player's controller go of the old hero, and gives the new hero to the player.

The hero has no shape of its own, so the director gives it a solid ball of radius 40 with the Pawn profile; that is what touches the fuses and the exit. Walking onto a fuse collects it. When the third fuse is collected the fuse box announces that it is powered, and the director powers the exit; a hero already standing in the exit when it is powered gets out at once. Walking into the powered exit is the escape.

The searchlight turns 45 degrees a second, sees 800 units, and has a half angle of 20 degrees. It watches the hero. The alert meter listens to the light, pulses every 0.25 seconds, fills by the pulse while the hero is seen, drains at half that pace while not, and catches the hero when it holds 2 seconds. The clock has a limit of 120 seconds, listens to the exit and the meter, and decides the ending: the first of an escape, a catch, or the time limit wins and nothing afterwards changes it.

The director's status line reads the clock's label, the fuses collected, and the alert level, for example `RUNNING | fuses 2/3 | alert 0.5`, and after an ending the label reads `ESCAPED in 41.2 s`, `CAUGHT after 12.0 s`, or `TIME UP`. R starts the next round, only after an ending; before that R does nothing. A C++ director receives keys only after `EnableInput` with the player controller. Reference game: the stealth sections of Metal Gear Solid, where a slow beam is easy to see and crossing it is a decision.

Compiles against earlier quests: m8-searchlight (`Quests/m8-searchlight/DojoM8Searchlight.h`), m8-fuse-box (`Quests/m8-fuse-box/DojoM8Fuse.h` and `Quests/m8-fuse-box/DojoM8FuseBox.h`), m8-exit-gate (`Quests/m8-exit-gate/DojoM8ExitGate.h`), m8-alert-meter (`Quests/m8-alert-meter/DojoM8AlertMeter.h`), m8-moment-clock (`Quests/m8-moment-clock/DojoM8MomentClock.h`), m1-move-pad (`Quests/m1-move-pad/DojoM1Walker.h`), and m1-turntable (`Quests/m1-turntable/DojoM1InputRig.h`, the test rig). The pieces need no additions.

Core numbers are fixed: 3 fuses, the positions above, 800 range, 20 degree half angle, 45 degrees a second, a 0.25 second pulse, 2 seconds to catch, a 120 second limit.

Extensions, in order of importance:

1. A second searchlight that turns the other way, with both lights feeding the one meter.
2. A guard that is spawned when the alert passes 1.0 and walks toward the hero, using a spawn and a timer.
3. A best escape time kept across rounds and shown on the status line.

Feel: tune the beam's speed and width until crossing it feels like a decision, not a coin toss.

# Required Pieces

```yaml
- id: round
  kind: class
  label: A director that spawns the whole yard fresh each round and releases the player before destroying the old one
  why: A second round must start from clean pieces.
- id: walk
  kind: step
  label: The walker from the input world with a solid ball so it touches pickups and the exit
  why: The hero must be able to collect and escape using only the keys.
- id: power
  kind: event
  label: The third fuse powers the exit and a hero already standing there gets out
  why: A pickup counter connected to a goal through an announcement.
- id: hunt
  kind: event
  label: The light sees the hero and the meter fills on a pulse and announces a catch
  why: A sensor turned into a gauge without polling.
- id: ending
  kind: step
  label: The clock decides the first ending and R starts a new round only after it
  why: One ending per round, and a clean restart.
- id: status
  kind: event
  label: A status line built from the clock and the fuse box and the meter
  why: The player's view of the moment, read from state and never polled by the pieces.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director spawns the yard and connects every announcement
  pieces:
    - { id: director, kind: class, label: ADojoM8Moment with the six round actors and an R action set in its own context, covers: [round] }
    - { id: body, kind: step, label: GiveHeroABody attaches a sphere of radius 40 with the Pawn profile to the walker, covers: [walk] }
    - { id: powering, kind: event, label: The director binds the fuse box OnPowered to a handler that calls SetPowered on the gate, covers: [power] }
    - { id: hunting, kind: event, label: The light watches the hero and the meter watches the light, covers: [hunt] }
    - { id: referee, kind: step, label: The clock watches the gate and the meter and the director starts it each round and PressRestart allows R only after an ending, covers: [ending] }
    - { id: line, kind: event, label: GetStatusLine joins the clock label and the fuse count and the alert level, covers: [status] }
  edges:
    - { from: powering, to: director, label: OnPowered }
    - { from: director, to: powering, label: SetPowered on the gate }
    - { from: powering, to: referee, label: OnEscaped }
    - { from: hunting, to: referee, label: OnCaught }
    - { from: referee, to: line, label: the clock label }
- id: placed-pieces
  title: Pieces placed in the level, wired by a thin level Blueprint
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the placed light and fuses and gate and meter and clock, covers: [round] }
    - { id: hero, kind: step, label: The walker is placed with Auto Possess Player and a sphere component added in its Blueprint with the Pawn profile, covers: [walk] }
    - { id: fuse-events, kind: event, label: BeginPlay binds each fuse OnCollected to the box and the box OnPowered to a custom event that calls Set Powered, covers: [power] }
    - { id: sight-events, kind: event, label: BeginPlay binds the light to the meter and calls Watch with the hero, covers: [hunt] }
    - { id: restart, kind: step, label: A custom event resets the box and the gate and the meter and moves the hero and calls Start on the clock and the R key calls it only when the clock has an ending, covers: [ending] }
    - { id: text, kind: event, label: A Text Render is set from the clock label and the box count and the meter level on a short timer, covers: [status] }
  edges:
    - { from: fuse-events, to: level, label: OnCollected and OnPowered }
    - { from: level, to: restart, label: custom event }
    - { from: sight-events, to: restart, label: On Caught }
    - { from: restart, to: text, label: the clock label }
```

# Integration Rubric

- The five pieces are reused without changes, and every rule stays in its piece; the director only spawns, connects, and restarts.
- The light, the fuses, and the gate only announce; the meter listens to the light, the clock listens to the gate and the meter, and the director listens to the fuse box.
- The hero gets its collision ball in code and walks onto fuses and into the exit using only the keys of the input world.
- The exit has no power until the third fuse, and a hero already standing in it when the power comes on gets out at once.
- The moment ends once, with the first of an escape, a catch, or the time limit, and no later event changes the label or the time.
- R does nothing before an ending; after one it starts a clean round, and a second round plays exactly like the first.
- Starting a round releases the player's pawn before destroying it, destroys every piece of the round before, and leaves no binding or timer behind; the director's context and input are removed in EndPlay.
- The tower's speed, range, and width, the pulse, and the time limit are properties a designer can change; the submission gives the tuned beam speed and width with one sentence on why.
