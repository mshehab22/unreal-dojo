---
id: m5-tower-plan
title: Plan a watchtower
order: 1
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, collision]
terms: [timer-manager, tick]
prerequisites: [m2-boss-clockwork-hall]
xp: 80
estimatedMinutes: 20
concepts:
  - Choosing what each sentry asks the world and how often it asks
  - Deciding who holds the sentries, who keeps the awareness, and who sounds the alarm
---

# Spec

A training yard is a strip 2000 units long, running along the level's X axis. The hero starts at the gate and has to reach the far end without being caught. Three things watch the strip:

- Two sentries, each standing off to one side of the strip and looking across it. A sentry sees the hero only when the hero is inside its cone and its range, and nothing solid stands in the line between them.
- A pillar in the strip. Anything behind it is hidden from the sentry on its side.
- A laser fence that crosses the strip as a straight beam. A hero standing close to the beam is zapped.

The sentries do not catch the hero at once. They share an awareness that fills while either of them sees the hero and drains while neither does. When it is full, an alarm sounds: it is counted, the hero goes back to the gate, and the awareness starts again from empty. A zap also sends the hero back to the gate. Reaching the end ends the round with the time, the alarms, and the zaps. A new round plays exactly like the first.

You are planning, not coding. Name the classes, the data, and the order of events; for each question the world is asked, say what is asked, by what kind of query, and how often.

Acceptance:

- A sentry never owns the hero, the awareness, or the alarm: it answers a question when it is asked.
- The look and the awareness are decided on a timer a few times a second, not every frame.
- Every query can be seen on screen while the yard is being tuned.
- A second round plays exactly like the first.

# Required Pieces

```yaml
- id: eyes
  kind: class
  label: One class for a sentry's eye that answers whether it can see a given actor
  why: The look is a rule about one sentry, a position, a cone, and what stands in the way, and it should be testable alone.
- id: cone
  kind: step
  label: An angle test and a range test before any query is made
  why: A cheap check can rule most positions out, so the expensive query only runs for the few that pass.
- id: blockers
  kind: step
  label: A line from the eye to the hero that counts as seen only if the first thing met is the hero
  why: A pillar, another character, or a wall has to hide the hero, and a hero is not seen merely because nothing was hit.
- id: meter
  kind: data
  label: An awareness number that rises while seen and falls while hidden
  why: The player gets a chance to slip away, and the rates are what a designer tunes.
- id: checks
  kind: step
  label: One repeating timer that asks the sentries, updates the awareness, and checks the beam
  why: Nothing here needs a frame each, and one timer keeps the order of the checks the same every time.
- id: alarm
  kind: event
  label: A full awareness counts an alarm, sends the hero back, and empties the awareness
  why: The consequence is a rule about the awareness and the hero together, and it should happen once, not every check while the awareness is full.
- id: fence
  kind: step
  label: A laser beam traced across the strip and a distance test from the hero to it
  why: A beam is a thing a trace can find, and zapping is a rule about the hero standing near it.
- id: round
  kind: class
  label: A tower that builds the yard, keeps the counts, ends the round, and starts the next
  why: Someone has to own the round, the score, and the schedule.
- id: tunables
  kind: data
  label: Range, cone, fill and drain rates, beam reach, and the check interval as settings
  why: A designer tunes the yard without opening the code.
- id: drawing
  kind: step
  label: Every sentry look and the beam drawn as debug lines in a colour for the result
  why: A query you cannot see cannot be tuned.
```

# Reference Plans

```yaml
- id: tower-checks
  title: The tower holds the sentries and runs the checks
  pieces:
    - { id: eye, kind: class, label: A sentry class with a CanSee function taking the actor to look at, covers: [eyes, blockers, drawing] }
    - { id: look, kind: step, label: CanSee rejects by range and by the dot product with the sentry's forward before it traces, covers: [cone] }
    - { id: trace, kind: step, label: The trace goes from the eye to the hero and only the first blocker counts and the eye leaves itself out, covers: [blockers] }
    - { id: beam, kind: class, label: A laser class that traces its beam and reports the points it touched, covers: [fence] }
    - { id: tower, kind: class, label: A tower that spawns the sentries and the laser and owns a looping timer for the checks and the awareness and the counts, covers: [round, checks, meter, alarm] }
    - { id: settings, kind: data, label: Range and angle and rates and radius are properties the tower sets when it spawns each piece, covers: [tunables] }
  edges:
    - { from: tower, to: eye, label: asks CanSee on each check }
    - { from: tower, to: beam, label: fires on each check and measures the hero against the points }
    - { from: tower, to: settings, label: reads the numbers }
- id: sentry-reports
  title: The sentries report to an awareness component
  pieces:
    - { id: eye, kind: class, label: A sentry class that looks on its own timer and broadcasts Spotted and Lost, covers: [eyes, blockers, drawing] }
    - { id: look, kind: step, label: The look rejects by range and angle first and then traces from the eye to the target, covers: [cone, blockers] }
    - { id: beam, kind: class, label: A laser class with a sweep of its path and a broadcast when something crosses it, covers: [fence] }
    - { id: awareness, kind: component, label: An awareness component that counts how many sentries see the hero and fills and drains on its own timer and broadcasts OnAlarm, covers: [meter, checks, alarm] }
    - { id: tower, kind: class, label: A tower that listens to OnAlarm and counts the alarms and the zaps and runs the round, covers: [round] }
    - { id: settings, kind: data, label: A data asset of rates and ranges read by the tower and the sentries, covers: [tunables] }
  edges:
    - { from: eye, to: awareness, label: Spotted and Lost }
    - { from: awareness, to: tower, label: OnAlarm }
    - { from: settings, to: tower, label: read at the start of a round }
```

# Rubric

- Each sentry is its own class that answers a look and nothing else; none holds the hero, the awareness, or the alarm.
- The plan puts a range and an angle test before any trace, and says why that order is cheaper.
- The line from the eye to the hero counts the hero as seen only when the first thing it meets is the hero, and the eye leaves itself out.
- The awareness, the alarm, and the beam check run on a timer, not in Tick, and the plan says who holds the awareness and the counts.
- The plan says how the alarm happens once per fill and how a new round resets the sentries, the awareness, the counts, the timer, and the hero.
- Every query is drawn as a debug line, and the plan says which settings a designer can change.

# Alternative Note

Both plans pass. Giving the tower the sentries makes the order of every check one short loop in one place, and the tower already knows each sentry because it spawned them; the cost is that the tower must be told about any sentry added later. Having each sentry report to an awareness component lets sentries be added with no change to the tower, and the same component could serve a different level; the cost is a timer in every sentry, more events to bind and unbind, and an order of events that is harder to test. A plan where a sentry traces the hero in its own Tick, or where the awareness is a number each sentry changes itself, breaks the second and first acceptance lines.
