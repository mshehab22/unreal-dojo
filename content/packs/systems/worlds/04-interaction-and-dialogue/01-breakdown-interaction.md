---
id: s4-interaction-plan
title: Plan a hero who uses things and talks to people
order: 1
kind: breakdown
difficulty: 4
patterns: [component, observer, type-object]
skills: [planning, interfaces, data]
terms: [uinterface, iinterface, actor-component, data-asset, dynamic-multicast-delegate, fname]
prerequisites: [s1-boss-expedition-pack]
xp: 120
estimatedMinutes: 25
concepts:
  - Letting the hero use anything through one contract without knowing its kind
  - Keeping conversations in assets and the story in flags
  - Deciding who owns the question of whether a conversation is playing
---

# Spec

A village sits behind a locked gate. The hero walks the road and meets a sign to read, a gossip, a gatekeeper, and the gate itself. Whatever is close enough shows a short prompt such as `Talk to Gatekeeper` or `Open door`, and pressing E uses the nearest thing that can be used; a locked gate is never offered.

Using a villager starts a conversation: the villager's line appears with numbered answers, and some answers appear only once the player has learned something. An answer can set a flag, such as "knows the password", and the gatekeeper's last answer sets the flag that unlocks the gate. While a conversation plays the hero cannot walk, the number keys pick answers, and nobody else can be talked to.

Designers will add villagers, signs, doors, and whole conversations as assets and without code, and doors and quests must be able to read the flags.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- A new kind of thing to use needs no change to the hero or to the prompt.
- A new conversation is a new asset, not new code.
- Nothing polls the focus or the flags every frame.
- A second hero could use the same villagers and the same gate.

# Required Pieces

```yaml
- id: use-contract
  kind: class
  label: A contract every usable thing implements with a prompt and a can-use check and a use action
  why: The hero must use a sign, a door, and a villager without knowing which is which.
- id: focus
  kind: component
  label: A component on the hero that finds usable things nearby and keeps the nearest one in focus
  why: Finding what to offer belongs to the hero's side, and any actor can carry it.
- id: prompt
  kind: class
  label: A prompt that shows the focused thing's verb and rewrites itself when the focus changes
  why: The player's cue, which must not poll.
- id: dialogue-data
  kind: data
  label: Conversations as assets with nodes and choices that can need a flag and set a flag
  why: Designers write conversations without code.
- id: runner
  kind: class
  label: A runner that plays one conversation at a time and knows whether it is idle or active
  why: One owner of the question of whether anyone is talking.
- id: flags
  kind: data
  label: A flag store that choices set and that choices and doors read
  why: The story so far, shared by conversations and the world.
- id: announcements
  kind: event
  label: Events for a focus change and for a conversation starting and a choice being made and the conversation ending
  why: The prompt, the keys, and the gate react by listening.
- id: input-mode
  kind: step
  label: A swap of what the keys mean and whether the hero walks while a conversation plays
  why: Numbers pick answers only while talking.
- id: flag-reactions
  kind: step
  label: A rule that reacts when a flag is set, such as unlocking the gate
  why: Something must connect the story to the world.
```

# Reference Plans

```yaml
- id: interface-and-runner
  title: One interface, one interactor component, and one conversation runner that announces its steps
  pieces:
    - { id: contract, kind: class, label: IDojoS4Interactable interface with GetPrompt and CanInteract and Interact that doors and signs and villagers implement, covers: [use-contract] }
    - { id: interactor, kind: component, label: UDojoS4Interactor sphere on the hero that tracks overlapping usable actors and keeps the nearest usable one as its focus and broadcasts OnFocusChanged, covers: [focus] }
    - { id: data, kind: data, label: UDojoS4DialogueData asset with start node and nodes holding text and choices that carry a required flag and a set flag and a next node, covers: [dialogue-data] }
    - { id: flags, kind: data, label: UDojoS4FlagStore with Set and Has and an OnFlagSet event, covers: [flags] }
    - { id: runner, kind: class, label: UDojoS4DialogueRunner with idle and active states and Start and Choose and Advance and End and three events, covers: [runner, announcements] }
    - { id: director, kind: class, label: A director that listens to the focus and the runner and the flags and swaps the keys and unlocks the gate when the pass flag is set, covers: [input-mode, flag-reactions] }
    - { id: board, kind: class, label: A text board that rewrites itself from the focus event and the runner events, covers: [prompt] }
  edges:
    - { from: contract, to: interactor, label: asked through the interface }
    - { from: data, to: runner, label: played by }
    - { from: flags, to: runner, label: read and set by choices }
    - { from: interactor, to: board, label: OnFocusChanged }
    - { from: runner, to: board, label: started and choice and ended }
    - { from: runner, to: director, label: started and ended }
    - { from: flags, to: director, label: OnFlagSet }
- id: usable-components
  title: Every usable thing carries a component, and every villager owns its own conversation state
  pieces:
    - { id: usable, kind: component, label: A usable component with a prompt text and an OnUsed event that any actor can carry, covers: [use-contract] }
    - { id: trace, kind: component, label: A component on the camera that traces forward on a custom channel every time the hero looks somewhere new and keeps the usable component it hits as the focus, covers: [focus] }
    - { id: table, kind: data, label: A data table with one row per conversation node and a row name for the next node and required and set flag names, covers: [dialogue-data] }
    - { id: talker, kind: component, label: A conversation component on each villager that holds its own current row and Choose and End and its own events, covers: [runner, announcements] }
    - { id: save, kind: data, label: A game instance subsystem that holds the flag set and announces each new flag, covers: [flags] }
    - { id: gatereact, kind: step, label: A reaction on the gate that listens to the subsystem and unlocks the gate when the pass flag arrives, covers: [flag-reactions] }
    - { id: widget, kind: class, label: A widget that binds to the focus change and to the talking villager's events and shows the prompt or the lines, covers: [prompt] }
    - { id: controller, kind: step, label: The player controller switches between game and UI input mode and ignores move input through SetIgnoreMoveInput when a talker starts and ends, covers: [input-mode] }
  edges:
    - { from: usable, to: trace, label: found by trace }
    - { from: table, to: talker, label: one row per node }
    - { from: talker, to: widget, label: its events }
    - { from: trace, to: widget, label: focus change }
    - { from: talker, to: save, label: sets flags }
    - { from: save, to: gatereact, label: a new flag is announced }
    - { from: talker, to: controller, label: started and ended }
```

# Rubric

- Each usable thing answers the same questions through one contract, and the hero's code never names a kind of thing.
- Focus is found by a component on the hero, by overlap or by trace, and a change of focus is announced by an event, not polled.
- Conversations live in assets as nodes and choices; the runner knows no story and the assets know no code.
- One piece owns whether a conversation is playing, and everything else asks it or listens.
- Flags are set by choices and read by choices and doors, and the plan says who reacts when one is set.
- The plan says what changes for the keys, the hero, and the prompt while a conversation plays, and what a second hero shares and what it needs of its own.

# Alternative Note

Both plans pass. The interface keeps every usable thing a plain actor that adds one contract, and one runner shared by all villagers makes "only one conversation at a time" a single check; the cost is that each class must write its own prompt and rules. A component on every usable thing puts the shared parts in one place and lets Blueprint-only actors join without C++, and a conversation component per villager lets two conversations run side by side; the cost is that "someone is talking" is now spread across components and the trace is run whenever the hero looks around. This is the Component pattern from Pack 2's "Actors built from parts" world: the focus finder on the hero and, in plan two, the usable and conversation parts on the world's actors. A plan where the hero checks every actor's class, where the prompt checks the focus every frame, or where conversation text sits in code fails the first three acceptance lines.
