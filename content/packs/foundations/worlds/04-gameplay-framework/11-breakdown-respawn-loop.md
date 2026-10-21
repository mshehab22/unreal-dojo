---
id: f4-respawn-loop
title: Plan a death and respawn loop
order: 11
kind: breakdown
difficulty: 3
patterns: [component]
skills: [planning, framework]
terms: [pawn, player-controller, player-state, game-mode-base, possession, actor-component]
prerequisites: [f4-fence]
xp: 90
estimatedMinutes: 15
concepts:
  - Deciding which framework class owns each piece of a player's life
  - Keeping what survives death off the pawn
---

# Spec

In a one-player arena, the player's character has 100 health. When health reaches 0, the character plays no more input, a "down" message shows for 3 seconds, and then a fresh character appears at the spawn point farthest from the nearest enemy, with full health. The player's score, their number of deaths, and the weapon they had equipped all survive the death; the dropped ammo does not. After 5 deaths the run ends and the game returns to the menu, where the best score is still shown. The camera never cuts to black: during the 3 seconds it looks at the place the character fell.

You are planning, not coding. Name which framework class owns each piece of state and each step, and how they talk.

Acceptance:

- Score, deaths, and the equipped weapon are the same before and after a respawn.
- Input does nothing while the player is down.
- The spawn point choice is a rule in one place, not in the character.
- The best score is still known after returning to the menu.
- Health, the respawn delay, and the death limit are tunable without a rebuild.

# Required Pieces

```yaml
- id: health
  kind: component
  label: A health component on the character that reports reaching 0
  why: Health belongs to the body and is reusable on enemies.
- id: player-record
  kind: data
  label: Score, deaths, and equipped weapon kept on something that outlives the character
  why: The pawn is destroyed on death, so anything stored on it is lost.
- id: death-step
  kind: step
  label: On death, stop input, keep the camera on the fall, and start the respawn delay
  why: The moment between bodies needs an owner that is still alive.
- id: spawn-rule
  kind: step
  label: Choose the spawn point farthest from the nearest enemy
  why: A rule of the match, decided in one place.
- id: respawn-step
  kind: step
  label: Spawn a fresh character, restore the equipped weapon, and possess it
  why: The controller drives the new body, and the record refills it.
- id: run-end
  kind: step
  label: After the fifth death, end the run and travel to the menu
  why: The match rules decide when it is over.
- id: best-score
  kind: data
  label: The best score kept across level changes
  why: The menu is another level, so the value must outlive the arena's world.
- id: tunables
  kind: data
  label: Health, respawn delay, and death limit as editable values
  why: Balance changes without code.
```

# Reference Plans

```yaml
- id: mode-drives-respawn
  title: The game mode owns the respawn rules
  pieces:
    - { id: health, kind: component, label: UDojoF4HealthComponent on the character that tells its owner when health hits 0, covers: [health] }
    - { id: state, kind: data, label: ADojoF4ArenaPlayerState with score and deaths and the equipped weapon class, covers: [player-record] }
    - { id: down, kind: step, label: The character tells its controller it died and the controller disables input and keeps the camera on the body with SetViewTarget, covers: [death-step] }
    - { id: mode, kind: class, label: ADojoF4ArenaGameMode picks the spawn point in ChoosePlayerStart and runs a 3 second timer before RestartPlayer, covers: [spawn-rule, respawn-step] }
    - { id: end, kind: step, label: The game mode counts deaths on the player state and calls OpenLevel to the menu after 5, covers: [run-end] }
    - { id: best, kind: data, label: A game instance subsystem that keeps the best score, covers: [best-score] }
    - { id: rules, kind: data, label: Editable health on the component and delay and death limit on the game mode, covers: [tunables] }
  edges:
    - { from: health, to: down, label: reports death }
    - { from: down, to: mode, label: asks for a respawn }
    - { from: mode, to: state, label: counts the death and reads the weapon }
    - { from: mode, to: end, label: after the limit }
    - { from: end, to: best, label: stores the best before travel }
- id: controller-drives-respawn
  title: The player controller runs its own respawn and asks the game mode only for a spawn point
  pieces:
    - { id: health, kind: component, label: UDojoF4HealthComponent broadcasting when health reaches 0, covers: [health] }
    - { id: state, kind: data, label: The player state holds score and deaths and the controller keeps the weapon class, covers: [player-record] }
    - { id: down, kind: step, label: The controller listens to the health component and on death unpossesses and starts a 3 second timer with the camera on the body, covers: [death-step] }
    - { id: spawn, kind: step, label: A game mode function FindSafestStart returns the player start farthest from the nearest enemy, covers: [spawn-rule] }
    - { id: respawn, kind: step, label: When its timer ends the controller spawns the default pawn there and possesses it and re-equips the weapon, covers: [respawn-step] }
    - { id: end, kind: step, label: The game mode watches deaths on player states and ends the run after 5 with OpenLevel, covers: [run-end] }
    - { id: best, kind: data, label: Best score kept on the game instance, covers: [best-score] }
    - { id: rules, kind: data, label: A rules data asset with health and delay and death limit, covers: [tunables] }
  edges:
    - { from: health, to: down, label: broadcasts death }
    - { from: down, to: respawn, label: timer ends }
    - { from: respawn, to: spawn, label: asks for a start }
    - { from: down, to: state, label: counts the death }
    - { from: end, to: best, label: stores the best before travel }
```

# Rubric

- Health lives on the character in a component; score, deaths, and the weapon live on something that survives the character.
- Input is disabled or the pawn unpossessed while down, and the camera is handled by the controller.
- The spawn rule is in one place on the match rules side, not in the character.
- Possession of the fresh character is named as the step that hands control back.
- The best score survives travel to the menu on the game instance or its subsystem.
- Health, the delay, and the death limit are named as editable data.

# Alternative Note

Both plans pass. The first is the shape Unreal's own game mode is built for: it already has ChoosePlayerStart and RestartPlayer, so the respawn is a few overrides. The second keeps the whole loop on the controller, which reads well when respawning has player-specific steps such as a death camera or a loadout screen, and only asks the game mode for the one rule it owns. A plan that keeps score or deaths on the character fails the first rubric line, because they vanish with the body.
