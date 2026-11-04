---
id: s6-guard-plan
title: Plan a night guard that sees and hears
order: 1
kind: breakdown
difficulty: 4
patterns: [state, component, observer]
skills: [planning, ai, delegates]
terms: [ai-controller, ai-perception, ai-stimulus, behavior-tree, blackboard, finite-state-machine]
prerequisites: [f5-boss-beacon-drill, p9-boss-prop-gauntlet]
xp: 120
estimatedMinutes: 25
concepts:
  - Turning raw sense updates into a few facts the decisions can read
  - Choosing one mode at a time, with the most urgent mode winning
  - Leaving a mode the moment the facts behind it stop being true
---

# Spec

A guard watches a vault at night. It walks a beat of four points around its post. It sees up to 1200 units in a cone in front of it and hears noises up to 1500 units away. When it hears something, it walks to the noise, looks around for two seconds, and goes back to its beat. When it sees an intruder, it runs at them and catches them at 100 units. If the intruder slips out of sight, the guard goes to the last place it saw them, the way it would for a noise.

Seeing beats hearing: a noise while the intruder is in sight changes nothing. Whatever the guard is doing, it switches the moment something more urgent happens, not after it finishes its current walk. A board shows what the guard is doing.

Designers will place more guards with different beats, and a second kind of guard that only hears. Neither may need new code in the parts that decide.

You are planning, not coding. Name the classes, the data, and the events, and say where each decision is made. For each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- Perception updates reach the decisions as plain facts (who, in sight or not, and the newest clue with its age), not as raw sense data.
- Exactly one mode runs at a time, and a more urgent mode interrupts a less urgent one at once.
- Nothing polls the senses every frame.
- Two guards with the same decision logic keep separate positions on their beats.

# Required Pieces

```yaml
- id: senses
  kind: component
  label: Sight and hearing set up on the guard's controller
  why: The engine's perception does the seeing and hearing, with ranges designers can tune.
- id: memory
  kind: component
  label: A memory that turns perception updates into a target and a visible flag and a clue with a time
  why: Decisions should read facts, and sight must beat hearing in one place.
- id: announcements
  kind: event
  label: Perception updates arriving as events and the memory announcing its own changes
  why: The memory listens to the senses, and a board listens to the memory.
- id: modes
  kind: class
  label: Chase and search and patrol as separate modes with one running at a time
  why: Each mode is a small behavior of its own, easier to test and to rearrange.
- id: priority
  kind: step
  label: A priority order and a rule for interrupting a running mode when the facts change
  why: Chasing must win over searching, and searching over the beat, without waiting.
- id: movement
  kind: step
  label: Walking a beat point by point and walking to a clue and running at a target
  why: Each mode moves the body, and the beat position belongs to each guard.
- id: board
  kind: class
  label: A board that shows the guard's state from the memory's events
  why: The player's read on the guard, with no polling.
```

# Reference Plans

```yaml
- id: behavior-tree
  title: A Behavior Tree and Blackboard fed by a memory component
  pieces:
    - { id: perception, kind: component, label: UAIPerceptionComponent on ADojoS6GuardController with a sight config and a hearing config, covers: [senses] }
    - { id: memory, kind: component, label: UDojoS6SenseMemoryComponent bound to OnTargetPerceptionUpdated that keeps the target and visible flag and clue and broadcasts OnMemoryChanged, covers: [memory, announcements] }
    - { id: service, kind: step, label: A service on the root that copies the memory into four blackboard keys on an interval, covers: [priority] }
    - { id: tree, kind: data, label: A root selector with chase and search and walk beat branches left to right, covers: [modes] }
    - { id: decorators, kind: step, label: Decorators on chase and search that interrupt running branches when the facts change, covers: [priority] }
    - { id: tasks, kind: step, label: Latent tasks for chase and go to clue and walk beat that keep per-guard state in node memory, covers: [movement] }
    - { id: board, kind: class, label: A director that binds OnMemoryChanged and rewrites a text board, covers: [board] }
  edges:
    - { from: perception, to: memory, label: OnTargetPerceptionUpdated }
    - { from: memory, to: service, label: read on an interval }
    - { from: service, to: decorators, label: blackboard keys }
    - { from: decorators, to: tree, label: allow and abort }
    - { from: tree, to: tasks, label: runs one }
    - { from: memory, to: board, label: OnMemoryChanged }
- id: state-component
  title: A C++ state machine component driven by perception events
  pieces:
    - { id: perception, kind: component, label: The same perception component with sight and hearing on the controller, covers: [senses] }
    - { id: memory, kind: component, label: The same memory component turning updates into facts and broadcasting OnMemoryChanged, covers: [memory, announcements] }
    - { id: brain, kind: component, label: A guard brain component with one state object per mode and a current state pointer, covers: [modes] }
    - { id: transitions, kind: step, label: The brain binds OnMemoryChanged and picks the most urgent state whose condition holds and switches at once, covers: [priority] }
    - { id: steps, kind: step, label: Each state's Tick moves the pawn and the beat index lives on the pawn, covers: [movement] }
    - { id: board, kind: class, label: A board that binds the brain's OnStateChanged event, covers: [board] }
  edges:
    - { from: perception, to: memory, label: OnTargetPerceptionUpdated }
    - { from: memory, to: transitions, label: OnMemoryChanged }
    - { from: transitions, to: brain, label: switch state }
    - { from: brain, to: steps, label: ticks the current state }
    - { from: brain, to: board, label: OnStateChanged }
```

# Rubric

- Perception reaches the decisions only through a memory that holds the target, whether it is in sight, and the newest clue with its time; sight beats hearing in that one place.
- The plan names the modes and the order of urgency, and says how a running mode is interrupted when the facts change.
- The memory announces its changes and the board only listens; neither the senses nor the memory point at the board or at the decisions.
- Per-guard data, such as where each guard is on its beat and where its current walk is going, has a home that two guards cannot share by accident.
- Each mode names the pieces it calls and when it counts as finished.
- The plan says what a guard that only hears needs, and why the deciding parts do not change.

# Alternative Note

Both plans pass. The Behavior Tree keeps the modes and their order in an asset a designer can rearrange and debug while the game runs, and its decorators give interruption for free; the cost is that facts must be copied into blackboard keys, and that one node object serves every guard, so per-guard state needs node memory. The state machine component is plain C++ that is easy to step through, and its transitions can read the memory directly; the cost is that the priority order lives in code, and every new mode means new transition rules. Unreal's StateTree sits between the two: states in an asset, with transitions like a state machine. The modes are the State pattern from Pack 2's "State" world, the memory and the brain are the Component pattern, and the perception events and the board are the Observer pattern. A plan where every mode reads the perception component directly, or where the board asks the guard every frame, fails the first and third acceptance lines.
