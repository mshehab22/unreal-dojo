---
id: m3-vault-plan
title: Plan a vault room
order: 1
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, collision]
terms: [primitive-component, adddynamic, dynamic-multicast-delegate, sweep, spawnactor]
prerequisites: [m2-boss-clockwork-hall]
xp: 80
estimatedMinutes: 20
concepts:
  - Choosing which shapes block, which only notice, and which do both at different times
  - Deciding who listens to which touch, and who tells whom
---

# Spec

The training hall gets a vault room: a corridor along the level's X axis with a vault at the far end behind a gate. A runner (the player stand-in) starts at the room's entrance. In the room:

- A flag partway along. Touching it makes it the runner's respawn point.
- A chute at the side that drops a crate when the player pulls a lever, with at most two crates in the room at once.
- A plate in a side bay. The gate is open only while at least two things stand on the plate: two crates, or a crate and the runner.
- A pit on the other side. A crate that falls in comes back to the chute; a runner that falls in goes back to its respawn point and the fall is counted.
- The gate lets the runner through while it is open, but a crate can never be pushed through it, open or shut, and it never shuts on a runner standing in the doorway.
- Reaching the vault ends the round, and the board shows the time and the falls. A key starts a fresh round, but only after a round has ended.

You are planning, not coding. Name the classes, the shapes each one owns, how each shape responds to runners and to crates, and who hears about each touch and whom they tell.

Acceptance:

- Every touch the room cares about arrives as an event; nothing checks positions every frame.
- The plate, the gate, the flag, and the pit each work alone, in any level, with no pointer to the room.
- A crate cannot reach the vault by any route.
- A second round plays exactly like the first.

# Required Pieces

```yaml
- id: shapes
  kind: data
  label: For every shape, whether it blocks or only notices runners and crates
  why: Each answer is a collision setting, and most bugs in a room like this are a wrong response on one shape.
- id: flag
  kind: class
  label: A flag that notices a runner and makes itself the runner's respawn point
  why: The runner keeps its own respawn point, and the flag is the thing that changes it.
- id: plate
  kind: class
  label: A plate that counts what stands on it and says when the count changes
  why: The gate depends on a number, and the number changes only when something steps on or off.
- id: gate
  kind: class
  label: A gate that blocks runners while shut and crates always, and waits for the doorway to clear before shutting
  why: The gate lets runners through while a crate never gets past, and the doorway must never shut on a runner.
- id: pit
  kind: class
  label: A pit that sends a crate back to the chute and a runner back to its respawn point
  why: The puzzle has to stay solvable after a fall.
- id: chute
  kind: step
  label: A lever that spawns a crate at the chute, up to two at once
  why: Crates are the puzzle's only resource, so their supply is a rule.
- id: room
  kind: class
  label: A room that places the pieces, wires the plate to the gate, counts falls, and ends the round at the vault
  why: Someone has to own the round, the falls, and the restart.
- id: board
  kind: event
  label: A board that changes only when the plate, the falls, or the round change
  why: The player's view of the round, with no polling.
```

# Reference Plans

```yaml
- id: room-listens
  title: The room listens to every piece and tells the gate what to do
  pieces:
    - { id: shapes, kind: data, label: The flag and pit and plate are query only triggers while the gate and crates block and the runner's body has the Pawn object type, covers: [shapes] }
    - { id: flag, kind: class, label: A flag actor with an overlap sphere that answers only pawns and calls SetRespawnPoint on a runner, covers: [flag] }
    - { id: plate, kind: class, label: A plate actor with a box trigger that counts what stands on it and broadcasts OnCountChanged, covers: [plate] }
    - { id: gate, kind: class, label: A gate actor with a blocking box whose Pawn response turns to Overlap when open and back to Block once no pawn is inside, covers: [gate] }
    - { id: pit, kind: class, label: A pit actor with a box trigger that calls Respawn on a runner and ReturnHome on a crate, covers: [pit] }
    - { id: chute, kind: step, label: The room spawns a crate at the chute on the lever key while fewer than two are alive, covers: [chute] }
    - { id: room, kind: class, label: A room actor that spawns the pieces and binds the plate's OnCountChanged and a second handler on the pit's trigger and its own vault trigger, covers: [room] }
    - { id: board, kind: event, label: The room rewrites a Text Render board from those three handlers only, covers: [board] }
  edges:
    - { from: room, to: plate, label: binds OnCountChanged }
    - { from: room, to: gate, label: Open and Close }
    - { from: room, to: pit, label: binds the trigger's begin overlap }
    - { from: room, to: board, label: writes }
- id: plate-drives-gate
  title: The plate drives its gate and the room only keeps score
  pieces:
    - { id: shapes, kind: data, label: Trigger shapes overlap everything they care about and solid shapes block everything with only the gate changing at runtime, covers: [shapes] }
    - { id: flag, kind: class, label: A flag with an overlap sphere that casts the other actor to the runner and stores itself as its respawn point, covers: [flag] }
    - { id: plate, kind: class, label: A plate with a gate pointer set in Details that opens the gate at two things and closes it below two, covers: [plate] }
    - { id: gate, kind: class, label: A gate that lets runners through while open and keeps crates out and checks the doorway for runners before shutting, covers: [gate] }
    - { id: pit, kind: class, label: A pit trigger that sends crates to their home and runners to their respawn point, covers: [pit] }
    - { id: chute, kind: step, label: A lever actor that spawns a crate at the chute when fewer than two crates exist, covers: [chute] }
    - { id: room, kind: class, label: A room that builds the level and keeps the falls and the clock and listens for the vault and the pit, covers: [room] }
    - { id: board, kind: event, label: The room's board updates on a fall and at the start and the end of the round, covers: [board] }
  edges:
    - { from: plate, to: gate, label: Open and Close }
    - { from: room, to: plate, label: sets the gate pointer }
    - { from: room, to: pit, label: listens }
    - { from: room, to: board, label: writes }
```

# Rubric

- Every shape in the plan says whether it blocks, overlaps, or ignores runners and crates, and the gate lets runners pass while it is open, never lets a crate pass, and is never shut on a runner.
- The flag, plate, gate, and pit each react only to their own shapes' events and hold no pointer to the room.
- The plan says who tells the gate to open, and the direction of that dependency is stated.
- The pit treats runners and crates differently, and the plan says where each one goes back to.
- Nothing measures positions in Tick; the vault, the plate, the pit, and the flag are all events.
- The plan says how a new round resets the crates, the plate, the gate, the falls, the flag, and the runner.

# Alternative Note

Both plans pass. When the room listens to the plate and opens the gate, the plate and the gate stay unaware of each other, so a designer can wire one plate to two gates, or two plates to one gate, in the room's code alone; the cost is that the room must be told about every new plate. When the plate holds its gate, a level with many plate and gate pairs needs no room code at all, but a plate can then only ever drive gates, and a plate that should light a lamp needs a second kind of plate. A plan where the gate checks the plate every frame, or where opening the gate turns its collision off, breaks the first and third acceptance lines.
