---
id: f6-loot-drops
title: Plan a loot drop system
order: 11
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, data]
terms: [data-table, data-asset, curve-float, tsoftobjectptr, primary-data-asset, log-category, ensure-macro]
prerequisites: [f6-showcase]
xp: 90
estimatedMinutes: 15
concepts:
  - Choosing where each piece of designer data lives
  - Keeping big assets out of memory until something drops
---

# Spec

When an enemy falls, it may drop loot. Each kind of enemy has its own drop list: a goblin drops coins often and a sword rarely; a bandit chief drops more and better. Rare items get a little more likely as the player levels up, following a shape the designer draws. A dropped item appears on the ground with its mesh and, when picked up, its icon shows in the inventory. There will be about 200 items, each with a name, a rarity, a value, a mesh, and an icon; most are never seen in a given session.

You are planning, not coding. Say where each piece of data lives (data asset, data table, curve, or code), how each asset is referenced (hard or soft), and how bad data is reported.

Acceptance:

- Designers add an item or change a drop chance without a programmer or a rebuild.
- Meshes and icons for items that never drop are never loaded.
- The rare-item bonus per level is drawn, not computed in code.
- A drop list that names an item that does not exist is reported once, clearly, and the drop is skipped; the game keeps running.
- Two players with the same level and the same random seed get the same drops.

# Required Pieces

```yaml
- id: items
  kind: data
  label: Item definitions with name, rarity, value, mesh, and icon
  why: About 200 items that designers own.
- id: drop-lists
  kind: data
  label: Per-enemy drop lists naming items with a weight each
  why: What each kind of enemy can drop and how often.
- id: rarity-curve
  kind: data
  label: A curve of the rare-item bonus by player level
  why: The designer draws how quickly rare items become likelier.
- id: roller
  kind: class
  label: A drop roller that picks items from a list using weights and the level bonus
  why: One place that owns the random choice, seeded so it can be replayed.
- id: lazy-assets
  kind: step
  label: Meshes and icons held softly and loaded when an item drops or is shown
  why: 200 items of art must not sit in memory.
- id: spawn-pickup
  kind: step
  label: The dropped item appears as a pickup showing its mesh
  why: The player sees what fell.
- id: bad-data
  kind: step
  label: A missing item in a drop list is reported in its own log category and skipped
  why: A designer's typo must be found, not crash the game.
```

# Reference Plans

```yaml
- id: tables-and-curve
  title: Items and drops in data tables
  pieces:
    - { id: item-table, kind: data, label: DT_Items with an FDojoItemRow of name and rarity and value and soft mesh and soft icon, covers: [items] }
    - { id: drop-table, kind: data, label: One drop table per enemy kind with an FDojoDropRow of item row name and weight, covers: [drop-lists] }
    - { id: curve, kind: data, label: C_RareBonus a UCurveFloat from player level to a weight multiplier for rare rows, covers: [rarity-curve] }
    - { id: roller, kind: class, label: UDojoLootSubsystem a world subsystem that rolls a drop table with an FRandomStream seeded per player, covers: [roller] }
    - { id: load, kind: step, label: On a drop the subsystem async loads the row's soft mesh through the streamable manager and spawns the pickup when it arrives, covers: [lazy-assets, spawn-pickup] }
    - { id: report, kind: step, label: FindRow with its warning off and a warning in LogDojoLoot naming the drop table and the missing row and the roll moves on, covers: [bad-data] }
  edges:
    - { from: drop-table, to: roller, label: rolled on death }
    - { from: curve, to: roller, label: scales rare weights }
    - { from: roller, to: item-table, label: finds the item row }
    - { from: item-table, to: load, label: soft mesh and icon }
    - { from: roller, to: report, label: missing rows }
- id: primary-assets
  title: Items as primary data assets found by the Asset Manager
  pieces:
    - { id: item-asset, kind: data, label: UDojoItemData a primary data asset per item with soft mesh and soft icon, covers: [items] }
    - { id: drop-asset, kind: data, label: UDojoDropListData a data asset per enemy kind with an array of item primary asset IDs and weights, covers: [drop-lists] }
    - { id: curve, kind: data, label: C_RareBonus a UCurveFloat on the drop list data asset, covers: [rarity-curve] }
    - { id: roller, kind: class, label: UDojoDropRollerComponent on each enemy that rolls its drop list with a seeded FRandomStream on death, covers: [roller] }
    - { id: load, kind: step, label: The Asset Manager loads the chosen item asset by ID and then its mesh and the pickup actor shows it, covers: [lazy-assets, spawn-pickup] }
    - { id: report, kind: step, label: An ID the Asset Manager cannot find fails an ensure naming the drop list and the roll moves on, covers: [bad-data] }
  edges:
    - { from: drop-asset, to: roller, label: set in Details }
    - { from: curve, to: roller, label: scales rare weights }
    - { from: roller, to: load, label: chosen item ID }
    - { from: item-asset, to: load, label: soft mesh and icon }
    - { from: roller, to: report, label: unknown IDs }
```

# Rubric

- Every number a designer tunes (weights, values, rarity, the level bonus) lives in a table, an asset, or a curve, none in code.
- Meshes and icons are soft references, loaded only for items that drop or are shown.
- The level bonus is a curve read with the player's level.
- Rolls use a seeded random stream, so the same seed and level give the same drops.
- A missing item is reported in a named log category or an ensure, and the drop is skipped without a crash.
- The plan says for each reference whether it is hard or soft, and why.

# Alternative Note

Both plans pass. Tables suit this many items with the same fields: designers balance them side by side and import them from a spreadsheet, and a row name is easy to type in a drop list. The cost is that a misspelled row name is only found at run time. Primary data assets give every item its own asset and an ID that the editor can pick from a list, and the Asset Manager can load or package items by type. The cost is more setup and 200 small assets to manage. A plan that hard-references every item's mesh from the drop lists fails the second acceptance line: loading a goblin would load every mesh it could ever drop.
