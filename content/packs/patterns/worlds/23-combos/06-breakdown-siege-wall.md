---
id: p23-breakdown-siege-wall
title: Plan the castle's siege wall
order: 6
kind: breakdown
difficulty: 4
patterns: [subclass-sandbox, state]
skills: [planning, subclass-sandbox, state]
terms: [finite-state-machine, abstract-specifier, uenum, timer-manager, multicast-delegate]
prerequisites: [p23-boss-ghost-drill, p7-state-when-not, p8-subclass-sandbox-when-not]
xp: 100
estimatedMinutes: 25
concepts:
  - Planning a family of machines that share modes but differ in what they do
  - Giving subclasses a few safe tools instead of the whole game
  - Deciding where a mode's time and data live
  - Letting a display and an alarm read the modes without the machines knowing them
---

# Spec

The castle wall carries siege engines: a ballista, a catapult, and a cauldron of boiling oil. Designers add a new engine most months, and each new one should be a small piece of work.

Every engine goes through the same modes. It starts idle. When a target comes into view it takes a few seconds to load, then it is ready, and a crew order to fire makes it fire and then rest for a few seconds before it is idle or loading again. A hit from the enemy can break an engine at any moment, whatever it was doing, and a broken engine ignores everything until the crew repairs it, after which it is idle. A crew order to fire that arrives in any mode but ready does nothing.

The engines differ in what firing does and in the numbers. The ballista shoots one bolt at one target. The catapult throws a boulder that hurts everything near where it lands. The cauldron pours over anything under the wall. Loading and resting take different times for each engine.

An engine must not be able to reach into the crew, the scoreboard, or the sound system directly. It may only use what the wall gives it: hurt things near a point, hurt one thing, play a named sound, and ask how many enemies are near. The alarm light on the gatehouse turns red when any engine is broken, and the engines must not know it exists.

Acceptance:

- A new engine is one new class that overrides what firing does and sets its numbers, and nothing else.
- A fire order in any mode other than ready does nothing, in every engine.
- An engine broken while loading, while ready, and while resting ends in the same broken mode, and after repair starts again from idle.
- The time left in a mode does not carry over into the next mode.
- The alarm light turns red when one engine is broken and stays red until the last one is repaired.

# Required Pieces

```yaml
- id: engine-base
  kind: class
  label: One base class that every engine derives from, which owns the modes and the shared behavior
  why: Modes and ordering rules are written once, so no engine can get them wrong.
- id: engine-kinds
  kind: class
  label: A child class for each engine that overrides what firing does and sets its numbers
  why: A new engine is small because the child only says what is different.
- id: tools
  kind: step
  label: A short list of protected tools that children may call, and nothing else from the game
  why: Engines stay unable to reach the crew, the scoreboard, or the sounds directly.
- id: modes
  kind: data
  label: The modes idle, loading, ready, resting, and broken, with the data each one owns
  why: Time left in a mode belongs to that mode and ends with it.
- id: transitions
  kind: step
  label: Which input moves which mode to which, including break from every mode and repair back to idle
  why: Writing the rules down in one place is how every mode gets the same rules in every engine.
- id: orders
  kind: event
  label: The crew's fire and repair orders, handled by whichever mode the engine is in
  why: An order means something different in each mode, and only the mode knows what.
- id: alarm
  kind: class
  label: The gatehouse alarm, which listens for engines entering and leaving the broken mode
  why: The alarm must follow the engines without the engines knowing it exists.
```

# Reference Plans

```yaml
- id: mode-objects
  title: A base class with a mode object for each mode
  pieces:
    - { id: engine-base, kind: class, label: "An abstract AEngine with UCLASS(Abstract), a timer, and a pointer to the current mode object, with Fire, Repair, Break, and a Tick that feeds time to the mode", covers: [engine-base] }
    - { id: engine-kinds, kind: class, label: "ABallista, ACatapult, and ACauldron override a protected OnFire and set load and rest seconds in their constructors", covers: [engine-kinds] }
    - { id: tools, kind: step, label: "Protected HurtNear, HurtOne, PlaySound, and CountEnemiesNear on the base, which children call and nothing else reaches", covers: [tools] }
    - { id: modes, kind: data, label: "A UObject class for each mode with its own seconds left, made once on the engine and reused", covers: [modes] }
    - { id: transitions, kind: step, label: "Each mode object returns the next mode from its own input functions, and the base's Break moves any mode to Broken", covers: [transitions] }
    - { id: orders, kind: event, label: "Fire and Repair call the current mode object's matching function, and the base class versions do nothing", covers: [orders] }
    - { id: alarm, kind: class, label: "The base broadcasts a native delegate when it enters or leaves Broken, and the alarm counts the broken engines it has heard of", covers: [alarm] }
  edges:
    - { from: engine-base, to: modes, label: "owns the current mode" }
    - { from: engine-kinds, to: tools, label: "uses only these" }
    - { from: modes, to: transitions, label: "each mode decides its exits" }
    - { from: orders, to: modes, label: "handled by the current mode" }
    - { from: engine-base, to: alarm, label: "announces entering and leaving broken" }
- id: enum-table
  title: A base class with an enum, a timer, and a transition table
  pieces:
    - { id: engine-base, kind: class, label: "An abstract AEngine with a UENUM for the modes, a current mode, and one timer handle that is cleared on every change of mode", covers: [engine-base] }
    - { id: engine-kinds, kind: class, label: "Children override a BlueprintNativeEvent for firing and set load and rest seconds as editable properties, so a Blueprint child works too", covers: [engine-kinds] }
    - { id: tools, kind: step, label: "Protected BlueprintCallable tools for hurting, sounds, and counting, marked BlueprintProtected so Blueprint children may call them", covers: [tools] }
    - { id: modes, kind: data, label: "The enum plus one float for the seconds the current mode has left, set again on every change of mode", covers: [modes] }
    - { id: transitions, kind: step, label: "A data table of from-mode, input, and to-mode rows that one function reads, with Break matching every from-mode", covers: [transitions] }
    - { id: orders, kind: event, label: "Fire and Repair look the input up in the table for the current mode, and do nothing when there is no row", covers: [orders] }
    - { id: alarm, kind: class, label: "A dynamic multicast delegate OnModeChanged that the alarm binds to and filters for the broken mode", covers: [alarm] }
  edges:
    - { from: engine-base, to: modes, label: "owns the current mode" }
    - { from: engine-kinds, to: tools, label: "uses only these" }
    - { from: transitions, to: modes, label: "the table decides each change" }
    - { from: orders, to: transitions, label: "inputs are looked up" }
    - { from: engine-base, to: alarm, label: "announces every change of mode" }
```

# Rubric

- The modes and their rules are written once in the base, so every engine gets them and no child can break them.
- A child engine overrides only what firing does and sets its numbers, and reaches the game only through the base's few protected tools.
- An input means what the current mode says it means, and a fire order outside ready does nothing.
- Break works from every mode and ends in the broken mode, and repair returns to idle.
- Time left in a mode belongs to that mode, and it is set again on entering the next.
- The alarm learns about the broken mode by a delegate and the engines never name it.

# Alternative Note

Both plans pass. A mode object for each mode keeps each mode's data and rules together and grows well when modes gain behavior, at the price of a class for each. An enum with a table is far smaller for five modes and lets designers edit transitions as data, but a mode with a lot of its own behavior will turn the table's callers into one large function. Choose objects when the modes are rich and a table when they are mostly timing.
