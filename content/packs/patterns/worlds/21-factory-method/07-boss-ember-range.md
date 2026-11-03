---
id: p21-boss-ember-range
title: "Boss: the Ember Range"
order: 7
kind: boss
difficulty: 4
patterns: [factory-method]
skills: [planning, factory-method]
terms: [tsubclassof, spawnactor, spawn-actor-deferred, timer-manager, tarray, tobjectptr]
prerequisites: [p21-launchers, p21-wave-spawner, p21-turret-refactor, p21-factory-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole shooting range built from two lists of classes, one for the launchers and one for the critters, with no kind named in the master
  - A master that fires a launcher and never needs to know which bolt it makes
  - Two launchers with limited shots that together can win a round neither can win alone
pieces:
  - p21-launchers
  - p21-wave-spawner
---

# Spec

The range master runs the Ember Range. A round has two launchers and a row of critters, and the master builds all of them from its own data, never from a class it names in code. The standard data is two launcher classes, an ember launcher and a frost launcher, and a wave of four critters: a level 2 slime (20 health), a level 2 imp (30), a level 3 slime (30), and a level 3 imp (45). An ember bolt hits for 12 and a frost bolt for 7. Reference game: Plants vs. Zombies, where each kind of plant fires its own kind of shot at the nearest zombie in front of it and the player decides which plant to lean on.

The master's own spot is the origin of the range. The first launcher stands at the master's spot and the second 100 units along the Y axis from it, both facing along the positive X axis. A spawner stands 300 units along the X axis from the master and makes the wave, with 150 units between critters, so the standard critters stand at 450, 600, 750, and 900 units. Key 1 fires the first launcher and key 2 fires the second. Each launcher may fire 8 bolts a round, counted by the launcher itself.

A bolt that is made hits the nearest living critter whose place is further along the X axis than the muzzle, takes that critter's health down by the bolt's damage, and is spent. A critter at 0 health or less is defeated and removed. A shot with nothing ahead of it is spent and hurts nobody. A launcher with no shots left, a number with no launcher, and any key while no round runs do nothing. Defeating every critter wins the round: the label shows WIN, the time to one decimal, and the shots used. After 30 seconds without a win the label shows TIME UP. While a round runs, the label shows `Critters` still alive out of the wave, and the shots left of each launcher, such as `Critters 3/4  Shots left 7 6`.

How rounds start: round 1 starts when play begins, and R starts the next round, only after one has ended. Starting a round destroys the last round's launchers, critters, and spawner and builds fresh ones from the data, so every count starts again. A C++ master receives keys only after `EnableInput` with the player controller.

The launchers and the spawner are the pieces' own actors. The master asks a launcher to `Fire` and a spawner to `SpawnWave`; it never names a kind of launcher, bolt, or critter, so a new kind is a new entry in the master's lists, never a change to the master. The pieces need no changes.

Compiles against earlier quests: p21-launchers (`Quests/p21-launchers/DojoP21Launcher.h`, `Quests/p21-launchers/DojoP21EmberLauncher.h`, `Quests/p21-launchers/DojoP21FrostLauncher.h`) and p21-wave-spawner (`Quests/p21-wave-spawner/DojoP21Critter.h`, `Quests/p21-wave-spawner/DojoP21Slime.h`, `Quests/p21-wave-spawner/DojoP21Imp.h`, `Quests/p21-wave-spawner/DojoP21SpawnEntry.h`, `Quests/p21-wave-spawner/DojoP21Spawner.h`).

Core numbers are fixed: 8 shots per launcher, a 30 second round, 100 units between launchers, a spawner 300 units out, and 150 between critters.

Extensions, in order of importance:

1. A third kind of launcher added only through data: a launcher that overrides `CreateBolt` to make a fan of bolts, or a Blueprint child of the launcher base, with key 3 added for it and no other change to the master.
2. Critters that step 50 units toward the launchers every 3 seconds, and a round that is lost, with LOST on the label, when one reaches 200 units from the master.
3. Bolts taken from a pool: a launcher subclass whose `CreateBolt` reuses a bolt the master has handed back after a hit.

Feel: tune the shots and health so that neither launcher alone can win a round and a sensible mix wins with a few bolts to spare, so that a player feels both launchers matter and that wasting bolts on a critter that is nearly dead costs something.

# Required Pieces

```yaml
- id: master
  kind: class
  label: A master that runs the round, builds the range from its data, and keeps the counts
  why: One owner of the round; no launcher or critter knows the range exists.
- id: launcher-data
  kind: data
  label: A list of launcher classes, one per key, that the master builds in order
  why: Which kinds of launcher the range has is data a designer edits, not a class the master names.
- id: wave-data
  kind: data
  label: A wave of entries, each a critter class and a level
  why: Which critters stand on the range is data too, and the spawner reads it.
- id: fire
  kind: step
  label: Keys 1 and 2 ask the matching launcher to fire, and ask nothing of a number with no launcher
  why: The player's one verb, the same for every kind of launcher.
- id: ammo
  kind: step
  label: Each launcher stops at 8 shots a round, counted on the launcher
  why: The limit that makes both launchers necessary, kept where the shots are counted.
- id: hit
  kind: step
  label: A bolt that was made hurts the nearest living critter ahead of the muzzle by its damage and is spent; a critter at 0 health is defeated
  why: The rule that connects what a launcher made to the critters the spawner made.
- id: round
  kind: step
  label: Every critter defeated wins and 30 seconds without that is TIME UP; R starts a clean round only between rounds
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-master
  title: A C++ range master builds the launchers and the wave from two lists of classes
  pieces:
    - { id: master, kind: class, label: "ADojoP21RangeMaster with a text label, the counts, and numbers for the shots per launcher and the round length in Details", covers: [master] }
    - { id: classes, kind: data, label: "A TArray of TSubclassOf<ADojoP21Launcher> on the master, filled with the ember and frost launcher classes in Details", covers: [launcher-data] }
    - { id: wave, kind: data, label: "A TArray of FDojoP21SpawnEntry on the master, each a TSubclassOf<ADojoP21Critter> and a level", covers: [wave-data] }
    - { id: build, kind: step, label: "StartRound spawns each launcher class with SpawnActor 100 units apart and gives a spawner the wave and asks it to SpawnWave", covers: [launcher-data, wave-data] }
    - { id: fire, kind: step, label: "PressFire with a number looks up that launcher, ignores a missing one, and calls Fire once; the launcher's own ShotsFired against the shots per launcher is the ammo check", covers: [fire, ammo] }
    - { id: hit, kind: step, label: "FindTarget keeps the nearest critter whose X is beyond the bolt's, the bolt's Damage comes off its Health, a critter at 0 is removed, and the bolt is destroyed", covers: [hit] }
    - { id: round, kind: step, label: "A non-looping 30 second timer ends the round as TIME UP, the last critter falling ends it as WIN, and R calls StartRound only while stopped, which destroys the old range and rebuilds", covers: [round] }
  edges:
    - { from: classes, to: build, label: "one launcher per class" }
    - { from: wave, to: build, label: "read by the spawner" }
    - { from: build, to: fire, label: "the launchers keys choose from" }
    - { from: fire, to: hit, label: "a made bolt is aimed by the master" }
    - { from: hit, to: round, label: "the last critter ends the round" }
    - { from: master, to: round, label: "start and end" }
- id: blueprint-master
  title: A Blueprint range master drives the pieces through their Blueprint API
  pieces:
    - { id: master, kind: class, label: "BP_RangeMaster actor with a Text Render component and variables for the shots per launcher, the round length, and a Running flag", covers: [master] }
    - { id: classes, kind: data, label: "An array variable of Dojo P21 Launcher class references, filled in Details with the ember and frost launcher classes", covers: [launcher-data] }
    - { id: wave, kind: data, label: "An array variable of Dojo P21 Spawn Entry structs, each a Dojo P21 Critter class and a level", covers: [wave-data] }
    - { id: build, kind: step, label: "A For Each over the class array uses Spawn Actor from Class 100 units apart, and a Dojo P21 Spawner gets the wave and Spawn Wave is called on it", covers: [launcher-data, wave-data] }
    - { id: fire, kind: step, label: "The 1 and 2 key events call one Fire Launcher function with the number; it ignores a number outside the array and a launcher whose Shots Fired has reached the limit, and calls Fire on the rest", covers: [fire, ammo] }
    - { id: hit, kind: step, label: "A loop over the living critters keeps the nearest one with a larger X than the bolt, subtracts the bolt's Damage from its Health, removes it from the array and destroys it at 0, and destroys the bolt", covers: [hit] }
    - { id: round, kind: step, label: "A 30 second Set Timer by Event shows TIME UP, the last critter falling shows WIN, and the R event behind a Branch on Running destroys the old range and rebuilds it", covers: [round] }
  edges:
    - { from: classes, to: build, label: "one launcher per class" }
    - { from: wave, to: build, label: "read by the spawner" }
    - { from: build, to: fire, label: "the launchers keys choose from" }
    - { from: fire, to: hit, label: "a made bolt is aimed by the master" }
    - { from: hit, to: round, label: "the last critter ends the round" }
    - { from: master, to: round, label: "start and end" }
```

# Integration Rubric

- The launcher and spawner pieces are reused unchanged, and the master only calls Fire and SpawnWave: it never names a kind of launcher, bolt, or critter.
- The launchers are built from the list of classes and the critters from the wave, in order, at the fixed places, so a new kind is a new entry in a list.
- Key 1 and key 2 fire the first and second launcher; a number with no launcher, a launcher with no shots left, and any key with no round running do nothing.
- Each launcher stops at 8 shots a round, counted by the launcher, and neither launcher alone can win the round.
- A bolt that was made hurts the nearest living critter ahead of the muzzle by its damage and is spent; a critter at 0 health is defeated, and a shot with nothing ahead hurts nobody.
- Defeating every critter wins with the time and the shots used shown; 30 seconds without that shows TIME UP.
- Round 1 starts with play, R starts later rounds only between rounds, and a round start destroys the old launchers, critters, and spawner, so round 2 plays like round 1 and the old timer cannot end it.
- The submission says why the master owns no rule about which class a launcher or a critter is, and gives the tuned ammo with why a mix of both launchers was needed.
