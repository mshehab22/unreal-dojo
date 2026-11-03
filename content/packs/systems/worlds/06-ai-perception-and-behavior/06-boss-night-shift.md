---
id: s6-boss-night-shift
title: "Boss: the night shift"
order: 6
kind: boss
difficulty: 5
patterns: [state, component, observer]
skills: [planning, ai, components, delegates]
terms: [ai-controller, ai-perception, ai-stimulus, behavior-tree, blackboard, bt-task-node, bt-service, bt-decorator, node-memory]
prerequisites: [s6-sense-memory, s6-walk-beat, s6-memory-service, s6-clue-decorator]
xp: 400
estimatedMinutes: 90
concepts:
  - Perception, a memory, a service, decorators, and tasks assembled into one guard, each piece reused as it is
  - A tree that chases first, searches second, and walks its beat otherwise, switching the moment the facts change
  - A director that spawns, listens, and keeps score, owning no rule about seeing or deciding
pieces:
  - s6-sense-memory
  - s6-walk-beat
  - s6-memory-service
  - s6-clue-decorator
---

# Spec

A thief has one night to reach a vault, and a guard walks a square beat between them. The guard starts at its post at the origin and walks the corners (800, 0), (800, 800), (0, 800), and back to (0, 0) at 300 units a second. It sees up to 1200 units within 60 degrees either side of where it faces, and hears noises up to 1500 units away. The thief starts at (-1500, 0), behind the guard, and the vault is at (1600, 400).

The guard decides in this order, switching the moment the facts change:

1. Chase: while the thief is in sight, run at it at 450 units a second. Within 100 units the thief is caught.
2. Search: while there is a clue no older than 10 seconds within 3000 units, walk to it at 300, look around for 2 seconds, and forget it.
3. Otherwise walk the beat.

Losing sight of the thief leaves the place it was last seen as a clue, so a lost chase turns into a search. The round ends when the guard catches the thief, and the board adds `CAUGHT in 8.3 s`, or when the thief reaches the vault (within 150 units), and the board adds `VAULT OPEN in 21.4 s`. The time counts from the round's start. The board's first line is `Guard: on patrol`, `Guard: searching`, or `Guard: chasing`, from the guard's memory: chasing while the thief is in sight, searching while there is a clue, on patrol otherwise.

Keys: the thief is the player's own pawn and walks with the usual movement. N throws a pebble that lands 400 units in front of the thief and makes a noise there, to lure the guard away. R starts the next round, only after a round ended. Reference game: Thief: The Dark Project, whose guards turn toward a noise, search where they heard it, and give up after a while, so sound is a tool for the player. The guard combines three Pack 2 patterns: State ("State"), for the chase, search, and beat branches with one running at a time; Component ("Actors built from parts"), for the memory and the perception on the controller; and Observer ("The lens, then the first payoff"), for the perception events, the memory's announcements, the decorators watching their keys, and the board.

How rounds start: round 1 starts when play begins. Starting a round removes the last guard and its controller, spawns a fresh guard at the post with the guard controller, puts the thief back at its start, and clears the result line. A C++ director receives keys only after `EnableInput` with the player controller.

The guard controller owns the perception component (sight and hearing), the sense memory, and the tree, which it builds when it possesses the guard. The director spawns the guard and only listens: to the memory for the board, and to the controller's catch event for the finale.

Compiles against earlier quests: s6-sense-memory (`Quests/s6-sense-memory/DojoS6SenseMemoryComponent.h`), s6-walk-beat (`Quests/s6-walk-beat/DojoS6TreeKit.h`, `Quests/s6-walk-beat/DojoS6Guard.h`, `Quests/s6-walk-beat/DojoS6BTTask_WalkBeat.h`), s6-memory-service (`Quests/s6-memory-service/DojoS6BTService_ReadMemory.h`), and s6-clue-decorator (`Quests/s6-clue-decorator/DojoS6BTDecorator_NearClue.h`). The pieces need no additions; chase, go to clue, and the in-sight decorator are new nodes in the boss.

Core numbers are fixed: sight 1200 and 60 degrees, hearing 1500, walk 300, run 450, catch at 100, clue fresh for 10 seconds and near within 3000, 2 seconds of looking, pebble at 400, vault radius 150.

Extensions, in order of importance:

1. Eyes that follow the walk: the guard faces where it is going, so sight sweeps the room instead of always facing east, using the AI controller's focus.
2. A second guard with its own beat, sharing the same tree and the same controller class, and a board line per guard.
3. Noise from the thief's own feet: walking faster than half speed reports a quiet noise every second, so creeping becomes a choice.

Feel: tune the sight angle and the hearing range until a careful player can reach the vault with one or two pebbles, and a careless one is caught. The submission gives the numbers and one sentence on why.

# Required Pieces

```yaml
- id: controller
  kind: class
  label: A guard controller with sight and hearing and the sense memory that builds and runs the tree on possession
  why: The guard's mind in one place, reusable for every guard.
- id: priorities
  kind: step
  label: A root selector with chase then search then the beat and the memory service on top
  why: The order of urgency is the order of the branches.
- id: interrupts
  kind: step
  label: Decorators that watch their keys and abort both ways so the guard switches at once
  why: A guard that finishes its walk before reacting is the failure this world is about.
- id: new-tasks
  kind: step
  label: Chase and go to clue tasks that move the guard over many frames with per-guard state
  why: The two behaviors the pieces did not cover.
- id: board
  kind: event
  label: A board that rewrites from the memory's events and a catch event from the controller
  why: The player's read on the guard, with no polling.
- id: rounds
  kind: step
  label: A director that spawns the guard and ends the round on a catch or at the vault and restarts on R
  why: A second round must play exactly like the first.
```

# Reference Plans

```yaml
- id: cpp-controller
  title: A C++ guard controller that builds its tree in code and a director on the level
  pieces:
    - { id: controller, kind: class, label: ADojoS6GuardController with a perception component configured for sight and hearing and a UDojoS6SenseMemoryComponent watching it, covers: [controller] }
    - { id: tree, kind: step, label: OnPossess builds a root selector with Read Memory and a chase sequence and a search sequence and Walk Beat and runs it, covers: [priorities] }
    - { id: decorators, kind: step, label: A target in sight decorator on chase and Near Clue on search both observing their keys with abort mode Both, covers: [interrupts] }
    - { id: tasks, kind: step, label: UDojoS6BTTask_Chase reports a catch to the controller and UDojoS6BTTask_GoToClue keeps its walk and look time in node memory and forgets the clue, covers: [new-tasks] }
    - { id: director, kind: class, label: ADojoS6ShiftDirector binds OnMemoryChanged and OnCaught and a vault overlap and writes the board, covers: [board] }
    - { id: rounds, kind: step, label: StartRound removes the old guard and controller and spawns a fresh guard and resets the thief and R only after a finale, covers: [rounds] }
  edges:
    - { from: controller, to: tree, label: builds on possession }
    - { from: tree, to: decorators, label: gated by }
    - { from: decorators, to: tasks, label: allow one }
    - { from: tasks, to: controller, label: ReportCatch }
    - { from: controller, to: director, label: OnCaught and OnMemoryChanged }
    - { from: director, to: rounds, label: R only after }
- id: asset-controller
  title: Behavior Tree and Blackboard assets with a Blueprint controller
  pieces:
    - { id: controller, kind: class, label: BP_GuardController from AIController with an AIPerception component and the sense memory added in the editor, covers: [controller] }
    - { id: tree, kind: step, label: BT_NightShift and BB_Guard assets with the same three branches and Read Memory on the root run from OnPossess, covers: [priorities] }
    - { id: decorators, kind: step, label: The engine's Blackboard decorator on TargetVisible and Near Clue on the search branch with Observer Aborts set to Both, covers: [interrupts] }
    - { id: tasks, kind: step, label: Two Blueprint tasks from BTTask_BlueprintBase for chase and go to clue that call Finish Execute when done, covers: [new-tasks] }
    - { id: director, kind: class, label: A level Blueprint that binds On Memory Changed and the controller's catch event and a trigger at the vault, covers: [board] }
    - { id: rounds, kind: step, label: The R event behind a Running branch destroys the guard and spawns a fresh one and moves the thief, covers: [rounds] }
  edges:
    - { from: controller, to: tree, label: Run Behavior Tree }
    - { from: tree, to: decorators, label: gated by }
    - { from: decorators, to: tasks, label: allow one }
    - { from: tasks, to: controller, label: catch event }
    - { from: controller, to: director, label: bound events }
    - { from: director, to: rounds, label: R only after }
```

# Integration Rubric

- The memory, the guard, Walk Beat, Read Memory, and Near Clue are reused without changes; every rule about sight beating hearing, clue freshness, and walking the beat stays in those pieces.
- The controller owns perception, memory, and the tree; the memory listens to perception, and nothing reads the perception component directly.
- Chase, search, and the beat are branches of one selector in that order, and a change in what the guard knows switches branches at once, in both directions.
- The new tasks keep everything about one guard's run in node memory or on the guard, so two guards can share the tree.
- A pebble near the guard sends it searching, the thief in sight sends it chasing, and losing sight leaves a clue to search.
- The board and the finale change only on events (the memory's, the controller's catch event, and the vault overlap), and nothing runs in Tick.
- Every binding is removed when its listener or its sender leaves, and R starts a fresh round only after the finale.
- A second round plays exactly like the first, with a fresh guard at the post; the submission gives the tuned numbers with one sentence on why.
