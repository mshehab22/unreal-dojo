---
id: s3-save-plan
title: Plan checkpoints for a coin vault
order: 1
kind: breakdown
difficulty: 4
patterns: [component]
skills: [planning, data, saving]
terms: [actor-component, uinterface, world-subsystem, dynamic-multicast-delegate, fname]
prerequisites: [f5-boss-beacon-drill, p9-boss-prop-gauntlet]
xp: 120
estimatedMinutes: 25
concepts:
  - Deciding what a checkpoint holds and what the level already knows
  - Naming every saveable thing so a fresh level can find it again
  - Keeping saving and loading in one place that every saveable thing plugs into
---

# Spec

A runner crosses a vault in a straight line. Five coins lie along the way and two doors block it; the runner opens a door with a key press when standing next to it and walks through. At any moment the player can save a checkpoint to a slot, and later load it: the runner is back where it stood with the coins it carried, each door is open or closed as it was, and the vault looks exactly as it did when the checkpoint was saved. A checkpoint must still load after the game is quit and started again.

Designers will add more doors, more coins, a lantern that can be lit, and a second vault, and none of that may need changes to the saving code. Each new kind of saveable thing may need a few lines of its own.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- A new door or coin is placed in the level, not written into the saving code.
- The saving code knows no kind of saveable thing by name: no door, coin, or runner.
- A checkpoint loads into a level that was just opened, not only into the one it was saved in.
- Anything that shows the checkpoint on screen learns about saves and loads by listening.

# Required Pieces

```yaml
- id: record
  kind: data
  label: A save object written to a named slot that holds the state of each saveable thing by its id
  why: The checkpoint itself, which outlives the level and the game.
- id: ids
  kind: data
  label: A stable id on every saveable thing that is the same each time the level opens
  why: A fresh level must match each saved state to the right actor.
- id: saveable
  kind: component
  label: A part each saveable actor carries that turns its saved properties into data and back
  why: Every kind of saveable thing plugs into saving the same way.
- id: marked
  kind: data
  label: Marking which properties of an actor belong in a save
  why: Progress is saved; looks and settings are not.
- id: system
  kind: class
  label: One place that gathers every saveable into the record and applies a record to the level
  why: Saving and loading happen in one place, not in every actor.
- id: restore-order
  kind: step
  label: An order for loading that sets the level out first and puts each actor's saved state on it after
  why: Saved state can only go onto actors that already exist, and the announcement must wait until all of it is back.
- id: announcements
  kind: event
  label: Events for a save finished and a load finished
  why: The board and sounds listen instead of asking.
- id: board
  kind: class
  label: A board that shows the checkpoint and rewrites itself from the events
  why: The player's view of whether the checkpoint worked.
```

# Reference Plans

```yaml
- id: subsystem-and-component
  title: A save record, a saveable component with SaveGame properties, and a world subsystem that gathers and applies
  pieces:
    - { id: record, kind: data, label: UDojoS3SaveRecord USaveGame with a map from save id to bytes and a list of ids, covers: [record] }
    - { id: ids, kind: data, label: A SaveId name set on each placed actor's saveable component, covers: [ids] }
    - { id: saveable, kind: component, label: UDojoS3SaveableComponent that writes its owner's SaveGame properties into bytes and reads them back, covers: [saveable] }
    - { id: marked, kind: data, label: UPROPERTY SaveGame on the properties that are progress, covers: [marked] }
    - { id: system, kind: class, label: UDojoS3SaveSystem world subsystem that finds every saveable component and saves and loads the record through a slot, covers: [system] }
    - { id: restored, kind: step, label: The vault is laid out fresh then the save system puts every saved state back and only then announces the load, covers: [restore-order] }
    - { id: events, kind: event, label: OnSaved and OnLoaded on the save system broadcast after the slot was written or the level was restored, covers: [announcements] }
    - { id: director, kind: class, label: A vault director that routes keys and rewrites the board from the save system's events, covers: [board] }
  edges:
    - { from: marked, to: saveable, label: only marked properties }
    - { from: ids, to: system, label: matched by id }
    - { from: system, to: saveable, label: capture and restore }
    - { from: system, to: record, label: writes and reads the slot }
    - { from: system, to: restored, label: layout then state then event }
    - { from: system, to: events, label: broadcasts }
    - { from: events, to: director, label: rewrites the board }
- id: interface-and-instance
  title: Each saveable actor writes its own fields through an interface into a save game held by the game instance
  pieces:
    - { id: record, kind: data, label: A USaveGame with one struct array per kind of saveable thing, covers: [record] }
    - { id: ids, kind: data, label: A guid assigned to each placed actor in the editor, covers: [ids] }
    - { id: saveable, kind: class, label: A saveable interface with WriteState and ReadState that each actor class implements by copying its own fields, covers: [saveable, marked] }
    - { id: system, kind: class, label: A game instance subsystem that saves asynchronously and loads after a level opens by asking every actor that implements the interface, covers: [system] }
    - { id: order, kind: step, label: The subsystem waits for the level to open then asks every implementer to read its state then broadcasts, covers: [restore-order] }
    - { id: events, kind: event, label: Saved and loaded delegates on the subsystem, covers: [announcements] }
    - { id: hud, kind: class, label: A HUD widget bound to both delegates, covers: [board] }
  edges:
    - { from: system, to: saveable, label: asks every implementer }
    - { from: saveable, to: record, label: writes its own entry }
    - { from: system, to: order, label: level then state then event }
    - { from: system, to: events, label: broadcasts }
    - { from: events, to: hud, label: redraws }
```

# Rubric

- The plan names the save object, where it is written, and what it holds for each saveable thing.
- Every saveable thing has an id that stays the same when the level opens again, and the plan says where the id comes from.
- One place gathers and applies every saveable, and it knows no kind of saveable thing by name.
- The plan marks which properties are progress and gives the order of a load, from the level to the announcement.
- Saves and loads are announced, and the board only listens.
- The plan says how a checkpoint loads into a level that was just opened.

# Alternative Note

Both plans pass. A component with SaveGame properties keeps each kind of saveable thing down to a few marked fields and one hook, and the saving code never changes when a kind is added; the cost is that the saved bytes follow the class's properties, so renaming a property quietly drops its old value, and the bytes cannot be read by anything but the same class. An interface whose actors write their own fields gives each kind full control over its saved format and makes version changes explicit, which suits long-lived saves; the cost is a pair of hand-written functions per kind, and a field added to the class but forgotten in WriteState is lost without warning. Saving through a slot rather than in memory is what lets a checkpoint outlive the game. The saveable part is the Component pattern from Pack 2's "Actors built from parts" world, and the builds that follow name the other ideas the system combines when you reach them. A plan where the save system lists every door and coin class, or where the board asks the save system every frame, fails the acceptance lines.
