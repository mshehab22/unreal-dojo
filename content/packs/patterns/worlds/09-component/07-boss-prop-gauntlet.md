---
id: p9-boss-prop-gauntlet
title: "Boss: the prop gauntlet"
order: 7
kind: boss
difficulty: 4
patterns: [component, observer]
skills: [planning, component]
terms: [actor-component, scene-component, newobject, register-component, findcomponentbyclass, dynamic-multicast-delegate, adddynamic, timer-manager]
prerequisites: [p9-arena-parts, p9-sprint-parts, p9-gladiator-refactor, p9-component-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - Building every kind of prop at runtime from a list of parts, with no class per kind
  - One director that listens to every prop's parts and never needs to know what kind of prop it is
  - A champion that is any actor with a stamina part, given one if it has none
pieces:
  - p9-arena-parts
  - p9-sprint-parts
---

# Spec

The arena master runs the prop gauntlet. A designer fills in a list of prop recipes on the master: each recipe has a name, a spot, whether the prop gets a health part and how much health, and whether it gets a loot part with which item and how many. The first four: a Crate at 100 units out with 40 health that drops one Bandage, a Jar at 400 with 40 health that drops two Coins, a Statue at 700 with 50 health and no loot, and a Banner at 1000 with no parts at all, which only stands there.

The champion is any actor a designer picks, or the player's pawn when none is picked; this world's gladiator is the usual choice. A champion with no stamina part is given one when play begins. Pressing E strikes: the prop with an unbroken health part nearest the champion within 150 units takes 25 damage, and the strike costs the champion 20 stamina through its stamina part. If two props are equally near, the earlier recipe wins. No prop in range, or not 20 stamina left, means no strike and nothing spent. A prop whose health runs out is broken: its name tag reads Broken, and its loot drops. When every prop with a health part is broken, the round is won: the label shows WIN, the time to one decimal, and the loot. After 45 seconds without a win, the label shows TIME UP. While a round runs, the label shows how many props are broken out of how many can break, and the loot so far. Reference game: the chambers of Hades, where the urns along the walls break under a strike or two and some spill coins.

How rounds start: round 1 starts when play begins, and R starts the next round, only after one has ended; E does nothing outside a round. Starting a round destroys every prop of the last round, refills the champion's stamina, builds fresh props from the recipes, and zeroes the counts. A C++ master receives keys only after `EnableInput` with the player controller.

Every prop is a plain actor. The master gives it a text render part as its root, so it has a place in the world and a name tag, then a health part and a loot part as its recipe says, with each part's settings filled in before the part is registered. The loot part listens to its own prop's health part, as in the crate kit. The master listens to every health part's `OnDepleted` and every loot part's `OnLootDropped`; the health delegate passes the health part, so the master knows which prop broke without keeping its own list of kinds. Strikes find the target's health part and the champion's stamina part with `FindComponentByClass`, so any actor that carries those parts works. The pieces need no changes.

Compiles against earlier quests: p9-arena-parts (`Quests/p9-arena-parts/DojoP9HealthComponent.h`, `Quests/p9-arena-parts/DojoP9LootComponent.h`), p9-sprint-parts (`Quests/p9-sprint-parts/DojoP9StaminaComponent.h`), and p9-gladiator-refactor (`Quests/p9-gladiator-refactor/DojoP9Gladiator.h`).

Core numbers are fixed: 150 to strike, 25 damage, 20 stamina a strike, a 45 second round.

Extensions, in order of importance:

1. A Burning part that a recipe can add: it ticks 5 damage a second into its prop's health part and stops when the health runs out.
2. Holding Shift sprints, through the champion's sprint part, and a strike while sprinting costs double.
3. A recipe list read from a data asset, so a designer can keep several gauntlets.

Feel: tune the recipes until the last strike lands with the stamina bar nearly empty, not with stamina to spare and not after a long wait.

# Required Pieces

```yaml
- id: master
  kind: class
  label: A master that runs the round, builds the props, and keeps the counts
  why: One owner of the rules; no prop or part knows the gauntlet exists.
- id: recipes
  kind: data
  label: A designer list of prop recipes, each naming its parts and their settings
  why: A new kind of prop is a new line of data, not a new class.
- id: assembly
  kind: step
  label: Each prop is a plain actor given a root with a name tag, then a health part and a loot part as its recipe says, filled in before registering
  why: The kinds exist only as mixes of parts, built while the game runs.
- id: champion
  kind: component
  label: The champion is any actor with a stamina part, given one at play if it has none
  why: The gauntlet works with the gladiator or with any other pawn.
- id: strike
  kind: step
  label: E strikes the nearest unbroken prop in range, the earlier recipe on a tie, paid for with the champion's stamina
  why: The player's one verb, reaching parts by class so any actor with them works.
- id: news
  kind: event
  label: The master listens to every health part and every loot part, and counts breaks and loot
  why: The parts announce; the master never polls them.
- id: round
  kind: step
  label: Every breakable prop broken wins and 45 seconds without that is TIME UP; R starts a clean round only between rounds
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-master
  title: A C++ gauntlet master assembles props from recipes
  pieces:
    - { id: master, kind: class, label: "ADojoP9GauntletMaster with a text label, the champion, and numbers for range, damage, strike cost, and round length in Details", covers: [master] }
    - { id: recipes, kind: data, label: "A TArray of FDojoP9PropRecipe structs with name, spot, health switch and amount, loot switch, item, and count", covers: [recipes] }
    - { id: build, kind: step, label: "BuildProp spawns an AActor, adds a text render part as its root and moves it to the spot, then adds a health part and a loot part with NewObject, settings, AddInstanceComponent, and RegisterComponent, and calls ListenTo on the loot", covers: [assembly] }
    - { id: champion, kind: component, label: "BeginPlay uses the picked champion or GetPlayerPawn and adds a stamina part with NewObject and RegisterComponent if FindComponentByClass finds none", covers: [champion] }
    - { id: strike, kind: step, label: "PressStrike walks the round's props, keeps the nearest unbroken health part strictly nearer than the last, and calls TrySpend on the champion's stamina part before ApplyDamage", covers: [strike] }
    - { id: news, kind: event, label: "BuildProp binds HandlePropBroken to each OnDepleted and HandleLootDropped to each OnLootDropped with AddDynamic, and ClearProps and EndPlay unbind them", covers: [news] }
    - { id: round, kind: step, label: "A non-looping 45 second timer ends the round as TIME UP, the broken count reaching the breakable count ends it as WIN, and R calls StartRound only while stopped, which destroys old props, refills stamina, and rebuilds", covers: [round] }
  edges:
    - { from: recipes, to: build, label: "one prop per recipe" }
    - { from: build, to: news, label: "binds each new part" }
    - { from: strike, to: news, label: "a breaking strike broadcasts" }
    - { from: champion, to: strike, label: "stamina pays for strikes" }
    - { from: news, to: round, label: "every break counts toward the win" }
    - { from: master, to: round, label: "start and end" }
- id: blueprint-master
  title: A Blueprint master assembles props through the parts' C++ API
  pieces:
    - { id: master, kind: class, label: "BP_GauntletMaster actor with a Text Render component and variables for every number, the champion, and a Running flag", covers: [master] }
    - { id: recipes, kind: data, label: "An array variable of a Blueprint struct with the same fields as the C++ recipe", covers: [recipes] }
    - { id: build, kind: step, label: "For each recipe, Spawn Actor from Class with a small BP_PropShell actor that has only a Text Render root, then Add Component by Class for the health and loot parts with Deferred Finish checked, set their settings, call Finish Add Component on each, and call Listen To", covers: [assembly] }
    - { id: champion, kind: component, label: "Event BeginPlay uses Get Player Pawn when no champion is set and calls Add Component by Class for a stamina part when Get Component by Class finds none", covers: [champion] }
    - { id: strike, kind: step, label: "The E event loops over the props, keeps the nearest unbroken health part in range, and calls Try Spend on the champion's stamina part before Apply Damage", covers: [strike] }
    - { id: news, kind: event, label: "Each new health part's On Depleted and loot part's On Loot Dropped is bound to a custom event that updates the counts and the label", covers: [news] }
    - { id: round, kind: step, label: "A 45 second Set Timer by Event shows TIME UP, the break event shows WIN when all are broken, and the R event behind a branch on Running destroys the props, calls Refill, and rebuilds", covers: [round] }
  edges:
    - { from: recipes, to: build, label: "one prop per recipe" }
    - { from: build, to: news, label: "binds each new part" }
    - { from: strike, to: news, label: "a breaking strike broadcasts" }
    - { from: champion, to: strike, label: "stamina pays for strikes" }
    - { from: news, to: round, label: "every break counts toward the win" }
    - { from: master, to: round, label: "start and end" }
```

# Integration Rubric

- The health, loot, stamina, and sprint parts and the gladiator are reused unchanged; no prop kind has its own class.
- Every prop is a plain actor built from its recipe: a scene root with its name tag, then only the parts the recipe names, each filled in before it registers.
- The master knows props only through their parts: it finds them with FindComponentByClass and hears about them through OnDepleted and OnLootDropped, bound when built and unbound when cleared.
- E strikes only the nearest unbroken prop within 150, the earlier recipe on a tie, and only when the champion's stamina part can pay 20; nothing else is spent.
- Breaking every breakable prop wins with the time and loot shown; 45 seconds without that shows TIME UP; parts with no health never count.
- Any actor can be the champion; one without a stamina part is given one at play.
- Round 1 starts with play, R starts later rounds only between rounds, and a round start destroys the old props, refills stamina, and zeroes the counts, so round 2 plays like round 1.
- The submission names the link each pair uses (owner, delegate, lookup by class, or direct call) with one reason each, and gives the tuned recipes with why the last strike felt tight.
