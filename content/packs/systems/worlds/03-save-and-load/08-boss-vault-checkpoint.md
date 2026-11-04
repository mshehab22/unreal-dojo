---
id: s3-boss-vault-checkpoint
title: "Boss: the vault checkpoint"
order: 8
kind: boss
difficulty: 5
patterns: [component, observer]
skills: [planning, saving, components, delegates, subsystems]
terms: [savegame, savegame-property, world-subsystem, actor-component, uinterface, dynamic-multicast-delegate, unbinding-delegates]
prerequisites: [s3-save-record, s3-saveable, s3-save-system, s3-door]
xp: 400
estimatedMinutes: 90
concepts:
  - A record, a saveable component, a save system, and a door assembled into checkpoints for a whole level
  - A director that lays the level out and routes keys, owning none of the saving rules
  - A checkpoint that loads into the level it was saved in and into a level opened fresh
pieces:
  - s3-save-record
  - s3-saveable
  - s3-save-system
  - s3-door
---

# Spec

A runner crosses a vault along one straight line from 0 to 900. Five coins lie at 100, 200, 400, 600, and 800, and two doors stand closed at 300 and 700. The runner starts at 0 with no coins.

Keys:

- The left and right arrows step the runner 100 back or ahead. A step past either end, or onto a closed door, does nothing.
- E takes the nearest coin within 60 of the runner; the coin leaves the vault and the runner carries one more.
- Q opens or closes the nearest door within 110, unless the runner stands in its doorway.
- F5 saves a checkpoint to the slot `DojoS3Vault`.
- F9 loads the checkpoint: the vault is laid out fresh first (every coin back in place, every door closed, the runner at 0 with no coins), and the checkpoint is applied on top, so the runner, its coins, the doors, and the coins already taken are exactly as they were at the save. With no checkpoint, F9 does nothing.

The round is won when the runner carries all five coins, and the board adds `CLEAR in 1.5 s`, the time since the round began. The board shows `Coins 2/5`, `Doors open 1/2`, and `Checkpoint none`, `saved`, `loaded`, or `failed`, one entry per line with the CLEAR line last, and it learns about saves and loads from the save system's events. Reference game: the quicksave and quickload of Skyrim (F5 and F9), where loading puts the whole world back to the moment of the save. The system combines two Pack 2 patterns: Component ("Actors built from parts"), for the saveable part that every runner, coin, and door carries; and Observer ("The lens, then the first payoff"), for the board, which listens to the save system instead of asking.

How rounds start: round 1 starts when play begins, and R starts the next round, only after the finale; it throws the checkpoint away and lays the vault out fresh. The keys do nothing outside a round. A C++ director receives keys only after `EnableInput` with the player controller.

The saving rules all live in the pieces: the record, the saveable component, and the world subsystem `UDojoS3SaveSystem`, which the director gets from the world. The runner and the coins are this boss's own classes; each carries a saveable component, and the runner keeps its spot and its coin count in SaveGame properties and moves itself back to its spot when it hears that its state was restored. Save ids are `Runner`, `Coin1` to `Coin5`, and `Door1` and `Door2`.

Compiles against earlier quests: s3-save-record (`Quests/s3-save-record/DojoS3SaveRecord.h`), s3-saveable (`Quests/s3-saveable/DojoS3SaveableComponent.h`, `Quests/s3-saveable/DojoS3Restorable.h`), s3-save-system (`Quests/s3-save-system/DojoS3SaveSystem.h`), and s3-door (`Quests/s3-door/DojoS3Door.h`). The pieces need no additions for the game itself; extension 2 asks the save system for an asynchronous path.

Core numbers are fixed: a vault from 0 to 900, coins at 100, 200, 400, 600, and 800, doors at 300 and 700, steps of 100, coin reach 60, door reach 110, one slot.

Extensions, in order of importance:

1. Three slots chosen with the number keys, each showing on the board whether it holds a checkpoint, with the coins and the time it was saved.
2. An autosave every time a door opens, using `AsyncSaveGameToSlot` so the frame does not wait for the disk, with the board showing `saving` until the callback arrives.
3. A version number in the record, and a load that refuses a checkpoint from an older version with `Checkpoint too old` instead of loading it wrong.

Feel: with the numbers fixed, a clean run without loads takes at least fifteen key presses; judge whether that is long enough for a checkpoint to feel like a way to try a route and come back, not a chore. The submission gives one sentence on why.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that lays out the runner and coins and doors and routes keys to them and to the save system
  why: The one place that translates keys into calls, owning none of the saving rules.
- id: layout
  kind: step
  label: Laying the vault out fresh with every coin back and every door closed and the runner at the start
  why: Both a new round and a load start from the same clean vault.
- id: keys
  kind: step
  label: Steps blocked by closed doors and taking coins and opening doors within reach
  why: The player's verbs, each allowed to do nothing.
- id: load-order
  kind: step
  label: F9 lays the vault out fresh first and then applies the checkpoint and only then rewrites the board
  why: Coins taken after the save must come back, and coins taken before it must stay gone.
- id: board
  kind: event
  label: The board rewrites on the save system's events and after each action and never polls
  why: The player's record of the round and the checkpoint, with no Tick.
- id: fresh
  kind: step
  label: R starts a fresh round only after the finale and throws the checkpoint away
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director that spawns the vault and drives the world's save system
  pieces:
    - { id: director, kind: class, label: ADojoS3VaultDirector with the coin and door spots and the slot name set in Details that spawns a runner and coins and doors with their save ids, covers: [director] }
    - { id: layout, kind: step, label: LayOut spawns any coin that is missing and closes every door and calls ResetRun on the runner, covers: [layout] }
    - { id: keys, kind: step, label: PressStep checks the ends and closed doors and PressTake and PressDoor find the nearest within reach, covers: [keys] }
    - { id: load, kind: step, label: PressLoad checks the slot exists then calls LayOut then LoadFromSlot on the save system, covers: [load-order] }
    - { id: board, kind: event, label: OnSaved and OnLoaded handlers set the checkpoint line and rewrite the board which every action also rewrites, covers: [board] }
    - { id: fresh, kind: step, label: RestartRound only after the finale deletes the slot and lays the vault out and starts the clock, covers: [fresh] }
  edges:
    - { from: keys, to: director, label: steps and takes }
    - { from: director, to: load, label: F9 }
    - { from: load, to: layout, label: first }
    - { from: director, to: board, label: save system events }
    - { from: board, to: fresh, label: R only after the finale }
- id: level-reload
  title: The level Blueprint saves through the subsystem and loads by reopening the level
  pieces:
    - { id: level, kind: class, label: Level Blueprint with the coins and doors placed by hand with save ids and a runner actor with SaveGame properties, covers: [director] }
    - { id: layout, kind: step, label: The placed level itself is the fresh layout because loading opens the level again, covers: [layout] }
    - { id: keys, kind: step, label: Key events move the runner and call Take on the nearest coin and Toggle on the nearest door, covers: [keys] }
    - { id: load, kind: step, label: F9 stores the slot name in the game instance and opens the level and the new level's BeginPlay calls Load From Slot, covers: [load-order] }
    - { id: board, kind: event, label: Custom events bound to On Saved and On Loaded rewrite a Text Render, covers: [board] }
    - { id: fresh, kind: step, label: R deletes the slot and opens the level, covers: [fresh] }
  edges:
    - { from: keys, to: level, label: moves and takes }
    - { from: level, to: load, label: F9 }
    - { from: load, to: layout, label: reopened level }
    - { from: level, to: board, label: bound events }
    - { from: board, to: fresh, label: R only after the finale }
```

# Integration Rubric

- The record, the saveable component, the save system, and the door are reused without changes, and every saving rule stays in them.
- The director, the runner, and the coins know the save system only through its two functions and its two events (the director also asks the engine whether the slot exists and deletes it on R); the save system knows none of them by name.
- A load puts the runner, its coins, both doors (state and panel), and every coin exactly as they were at the save, including coins taken after the save coming back and coins taken before it staying gone.
- A checkpoint saved in one world loads into a vault built fresh in another.
- Steps, coins, and doors follow the fixed numbers, each can do nothing, and F9 with no checkpoint changes nothing.
- The board changes only after actions and on the save system's events, and nothing runs in Tick; every binding made in BeginPlay is removed in EndPlay.
- R starts a fresh round only after the finale, throws the checkpoint away, and the keys do nothing outside a round.
- A second round plays exactly like the first; the submission gives one sentence on how the fixed route feels.
