---
id: p19-boss-dusk
title: "Boss: the jar at dusk"
order: 7
kind: boss
difficulty: 4
patterns: [data-locality]
skills: [planning, data-locality]
terms: [tarray, ustruct, fvector3f, timer-manager, spawnactor, tick]
prerequisites: [p19-firefly-swarm, p19-firefly-meadow, p19-ember-refactor, p19-data-locality-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - Two thousand ambient fireflies and every catchable one are records, and the only actors are the hunt, the swarm, and the meadow
  - The hunt names each catchable firefly by its handle, never by where it sits in the meadow's array
  - A caught firefly leaves the meadow and joins the ambient swarm, still a record
  - Two rounds play alike because the spots come from a seed restarted every round
pieces:
  - p19-firefly-swarm
  - p19-firefly-meadow
---

# Spec

The dusk hunt runs a firefly catch in the summer meadow. When play begins it sets up one ambient swarm holding `AmbientFireflies` fireflies, 2000 by default, and one meadow for the catchable ones, both at its own spot. Those are the only actors it ever adds: every firefly of the evening, ambient or catchable, is a record.

A round lasts 60 seconds. One second after it starts, and every 2 seconds after that, the hunt releases a catchable firefly into the meadow, 100 units up at a spot within 400 units of the hunt along X and Y, drifting slowly sideways, with 6.5 seconds to live. The spots come from a random stream seeded with `Seed`, restarted at the start of every round. The hunt keeps the handle of every firefly it releases. Each frame, any released firefly within 100 units of the champion is caught: it leaves the meadow and is let go into the ambient swarm at the champion's spot. A released firefly whose handle no longer finds it faded uncaught and counts as missed. Ten caught fireflies fill the jar: the label shows `JAR FULL in <seconds> s`, the round's time to one decimal. When 60 seconds pass first, dusk falls and the label shows `DUSK: <caught> caught, <missed> missed`. While a round runs, the label shows the caught count out of ten, the missed count, and the seconds left. Reference game: Animal Crossing: New Horizons, where fireflies come out over the island on summer nights and the player catches them with a net.

How rounds start: round 1 starts when play begins. R starts the next round, only after one has ended: the catchable fireflies left over from the last round are taken out of the meadow, the counts start at zero, and the spots start again from the seed. The ambient swarm keeps every firefly it has ever been given. A C++ hunt receives keys only after `EnableInput` with the player controller.

Every piece is the earlier quests' own: the ambient swarm is an `ADojoP19Swarm`, given its starting count before it begins play and its new fireflies with `AddFirefly`; the meadow is an `ADojoP19Meadow`, given its fireflies with `AddFirefly` and read and emptied through the `FDojoP19FlyHandle`s it hands back, with `IsAlive`, `GetPosition`, and `Catch`. The pieces need no changes.

Compiles against earlier quests: p19-firefly-swarm (`Quests/p19-firefly-swarm/DojoP19Swarm.h`) and p19-firefly-meadow (`Quests/p19-firefly-meadow/DojoP19Meadow.h`, `Quests/p19-firefly-meadow/DojoP19MeadowFly.h`).

Core numbers are fixed: 2000 ambient fireflies, a 60 second round, the first release after 1 second and one every 2 seconds after it, 6.5 seconds to live, a 100 unit catch radius, and 10 to fill the jar.

Extensions, in order of importance:

1. The swarm drawn: the ambient swarm feeds an instanced static mesh, one instance per firefly, updated from its array after every step, and the meadow's fireflies are drawn the same way in another color.
2. Embers: the fire basket from the refactor stands in the meadow, and every caught firefly kindles a spark there, so three kinds of records run side by side.
3. A crowded dusk: the ambient swarm grows to 50,000, and the submission reports the swarm's step time from Unreal Insights before and after a change of your choice to its layout.

Feel: tune the drift and the spots so that a player who moves steadily can fill the jar in about 25 seconds, and the last few fireflies need a real chase.

# Required Pieces

```yaml
- id: hunt
  kind: class
  label: A hunt that sets up the swarm and the meadow, runs the rounds, and keeps the counts
  why: One owner for the evening; the swarm and the meadow know nothing about it.
- id: setup
  kind: step
  label: The swarm is spawned with its starting count and the meadow beside it when play begins, and no actor is added after that
  why: Every firefly of the evening is a record.
- id: release
  kind: step
  label: A catchable firefly released after 1 second and every 2 seconds after, at spots from a seed restarted each round, its handle kept
  why: Two rounds must play alike, and the hunt must be able to name every firefly it released.
- id: catch
  kind: step
  label: Each frame, a released firefly near the champion is caught through its handle and let go into the ambient swarm
  why: The handle, not an index, says which firefly the champion reached.
- id: missed
  kind: step
  label: A released firefly whose handle finds nothing faded uncaught and counts as missed
  why: The meadow removes faded fireflies itself; the hunt only asks.
- id: round
  kind: step
  label: Ten caught fills the jar, 60 seconds is dusk, and R starts a clean round only after one has ended
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-hunt
  title: A C++ dusk hunt names every catchable firefly by its handle
  pieces:
    - { id: hunt, kind: class, label: "ADojoP19DuskHunt with a text label, the champion, the seed, and numbers for the swarm size, the round, the releases, the life, the radius, and the jar in Details", covers: [hunt] }
    - { id: setup, kind: step, label: "BeginPlay spawns the swarm with SpawnActorDeferred and sets StartingFireflies before FinishSpawning, spawns the meadow, binds R, and starts round 1", covers: [setup] }
    - { id: release, kind: step, label: "StartRound restarts an FRandomStream from the seed and sets a looping 2 second timer with a 1 second first delay; each release calls AddFirefly on the meadow and keeps the handle", covers: [release] }
    - { id: catch, kind: step, label: "Tick walks the kept handles, compares GetPosition with the champion's location, calls Catch on the meadow and AddFirefly on the swarm for each one in reach, and drops its handle", covers: [catch] }
    - { id: missed, kind: step, label: "Tick counts a missed firefly and drops its handle when IsAlive is false", covers: [missed] }
    - { id: round, kind: step, label: "The tenth catch ends the round as JAR FULL with the time since the start; a 60 second timer ends it as DUSK; StartRound returns early while a round runs and catches every leftover handle first", covers: [round] }
  edges:
    - { from: setup, to: release, label: "the meadow takes every release" }
    - { from: release, to: catch, label: "the kept handles" }
    - { from: release, to: missed, label: "the kept handles" }
    - { from: catch, to: round, label: "the tenth catch fills the jar" }
    - { from: hunt, to: round, label: "start and end" }
    - { from: hunt, to: setup, label: "owns the swarm and the meadow" }
- id: blueprint-hunt
  title: A Blueprint dusk hunt wires the pieces through their Blueprint API
  pieces:
    - { id: hunt, kind: class, label: "BP_DuskHunt actor with a Text Render component, variables for the champion, the seed, the numbers, a Fly Handle array, the counts, and a Running flag", covers: [hunt] }
    - { id: setup, kind: step, label: "Begin Play spawns BP_AmbientSwarm, a child of the swarm whose class defaults set 2000 starting fireflies, and a Dojo P19 Meadow with Spawn Actor from Class, then calls Start Round", covers: [setup] }
    - { id: release, kind: step, label: "Start Round sets a Random Stream variable from the seed and starts a looping Set Timer by Event of 2 seconds with an initial delay of 1; the event calls Add Firefly on the meadow and adds the returned handle to the array", covers: [release] }
    - { id: catch, kind: step, label: "Event Tick loops over the handles in reverse; when Get Position is within 100 of the champion it calls Catch, adds a firefly to the swarm, and removes the handle", covers: [catch] }
    - { id: missed, kind: step, label: "In the same loop, Is Alive false adds a missed firefly and removes the handle", covers: [missed] }
    - { id: round, kind: step, label: "A Branch on the caught count ends the round as JAR FULL; a 60 second Set Timer by Event ends it as DUSK; the R event sits behind a Branch on Running and catches every leftover handle first", covers: [round] }
  edges:
    - { from: setup, to: release, label: "the meadow takes every release" }
    - { from: release, to: catch, label: "the kept handles" }
    - { from: release, to: missed, label: "the kept handles" }
    - { from: catch, to: round, label: "the tenth catch fills the jar" }
    - { from: hunt, to: round, label: "start and end" }
    - { from: hunt, to: setup, label: "owns the swarm and the meadow" }
```

# Integration Rubric

- The swarm and meadow pieces are reused unchanged, and the hunt reaches the meadow's fireflies only through the handles it was given.
- The swarm, with its 2000 starting fireflies, and the meadow are spawned when play begins, and no actor is added during any round.
- Catchable fireflies are released after 1 second and every 2 seconds after, at spots from the seed restarted every round, with 6.5 seconds to live.
- A released firefly within 100 units of the champion is caught, leaves the meadow, and joins the ambient swarm at the champion's spot.
- A released firefly that faded uncaught counts as missed.
- Ten caught show JAR FULL with the round's time; 60 seconds first show DUSK with the caught and missed counts.
- Round 1 starts when play begins; R starts a clean round only after one has ended, with leftover fireflies taken out and the spots restarted.
- The submission says why no firefly is an actor and why the hunt keeps handles instead of indices, and gives the tuned drift and spots with the time a steady player needs.
