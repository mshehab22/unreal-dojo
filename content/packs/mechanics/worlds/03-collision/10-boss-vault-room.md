---
id: m3-boss-vault-room
title: "Boss: the vault room"
order: 10
kind: boss
difficulty: 5
patterns: []
skills: [planning, collision, delegates]
terms: [overlap-event, collision-response, get-overlapping-actors, dynamic-multicast-delegate, adddynamic, spawnactor]
prerequisites: [m3-vault-plan, m3-checkpoint, m3-pawn-gate, m3-scale-plate, m3-return-pit]
xp: 300
estimatedMinutes: 75
concepts:
  - Four pieces that each react to their own shapes, wired together by one room
  - A gate driven by a plate's event, a second listener on a pit, and a vault the room listens to itself
pieces:
  - m3-checkpoint
  - m3-pawn-gate
  - m3-scale-plate
  - m3-return-pit
---

# Spec

The vault room is a corridor along the level's X axis, with the room actor at the origin. The runner, set on the room in Details, starts each round at the entrance at the origin, with the entrance as its respawn point. Each round the room places, fresh:

- The flag at X 600.
- The plate at X 900, Y 500, needing 2 things.
- The pit at X 900, Y -500.
- The gate at X 1200, shut.

The vault is the room's own trigger, a box 200 deep and 600 wide centered at X 1600, which notices pawns and nothing else. The chute is at X 300, Y 500: the lever (`PressDispense`) drops a crate there while the round runs and fewer than 2 crates are in the room, and a crate that falls in the pit comes back to the chute, since that is where it started.

The gate is open exactly while the plate is pressed: the room hears every change of the plate's count and opens or closes the gate, and the gate itself still waits for a runner in its doorway to leave before it turns solid. A runner that falls in the pit goes back to its respawn point and the room counts a fall; a crate in the pit is not a fall. When the runner enters the vault the round is over: the time is frozen, the lever does nothing, falls are no longer counted, and the board reads `VAULT in 12.3 s, 1 falls` with the real time and falls. While the round runs the board reads `Plate 1 / 2, falls 0`, rewritten only when the plate's count or the falls change.

R (`PressRestart`) starts the next round, but only after the runner has reached the vault; before that R does nothing. A new round destroys every crate and piece and places them again, resets the falls and the time, and puts the runner at the entrance with the entrance as its respawn point, so a second round plays exactly like the first. A C++ room receives keys only after `EnableInput` with the player controller.

The plate needs one addition and its rules stay as they are: a dynamic multicast delegate `OnCountChanged`, broadcast with the new count whenever the count changes, so the room can listen. The flag, gate, and pit are reused unchanged; the room listens to the pit's zone with a second handler of its own beside the pit's.

Reference game: Portal, where a cube on a button holds a door open and the puzzle is getting yourself and the cube where they need to be.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Checkpoint.h`, `Quests/m3-checkpoint/DojoM3Runner.h`), m3-pawn-gate (`Quests/m3-pawn-gate/DojoM3Gate.h`), m3-scale-plate (`Quests/m3-scale-plate/DojoM3Plate.h`, `Quests/m3-scale-plate/DojoM3Crate.h`), and m3-return-pit (`Quests/m3-return-pit/DojoM3Pit.h`).

Core numbers are fixed: a plate that needs 2, at most 2 crates, the flag at 600, the plate and the pit at 900, the gate at 1200, and the vault at 1600.

Extensions, in order of importance:

1. A carry: the runner gets a grab sphere that finds the nearest crate's handle with an overlap query and carries it in front of it, so the puzzle can be played without teleports.
2. Two plates and two gates, where the second gate needs both plates pressed, wired entirely in the room.
3. A best time and fewest falls across rounds, shown on the board.

Feel: once the core round passes, move the chute (a property on the room) until carrying a crate from it past the pit feels like a small risk you choose to take, not a trap you cannot see.

# Required Pieces

```yaml
- id: place
  kind: class
  label: A room that places the flag, plate, pit, and gate at fixed spots each round
  why: The one place that knows the layout and rebuilds it.
- id: plate-to-gate
  kind: event
  label: The plate's count change opens or closes the gate
  why: The gate must follow the plate without either knowing the other.
- id: crates
  kind: step
  label: A lever that drops a crate at the chute, at most two in the room
  why: Crates are the puzzle's resource, and their home is the chute.
- id: falls
  kind: event
  label: The room counts the runner's falls by listening to the pit's zone beside the pit
  why: The pit sends things back; the score belongs to the room.
- id: vault
  kind: event
  label: A runner entering the vault ends the round and freezes the time
  why: The player's goal, announced once.
- id: restart
  kind: step
  label: R rebuilds the room only after the vault
  why: A second round must play exactly like the first.
- id: board
  kind: event
  label: The board changes only when the plate's count, the falls, or the round change
  why: The player's view of the round, with no polling.
```

# Reference Plans

```yaml
- id: cpp-room
  title: A C++ room actor places the pieces and listens to them
  pieces:
    - { id: room, kind: class, label: ADojoM3VaultRoom with the runner set in Details and a vault box and a board as components, covers: [place] }
    - { id: wire, kind: event, label: StartRound spawns the plate deferred with RequiredCount 2 and binds its OnCountChanged to a handler that calls Open or Close on the gate, covers: [plate-to-gate] }
    - { id: lever, kind: step, label: PressDispense spawns a crate at the chute while the round runs and the room holds fewer than two, covers: [crates] }
    - { id: falls, kind: event, label: StartRound adds a second AddDynamic on the pit's Zone whose handler counts a fall only for the runner, covers: [falls] }
    - { id: vault, kind: event, label: The vault box overlaps only pawns and its handler ends the round for the runner, covers: [vault] }
    - { id: restart, kind: step, label: PressRestart returns false while running and otherwise calls StartRound which destroys every crate and piece first, covers: [restart] }
    - { id: board, kind: event, label: RefreshBoard runs from the plate handler and the fall handler and at the start and the end of a round only, covers: [board] }
  edges:
    - { from: room, to: wire, label: spawns and binds }
    - { from: wire, to: board, label: RefreshBoard }
    - { from: falls, to: board, label: RefreshBoard }
    - { from: vault, to: board, label: finish line }
    - { from: restart, to: room, label: StartRound }
- id: blueprint-room
  title: The level Blueprint places the pieces and listens to them
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the runner and each piece and a Running Boolean and a Falls integer, covers: [place] }
    - { id: wire, kind: event, label: After Spawn Actor From Class for the plate the graph binds an event to its On Count Changed and branches on Is Pressed to Open or Close the gate, covers: [plate-to-gate] }
    - { id: lever, kind: step, label: The E key spawns a crate at the chute behind a branch on Running and the crate array's length, covers: [crates] }
    - { id: falls, kind: event, label: A bound event on the pit's Zone On Component Begin Overlap adds to Falls when Other Actor equals the runner, covers: [falls] }
    - { id: vault, kind: event, label: A trigger box actor in the level for the vault whose On Actor Begin Overlap ends the round for the runner, covers: [vault] }
    - { id: restart, kind: step, label: The R key behind a branch on Running destroys every spawned actor and runs the build graph again, covers: [restart] }
    - { id: board, kind: event, label: A custom event sets the Text Render text and is called only from the plate and pit events and at the start and the end of a round, covers: [board] }
  edges:
    - { from: level, to: wire, label: build graph }
    - { from: wire, to: board, label: custom event }
    - { from: falls, to: board, label: custom event }
    - { from: restart, to: level, label: build graph }
```

# Integration Rubric

- The flag, gate, and pit are reused without changes, and the plate's only addition is `OnCountChanged`, broadcast once per change of the count; its piece tests still pass.
- The pieces hold no pointer to the room or to each other; the room spawns them and binds their events.
- The gate follows the plate through the event alone, opening while the plate is pressed and closing otherwise, and still waits for a runner in its doorway.
- The room's fall handler is a second listener on the pit's zone, counts the runner only, and leaves the sending back to the pit.
- A crate can never reach the vault: the gate stops it open or shut, and the vault notices pawns only.
- The vault ends the round once: the time freezes, the lever and falls stop, and the board shows the real time and falls.
- R does nothing while a round runs; a new round destroys and rebuilds every crate and piece and resets the falls, the time, and the runner.
- Nothing ticks and nothing polls; the plate's needed count and the crate limit are properties a designer can tune; the submission says in one sentence where it moved the chute for the feel criterion and why.
