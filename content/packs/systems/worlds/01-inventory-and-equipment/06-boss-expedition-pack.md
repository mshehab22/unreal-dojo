---
id: s1-boss-expedition-pack
title: "Boss: the expedition pack"
order: 6
kind: boss
difficulty: 5
patterns: [component, observer, type-object]
skills: [planning, components, delegates, data]
terms: [actor-component, data-asset, dynamic-multicast-delegate, adddynamic, unbinding-delegates, findcomponentbyclass]
prerequisites: [s1-item-data, s1-bag, s1-equipment, s1-bag-view]
xp: 400
estimatedMinutes: 90
concepts:
  - A bag, equipment, piles, and a view assembled into one carrying system, each part reused as it is
  - A director that only connects the parts and owns none of their rules
  - A second round that plays exactly like the first
pieces:
  - s1-item-data
  - s1-bag
  - s1-equipment
  - s1-bag-view
---

# Spec

The expedition leaves at dawn, and the hero has to pack for it. The hero carries a bag with four slots and a weight limit of 20, and has a head slot and a hand slot. Six piles lie along a road, in this order: 6 stones, a sword, a helmet, 4 potions, 4 more potions, and a dagger. Potions stack to 5 and weigh 1, stones stack to 10 and weigh 2, the sword weighs 6 and adds 7 power in the hand, the dagger weighs 2 and adds 3 in the hand, and the helmet weighs 4 and adds 2 on the head. A potion heals 25.

The pack is ready when the sword is in the hand, the helmet is on the head, and the bag holds at least 3 potions. The round then ends and the board adds `READY in 41.2 s`, the time since the round began. Health starts at 50 of 100, and it only matters for what a potion does.

Keys, all on the hero:

- E picks up the nearest pile within 200 units, taking only what the bag accepts and leaving the rest lying there; between piles at the same distance the earlier one wins.
- 1 to 4 select a bag slot (counted from slot 1); drop, use, and equip act on the selected slot, and a slot with nothing in it does nothing.
- G drops one of the selected item, which lands 100 units in front of the hero as a pile of one.
- U uses one of the selected item if it heals and the hero is hurt: health rises by its heal amount, up to the maximum. At full health nothing is used and the potion is kept.
- Q equips the selected item if it can be worn; whatever was worn there goes back to the bag.

The board shows `Health 50/100` and `Selected: Potion x3` (or `Selected: none`) and, after the finale, the ready line. A bag view beside it shows the bag and what is worn, the way the panel piece writes it. Reference game: Resident Evil 4's attaché case, where fitting things into a small case is the whole puzzle. The system combines three Pack 2 patterns: Component ("Actors built from parts"), for the bag and the equipment that any actor can carry; Observer ("The lens, then the first payoff"), for the board, the view, and the finale, which listen instead of asking; and Type Object ("Kinds as data"), for the item kinds that live in assets.

How rounds start: round 1 starts when play begins, and R starts the next round, only after the finale; the keys do nothing outside a round, except that selecting a slot always works. Starting a round empties the bag and the body, puts health back at 50, removes every pile, including dropped ones, and lays out the six piles again. A C++ director receives keys only after `EnableInput` with the player controller.

The hero's bag and equipment are components on the hero; the director finds them with `FindComponentByClass`. It spawns the bag view itself.

Compiles against earlier quests: s1-item-data (`Quests/s1-item-data/DojoS1ItemData.h`, `Quests/s1-item-data/DojoS1WorldItem.h`), s1-bag (`Quests/s1-bag/DojoS1InventoryComponent.h`), s1-equipment (`Quests/s1-equipment/DojoS1EquipmentComponent.h`), and s1-bag-view (`Quests/s1-bag-view/DojoS1BagView.h`). The pieces need no additions.

Core numbers are fixed: 4 slots, a weight limit of 20, 200 to pick up, 100 to drop, 25 per potion, 3 potions needed, health 50 of 100.

Extensions, in order of importance:

1. A chest: a second actor with its own bag, where the hero can move items by selecting a slot and pressing a key, reusing the bag component unchanged.
2. Dropping a whole stack at once, and picking a dropped pile up again with the same rules.
3. Weight changes the walk: above 15 the hero moves at 80 percent speed, so packing light is a choice.

Feel: tune the weight limit and the number of slots until a perfect pack exists but the first try runs out of room. The submission gives the numbers and one sentence on why.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that connects the hero's bag and equipment to the piles and the board
  why: The one place that translates keys into calls, owning none of the bag's or equipment's rules.
- id: reach
  kind: step
  label: E picks up the nearest pile within 200 and takes only what the bag accepts
  why: A reach rule and a partial pickup that leaves the rest where it lies.
- id: keys
  kind: step
  label: Selecting a slot and dropping and using and equipping on the selected slot
  why: The player's verbs, each acting on one slot and each allowed to do nothing.
- id: board
  kind: event
  label: The board and the bag view rewrite on events and never poll
  why: The player's record of the round, with no Tick.
- id: finale
  kind: step
  label: Sword in hand and helmet on head and three potions in the bag end the round with the time
  why: A goal made of three conditions from two components.
- id: fresh
  kind: step
  label: R starts a fresh round only after the finale and resets the bag and the body and health and the piles
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director on the level that wires the hero's components
  pieces:
    - { id: director, kind: class, label: ADojoS1PackDirector with the hero and the loot spots and the ready items set in Details and the bag and equipment found on the hero, covers: [director] }
    - { id: reach, kind: step, label: PressPickUp finds the nearest pile within range and takes what Add accepted from it, covers: [reach] }
    - { id: keys, kind: step, label: A selected slot index and PressDrop and PressUse and PressEquip that read the selected item from the bag, covers: [keys] }
    - { id: board, kind: event, label: The director binds OnInventoryChanged and OnEquipmentChanged to a handler that rewrites the board and the spawned bag view listens by itself, covers: [board] }
    - { id: finale, kind: step, label: The same handler checks the three conditions while the round runs and records the time when they hold, covers: [finale] }
    - { id: fresh, kind: step, label: RestartRound clears the bag and the body and destroys every pile and respawns the loot only when not running, covers: [fresh] }
  edges:
    - { from: reach, to: director, label: Add and Take }
    - { from: keys, to: director, label: Remove and Equip }
    - { from: director, to: board, label: bag and equipment events }
    - { from: board, to: finale, label: checked on every change }
    - { from: finale, to: fresh, label: R only after }
- id: blueprint-director
  title: The level Blueprint wires the pieces through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and the item assets and the piles and a Running Boolean, covers: [director] }
    - { id: reach, kind: step, label: The E event loops over the piles comparing distances and calls Add on the hero's bag and Take on the pile with the result, covers: [reach] }
    - { id: keys, kind: step, label: The number keys set a slot variable and G and U and Q read the item from Get Slots and call Remove or Equip, covers: [keys] }
    - { id: board, kind: event, label: Custom events bound to On Inventory Changed and On Equipment Changed rewrite a Text Render and call Show on a bag view, covers: [board] }
    - { id: finale, kind: step, label: The custom events check the hand and the head and Count Of the potion and set Running to false with the time, covers: [finale] }
    - { id: fresh, kind: step, label: The R event behind a branch on Running removes every item and unequips both slots and destroys the piles and spawns the six again, covers: [fresh] }
  edges:
    - { from: reach, to: level, label: Add and Take }
    - { from: keys, to: level, label: Remove and Equip }
    - { from: level, to: board, label: bound events }
    - { from: board, to: finale, label: checked on every change }
    - { from: finale, to: fresh, label: R only after }
```

# Integration Rubric

- The item data, world item, bag, equipment, and bag view are reused without changes; every rule about stacking, limits, and moving items stays in the bag and the equipment.
- The director subscribes to the bag and the equipment, and the bag view subscribes by itself; neither the bag nor the equipment points at the director or the view.
- E reaches the nearest pile within 200, the earlier pile winning ties, and takes only what the bag accepted, leaving the rest lying where it was.
- Drop, use, and equip act on the selected slot, do nothing for an empty slot, and use is refused at full health without consuming the potion.
- A refused equip loses and duplicates nothing, and leaves the worn items and the piles on the ground as they were.
- The board and the bag view change only on events, and the finale is checked from the same events.
- Every binding made in BeginPlay is removed in EndPlay, and nothing runs in Tick.
- R starts a fresh round only after the finale, and a second round plays exactly like the first; the submission gives the tuned numbers with one sentence on why.
