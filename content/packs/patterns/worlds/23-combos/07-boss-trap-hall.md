---
id: p23-boss-trap-hall
title: "Boss: the trap hall"
order: 7
kind: boss
difficulty: 5
patterns: [subclass-sandbox, state]
skills: [planning, subclass-sandbox, state]
terms: [spawnactor, tsubclassof, abstract-specifier, timer-manager, tactoriterator]
prerequisites: [p23-breakdown-siege-wall, p8-trap-family, p7-ballista]
xp: 360
estimatedMinutes: 85
concepts:
  - A trap family where a new kind is one new class, here a frost vent, that uses only the base's tools
  - A ballista whose modes decide what each order means, driven only by a target shown and taken away
  - A director that turns a bolt the ballista reports into a hit and works out no trap effect and no mode
  - Trap classes chosen in Details, so an abstract or missing class builds nothing and breaks nothing
pieces:
  - p8-trap-family
  - p7-ballista
---

# Spec

The director runs a trap hall for 12 seconds a round. Fighters stand in the hall, traps spring around them, and a ballista on the wall shoots at the nearest one in reach. The earlier quests supply the rules: a trap base with a rest after each spring and a family of traps that override one function and use only its tools, a fighter that traps can hurt, and a ballista whose modes decide what each order to it means.

The designer sets the hall up in Details. The trap list names a class, a place, and a rest in seconds for each trap, and the director builds an actor of each class that is not abstract and gives it the rest. A class that is empty or abstract builds nothing and the other traps are unaffected. The roster lists where each fighter stands and its starting health. The hall also has the ballista's offset from the hall, its reach, the damage of a bolt, and the aim and reload times it hands to the ballista. In the reference hall a spike trap stands at the origin, a new frost vent stands 400 out, Ava stands 100 out with 100 health, Bo stands 400 out with 100, the ballista is 200 above the origin with a reach of 600, a bolt does 25, aiming takes 1 second, and reloading takes 1.5. Every round starts by clearing the last one and building the ballista, the traps, and the fighters again.

The frost vent is the boss's own trap. It is a child of the trap base that overrides only what the trap does when it springs: it plays its cue and hurts every standing fighter within 120 of it for 10, using only the base's tools.

Every second, the first at half a second, the director springs every trap once, and a trap that is still resting ignores it. Every half second, the first at a quarter of a second, the director shows the ballista a target when some standing fighter is within its reach and it has none, and takes the target away when no fighter is and it has one. Every second, the first at one second, the director orders the ballista to fire. When the ballista's count of bolts has gone up because of that order, the director takes the bolt's damage from the nearest standing fighter within reach, the earlier one in the roster on a tie. The round ends at 12 seconds. It is `CLEARED` when every fighter is down and `HELD` otherwise. The label reads `Round N  Bolts B  Standing S`, and when the round ends it adds two spaces and the result. R starts the next round only after one has ended. A C++ director receives keys only after `EnableInput` with the player controller.

The ballista and the traps know nothing about the director or about each other. The director never works out what a trap does, never decides what an order means in a mode, and never changes the ballista's mode itself: it springs, shows a target, orders, and turns the bolt count into a hit. Reference game: a tower defense game, where a trap lane and an arrow tower wear down the same wave and a new trap kind is a small addition.

Compiles against earlier quests: p8-trap-family (`Quests/p8-trap-family/DojoP8TrapBase.h`, `Quests/p8-trap-family/DojoP8Fighter.h`, `Quests/p8-trap-family/DojoP8SpikeTrap.h`) and p7-ballista (`Quests/p7-ballista/DojoP7Ballista.h`, `Quests/p7-ballista/DojoP7BallistaAiming.h`, `Quests/p7-ballista/DojoP7BallistaIdle.h`, `Quests/p7-ballista/DojoP7BallistaReloading.h`).

Core numbers are fixed: a 12 second round, a spring attempt every second from half a second, a look for a target every half second from a quarter, an order to fire every second from one, a bolt worth 25, and a reach of 600.

Extensions, in order of importance:

1. A third trap kind, a flame jet from the earlier quest, added to the hall by the trap list alone.
2. A second ballista with its own reach, so that the nearer one fires.
3. A label line showing the ballista's mode.

Feel: tune the traps' rests and the ballista's reload so that the traps and the bolts take turns at wearing a fighter down, and the moment the last target falls feels like the ballista going quiet.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that builds the hall, springs the traps, shows the ballista a target, orders it to fire, and turns bolts into hits, deciding no trap effect and no mode
  why: One owner of the order of things; effects belong to the traps and modes to the ballista.
- id: plans
  kind: data
  label: The trap list with a class, a place, and a rest, the roster of fighters, and the ballista's numbers as data in Details
  why: A new trap, fighter, or hall is data, and the trap class is chosen there.
- id: new-trap
  kind: class
  label: A frost vent as a new child of the trap base that overrides only what happens on springing and uses only the base's tools
  why: It shows that a new kind of trap is one small class.
- id: build
  kind: step
  label: Each round builds the ballista, a trap of every class in the list that is not abstract, and the fighters, and removes the last round's
  why: A second round must start from fresh actors with no leftover rest or mode.
- id: springing
  kind: step
  label: Every second from half a second the director calls Spring on each trap and a resting trap ignores it
  why: The rest belongs to the trap base, so the director never counts it.
- id: targeting
  kind: step
  label: Every half second from a quarter the director shows the ballista a target when a standing fighter is in reach and takes it away when none is
  why: The ballista's modes react to a target appearing and going, and nothing else tells it.
- id: firing
  kind: step
  label: Every second the director orders the ballista to fire, and a rise in its bolt count takes the bolt's damage from the nearest standing fighter in reach
  why: The ballista decides whether an order fires, and the director only reads the result.
- id: round
  kind: step
  label: A 12 second round, R only between rounds, and CLEARED or HELD on the label from the fighters still standing
  why: The round needs an outcome that the traps and bolts decide.
```

# Reference Plans

```yaml
- id: cpp-hall
  title: A C++ director with a new trap child and timers for the springs, the looks, and the orders
  pieces:
    - { id: director, kind: class, label: "ADojoP23TrapHall with a text label as its root, a TObjectPtr to the ballista, TArrays of TObjectPtr to the traps and the fighters, and the reach, damage, aim, reload, and round length in Details", covers: [director] }
    - { id: plans, kind: data, label: "Two USTRUCTs, a trap plan with a TSubclassOf of the trap base, a place, and a rest, and a fighter plan with a place and a health, held in TArrays on the director", covers: [plans] }
    - { id: new-trap, kind: class, label: "ADojoP23FrostVent derives from ADojoP8TrapBase and overrides the protected Trigger to call PlayCue and DamageFightersInRadius with its own radius and damage properties", covers: [new-trap] }
    - { id: build, kind: step, label: "StartRound destroys the old actors, spawns the ballista and sets its aim and reload, spawns each non-abstract trap class and sets its CooldownSeconds, and spawns each fighter deferred with its health set before FinishSpawning", covers: [build] }
    - { id: springing, kind: step, label: "A looping timer with a half second first delay calls Spring on every trap", covers: [springing] }
    - { id: targeting, kind: step, label: "A looping timer with a quarter second first delay finds the nearest standing fighter in reach and calls SpotTarget or LoseTarget by comparing the answer with HasTarget", covers: [targeting] }
    - { id: firing, kind: step, label: "A looping timer with a one second first delay calls Fire, compares GetBoltsFired before and after, and calls TakeHit with the bolt damage on the nearest standing fighter in reach when it rose", covers: [firing] }
    - { id: round, kind: step, label: "A non-looping 12 second timer clears the other timers and sets CLEARED or HELD; PressNextRound calls StartRound only while stopped", covers: [round] }
  edges:
    - { from: plans, to: build, label: "each plan builds one actor" }
    - { from: new-trap, to: springing, label: "springs like any trap" }
    - { from: springing, to: firing, label: "both wear the fighters down" }
    - { from: targeting, to: firing, label: "the ballista only fires with a target" }
    - { from: firing, to: round, label: "the fighters left decide" }
    - { from: director, to: round, label: "start and end" }
- id: cpp-heartbeat
  title: A C++ director with one quarter-second heartbeat that counts out the springs, the looks, and the orders
  pieces:
    - { id: director, kind: class, label: "ADojoP23TrapHall with a text label as its root, a TObjectPtr to the ballista, TArrays of TObjectPtr to the traps and the fighters, and the reach, damage, aim, reload, and round length in Details", covers: [director] }
    - { id: plans, kind: data, label: "Two USTRUCTs, a trap plan with a TSubclassOf of the trap base, a place, and a rest, and a fighter plan with a place and a health, held in TArrays on the director", covers: [plans] }
    - { id: new-trap, kind: class, label: "ADojoP23FrostVent derives from ADojoP8TrapBase and overrides the protected Trigger to call PlayCue and DamageFightersInRadius with its own radius and damage properties", covers: [new-trap] }
    - { id: build, kind: step, label: "StartRound destroys the old actors, spawns the ballista and sets its aim and reload in C++, spawns each non-abstract trap class and sets its CooldownSeconds, and spawns each fighter deferred with its health set before FinishSpawning", covers: [build] }
    - { id: springing, kind: step, label: "On heartbeat counts 2, 6, 10 and so on the heartbeat calls Spring on every trap", covers: [springing] }
    - { id: targeting, kind: step, label: "On the odd heartbeat counts, with the first at a quarter second, it finds the nearest standing fighter in reach and calls SpotTarget or LoseTarget by comparing the answer with HasTarget", covers: [targeting] }
    - { id: firing, kind: step, label: "On heartbeat counts 4, 8, 12 and so on it calls Fire, compares GetBoltsFired before and after, and calls TakeHit with the bolt damage on the nearest standing fighter in reach when it rose", covers: [firing] }
    - { id: round, kind: step, label: "One looping timer of a quarter second drives the heartbeat and a non-looping 12 second timer clears it and sets CLEARED or HELD; PressNextRound calls StartRound only while stopped", covers: [round] }
  edges:
    - { from: plans, to: build, label: "each plan builds one actor" }
    - { from: new-trap, to: springing, label: "springs like any trap" }
    - { from: springing, to: firing, label: "both wear the fighters down" }
    - { from: targeting, to: firing, label: "the ballista only fires with a target" }
    - { from: firing, to: round, label: "the fighters left decide" }
    - { from: director, to: round, label: "start and end" }
```

# Integration Rubric

- The trap base, the spike trap, the fighter, and the ballista with its modes are reused unchanged, and the director never works out what a trap does, never decides what an order means in a mode, and never changes the ballista's mode: it springs, shows a target, orders, and turns the bolt count into a hit.
- The frost vent is a new child of the trap base that overrides only what happens on springing and uses only the base's tools, and the traps come from the classes in Details, each given the plan's rest, so a new kind needs no change to the director and an empty or abstract class builds nothing and breaks nothing.
- Every trap is sprung every second from half a second and a resting trap ignores it, with the rest kept by the trap and not counted by the director.
- The ballista is shown a target only while a standing fighter is within its reach and has it taken away when none is, so its modes alone decide whether an order to fire shoots.
- A bolt takes the bolt's damage from the nearest standing fighter in reach, and only when the order made the bolt count rise, so orders given in other modes cost nobody anything.
- A round lasts 12 seconds, the result is CLEARED when no fighter stands and HELD otherwise, and the label shows the round, the bolts, the fighters standing, and the result as specified.
- R starts a round only between rounds, and a new round removes the last round's actors and builds new ones, with the current plans, so no rest, mode, or bolt count is carried over.
- The submission says which function decides what firing does for each trap kind, why the director shows the ballista a target and does not move it between modes, and gives the tuned rests and reload with the feel they produced.
