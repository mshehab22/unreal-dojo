---
id: s2-boss-sparring-ring
title: "Boss: the sparring ring"
order: 8
kind: boss
difficulty: 5
patterns: [component, observer, type-object, subclass-sandbox]
skills: [planning, components, delegates, data, timers, tags]
terms: [actor-component, data-asset, gameplay-tags, instanced-specifier, dynamic-multicast-delegate, unbinding-delegates, findcomponentbyclass, timer-manager]
prerequisites: [s2-ability-data, s2-energy, s2-ability-component, s2-effects]
xp: 400
estimatedMinutes: 90
concepts:
  - Abilities, energy, and effects assembled into one ability system, each part reused as it is
  - A director that grants, routes, and listens, and owns none of the rules about starting, paying, or waiting
  - A second round that plays exactly like the first
pieces:
  - s2-ability-data
  - s2-energy
  - s2-ability-component
  - s2-effects
---

# Spec

A sparring hero stands in the middle of a ring of radius 600, facing +X, with four training dummies 200 units away: ahead, to the right, behind, and to the left. The round is won when every dummy is more than 600 units from the middle, measured flat. The hero has 100 energy, which comes back 5 points every half second while it is below 100, and three moves:

- 1, Dash: costs 20, waits 1 second, moves the hero 300 ahead. It cannot start while the hero is rooted (`DojoS2.State.Rooted`).
- 2, Shockwave: costs 40, waits 3 seconds, pushes every dummy within 400 of the hero 300 straight away from it, and roots the hero for 1 second. It cannot start while the hero is channeling (`DojoS2.State.Channeling`).
- 3, Focus: free, waits 12 seconds, fills the energy to 100, and roots the hero and makes it channel for 2 seconds.

The left and right arrows turn the hero 90 degrees. A move that cannot start does nothing and costs nothing. When the last dummy leaves the ring, the round ends and the board adds `CLEAR in 14.6 s`, the time since the round began.

The board shows, one per line: `Energy 60/100`; one line per move in key order, such as `1. Dash ready` or `2. Shockwave cooling`; and `Out 1/4`. It changes only when the energy changes, a move starts, or a wait starts or ends. Reference game: Overwatch, where every hero's kit is a handful of moves on separate cooldowns and some of them pin the hero in place while they run. The system combines four Pack 2 patterns: Type Object ("Kinds as data"), for moves that are assets; Component ("Actors built from parts"), for the ability and energy components any actor can carry; Observer ("The lens, then the first payoff"), for the board, which listens instead of asking; and Subclass Sandbox ("Many kinds, one toolbox"), for the effects.

How rounds start: round 1 starts when play begins, and R starts the next round, only after the finale; the move and turn keys do nothing outside a round. Starting a round puts the hero back in the middle facing +X, puts each dummy back where it began, fills the energy, and ends every wait and every run. A C++ director receives keys only after `EnableInput` with the player controller.

The hero's ability and energy components are components on the hero; the director finds them with `FindComponentByClass`, connects the ability component to the energy, and grants the three moves. Dummies carry the actor tag `Target`.

Compiles against earlier quests: s2-ability-data (`Quests/s2-ability-data/DojoS2AbilityData.h`, `Quests/s2-ability-data/DojoS2AbilityTags.h`), s2-energy (`Quests/s2-energy/DojoS2EnergyComponent.h`), s2-ability-component (`Quests/s2-ability-component/DojoS2AbilityComponent.h`), and s2-effects (`Quests/s2-effects/DojoS2Effect.h`, `Quests/s2-effects/DojoS2DashEffect.h`, `Quests/s2-effects/DojoS2PushEffect.h`).

The pieces need one addition. A move's asset must say what the move does, so `UDojoS2AbilityData` gains `UPROPERTY(EditAnywhere, Instanced, BlueprintReadOnly) TArray<TObjectPtr<UDojoS2Effect>> Effects`, with a forward declaration of `UDojoS2Effect`; nothing else in the pieces changes, and their own tests still pass. Focus needs a third kind of effect, a refill, written as one more child of the effect base.

Core numbers are fixed: ring 600, dummies at 200, energy 100 coming back 5 per half second, Dash 20 and 1 s and 300, Shockwave 40 and 3 s and 400 and 300 with a 1 s root, Focus 0 and 12 s with a 2 s root and channel, turns of 90 degrees.

Extensions, in order of importance:

1. A second sparring hero, a copy driven by its own keys, that uses the same three assets with its own components, and shows that nothing in the assets belongs to one hero.
2. A wind-up: a move whose effects happen when its run ends instead of when it starts, and which a new root on the hero cancels without refunding its cost.
3. The board shows the seconds left on each wait, using a 0.1 second timer that runs only while something is waiting, never Tick.

Feel: tune the shockwave's reach and wait until clearing the ring takes planning, so the fastest clear needs Focus at least once. The submission gives the numbers and one sentence on why.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that connects the hero's ability and energy components to the keys and the board and grants the loadout
  why: The one place that translates keys into calls, owning none of the rules about starting, paying, or waiting.
- id: effects-run
  kind: step
  label: A started move runs the effects listed in its asset on the hero
  why: What a move does comes from data, so a designer changes it without code.
- id: keys
  kind: step
  label: The number keys try the moves in loadout order and the arrows turn the hero
  why: The player's verbs, each one a single call that may be refused.
- id: board
  kind: event
  label: The board rewrites itself on energy and start and cooldown events and never polls
  why: The player's record of the round, with no Tick.
- id: finale
  kind: step
  label: The round ends when every dummy is outside the ring and records the time
  why: A goal checked when something changes.
- id: fresh
  kind: step
  label: R starts a fresh round only after the finale and resets the hero and the dummies and the energy and every wait
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director on the level that wires the hero's components and runs each move's effects
  pieces:
    - { id: director, kind: class, label: ADojoS2RingDirector with the hero and the loadout and the dummies set in Details and the components found on the hero, covers: [director] }
    - { id: effects-run, kind: step, label: The OnAbilityActivated handler calls Apply on every effect in the started move's Effects list with the hero, covers: [effects-run] }
    - { id: keys, kind: step, label: PressAbility calls TryActivate with the move at that place in the loadout and the turn keys add 90 degrees of yaw while the round runs, covers: [keys] }
    - { id: board, kind: event, label: Handlers for OnEnergyChanged and OnCooldownChanged and OnAbilityActivated all rewrite the board from the components, covers: [board] }
    - { id: finale, kind: step, label: The board refresh counts the dummies outside the ring and ends the round with the time when all four are, covers: [finale] }
    - { id: fresh, kind: step, label: RestartRound only after the finale puts the hero and dummies back and calls Refill and ResetAll, covers: [fresh] }
  edges:
    - { from: keys, to: director, label: TryActivate }
    - { from: director, to: effects-run, label: on start }
    - { from: director, to: board, label: three events }
    - { from: board, to: finale, label: checked on every change }
    - { from: finale, to: fresh, label: R only after }
- id: component-runs-effects
  title: The ability component runs the effects itself and the level Blueprint only routes and draws
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the hero and the three assets and the dummies and a Running Boolean, covers: [director] }
    - { id: effects-run, kind: step, label: The ability component calls Apply on each effect of a move right after it starts so any owner of the component gets the effects, covers: [effects-run] }
    - { id: keys, kind: step, label: Key events call Try Activate on the hero's ability component and the arrows call Add Actor World Rotation, covers: [keys] }
    - { id: board, kind: event, label: Custom events bound to the three delegates rewrite a Text Render, covers: [board] }
    - { id: finale, kind: step, label: The custom events count the dummies outside the ring and set Running to false with the time, covers: [finale] }
    - { id: fresh, kind: step, label: The R event behind a branch on Running moves everyone back and calls Refill and Reset All, covers: [fresh] }
  edges:
    - { from: keys, to: level, label: Try Activate }
    - { from: effects-run, to: board, label: started event }
    - { from: level, to: board, label: bound events }
    - { from: board, to: finale, label: checked on every change }
    - { from: finale, to: fresh, label: R only after }
```

# Integration Rubric

- The pieces are reused unchanged apart from the Effects list on the ability asset; every rule about starting, paying, waiting, and tags stays in the ability and energy components.
- A move does what its asset's effects say: changing the effects in the asset changes the move with no code change, and a third kind of effect is one more child of the effect base.
- The director subscribes to the three events; neither component points at the director or the board.
- A move that is waiting, unaffordable, or blocked by the hero's tags does nothing and costs nothing, including a dash while Focus still roots the hero after the shockwave's root has ended.
- The board and the finale change only on events, and the finale counts dummies more than 600 units from the middle, measured flat.
- Every binding made in BeginPlay is removed in EndPlay, and nothing runs in Tick.
- R starts a fresh round only after the finale, and the move and turn keys do nothing outside a round.
- A second round plays exactly like the first; the submission gives the tuned numbers with one sentence on why.
