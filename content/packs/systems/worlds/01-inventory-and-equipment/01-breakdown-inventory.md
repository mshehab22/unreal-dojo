---
id: s1-inventory-plan
title: Plan a bag with equipment slots
order: 1
kind: breakdown
difficulty: 4
patterns: [component]
skills: [planning, data, delegates]
terms: [data-asset, actor-component, dynamic-multicast-delegate, tarray, tmap, ustruct]
prerequisites: [f5-boss-beacon-drill, p9-boss-prop-gauntlet]
xp: 120
estimatedMinutes: 25
concepts:
  - Describing each kind of item once and letting everything else point at it
  - Deciding which piece owns the bag, which owns what is worn, and who only listens
  - Keeping limits, moves, and announcements in the pieces that own them
---

# Spec

An expedition leader packs for a dungeon. The leader carries a bag with four slots and a weight limit of 20. Piles of loose things lie around the level: potions (a slot holds up to 5, each weighs 1, and drinking one heals), stones (a slot holds up to 10, each weighs 2, and they are worth nothing), a sword (weighs 6, worn in the hand, adds 7 power), a dagger (weighs 2, worn in the hand, adds 3 power), and a helmet (weighs 4, worn on the head, adds 2 power).

The player picks up the nearest pile, taking only what fits and leaving the rest lying there. They drop one item of the selected slot in front of them, drink a potion when hurt, and equip an item from the bag; equipping puts back into the bag whatever was worn in that slot. A panel shows the bag's weight, each slot, what is worn, and the total power, and it is always right.

Designers will add new kinds of item and a second character with a bag, and neither may need new code.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- A new kind of item is a new asset, not new code.
- The bag knows nothing about equipment, the panel, or the player's keys.
- Nothing polls the bag or the equipment every frame.
- A second character can carry a bag and wear items with the same pieces.

# Required Pieces

```yaml
- id: item-kinds
  kind: data
  label: Item kinds as assets with a name and stack size and weight and slot and power and heal
  why: Designers add kinds without code, and every pile points at one kind.
- id: world-pile
  kind: class
  label: A pile of loose items in the world that hands out items and leaves when empty
  why: The things the player finds, which know nothing about bags.
- id: bag
  kind: component
  label: A bag that holds stacks in slots under a weight limit
  why: Any actor can carry one, and it owns the stacks.
- id: equipment
  kind: component
  label: Equipment slots that move items between the bag and the body
  why: What is worn is separate from what is carried, and something must move items between them.
- id: announcements
  kind: event
  label: Events that announce every change to the bag and to the equipment
  why: Panels and sounds listen instead of asking.
- id: actions
  kind: step
  label: Pick up and drop and use and equip actions that call the bag and the equipment
  why: The player's verbs, each one a short sequence of calls.
- id: limits
  kind: step
  label: Rules for stacking and slot capacity and weight
  why: Someone must decide how much fits and report how much actually moved.
- id: panel
  kind: class
  label: A panel that rewrites itself from the events
  why: The player's view of the bag and the body.
```

# Reference Plans

```yaml
- id: two-components
  title: A bag component and an equipment component, each announcing its own changes
  pieces:
    - { id: kinds, kind: data, label: UDojoS1ItemData data asset with name and stack size and weight and equip slot and power bonus and heal amount, covers: [item-kinds] }
    - { id: pile, kind: class, label: ADojoS1WorldItem holding an item asset and a count that gives items out and removes itself when empty, covers: [world-pile] }
    - { id: bag, kind: component, label: UDojoS1InventoryComponent with stacks in slots and a slot count and a weight limit where Add and Remove say how many moved, covers: [bag, limits] }
    - { id: equipment, kind: component, label: UDojoS1EquipmentComponent with one worn item per slot that takes items from the bag and gives replaced items back, covers: [equipment] }
    - { id: events, kind: event, label: OnInventoryChanged on the bag and OnEquipmentChanged on the equipment each broadcast after the change is complete, covers: [announcements] }
    - { id: director, kind: class, label: A director that takes the player's keys and calls the piles and the bag and the equipment, covers: [actions] }
    - { id: panel, kind: class, label: A panel actor that binds to both events and rewrites its text and unbinds when it leaves play, covers: [panel] }
  edges:
    - { from: kinds, to: pile, label: pile points at a kind }
    - { from: kinds, to: bag, label: stacks point at kinds }
    - { from: pile, to: director, label: found by distance }
    - { from: director, to: bag, label: Add and Remove }
    - { from: director, to: equipment, label: Equip }
    - { from: equipment, to: bag, label: Remove and Add }
    - { from: bag, to: events, label: broadcasts }
    - { from: equipment, to: events, label: broadcasts }
    - { from: events, to: panel, label: both events }
- id: one-inventory
  title: One inventory component whose slots include named equipment slots
  pieces:
    - { id: kinds, kind: data, label: A data table with one row per item kind holding the same fields and a slot name, covers: [item-kinds] }
    - { id: pile, kind: class, label: A world pickup actor with a row name and a count that gives items out and removes itself when empty, covers: [world-pile] }
    - { id: inventory, kind: component, label: One inventory component with numbered bag slots and named body slots and a weight limit and Move functions between any two slots, covers: [bag, equipment, limits] }
    - { id: changed, kind: event, label: A single OnChanged event that carries the slot that changed, covers: [announcements] }
    - { id: actions, kind: step, label: The component's own PickUp and Drop and Use and Equip functions that the player's input calls, covers: [actions] }
    - { id: panel, kind: class, label: A panel actor that binds to OnChanged and redraws only the slot named in the event, covers: [panel] }
  edges:
    - { from: kinds, to: inventory, label: slots point at rows }
    - { from: pile, to: actions, label: found by distance }
    - { from: actions, to: inventory, label: Move }
    - { from: inventory, to: changed, label: broadcasts }
    - { from: changed, to: panel, label: slot that changed }
```

# Rubric

- Each kind of item is described once, as data, and piles, bags, and equipment point at it instead of copying its numbers.
- The bag owns the stacks and its two limits; equipment owns what is worn; neither points at the panel or at the player's input.
- Every change to the bag and every change to the equipment is announced by an event, and the panel only listens and unbinds when it leaves play.
- The plan says who moves an item between the ground, the bag, and the body, and which piece decides whether a move is allowed.
- Pick up, drop, use, and equip each name the pieces they call and what those report back.
- The plan says what a second character with a bag needs.

# Alternative Note

Both plans pass. Two components keep the bag simple enough to reuse on a chest or a shop, and let equipment come and go on characters that never wear anything; the cost is that a move between them touches two components and two events, so the order of those changes matters. One inventory component makes every move a single operation on one list of slots and gives the panel one event, which suits systems where the body and the bag are really the same grid; the cost is that every character carries rules for slots it may never use. This is the Component pattern from Pack 2's "Actors built from parts" world; the announcements and the item kinds as data are two more ideas from Pack 2, and the builds that follow name them when you reach them. A plan where the bag calls the panel, where the panel checks the bag every frame, or where each kind of item is a class of its own fails the first three acceptance lines.
