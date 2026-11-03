---
id: s2-ability-plan
title: Plan a hero's ability kit
order: 1
kind: breakdown
difficulty: 4
patterns: [component]
skills: [planning, data, delegates, timers]
terms: [data-asset, actor-component, dynamic-multicast-delegate, timer-manager, tsubclassof, gas]
prerequisites: [f5-boss-beacon-drill, p9-boss-prop-gauntlet]
xp: 120
estimatedMinutes: 25
concepts:
  - Describing each ability once, as data, with its cost, its wait, and what stops it
  - Deciding which piece says yes or no to a start, which piece pays, and which piece does the work
  - Keeping time-based rules on timers and announcing every change
---

# Spec

A sparring hero trains in a round ring with three moves. Dash costs 20 energy, can be used again after 1 second, and throws the hero 300 units ahead. Shockwave costs 40, waits 3 seconds, and shoves every training dummy within 400 units 300 units straight away from the hero; for 1 second after it the hero is planted and cannot dash. Focus is free, waits 12 seconds, and fills the hero's energy to the top; for 2 seconds after it the hero is planted and cannot use Shockwave either. Energy tops out at 100 and comes back 5 points every half second while it is below the top.

The player presses 1, 2, or 3 for the moves and turns with the arrow keys. A move that cannot start (still waiting, too little energy, or stopped by the state the hero is in) does nothing at all and costs nothing. A board shows the energy, which moves are waiting, and how many of the four dummies have been pushed out of the ring, and it is always right.

Designers will add new moves and a second hero, and tune every number, and none of that may need new code. A new kind of effect, such as a heal, may need one new class.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side points at the other, which side broadcasts, and which side only listens.

Acceptance:

- A new move made of existing effects is a new asset, not new code.
- The piece that decides whether a move may start knows nothing about the board, the dummies, or the keys.
- Nothing counts down a wait or adds energy every frame.
- A second hero can carry the same moves with the same pieces.

# Required Pieces

```yaml
- id: ability-kinds
  kind: data
  label: Ability assets with a name and energy cost and cooldown and run time and the states they add and the states that stop them
  why: Designers add and tune moves without code, and every user of a move reads the same asset.
- id: state-tags
  kind: data
  label: Named states such as planted and channeling that a move adds to its user and that other moves check
  why: Moves stop each other through shared states instead of knowing about each other.
- id: ability-owner
  kind: component
  label: A component that holds the granted moves and decides whether one may start and runs the waits
  why: Any actor can carry moves, and one place owns the yes or no.
- id: energy
  kind: component
  label: An energy pool that is spent and comes back on a timer
  why: The cost is paid from a part the hero carries, which a second hero can carry too.
- id: effects
  kind: class
  label: A family of effects such as move ahead and push away and refill that the moves run
  why: What a move does is separate from whether it may start, and new kinds share one set of tools.
- id: announcements
  kind: event
  label: Events for a move starting and a wait starting or ending and the energy changing
  why: The board and sounds listen instead of asking.
- id: input
  kind: step
  label: Keys routed to the moves in a loadout
  why: The player's verbs, each one a single call that may be refused.
- id: board
  kind: class
  label: A board that rewrites itself from the events
  why: The player's view of the kit.
```

# Reference Plans

```yaml
- id: data-and-components
  title: Abilities as data assets run by an ability component, paid from an energy component
  pieces:
    - { id: data, kind: data, label: UDojoS2AbilityData data asset with name and cost and cooldown and duration and granted tags and blocking tags and a list of effects, covers: [ability-kinds] }
    - { id: tags, kind: data, label: Native gameplay tags for the states Rooted and Channeling under one parent, covers: [state-tags] }
    - { id: abilities, kind: component, label: UDojoS2AbilityComponent with Grant and CanActivate and TryActivate and a timer per cooldown and a timer per run that ends the run's tags, covers: [ability-owner] }
    - { id: energy, kind: component, label: UDojoS2EnergyComponent with CanSpend and Spend and Refill and a regen timer that only runs below the top, covers: [energy] }
    - { id: effects, kind: class, label: An abstract UDojoS2Effect with a public Apply and one protected hook and tools to move actors and find targets with dash and push and refill subclasses, covers: [effects] }
    - { id: events, kind: event, label: OnAbilityActivated and OnCooldownChanged on the ability component and OnEnergyChanged on the energy each broadcast after the change, covers: [announcements] }
    - { id: director, kind: class, label: A director that grants the loadout and maps keys to TryActivate and runs a started ability's effects and rewrites the board on every event, covers: [input, board] }
  edges:
    - { from: tags, to: data, label: assets name states }
    - { from: data, to: abilities, label: granted moves point at assets }
    - { from: abilities, to: energy, label: CanSpend and Spend }
    - { from: abilities, to: events, label: broadcasts }
    - { from: energy, to: events, label: broadcasts }
    - { from: events, to: director, label: all three events }
    - { from: director, to: abilities, label: TryActivate }
    - { from: director, to: effects, label: Apply on start }
- id: ability-objects
  title: Each ability as its own object with an activate hook, in the shape of the Gameplay Ability System
  pieces:
    - { id: ability-class, kind: class, label: An abstract ability class with CanActivate and a CommitCost step and an ActivateAbility hook that each move subclass fills in, covers: [ability-kinds, effects] }
    - { id: tags, kind: data, label: Gameplay tags for states that abilities add to their user and check before they start, covers: [state-tags] }
    - { id: owner, kind: component, label: An ability owner component that spawns one ability object per granted class from TSubclassOf and asks it to activate, covers: [ability-owner] }
    - { id: attributes, kind: component, label: An attribute component holding energy with regen on a timer, covers: [energy] }
    - { id: events, kind: event, label: Started and cooldown and attribute changed events on the owner and the attributes, covers: [announcements] }
    - { id: input, kind: step, label: Keys bound to ability classes through an input to ability table, covers: [input] }
    - { id: hud, kind: class, label: A HUD actor bound to the events that redraws the slots, covers: [board] }
  edges:
    - { from: owner, to: ability-class, label: one object per grant }
    - { from: ability-class, to: attributes, label: commit pays }
    - { from: ability-class, to: tags, label: adds and checks }
    - { from: owner, to: events, label: broadcasts }
    - { from: attributes, to: events, label: broadcasts }
    - { from: events, to: hud, label: redraws }
    - { from: input, to: owner, label: activate }
```

# Rubric

- Each move is described once: its cost, wait, run time, and states live in one place that every user reads.
- One piece decides whether a move may start, checking every reason before it changes anything, and it knows nothing about the board, the dummies, or the keys.
- The energy is its own part, spent through a question and an action, and it comes back on a timer that stops at the top.
- What a move does is a family of effects with shared tools, kept apart from the rule about whether it may start.
- Every change a board needs is announced by an event, and the board only listens.
- The plan says what a second hero needs to carry the same moves.

# Alternative Note

Both plans pass. Data assets with a list of effects keep every move in one file a designer can copy and tune, and the component holds all the rules, so a second hero needs only the two components and a loadout; the cost is that a move with truly new behavior needs a new effect class, and an effect cannot keep anything between uses because every user shares the asset. Ability objects with an activate hook are the shape of Epic's Gameplay Ability System (GAS): each move is a class, it can hold state while it runs, play animations, and wait for events, which suits long moves and networked games; the cost is a class per move and more machinery before the first move works. This is the Component pattern from Pack 2's "Actors built from parts" world, and the builds that follow name the other patterns the system combines when you reach them. A plan where the board asks the component every frame, where each move is an if branch in one function, or where a refused move still pays fails the acceptance lines.
