---
id: p10-breakdown-armory
title: Plan the arena armory
order: 6
kind: breakdown
difficulty: 3
patterns: [type-object]
skills: [planning, type-object]
terms: [primary-data-asset, data-table, tsoftobjectptr, tsubclassof, spawnactor]
prerequisites: [p10-lantern-refactor]
xp: 90
estimatedMinutes: 20
concepts:
  - Planning kinds as data that a shop, a spawner, and the placed items all read
  - Choosing between data assets and data table rows per part of the plan
  - Keeping heavy references soft so listing every kind does not load every mesh
---

# Spec

The arena's armory sells gear between bouts, and designers keep adding to it. At launch it has 60 kinds of gear: weapons, shields, and quivers. Every kind has a name, a price, an icon, a mesh, a sound when it is bought, and the numbers of its family: damage and durability for weapons, block share and durability for shields, arrow count and arrow damage for quivers. Some kinds use a Blueprint child with extra effects instead of the plain actor.

The shop screen lists every kind in the armory, sorted by price, even kinds no fighter owns yet. Buying a kind spawns that item, at full durability, next to the buyer. Gear wears per item, never per kind. Designers balance prices and numbers between playtests, and want price changes to show in the shop without a code change.

Acceptance:

- A new kind of gear, of an existing family, is added with no C++ change.
- Opening the shop does not load all 60 meshes and sounds; only the icons it shows.
- Two shields of one kind wear independently.
- A kind can name a Blueprint child as its actor, and buying it spawns that class with the kind already set when its BeginPlay runs.
- A designer's change to a kind's numbers reaches items already in the arena.

# Required Pieces

```yaml
- id: kinds
  kind: data
  label: One kind class per gear family, each kind an instance designers create in the editor
  why: New kinds and balance changes become data, with no code or compile.
- id: catalog
  kind: step
  label: A way for the shop to find every kind without a placed item, and list them by price
  why: The shop must show kinds that exist only as data.
- id: soft-refs
  kind: data
  label: Meshes and sounds held softly on each kind, loaded only when an item of that kind appears
  why: Listing 60 kinds must not load 60 meshes.
- id: item-state
  kind: data
  label: Each spawned item keeps its own durability and points at its kind
  why: Wear is per item; everything else is shared.
- id: spawn
  kind: step
  label: A buy spawns the kind's actor class with the kind set before BeginPlay
  why: Items must start full and correct from their first frame, including Blueprint children.
- id: read-through
  kind: step
  label: Items read shared numbers through their kind each time
  why: A retuned kind reaches items already in play.
```

# Reference Plans

```yaml
- id: primary-assets
  title: A primary data asset class per family, found through the Asset Manager
  pieces:
    - { id: kinds, kind: data, label: "UDojoWeaponKind, UDojoShieldKind, and UDojoQuiverKind deriving from a shared UDojoGearKind primary data asset with name, price, and icon", covers: [kinds] }
    - { id: catalog, kind: step, label: "The three types in the Asset Manager's scan list; the shop asks it for every primary asset id of those types, loads only the kind assets, and sorts by price", covers: [catalog] }
    - { id: soft, kind: data, label: "TSoftObjectPtr for the mesh and the buy sound on UDojoGearKind; the icon is a hard reference because the shop always shows it", covers: [soft-refs] }
    - { id: state, kind: data, label: "Each gear actor holds a const TObjectPtr to its kind and its own Durability", covers: [item-state] }
    - { id: spawn, kind: step, label: "UDojoGearKind holds TSubclassOf for its actor; the shop's buy spawns it with SpawnActorDeferred, sets the kind, loads the mesh asynchronously, and calls FinishSpawning", covers: [spawn] }
    - { id: read, kind: step, label: "Gear actors read damage, block share, and arrow numbers through Kind whenever they use them", covers: [read-through] }
  edges:
    - { from: catalog, to: kinds, label: "finds every kind by type" }
    - { from: kinds, to: soft, label: "names heavy assets softly" }
    - { from: spawn, to: state, label: "creates items with their kind set" }
    - { from: state, to: read, label: "reads shared numbers through the kind" }
- id: tables
  title: A data table per family, with rows for kinds
  pieces:
    - { id: kinds, kind: data, label: "DT_Weapons, DT_Shields, and DT_Quivers, each with its own row struct deriving from FTableRowBase, sharing name, price, and icon fields", covers: [kinds] }
    - { id: catalog, kind: step, label: "The shop holds the three tables, walks every row with GetAllRows, and sorts the combined list by price", covers: [catalog] }
    - { id: soft, kind: data, label: "TSoftObjectPtr fields for mesh and sound in each row struct", covers: [soft-refs] }
    - { id: state, kind: data, label: "Each gear actor holds an FDataTableRowHandle and its own Durability", covers: [item-state] }
    - { id: spawn, kind: step, label: "A row's TSubclassOf names the actor; the buy spawns it deferred, sets the handle, and finishes spawning", covers: [spawn] }
    - { id: read, kind: step, label: "Gear actors call FindRow on their handle whenever they need a shared number", covers: [read-through] }
  edges:
    - { from: catalog, to: kinds, label: "reads every row" }
    - { from: kinds, to: soft, label: "names heavy assets softly" }
    - { from: spawn, to: state, label: "creates items with their kind set" }
    - { from: state, to: read, label: "reads shared numbers through the row" }
```

# Rubric

- Kinds are data per family, created and tuned in the editor; a new kind of an existing family needs no code.
- The shop finds every kind without a placed item, and lists them sorted by price.
- Meshes and sounds are soft references on the kind, loaded only when an item of that kind appears.
- Each item keeps its own durability and points at its kind; nothing per item lives on a kind.
- Buying spawns the kind's actor class with the kind set before BeginPlay.
- Items read shared numbers through their kind, so balance changes reach items already in play.

# Alternative Note

Both reference plans pass. Primary data assets suit gear whose kinds reference several assets, need their own Content Browser entries, and should be loadable by id, and the Asset Manager keeps memory under control as the armory grows. Data tables suit families with many small kinds edited side by side, and import from a spreadsheet the balance team already keeps. A mix is common: a table for quivers, assets for weapons. A third plan that gives every kind its own Blueprint class also works for 60 kinds, but the shop must then load classes to read their prices, and every balance change is a Blueprint compile.
