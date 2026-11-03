---
id: p13-boss-modded-vault
title: "Boss: the modded vault"
order: 7
kind: boss
difficulty: 4
patterns: [bytecode]
skills: [planning, bytecode]
terms: [stack-machine, edit-condition, uparam-ref, spawnactor, timer-manager, tarray]
prerequisites: [p13-potion-recipes, p13-door-conditions, p13-trap-refactor, p13-bytecode-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole vault described by one mod list of potions and doors, each carrying its own script
  - A master that runs the round and never needs to know what any script says
  - A broken script from a modder that fizzles or stays shut while the round goes on
pieces:
  - p13-potion-recipes
  - p13-door-conditions
---

# Spec

The vault master runs a vault that a modder wrote. The modder's file is a mod list on the master: each entry has a name, a kind (potion or door), a spot, and its script, a recipe for a potion or a condition for a door. The standard mod has six entries along a corridor: the Purse potion at 100 units (Gold plus 12), the Cursed brew at 300 (a broken recipe: Add with nothing on the stack, then Write Health), the Key brew at 500 (Keys plus 1), the Treasurer's door at 700 (Gold greater than 9 and Keys not 0), the Second Wind potion at 900 (Health plus twice Stamina), and the Vault door at 1100 (Health greater than 80).

The champion is any actor a designer picks, or the player's pawn when none is picked. The champion's stats start every round at Health 50, Stamina 20, Gold 0, and Keys 0, and live on the master. Pressing E uses the unused station nearest the champion within 150 units; if two are equally near, the earlier entry wins. A potion is drunk once per round: its recipe runs on the champion's stats, and a broken recipe fizzles, which changes nothing and counts as a fizzle, and the potion is still used up. A door is tried with the champion's stats now: it opens if its condition says Open and stays shut otherwise; a shut door can be tried again later, and an opened door counts as used. No station in range means nothing happens. When every door is open, the round is won: the label shows WIN, the time to one decimal, and the champion's Health and Gold. After 60 seconds without a win, the label shows TIME UP. While a round runs, the label shows doors open out of doors, the champion's Health, Gold, and Keys, and how many potions fizzled. Reference game: the adventure maps people build in Minecraft, where command blocks that the map maker wrote open doors and hand out rewards, and a badly written block simply does nothing.

How rounds start: round 1 starts when play begins, and R starts the next round, only after one has ended; E does nothing outside a round. Starting a round destroys every station of the last round, builds fresh ones from the mod list, resets the champion's stats to the starting stats, and zeroes the counts. A C++ master receives keys only after `EnableInput` with the player controller.

Every station is the piece's own actor: a potion is a `ADojoP13Potion` spawned at its spot with the entry's recipe, and a door is a `ADojoP13VaultDoor` with the entry's condition. The master drinks with `Drink` and tries doors with `TryOpen`, passing the champion's stats; it never reads a script itself, so a new kind of potion or door is a new entry, never a change to the master. The pieces need no changes.

Compiles against earlier quests: p13-potion-recipes (`Quests/p13-potion-recipes/DojoP13Potion.h`, `Quests/p13-potion-recipes/DojoP13Instruction.h`, `Quests/p13-potion-recipes/DojoP13Stats.h`) and p13-door-conditions (`Quests/p13-door-conditions/DojoP13VaultDoor.h`, `Quests/p13-door-conditions/DojoP13CheckStep.h`).

Core numbers are fixed: 150 to use, a 60 second round, starting stats of Health 50, Stamina 20, Gold 0, and Keys 0.

Extensions, in order of importance:

1. Dart trap stations: a mod entry can name a trap routine from the trap refactor, and each dart a trap fires costs the champion 5 Health while the champion is within 300 units of it.
2. A text front end: a mod line such as `read gold, push 9, greater` becomes condition steps, and a line it cannot read is reported with its number before the round starts.
3. A trace for broken scripts: when a potion fizzles, the label names the step that failed and what was on the stack.

Feel: tune the corridor so that the order of potions matters and a player who drinks everything at once in the wrong order is short of the Vault door, but a player who reads the doors first opens the Vault door with about ten seconds to spare.

# Required Pieces

```yaml
- id: master
  kind: class
  label: A master that runs the round, builds the stations, and keeps the counts
  why: One owner of the round; no potion or door knows the vault exists.
- id: mod
  kind: data
  label: A mod list of entries, each a potion or a door with its script and spot
  why: The whole vault is data a modder writes; a new station is a new entry.
- id: stations
  kind: step
  label: Each entry spawns the piece's own potion or door actor at its spot and hands it the entry's script
  why: The pieces' machines run the scripts; the master never reads one.
- id: champion
  kind: data
  label: The champion's stats live on the master and reset to the starting stats every round
  why: Every potion and door reads and writes one set of numbers that a new round can reset.
- id: use
  kind: step
  label: E uses the nearest unused station in range, the earlier entry on a tie; potions are drunk once, doors can be tried again
  why: The player's one verb, the same for every kind of station.
- id: sandbox
  kind: step
  label: A broken recipe fizzles, counted and harmless, and a broken door condition keeps its door shut, while the round goes on
  why: A modder's mistake must never stop the game or change anything.
- id: round
  kind: step
  label: Every door open wins and 60 seconds without that is TIME UP; R starts a clean round only between rounds
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-master
  title: A C++ vault master builds the stations from the mod list
  pieces:
    - { id: master, kind: class, label: "ADojoP13VaultMaster with a text label, the champion, the starting stats, and numbers for the use range and the round length in Details", covers: [master] }
    - { id: mod, kind: data, label: "A TArray of FDojoP13ModEntry structs with name, kind, spot, a recipe array, and a condition array, each array shown only for its kind with EditCondition", covers: [mod] }
    - { id: build, kind: step, label: "BuildStation spawns an ADojoP13Potion or an ADojoP13VaultDoor at the spot with SpawnActor and copies the entry's recipe or condition into it", covers: [stations] }
    - { id: stats, kind: data, label: "An FDojoP13Stats member set from StartingStats in StartRound and passed by reference to Drink and by const reference to TryOpen", covers: [champion] }
    - { id: use, kind: step, label: "PressUse walks the stations, skips used ones, keeps the nearest strictly nearer than the last within range, then drinks or tries it and marks potions and opened doors used", covers: [use] }
    - { id: sandbox, kind: step, label: "A false from Drink adds one to the fizzle count and nothing else; a door whose Judge says Broken simply stays shut", covers: [sandbox] }
    - { id: round, kind: step, label: "A non-looping 60 second timer ends the round as TIME UP, the open count reaching the door count ends it as WIN, and R calls StartRound only while stopped, which destroys the stations, resets the stats, and rebuilds", covers: [round] }
  edges:
    - { from: mod, to: build, label: "one station per entry" }
    - { from: build, to: use, label: "the stations E chooses from" }
    - { from: stats, to: use, label: "every drink and try reads or writes them" }
    - { from: use, to: sandbox, label: "a broken script is counted, never run on" }
    - { from: use, to: round, label: "the last door ends the round" }
    - { from: master, to: round, label: "start and end" }
- id: blueprint-master
  title: A Blueprint vault master drives the pieces through their Blueprint API
  pieces:
    - { id: master, kind: class, label: "BP_VaultMaster actor with a Text Render component and variables for the champion, the starting stats, the range, the round length, and a Running flag", covers: [master] }
    - { id: mod, kind: data, label: "An array variable of a Blueprint struct with a name, a kind enum, a spot, a Dojo P13 Instruction array, and a Dojo P13 Check Step array", covers: [mod] }
    - { id: build, kind: step, label: "For each entry, a Switch on the kind spawns a Dojo P13 Potion or a Dojo P13 Vault Door with Spawn Actor from Class at the spot and sets its Recipe or Condition", covers: [stations] }
    - { id: stats, kind: data, label: "A Dojo P13 Stats variable set from the starting stats when a round starts and wired into Drink's by-reference pin and Try Open's input", covers: [champion] }
    - { id: use, kind: step, label: "The E event loops over the stations with a parallel array of Used booleans, keeps the nearest unused one in range, and casts it to call Drink or Try Open", covers: [use] }
    - { id: sandbox, kind: step, label: "A Branch on Drink's return adds to a Fizzled integer when it is false; Judge's Broken verdict needs no handling because Try Open returns false", covers: [sandbox] }
    - { id: round, kind: step, label: "A 60 second Set Timer by Event shows TIME UP, the open count shows WIN when it reaches the door count, and the R event behind a Branch on Running destroys the stations, resets the stats, and rebuilds", covers: [round] }
  edges:
    - { from: mod, to: build, label: "one station per entry" }
    - { from: build, to: use, label: "the stations E chooses from" }
    - { from: stats, to: use, label: "every drink and try reads or writes them" }
    - { from: use, to: sandbox, label: "a broken script is counted, never run on" }
    - { from: use, to: round, label: "the last door ends the round" }
    - { from: master, to: round, label: "start and end" }
```

# Integration Rubric

- The potion and door pieces are reused unchanged, and the master never reads or runs a script itself: it calls Drink and TryOpen.
- Every station is built from its mod entry: a potion or a door actor at the entry's spot with the entry's script, so a new station is a new entry.
- The champion's stats live in one place, start every round at Health 50, Stamina 20, Gold 0, and Keys 0, and are what every potion and door reads or writes.
- E uses only the nearest unused station within 150, the earlier entry on a tie; a potion is used up once drunk, a shut door can be tried again, and nothing happens with nothing in range.
- The Cursed brew fizzles: it is counted, it changes no stat, and the round goes on; a door with a broken condition stays shut.
- Opening every door wins with the time, Health, and Gold shown; 60 seconds without that shows TIME UP.
- Round 1 starts with play, R starts later rounds only between rounds, and a round start destroys the old stations, resets the stats, and zeroes the counts, so round 2 plays like round 1.
- The submission says why the master owns no rule about what a script means, and gives the tuned corridor with why the order of the potions mattered.
