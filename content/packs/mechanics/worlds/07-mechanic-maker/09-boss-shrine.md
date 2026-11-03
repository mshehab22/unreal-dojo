---
id: m7-boss-shrine
title: "Boss: the shrine gate"
order: 9
kind: boss
difficulty: 5
patterns: [observer, component]
skills: [planning, collision, delegates, time]
terms: [dynamic-multicast-delegate, adddynamic, unbinding-delegates, timer-manager, findcomponentbyclass, meta-specifier]
prerequisites: [m7-plate-door-plan, m7-pitch-and-pieces, m7-signal-plate, m7-tuning-knobs, m7-plate-gate, m7-key-door-plan, m7-key-ring, m7-locked-door, m3-checkpoint, m3-scale-plate]
xp: 320
estimatedMinutes: 80
concepts:
  - Two ready mechanics joined in one room, each still working alone
  - A director that only hears events and puts the pieces back, with every rule left in the pieces
pieces:
  - m7-signal-plate
  - m7-plate-gate
  - m7-key-ring
  - m7-locked-door
---

# Spec

The temple keeper's shrine is one room along the level's X axis. A visitor, the runner with a key ring, starts at X -2500. In the forecourt, two signal plates sit at X 0, Y 600 and Y -600, and two crates wait at X -1500 on the same two lines. A plate gate at X 800 listens to both plates and rises 300 cm over 0.8 seconds while both are pressed, sinking back the same way when either is released. Behind it, in the inner court, the shrine key waits on its pickup at X 1200, and the sanctum door at X 1800 needs `ShrineKey`.

A visit goes like this: the visitor pushes a crate onto each plate, the gate rises, the visitor takes the key and tries the door, and the door opens. How the visitor tries the door is the level's choice; in the editor a key in the level Blueprint calls Try Open with the runner. Every try before the key is a locked try, and the door counts it.

The door opening clears the round. A shrine director hears the unlock and nothing else decides it: it counts the round, announces it, remembers the visitor the unlock named, and 2 seconds later puts the shrine back. The crates go home, which frees the plates, so the gate sinks on its own; the key returns to its pickup; the door relocks and keeps its count of locked tries; and the key comes off the visitor's ring. The next visitor then plays exactly like the first.

A board on the director reads three lines: `Rounds cleared: 1`, `Gate: OPEN` or `Gate: SHUT`, and `Resetting` while a reset is coming. It changes only when the gate reports it finished opening or closing, when a round is cleared, and when the reset runs.

Dependency direction: the director holds pointers to the gate, the key pickup, the door, and the crates, and only listens to their events and calls their public functions. The pieces never know the director exists, and the plates and the gate never know about the key or the door.

The pieces need no additions: the plate, the gate, the ring, the pickup, and the door are used as their quests left them. The runner and the crates are the ones from the collision world.

Reference game: the switch rooms of top-down adventure dungeons such as The Legend of Zelda: A Link to the Past, where a block pushed onto a floor switch holds a way open and a small key opens the last door.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`), m3-scale-plate (`Quests/m3-scale-plate/DojoM3Crate.h`), m7-signal-plate (`Quests/m7-signal-plate/DojoM7SignalPlate.h`), m7-plate-gate (`Quests/m7-plate-gate/DojoM7PlateGate.h`), m7-key-ring (`Quests/m7-key-ring/DojoM7KeyRing.h`, `Quests/m7-key-ring/DojoM7KeyPickup.h`), and m7-locked-door (`Quests/m7-locked-door/DojoM7LockedDoor.h`).

Core numbers are fixed: two plates, both needed; the gate rises 300 cm in 0.8 seconds; one key, `ShrineKey`; the reset comes 2 seconds after the unlock; the plates at X 0, the gate at X 800, the key at X 1200, and the door at X 1800.

Extensions, in order of importance:

1. A second door in the sanctum that needs `CellarKey`, from a second pickup that only the first door reaches; the director takes a list of pickups and doors, a round is cleared by the last door, and every key comes off the ring at the reset.
2. A visit timer from the first plate pressed to the unlock, with the best time kept on the board across rounds.
3. Feedback through the events that already exist: a click when a plate is pressed, a rumble while the gate moves, and a chime on the unlock, none of them known to the piece that fires the event.

Feel: once both rounds pass, tune the gate's open time and the reset pause until the gate rising reads as a reward you watch and the reset leaves you a moment to see the door shut behind you, not a wait you sit through. Note the two values you chose.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A shrine director holding the gate, the key, the door, and the crates, owning no rules
  why: One place that hears the room and puts it back, while every rule stays in a piece.
- id: plates-to-gate
  kind: event
  label: Both plates pressed open the gate through the plates' events, with no director code
  why: The first mechanic must keep working alone inside the second.
- id: round-clear
  kind: event
  label: The door's unlock reaches the director, which counts a round and remembers the named visitor
  why: The unlock is the one moment a round ends, and the event already names who did it.
- id: reset-clock
  kind: step
  label: A timer starts ResetSeconds after each unlock and is cancelled if the director leaves
  why: The pause is a rhythm, not a per-frame check.
- id: reset
  kind: step
  label: The reset sends crates home, returns the key, relocks the door, and takes the key off the ring
  why: A second visitor must find the shrine exactly as the first did.
- id: board
  kind: event
  label: The board follows the gate's opened and closed events, the rounds, and the reset
  why: The visitor's view of the shrine, with no polling.
- id: knobs
  kind: data
  label: Reset pause, gate height, and gate time as editable numbers with ranges
  why: The feel criterion is tuned in Details, not in code.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ shrine director wires the pieces through their events
  pieces:
    - { id: director, kind: class, label: ADojoM7ShrineDirector with Gate and KeyPickup and Door and Crates set in Details and a board, covers: [director] }
    - { id: gate, kind: event, label: The plate gate binds HandlePlateChanged to both plates in its own BeginPlay and the director never touches the plates, covers: [plates-to-gate] }
    - { id: unlock, kind: event, label: BeginPlay binds HandleDoorUnlocked to the door's OnUnlocked with AddUniqueDynamic and the handler counts the round and keeps the visitor and broadcasts OnRoundCleared, covers: [round-clear] }
    - { id: clock, kind: step, label: The handler sets a one shot timer for ResetSeconds and EndPlay clears it and removes every binding, covers: [reset-clock] }
    - { id: reset, kind: step, label: ResetShrine calls ReturnHome on each crate and ResetPickup and Relock and RemoveKey on the ring found with FindComponentByClass, covers: [reset] }
    - { id: board, kind: event, label: Handlers on the gate's OnOpened and OnClosed and the round and reset steps call RefreshBoard, covers: [board] }
    - { id: knobs, kind: data, label: ResetSeconds with ClampMin and Units on the director and OpenHeight and OpenSeconds on the gate, covers: [knobs] }
  edges:
    - { from: gate, to: board, label: OnOpened and OnClosed }
    - { from: unlock, to: director, label: OnUnlocked }
    - { from: director, to: clock, label: starts the timer }
    - { from: clock, to: reset, label: fires once }
    - { from: reset, to: gate, label: crates home free the plates }
    - { from: knobs, to: clock, label: ResetSeconds }
- id: blueprint-director
  title: The level Blueprint wires the pieces through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the gate and the pickup and the door and a crate array and a Rounds integer, covers: [director] }
    - { id: gate, kind: event, label: The gate placed in the level with both plates in its Plates array in Details, covers: [plates-to-gate] }
    - { id: unlock, kind: event, label: Bind Event to the door's On Unlocked runs a custom event that adds to Rounds and stores the Visitor pin, covers: [round-clear] }
    - { id: clock, kind: step, label: The custom event calls Set Timer by Event with a Reset Seconds float variable whose Value Range sets the hard limit and whose value is set in the Level Blueprint's defaults, covers: [reset-clock, knobs] }
    - { id: reset, kind: step, label: The timer event loops the crates calling Return Home then calls Reset Pickup and Relock and Remove Key on Get Component by Class of the stored visitor, covers: [reset] }
    - { id: board, kind: event, label: Events bound to the gate's On Opened and On Closed and the two custom events set a Text Render's text, covers: [board] }
  edges:
    - { from: unlock, to: level, label: On Unlocked }
    - { from: unlock, to: clock, label: starts the timer }
    - { from: clock, to: reset, label: fires once }
    - { from: reset, to: gate, label: crates home free the plates }
    - { from: gate, to: board, label: On Opened and On Closed }
```

# Integration Rubric

- The plate, the gate, the ring, the pickup, and the door are reused without changes, and each piece's own tests still pass.
- The gate follows the plates through their events alone; the director has no code about plates and no copy of the all plates pressed rule.
- A round is cleared only by the door's `OnUnlocked`, once per opening, and the visitor comes from the event, not from a search.
- The reset is a one shot timer `ResetSeconds` after the unlock, never a check in Tick, and a pause of zero resets at once.
- The reset sends every crate home, returns the key, relocks the door with its locked tries kept, and takes the key off the ring found on the visitor with `FindComponentByClass`.
- The board changes only on the gate's `OnOpened` and `OnClosed`, a cleared round, and the reset.
- Every binding made in `BeginPlay` is removed in `EndPlay`, where the pending reset timer is also cleared.
- A second visit plays exactly like the first; `ResetSeconds` is `EditAnywhere` with `ClampMin` and `Units`, and the submission gives the tuned gate time and reset pause with one sentence on why.
