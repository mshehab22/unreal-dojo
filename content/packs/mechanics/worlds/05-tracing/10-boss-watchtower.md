---
id: m5-boss-watchtower
title: "Boss: the watchtower"
order: 10
kind: boss
difficulty: 5
patterns: []
skills: [planning, collision, math, time]
terms: [line-trace, sweep, object-type-query, debug-draw, timer-manager]
prerequisites: [m5-tower-plan, m5-sightline, m5-laser, m5-tracing-habits]
xp: 300
estimatedMinutes: 75
concepts:
  - Two sentries and a laser, each answering a different question about the world, built and scored by one tower
  - A tower that places, schedules, and scores, leaving every look and every beam to the pieces
pieces:
  - m5-sightline
  - m5-laser
---

# Spec

It is training night in the watchtower yard, a strip 2000 units long along the level's X axis. The hero starts at the gate at the origin. A round starts when play begins, and each round builds the yard fresh. The yard holds:

- The first sentry: a sight piece at X 800, Y -600, turned 90 degrees so it looks along Y.
- The second sentry: a sight piece at X 1400, Y 600, turned -90 degrees so it looks along -Y.
- Both sentries see 1200 units, with a cone 45 degrees to either side of straight ahead.
- The pillar: a solid static block at X 800, Y -300, wide along X (its default size), which hides whatever stands behind it from the first sentry.
- The laser fence: a laser piece at X 1300, Y -500, turned 90 degrees, allowed no bounces and with a segment length of 1100, so its beam runs across the strip along Y.

Every 0.1 seconds the tower makes its check, in this order. Each sentry looks at the hero. If either sees the hero, the awareness rises by 1 times the check interval, otherwise it falls by 0.5 times the check interval; it never goes below 0 or above 1. When the awareness is full, an alarm sounds: the alarm is counted, the hero is moved back to the gate, and the awareness goes back to 0. If no alarm sounded, the laser is fired, and a hero within 60 units of any part of its beam is zapped: the zap is counted and the hero is moved back to the gate. At most one send-back happens per check. If neither happened and the hero is at X 2000 or beyond, the round is over: the time is frozen, the timer stops, and the board reads `CLEAR in 41.2 s, 2 alarms, 1 zaps` with the real time and counts. While the round runs, the board reads `Alarms: 2, Zaps: 1`, rewritten only when the counts change.

R starts the next round, but only after a round is over; before that R does nothing. A new round clears every sentry, the laser, and the pillar, builds them again, resets the counts, the awareness, and the time, and puts the hero at the gate, so a second round plays exactly like the first. A C++ tower receives keys only after `EnableInput` with the player controller.

The hero in the tests is a capsule shaped like a game character's, and the tests move it by setting its location.

Reference game: Metal Gear Solid, where a cone of vision, a hiding place, and a meter that fills and drains are the whole game.

Compiles against earlier quests: m5-sightline (`Quests/m5-sightline/DojoM5Eye.h`) and m5-laser (`Quests/m5-laser/DojoM5Laser.h`). The pieces need no additions.

Core numbers are fixed: 2 sentries, 1 pillar, 1 laser, a 2000 unit strip, a 1200 unit sight, a 45 degree half angle, a 0.1 second check, a fill of 1 a second, a drain of 0.5 a second, a zap radius of 60.

Extensions, in order of importance:

1. A gate at X 1700 that closes across the strip after an alarm, one step at each check, asking the feeler from the feeler quest whether anyone stands in its way before every step and waiting if so.
2. Sentries that scan: each turns slowly through 60 degrees and back, so the cone sweeps across the strip instead of staring at one spot.
3. A second laser, bounced off a mirror, that crosses the strip a second time.

Feel: tune the fill and drain rates until slipping past the sentries feels like a decision and not like luck.

# Required Pieces

```yaml
- id: build
  kind: class
  label: A tower that builds two sentries and a pillar and a laser at fixed spots with their settings
  why: The one place that knows where each piece stands and how it is tuned.
- id: sight
  kind: step
  label: Each check asks both sentries whether they see the hero
  why: The look belongs to the sentry, and the question belongs to the tower.
- id: meter
  kind: step
  label: The awareness rises by the fill rate times the interval while seen and falls by the drain rate while hidden
  why: The player's chance to slip away comes from two rates and a clamp.
- id: alarm
  kind: event
  label: A full awareness counts an alarm, sends the hero back, and empties the awareness
  why: Once per fill, not every check while it is full.
- id: fence
  kind: step
  label: The laser is fired each check and a hero within 60 units of its beam is zapped and sent back
  why: The beam is a thing to measure the hero against, and the zap is a rule about both together.
- id: checks
  kind: step
  label: One looping timer of 0.1 seconds runs the whole check in a fixed order
  why: Nothing here needs a frame each, and a fixed order keeps one send-back per check.
- id: finish
  kind: event
  label: Reaching 2000 ends the round with the time and counts on the board and stops the timer
  why: The player's goal, announced once.
- id: restart
  kind: step
  label: R builds a fresh yard only after a round is over
  why: A second round must play exactly like the first.
- id: board
  kind: event
  label: The board changes only when the counts or the round change
  why: The player's record of the round, with no polling.
```

# Reference Plans

```yaml
- id: cpp-tower
  title: A C++ tower actor builds the yard and runs the timer
  pieces:
    - { id: tower, kind: class, label: ADojoM5Tower with the hero set in Details and a board text render as its root, covers: [build] }
    - { id: checks, kind: step, label: StartRound spawns the pieces and sets a looping 0.1 second timer that calls CheckYard, covers: [checks] }
    - { id: sight, kind: step, label: CheckYard calls CanSee on each sentry with the hero, covers: [sight] }
    - { id: meter, kind: step, label: A float meter is clamped between 0 and 1 and moved by the fill or drain rate times the interval, covers: [meter] }
    - { id: alarm, kind: event, label: When the meter is full CheckYard counts the alarm and teleports the hero to the gate and zeroes the meter and skips the rest of the check, covers: [alarm] }
    - { id: fence, kind: step, label: Otherwise CheckYard fires the laser and measures the hero against each segment of its path, covers: [fence] }
    - { id: finish, kind: event, label: CheckYard ends the round at X 2000 with EndRound freezing the time and clearing the timer, covers: [finish] }
    - { id: restart, kind: step, label: PressRestart returns false while the round runs and otherwise calls StartRound which destroys the old pieces first, covers: [restart] }
    - { id: board, kind: event, label: RefreshBoard is called on an alarm or a zap and at the start and the end of a round only, covers: [board] }
  edges:
    - { from: tower, to: checks, label: owns the timer }
    - { from: checks, to: sight, label: asks each sentry }
    - { from: sight, to: meter, label: seen or not }
    - { from: meter, to: alarm, label: full }
    - { from: alarm, to: fence, label: no send-back yet }
    - { from: fence, to: finish, label: exit check }
    - { from: restart, to: tower, label: StartRound }
- id: blueprint-tower
  title: The level Blueprint builds the yard and runs the timer
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and each piece and a Running Boolean and Meter and Alarms and Zaps, covers: [build] }
    - { id: checks, kind: step, label: The BeginPlay graph spawns the pieces with Spawn Actor From Class and starts a looping Set Timer by Event of 0.1 seconds, covers: [checks] }
    - { id: sight, kind: step, label: The timer event calls Can See on each sentry with the hero and combines the results with an OR, covers: [sight] }
    - { id: meter, kind: step, label: A Branch on the result adds the fill step or subtracts the drain step and the value is clamped between 0 and 1, covers: [meter] }
    - { id: alarm, kind: event, label: A Branch on a full meter increments Alarms and calls Set Actor Location on the hero and sets Meter to 0 and ends the event, covers: [alarm] }
    - { id: fence, kind: step, label: Otherwise the event calls Fire on the laser and measures Get Distance To for the points of the path against the zap radius, covers: [fence] }
    - { id: finish, kind: event, label: The same event ends the round at X 2000 by setting Running to false and clearing the timer by handle, covers: [finish] }
    - { id: restart, kind: step, label: The R event behind a branch on Running destroys every spawned piece and runs the BeginPlay graph again, covers: [restart] }
    - { id: board, kind: event, label: A custom event sets the Text Render text and is called only on an alarm or a zap and at the start and the end of a round, covers: [board] }
  edges:
    - { from: level, to: checks, label: BeginPlay graph }
    - { from: checks, to: sight, label: timer event }
    - { from: fence, to: finish, label: exit check }
    - { from: alarm, to: board, label: custom event }
    - { from: restart, to: level, label: BeginPlay graph }
```

# Integration Rubric

- The sight and laser pieces are reused without changes; the tower only places, configures, and asks them.
- Sentries only look: none holds the hero, the awareness, or the counts, and the tower holds the sentries.
- Every look asks the world about the first thing in the line, not only whether something was hit, and the pillar hides the hero from the sentry it stands in front of.
- The check is a 0.1 second timer, never Tick; the awareness is clamped between 0 and 1, an alarm sounds once per fill, and at most one send-back happens per check.
- The exit at X 2000 ends the round once: the time freezes, the timer stops, and no further alarms or zaps count.
- R does nothing while a round runs; a new round clears and rebuilds every piece and resets the counts, the awareness, the time, and the hero.
- The board changes only when the counts or the round change, with the real time and counts at the finish.
- The exit, the sight range, the cone angle, the fill and drain rates, the zap radius, and the check interval are properties a designer can tune; every timer is cleared in EndPlay or at the end of the round, and the submission states how every look and the beam are drawn while tuning.
