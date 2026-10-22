---
id: f6-boss-range-day
title: "Boss: range day"
order: 12
kind: boss
difficulty: 4
patterns: []
skills: [planning, data, debugging]
terms: [data-asset, data-table, table-row-base, curve-float, tsoftobjectptr, log-category, ensure-macro]
prerequisites: [f6-weapon-data, f6-target-table, f6-level-curve, f6-showcase, f6-loot-drops]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole round run from data, so designers change it without code
  - Rules that decide what happens in which order, written once in one director
pieces:
  - f6-weapon-data
  - f6-target-table
  - f6-level-curve
  - f6-showcase
---

# Spec

The range opens for a day of practice. A director plays waves of targets, read in order from a wave table whose rows name a kind of target from the target table and how many to put up. Each wave's targets stand in a row 150 units apart from the director, and a wave starts the moment the last one falls. A wave whose kind is missing from the target table spawns nothing: it is reported in the director's own log category and skipped, and the round carries on. The round ends when the last wave in the table is cleared, and the label shows CLEAR, the score, and the number of shots, such as `CLEAR 180 in 14 shots`. While a round runs, the label shows `WAVE 2 SCORE 30`.

Pressing F fires the blaster at the oldest standing target. If the clip is empty, the press reloads instead and is not counted as a shot. A target that falls gives its points to the score and as XP to the director's level component, whose XP per level is a curve. Reaching level 3 swaps the starting weapon for the upgrade, which starts with a full clip, and the showcase shows the equipped weapon's mesh, loaded from the weapon asset's soft reference. Reference game: the shooting galleries in Zelda, where each round tests the same rules with new targets.

How rounds start: round 1 starts when play begins, and R starts the next round, only after one has ended; F does nothing outside a round. Starting a round removes any standing targets, resets the level to 1, equips the starting weapon with a full clip (and shows it), and zeroes the score and shots. A C++ director receives keys only after `EnableInput` with the player controller.

The range's reference data, used by the tests and suggested for the level: targets Tin (health 1, 10 points) and Steel (health 3, 30 points); waves Opening (3 Tin), Plates (2 Steel), Ghosts (1 of a kind called Ghost that the target table lacks), Finale (3 Steel); an XP curve of 40 at level 1 rising by 20 a level; a pistol with damage 1 and a clip of 6, and a rifle with damage 3 and a clip of 4. With these, a round takes 14 shots and one reload and scores 180.

Compiles against earlier quests: f6-weapon-data (`Quests/f6-weapon-data/DojoF6Blaster.h`, `Quests/f6-weapon-data/DojoF6WeaponData.h`), f6-target-table (`Quests/f6-target-table/DojoF6Target.h`, `Quests/f6-target-table/DojoF6TargetSpawner.h`), f6-level-curve (`Quests/f6-level-curve/DojoF6LevelComponent.h`), and f6-showcase (`Quests/f6-showcase/DojoF6Showcase.h`). The pieces need no additions.

Core numbers are fixed: targets 150 apart, the upgrade at level 3, one press per reload with no shot.

Extensions, in order of importance:

1. A third weapon at level 5, added only as a data asset and an entry in the weapons list.
2. A wave row field for spacing, so one wave can spread wider than another.
3. The best score per day kept on the World 3 score board.

Feel: tune the XP curve until the rifle arrives just as the steel starts to feel slow, not before the player has felt the pistol's limits.

# Required Pieces

```yaml
- id: range-driver
  kind: class
  label: A director that runs the round from a wave table and owns the score and shots
  why: One owner of the rules; every number it plays comes from data.
- id: waves
  kind: data
  label: A wave table of target kind and count played in table order with targets 150 apart
  why: Designers write the round as rows.
- id: missing-kind
  kind: step
  label: A wave whose kind is not in the target table is logged in the director's category and skipped
  why: A designer's typo is reported and survived.
- id: fire
  kind: step
  label: F shoots the oldest standing target with the blaster or reloads an empty clip without counting a shot
  why: The player's one verb, with an ordering rule and a reload rule.
- id: progress
  kind: step
  label: Points from fallen targets feed the score and the level component's curve-driven XP
  why: Levels drawn as a curve pace the round.
- id: upgrade
  kind: step
  label: Level 3 equips the upgrade weapon with a full clip and the showcase loads and shows its mesh
  why: Data assets swap behavior and soft references load the look on demand.
- id: round
  kind: step
  label: The last wave cleared shows CLEAR with score and shots and R starts a clean round only between rounds
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ range director reads every rule's numbers from data
  pieces:
    - { id: director, kind: class, label: ADojoF6RangeDirector with the wave table and spawner and blaster and showcase and weapon list set in Details and a level component of its own, covers: [range-driver] }
    - { id: waves, kind: data, label: An FDojoF6WaveRow struct deriving from FTableRowBase with TargetKind and Count read with GetRowNames and FindRow in order, covers: [waves] }
    - { id: skip, kind: step, label: When a wave's spawns all return nullptr the director logs a warning in LogDojoF6Range and moves to the next row, covers: [missing-kind] }
    - { id: fire, kind: step, label: PressFire reloads when GetAmmo is 0 and otherwise calls TakeShot on the first standing target with Fire's damage, covers: [fire] }
    - { id: xp, kind: step, label: A fallen target's points go to the score and to AddXP on the level component, covers: [progress] }
    - { id: upgrade, kind: step, label: When GetLevel reaches 3 the director calls SetWeapon with the second weapon and ShowMesh with its soft Mesh, covers: [upgrade] }
    - { id: round, kind: step, label: After the last row the label shows CLEAR and R calls StartRound only when not running which destroys targets and resets progress and equips the first weapon, covers: [round] }
  edges:
    - { from: waves, to: director, label: rows in order }
    - { from: director, to: skip, label: empty waves }
    - { from: fire, to: xp, label: a target falls }
    - { from: xp, to: upgrade, label: level 3 }
    - { from: director, to: round, label: start and end }
- id: blueprint-director
  title: The level Blueprint plays the waves through the pieces' C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for the wave table and the weapons array and a Running Boolean and a Standing array of targets, covers: [range-driver] }
    - { id: waves, kind: data, label: Get Data Table Row Names on the wave table and Get Data Table Row for each wave index as a Dojo F6 Wave Row, covers: [waves] }
    - { id: skip, kind: step, label: When Spawn Target returns nothing for the whole wave a Print String in yellow and a branch back to the next wave, covers: [missing-kind] }
    - { id: fire, kind: step, label: The F event calls Get Ammo and either Reload or Fire into Take Shot on Standing index 0, covers: [fire] }
    - { id: xp, kind: step, label: When Take Shot returns true Get Points is added to the score and passed to Add XP on the level component, covers: [progress] }
    - { id: upgrade, kind: step, label: A branch on Get Level of at least 3 and the first weapon equipped calls Set Weapon and Show Mesh with the weapon's Mesh, covers: [upgrade] }
    - { id: round, kind: step, label: After the last row a Text Render shows CLEAR and the R event behind a branch on Running destroys Standing and calls Reset Progress and Set Weapon with the first weapon, covers: [round] }
  edges:
    - { from: waves, to: level, label: rows in order }
    - { from: level, to: skip, label: empty waves }
    - { from: fire, to: xp, label: a target falls }
    - { from: xp, to: upgrade, label: level 3 }
    - { from: level, to: round, label: start and end }
```

# Integration Rubric

- The blaster, weapon asset, target, spawner, level component, and showcase are reused without changes.
- Waves come from a table read in row order; no wave, target, weapon, or XP number is written in the director.
- A wave whose kind is missing is reported once, in the director's own log category, or with a Print String for a Blueprint director, and skipped, and the round carries on.
- F hits the oldest standing target, and an empty clip spends the press on a reload that is not a shot.
- Fallen targets feed the score and the curve-driven level, and level 3 equips the upgrade with a full clip.
- The showcase loads the equipped weapon's mesh from its soft reference only when that weapon is equipped.
- Round 1 starts with play, R starts later rounds only between rounds, and a round start resets targets, level, weapon, score, and shots, so round 2 plays like round 1.
- The tuned XP curve is written in the submission with one sentence on why the upgrade arrives when it does.
