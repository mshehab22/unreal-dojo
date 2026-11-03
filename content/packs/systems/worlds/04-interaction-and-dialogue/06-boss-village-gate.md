---
id: s4-boss-village-gate
title: "Boss: the village gate"
order: 6
kind: boss
difficulty: 5
patterns: [component, observer, state, type-object]
skills: [planning, interfaces, delegates, data]
terms: [uinterface, actor-component, data-asset, dynamic-multicast-delegate, adddynamic, unbinding-delegates, findcomponentbyclass]
prerequisites: [s4-interactable, s4-interactor, s4-dialogue-runner, s4-villager]
xp: 400
estimatedMinutes: 90
concepts:
  - Four pieces assembled into one working system, each reused as it is
  - A director that only connects the parts and owns none of their rules
  - Flags that carry the story from one conversation to the world
  - A second round that plays exactly like the first
pieces:
  - s4-interactable
  - s4-interactor
  - s4-dialogue-runner
  - s4-villager
---

# Spec

A village road runs east, and a locked gate closes it. The hero starts at the west end, far from everyone. Along the road stand a gossip, then a gatekeeper with a sign beside, then the gate. Everything is placed for you: the gossip 600 units along the road, the gatekeeper 1200, the sign 150 to the side of the gatekeeper, the gate 1800.

The hero carries an interactor with a reach of 200, the radius of its sphere, so a thing counts as in reach once its box touches the sphere. Whatever the interactor offers is shown on the board as `Prompt: Talk to Gatekeeper`, `Prompt: Read sign`, `Prompt: Open door`, or `Prompt: none` when nothing can be used. E uses the offered thing. The nearest usable thing is offered, and a locked gate is never offered.

The gatekeeper greets the hero with `Halt. State your business.` and three answers: `I carry a message.`, `Let me through.`, and `The password is moonlight.`, which is shown only once the hero knows the password. The first two end in a short refusal and then the end of the conversation. The third sets the flag that unlocks the gate and leads to the closing line `Moonlight. Go ahead.`, which E moves on. The gossip says `Psst. The gate password changes daily.` and can be asked: `Tell me.` leads to `Today it is moonlight.` and the answer `Thanks.` sets the flag `knows-password`; `Not interested.` ends the conversation.

While a conversation plays, the board shows the speaker's line and the numbered answers that are shown, such as `1. I carry a message.`; a closing line shows `(E to continue)`; the number keys 1 to 3 pick an answer by its position among those shown; E does nothing except move a closing line on; the hero cannot walk; and nobody else can be talked to. When it ends the board goes back to the prompt.

Opening the gate ends the round: the board adds `GATE OPEN in 41.2 s`, the time since the round began, and E does nothing more. R starts the next round, only after the finale. Starting a round locks and shuts the gate, clears every flag, ends any conversation, puts the hero back at the start, and makes the board read `Prompt: none`. Reference game: Skyrim's guard conversations, where what you have learned decides which answers you are offered.

A C++ director receives keys only after `EnableInput` with the player controller. The hero's interactor is a component on the hero; the director finds it with `FindComponentByClass`. The director creates the one runner and the one flag store and gives them to every villager.

Compiles against earlier quests: s4-interactable (`Quests/s4-interactable/DojoS4Door.h`, `Quests/s4-interactable/DojoS4Sign.h`), s4-interactor (`Quests/s4-interactor/DojoS4Interactor.h`), s4-dialogue-runner (`Quests/s4-dialogue-runner/DojoS4DialogueData.h`, `Quests/s4-dialogue-runner/DojoS4DialogueRunner.h`, `Quests/s4-dialogue-runner/DojoS4FlagStore.h`), and s4-villager (`Quests/s4-villager/DojoS4Villager.h`). The pieces need no additions.

Core numbers are fixed: a reach of 200, places 600, 1200, and 1800 along the road, three answers at the gatekeeper, answers picked by position among those shown, and the flags `knows-password` and `pass`.

The system combines four Pack 2 patterns: Component ("Actors built from parts"), for the interactor that any actor can carry; Observer ("The lens, then the first payoff"), for the focus, the conversation, and the flags, which are listened to instead of asked; Type Object ("Kinds as data"), for conversations that live in assets; and State ("One mode at a time"), for the runner that is idle or active and the keys that mean exploring or talking.

Extensions, in order of importance:

1. A second gate that opens on a different flag, reusing the door and the villagers without a change.
2. A quest that reads the flags: "learn the password" completes when `knows-password` is set, with the Pack 3 quest tracker.
3. Dialogue portraits and a typewriter effect on the line, as a listener of the conversation events.

Feel: tune the reach and the places until the road feels like a short walk with a decision at every stop, not a corridor. The submission gives the numbers and one sentence on why.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that connects the hero's interactor and the shared runner and the flags to the gate and the board
  why: The one place that translates keys and events into calls, owning none of the pieces' rules.
- id: offer
  kind: step
  label: The nearest usable thing within 200 is offered and E uses it and a locked gate is never offered
  why: A reach rule and a can-use rule that live in the interactor, not the director.
- id: talk
  kind: step
  label: Using a villager starts a conversation and the number keys pick among the shown answers and E moves a closing line on
  why: The conversation's keys, with a numbering rule that depends on what is shown.
- id: mode
  kind: event
  label: The board and the keys and the hero's walking follow the conversation's started and ended events
  why: Exploring and talking are two modes, switched by listening.
- id: flag-gate
  kind: event
  label: The pass flag being set unlocks the gate
  why: The story reaches the world through a flag event.
- id: finale
  kind: step
  label: Opening the gate ends the round with the time
  why: A goal that comes from using an ordinary door.
- id: fresh
  kind: step
  label: R starts a fresh round only after the finale and resets the gate and the flags and the conversation and the hero
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director on the level that wires the hero's interactor, the runner, and the flags
  pieces:
    - { id: director, kind: class, label: ADojoS4GateDirector with the hero and the gate and the villagers set in Details and the interactor found on the hero and the runner and flags created and given to every villager, covers: [director] }
    - { id: offer, kind: step, label: PressInteract calls TryInteract on the hero's interactor and the interactor itself picks the nearest usable thing, covers: [offer] }
    - { id: talk, kind: step, label: PressChoice calls Choose with the number minus one and PressInteract calls Advance while talking, covers: [talk] }
    - { id: mode, kind: event, label: Handlers bound to OnFocusChanged and the runner's started and choice and ended events rewrite the board and switch the input mode and stop or allow walking, covers: [mode] }
    - { id: flaggate, kind: event, label: A handler bound to OnFlagSet unlocks the gate and refreshes the interactor when the pass flag arrives, covers: [flag-gate] }
    - { id: finale, kind: step, label: After E the director checks whether the gate is open and records the time and ends the round, covers: [finale] }
    - { id: fresh, kind: step, label: RestartRound ends any conversation and resets the flags and locks the gate and moves the hero back and starts the clock only when not running, covers: [fresh] }
  edges:
    - { from: offer, to: director, label: TryInteract }
    - { from: talk, to: director, label: Choose and Advance }
    - { from: director, to: mode, label: focus and conversation events }
    - { from: mode, to: flaggate, label: the choice sets the flag }
    - { from: flaggate, to: finale, label: the gate can be opened }
    - { from: finale, to: fresh, label: R only after }
- id: blueprint-director
  title: The level Blueprint wires the pieces through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and the gate and the villagers and the runner and the flag store and a Running Boolean, covers: [director] }
    - { id: offer, kind: step, label: The E event gets the interactor with Get Component by Class and calls Try Interact on it, covers: [offer] }
    - { id: talk, kind: step, label: The 1 and 2 and 3 events branch on the runner's Get State and call Choose with the number minus one and E calls Advance while Active, covers: [talk] }
    - { id: mode, kind: event, label: Custom events bound with Bind Event to On Focus Changed and On Dialogue Started and On Choice Made and On Dialogue Ended rewrite a Text Render and set a Talking Boolean, covers: [mode] }
    - { id: flaggate, kind: event, label: A custom event bound to On Flag Set compares the flag name to pass and calls Unlock on the gate, covers: [flag-gate] }
    - { id: finale, kind: step, label: After Try Interact a branch on the gate's Is Open sets Running to false and prints the time, covers: [finale] }
    - { id: fresh, kind: step, label: The R event behind a branch on Running calls End on the runner and Reset on the flags and Lock on the gate and Set Actor Location on the hero, covers: [fresh] }
  edges:
    - { from: offer, to: level, label: Try Interact }
    - { from: talk, to: level, label: Choose and Advance }
    - { from: level, to: mode, label: bound events }
    - { from: mode, to: flaggate, label: the choice sets the flag }
    - { from: flaggate, to: finale, label: the gate can be opened }
    - { from: finale, to: fresh, label: R only after }
```

# Integration Rubric

- The door, sign, villager, interactor, runner, and flag store are reused without changes; every rule about what is offered and what is shown stays in them.
- The director subscribes to the interactor, the runner, and the flags; none of those points at the director or the board.
- The nearest usable thing within 200 is offered, a locked gate is never offered, and the offer changes only through events.
- The number keys pick among the shown answers by position, and a hidden answer never takes a number.
- While a conversation plays, E only moves a closing line on, no other villager can be used, and the hero cannot walk; the keys mean exploring again as soon as it ends.
- The pass flag unlocks the gate through the flag event, and the gate is never unlocked any other way.
- Every delegate binding made in BeginPlay is removed in EndPlay, and nothing runs in Tick.
- R starts a fresh round only after the finale, and a second round plays exactly like the first; the submission gives the tuned numbers with one sentence on why.
