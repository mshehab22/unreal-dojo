---
id: p8-breakdown-attack-moves
title: Plan the champion's attack moves
order: 6
kind: breakdown
difficulty: 3
patterns: [subclass-sandbox]
skills: [planning, subclass-sandbox]
terms: [abstract-specifier, blueprintnativeevent, blueprint-protected, gas, timer-manager]
prerequisites: [p8-hazard-refactor]
xp: 90
estimatedMinutes: 20
concepts:
  - Planning a family of behaviors as one base with a hook and a toolbox
  - Choosing which operations belong in the toolbox and which rules the base must own
  - Comparing a hand-written base with the Gameplay Ability System's ability class
---

# Spec

The arena champion fights with a growing set of attack moves, and designers want to add new ones as Blueprint children without asking a programmer. The first four:

- **Shoulder Rush.** A 0.4 second windup, then a hit zone 2 meters ahead for 0.3 seconds, then a 0.8 second recovery.
- **Overhead Slam.** A 0.9 second windup, a hit zone around the champion for 0.2 seconds that also knocks fighters back, then a 1.2 second recovery.
- **Two-Strike Combo.** Two hit zones 0.35 seconds apart after a 0.3 second windup, then a 0.6 second recovery.
- **War Cry.** A 0.5 second windup, no hit zone, and the champion's next move does 25 percent more damage.

Every move must follow the same rules: only one move at a time, nothing starts during another move's recovery, every hit zone hits each fighter at most once, damage goes through the arena's damage rules, and every move plays its cues through the arena's cue system.

Acceptance:

- A designer can add a fifth move as a Blueprint child with no C++ change.
- No move can skip the one-at-a-time and recovery rules.
- A Two-Strike Combo that catches a fighter in both zones hits them twice, once per zone.
- War Cry's bonus applies to exactly the next move and then ends.
- Moves never include the damage system's or the cue system's headers.

# Required Pieces

```yaml
- id: move-base
  kind: class
  label: Abstract attack move base class
  why: The family needs one parent that owns the rules and the toolbox.
- id: entry
  kind: step
  label: Non-virtual start entry that enforces one move at a time and recovery
  why: The shared rules must live where no move can replace them.
- id: hook
  kind: event
  label: Overridable hook where each move's sequence lives, open to Blueprint children
  why: Each move differs only here, and designers write new ones in Blueprint.
- id: toolbox
  kind: step
  label: Protected tools for windup, hit zones, knockback, cues, and recovery
  why: Moves are built from these; they are the only way moves touch damage and cues.
- id: hit-once
  kind: data
  label: Per-zone record of fighters already hit
  why: Each hit zone must hit a fighter at most once.
- id: bonus
  kind: data
  label: Next-move damage bonus on the champion
  why: War Cry changes the next move, so the bonus lives outside any single move.
- id: tuning
  kind: data
  label: Timings, zone sizes, and damage as editable properties per move
  why: Designers balance moves without code.
```

# Reference Plans

```yaml
- id: own-base
  title: A hand-written move base with a native event hook
  pieces:
    - { id: base, kind: class, label: "UDojoChampionMove, UCLASS(Abstract, Blueprintable)", covers: [move-base] }
    - { id: start, kind: step, label: "StartMove, public and non-virtual, refuses during another move or recovery", covers: [entry] }
    - { id: perform, kind: event, label: "PerformMove BlueprintNativeEvent, overridden by each move", covers: [hook] }
    - { id: tools, kind: step, label: "BlueprintProtected tools: Windup, OpenHitZone, Knockback, PlayCue, Recover", covers: [toolbox] }
    - { id: zone, kind: data, label: "Each OpenHitZone keeps a set of fighters it has hit", covers: [hit-once] }
    - { id: bonus, kind: data, label: "PendingDamageBonus on the champion, read and cleared by the damage tool", covers: [bonus] }
    - { id: props, kind: data, label: "Editable timing and damage properties on each move class", covers: [tuning] }
  edges:
    - { from: start, to: perform, label: "calls the hook once the rules allow" }
    - { from: perform, to: tools, label: "moves are built only from the tools" }
    - { from: tools, to: zone, label: "hit zones record who they hit" }
    - { from: tools, to: bonus, label: "the damage tool applies and clears the bonus" }
    - { from: props, to: perform, label: "each move reads its own numbers" }
- id: gameplay-abilities
  title: Each move as a Gameplay Ability
  pieces:
    - { id: base, kind: class, label: "UDojoChampionMoveAbility deriving from UGameplayAbility, marked Abstract", covers: [move-base] }
    - { id: start, kind: step, label: "TryActivateAbility with tags that block other moves and a recovery cooldown effect", covers: [entry] }
    - { id: perform, kind: event, label: "ActivateAbility in C++ or the ActivateAbility event in Blueprint", covers: [hook] }
    - { id: tools, kind: step, label: "Protected helpers on the base plus ability tasks for waits and hit zones", covers: [toolbox] }
    - { id: zone, kind: data, label: "Hit zone helper keeps a set of fighters it has hit", covers: [hit-once] }
    - { id: bonus, kind: data, label: "A gameplay effect that adds damage to the next move and removes itself", covers: [bonus] }
    - { id: props, kind: data, label: "Timing and damage as properties on each ability", covers: [tuning] }
  edges:
    - { from: start, to: perform, label: "the ability system activates the hook when tags allow" }
    - { from: perform, to: tools, label: "moves use the base helpers and ability tasks" }
    - { from: tools, to: zone, label: "hit zones record who they hit" }
    - { from: bonus, to: tools, label: "the damage helper reads the bonus effect" }
    - { from: props, to: perform, label: "each ability reads its own numbers" }
```

# Rubric

- One abstract base owns the shared rules in an entry point no move can replace.
- Each move is one override, open to Blueprint children, built only from the base's tools.
- The toolbox covers windup, hit zones, knockback, cues, and recovery, and is the only path to damage and cues.
- Each hit zone hits a fighter at most once; the combo's two zones count separately.
- War Cry's bonus lives outside the move and applies to exactly the next one.
- Timings and damage are editable per move.

# Alternative Note

Both reference plans are valid. The hand-written base is small, easy to test, and enough for one champion with a handful of moves. The Gameplay Ability plan buys tags, cooldown effects, prediction, and replication from the engine, and is worth it once many characters share moves or the game is networked. A third plan that makes each move a data asset of timings with no per-move logic also passes for the first three moves, but it cannot express War Cry or a designer's next idea without new code, which is why a hook is needed.
