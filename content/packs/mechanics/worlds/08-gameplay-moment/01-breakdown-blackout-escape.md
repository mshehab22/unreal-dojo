---
id: m8-moment-plan
title: Plan the Blackout Escape
order: 1
kind: breakdown
difficulty: 4
patterns: [observer, state]
skills: [planning, input, collision, delegates, timers, tracing]
terms: [pawn, overlap-event, dynamic-multicast-delegate, timer-manager]
prerequisites: [m1-boss-drone-handoff, m2-boss-clockwork-hall, m3-boss-vault-room, m4-boss-fuse-yard, m5-boss-watchtower, m6-boss-quest-system]
xp: 120
estimatedMinutes: 25
concepts:
  - Turning a timed walkthrough into a list of mechanics, events, and numbers
  - Deciding which part of a moment is built, which is faked, and which is cut
---

# Spec

A clip cannot be played in this app, so it is described here in writing, with times. It is a two-minute moment called the Blackout Escape.

- 0:00. A power cut. The player stands at one corner of a square yard at night. A searchlight tower stands in the middle of the yard. Its beam is narrow and turns slowly all the time.
- 0:05 to 0:50. Three glowing fuses lie on the corners of the yard, one at a time. The player walks to each with W, A, S, D. Stepping on a fuse picks it up, and a counter on the wall of the fuse box reads 1 of 3, then 2 of 3, then 3 of 3.
- Any time. If the beam falls on the player, an alarm bar on the HUD fills while the beam stays there, and drains slowly when it moves on. If the bar fills, the player is caught and the moment ends.
- 0:50. When the third fuse goes in, the exit gate at the far side of the yard lights up. Until then it is dead and nothing happens when the player stands in it.
- 1:00 to 1:30. The player crosses the yard to the exit. Walking through the powered exit ends the moment as an escape and shows the time.
- 2:00. If neither has happened, the moment ends with the time up. R starts again from a clean yard.

Reference: the stealth sections of Metal Gear Solid and the generator rooms of Alien: Isolation. The player must feel hunted by a beam that is easy to see and easy to cross if they time it.

You are planning, not coding. First write down everything the player does, everything that touches something, and everything that happens on its own, down to the smallest. Then map each to a skill you have already built (input, transforms, collision, timers, tracing, delegates) and mark the gaps. A gap is anything the walkthrough needs that none of your built pieces covers. For each gap say whether you would spike it (build a quick throwaway to find out whether it works), fake it (build a cheaper stand-in that gives the same feel), or cut it (leave it out and say so). Then name the classes, the data, and the events; for each pair, say which side points at the other, which side announces, and which side only listens.

Acceptance:

- Pieces that sense or count (the light, the fuses, the gate) know nothing about the rules that use them.
- Nothing checks the game state on every frame where an event or a timer can do the job.
- Every tunable number in the walkthrough is a property someone can change without code.
- A second round plays exactly like the first after a restart.

# Required Pieces

```yaml
- id: sight
  kind: class
  label: A searchlight that turns and says when it sees the hero through a trace
  why: The hunter, and the only piece that needs the trace.
- id: pickups
  kind: class
  label: Fuses that announce a pickup and a box that counts them and announces when it is powered
  why: Counting without the fuses knowing about the box.
- id: exit
  kind: class
  label: An exit that lets the hero out only when it has power, even if the hero was already standing in it
  why: The goal of the moment, with a power rule and an edge case.
- id: alert
  kind: class
  label: An alert meter that fills and drains from the light's events on a timer and announces a catch
  why: Turns a sensor's yes or no into a gauge without polling.
- id: clock
  kind: class
  label: A clock that owns the time and decides which ending the moment has
  why: One place for the ending, so only one ending can happen.
- id: director
  kind: class
  label: A director that spawns the round and connects the pieces and restarts it
  why: Someone must translate between pieces that know nothing of each other.
- id: cuts
  kind: step
  label: A gap map that names what is faked or cut, such as the fuses glow and the beam is only a cone check
  why: A moment is built to feel right, not to match the clip in every detail.
```

# Reference Plans

```yaml
- id: event-pieces
  title: Small pieces that announce and a director that wires them
  pieces:
    - { id: light, kind: class, label: ADojoM8Searchlight with a cone check and a line trace and an OnSightChanged event, covers: [sight] }
    - { id: fuses, kind: class, label: ADojoM8Fuse with OnCollected and ADojoM8FuseBox that counts and broadcasts OnPowered once, covers: [pickups] }
    - { id: gate, kind: class, label: ADojoM8ExitGate with a zone and SetPowered and OnEscaped that also lets out a pawn already inside, covers: [exit] }
    - { id: meter, kind: class, label: ADojoM8AlertMeter that listens to the light and pulses on a repeating timer and broadcasts OnCaught, covers: [alert] }
    - { id: timekeeper, kind: class, label: ADojoM8MomentClock that listens to the gate and the meter and ends the moment on the first of an escape or a catch or the time limit, covers: [clock] }
    - { id: moment, kind: class, label: A director that spawns the hero and the pieces for each round and wires every event and gives R to start the next round, covers: [director] }
    - { id: gaps, kind: step, label: A written gap map where the glowing fuse and the visible beam are faked by a sphere and a cone check and sound and animation are cut, covers: [cuts] }
  edges:
    - { from: light, to: meter, label: OnSightChanged }
    - { from: fuses, to: moment, label: OnPowered }
    - { from: moment, to: gate, label: SetPowered }
    - { from: gate, to: timekeeper, label: OnEscaped }
    - { from: meter, to: timekeeper, label: OnCaught }
- id: one-referee
  title: Plain props and one referee that checks them on a timer
  pieces:
    - { id: props, kind: class, label: Props for the tower and the fuses and the exit that hold their own state and answer questions but announce nothing, covers: [sight, pickups, exit] }
    - { id: referee, kind: class, label: One referee actor that every 0.25 seconds asks the tower whether it sees the hero and counts the fuses taken and checks the exit, covers: [alert, clock, director] }
    - { id: rules, kind: step, label: The referee keeps the alert level and the time and the ending in one place and restarts the round, covers: [alert, clock, director] }
    - { id: gaps, kind: step, label: A written gap map that fakes the beam as a cone check and cuts sound and animation, covers: [cuts] }
  edges:
    - { from: referee, to: props, label: asks }
    - { from: rules, to: referee, label: state }
```

# Rubric

- The plan lists the mechanics, interactions, and events of the walkthrough, including the small ones such as the counter and the restart.
- Each piece has one job, and the plan says which side points at the other, which side announces, and which only listens.
- The ending is decided in one place, and the plan says what happens if an escape and a catch come close together or the time runs out afterwards.
- Nothing is checked on every frame where an event or a timer would do, and the plan says what is on a timer.
- The gap map names at least two things that are faked or cut and says why the moment still feels right without them.
- Every tunable number from the walkthrough is a property, and a second round resets everything it should.

# Alternative Note

Both plans pass. Small pieces that announce keep every rule in the piece that owns it, so a new sensor or ending is a new listener, and the director is a short list of connections; the cost is more classes and more bindings to set up and remove each round. One referee keeps the whole moment readable in one file and makes a round trivial to reset; the cost is that every new rule edits the referee, and a check on a timer is slightly late. A plan where the light finds the meter and calls it, or where the meter asks the light every frame, fails the first two acceptance lines.
