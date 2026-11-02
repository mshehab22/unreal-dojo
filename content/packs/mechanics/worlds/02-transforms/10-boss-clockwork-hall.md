---
id: m2-boss-clockwork-hall
title: "Boss: the clockwork hall"
order: 10
kind: boss
difficulty: 5
patterns: []
skills: [planning, movement, math, time]
terms: [add-actor-offset, interpolation, sweep, timer-manager, world-and-local-space]
prerequisites: [m2-hall-plan, m2-sled, m2-patrol, m2-bumper, m2-dart]
xp: 300
estimatedMinutes: 75
concepts:
  - Four movers with four different rules, built and reset by one hall
  - A hall that only places, schedules, and scores, leaving every motion to the hazards
pieces:
  - m2-sled
  - m2-patrol
  - m2-bumper
  - m2-dart
---

# Spec

It is training day in the clockwork hall, a corridor 2000 units long along the level's X axis. The hero starts at the gate at the origin. A round starts when play begins, and each round builds the hall fresh. Four hazards stand in it:

- The crusher: a patrol at X 500, Y -300, turned 90 degrees so it swings along Y, 600 units out and back at 300 units a second.
- The boulder: a sled at X 1000, Y -700, turned 90 degrees, rolling along its own forward at 350 units a second. At the start of the round, and then every 4 seconds, a new boulder replaces the old one at that spot.
- The bouncer: a bumper at X 1400, Y 0, rolling along Y at 300 units a second between two walls at Y -400 and Y 400 (the wall pieces' default size).
- The dart: every 3 seconds, a dart appears at X 1800, Y 800, facing along -Y, and chases the hero at 500 units a second with a turn rate of 90 degrees a second. A new dart replaces the old one.

Every 0.1 seconds the hall checks the hero against the crusher, the boulder, the bouncer, and the dart. A hazard within 100 units of the hero is a hit: the hero is moved back to the gate, a hit is counted, and a dart that hit is used up. At most one hit is counted per check. When the check finds the hero at X 2000 or beyond, the round is over: the time is frozen, the boulder and dart timers stop, and the board reads `CLEAR in 41.2 s, 2 hits` with the real time and hits. While the round runs, the board reads `Hits: 2`, rewritten only when the hits change.

R starts the next round, but only after a round is over; before that R does nothing. A new round clears every hazard and wall, builds them again, resets the hits and the time, and puts the hero at the gate, so a second round plays exactly like the first. A C++ hall receives keys only after `EnableInput` with the player controller.

Reference game: Fall Guys, where a course of timed obstacles is the whole game and a failed attempt costs only a short walk back.

Compiles against earlier quests: m2-sled (`Quests/m2-sled/DojoM2Sled.h`), m2-patrol (`Quests/m2-patrol/DojoM2Patrol.h`), m2-bumper (`Quests/m2-bumper/DojoM2Bumper.h`, `Quests/m2-bumper/DojoM2Wall.h`), and m2-dart (`Quests/m2-dart/DojoM2Dart.h`). The pieces need no additions.

Core numbers are fixed: 4 hazards, a 2000 unit hall, a 100 unit hit radius, a 0.1 second check, a boulder every 4 seconds, a dart every 3.

Extensions, in order of importance:

1. A fifth hazard, a rising pillar built from the lift quest: it rises when the hero comes within 300 units and falls when the hero leaves, and its top is a hit when the hero is inside it.
2. One shared clock: a clock actor the crusher and boulder read their positions from, so they stay in step and both stop when the clock is paused.
3. A best time and a best hit count across rounds, shown on the board.

Feel: tune the boulder and dart intervals until the hall feels like a rhythm you can learn in three tries, not a lottery.

# Required Pieces

```yaml
- id: build
  kind: class
  label: A hall that builds the four hazards and two walls at fixed spots with their settings
  why: The one place that knows where each hazard stands and how it is tuned.
- id: spaces
  kind: step
  label: The crusher and boulder are turned in the level and move along their own forward, the ball and dart in world directions
  why: Each hazard's path comes from the spot and facing it is given.
- id: schedule
  kind: step
  label: A fresh boulder every 4 seconds and a fresh dart every 3, each replacing the last
  why: The hall's rhythm comes from two timers and no hazard moves itself back.
- id: hits
  kind: step
  label: A hit check every 0.1 seconds, within 100 of the hero, that sends the hero to the gate
  why: Hits are a rule about the hero and the hazards together and do not need a frame each.
- id: finish
  kind: event
  label: Reaching 2000 ends the round with the time and hits on the board and stops the timers
  why: The player's goal, announced once.
- id: restart
  kind: step
  label: R builds a fresh hall only after a round is over
  why: A second round must play exactly like the first.
- id: board
  kind: event
  label: The board changes only when the hits or the round change
  why: The player's record of the round, with no polling.
```

# Reference Plans

```yaml
- id: cpp-hall
  title: A C++ hall actor builds the hazards and runs the timers
  pieces:
    - { id: hall, kind: class, label: ADojoM2Hall with the hero set in Details and a board text render as its root, covers: [build] }
    - { id: spaces, kind: step, label: StartRound spawns the crusher and boulder turned 90 degrees with Direction forward and local space and the bouncer and dart with world headings, covers: [spaces] }
    - { id: schedule, kind: step, label: Two looping timers call ReleaseBoulder and FireDart each destroying the old hazard before spawning the new one, covers: [schedule] }
    - { id: hits, kind: step, label: A 0.1 second looping timer calls CheckHall which measures the hero against each hazard and teleports the hero to the gate on a hit, covers: [hits] }
    - { id: finish, kind: event, label: CheckHall ends the round at X 2000 with EndRound freezing the time and clearing the three timers, covers: [finish] }
    - { id: restart, kind: step, label: PressRestart returns false while the round runs and otherwise calls StartRound which clears every hazard first, covers: [restart] }
    - { id: board, kind: event, label: RefreshBoard is called on a hit and at the start and the end of a round only, covers: [board] }
  edges:
    - { from: hall, to: spaces, label: spawns turned hazards }
    - { from: hall, to: schedule, label: owns the timers }
    - { from: schedule, to: hits, label: replaced hazards are checked }
    - { from: hits, to: finish, label: exit check }
    - { from: restart, to: hall, label: StartRound }
    - { from: hits, to: board, label: RefreshBoard }
- id: blueprint-hall
  title: The level Blueprint builds the hazards and runs the timers
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and each hazard and a Running Boolean and a Hits integer, covers: [build] }
    - { id: spaces, kind: step, label: The BeginPlay graph spawns the hazards with Spawn Actor From Class and sets the rotation of the crusher and boulder to yaw 90, covers: [spaces] }
    - { id: schedule, kind: step, label: Two Set Timer by Event nodes looping every 4 and 3 seconds destroy the old hazard and spawn the new one, covers: [schedule] }
    - { id: hits, kind: step, label: A 0.1 second looping Set Timer by Event measures Get Distance To for each hazard and calls Set Actor Location on the hero for a hit, covers: [hits] }
    - { id: finish, kind: event, label: The same event ends the round at X 2000 by setting Running to false and clearing the timers by handle, covers: [finish] }
    - { id: restart, kind: step, label: The R event behind a branch on Running destroys every spawned hazard and runs the BeginPlay graph again, covers: [restart] }
    - { id: board, kind: event, label: A custom event sets the Text Render text and is called only on a hit and at the start and the end of a round, covers: [board] }
  edges:
    - { from: level, to: spaces, label: BeginPlay graph }
    - { from: level, to: schedule, label: timer handles }
    - { from: hits, to: finish, label: exit check }
    - { from: hits, to: board, label: custom event }
    - { from: restart, to: level, label: BeginPlay graph }
```

# Integration Rubric

- The sled, patrol, bumper, and dart are reused without changes; the hall only places and configures them.
- Hazards only move: none holds the hero, the hall, or the score, and the hall holds the hazards.
- The boulder and crusher get their direction from the facing the hall spawns them with, not from a world axis.
- The hit check is a 0.1 second timer on a 100 unit radius, never Tick; a hit sends the hero to the gate, counts once per check, and uses up a dart.
- The exit at X 2000 ends the round once: the time freezes, the timers stop, and no further hits count.
- R does nothing while a round runs; a new round clears and rebuilds every hazard and wall, and resets the hits, the time, and the hero.
- The board changes only when the hits or the round change, with the real time and hits at the finish.
- The exit, the hit radius, and the three intervals are properties a designer can tune; every timer is cleared in EndPlay or at the end of the round; the submission gives the tuned boulder and dart intervals with one sentence on why.
