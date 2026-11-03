---
id: p17-boss-night-watch
title: "Boss: the night watch"
order: 7
kind: boss
difficulty: 4
patterns: [dirty-flag]
skills: [planning, dirty-flag]
terms: [actor-component, timer-manager, spawnactor, tarray]
prerequisites: [p17-guard-rating, p17-tower-rig, p17-ladder-refactor, p17-dirty-flag-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole round of play that reads two remembered values every second and changes them rarely
  - A director that changes the guard and the tower only through the pieces' own functions
  - Buffs that wear off by time, removed through the same functions that add them
  - Counts that prove the work was done once after each change and not once for each read
pieces:
  - p17-guard-rating
  - p17-tower-rig
---

# Spec

The director runs the night watch. A watchman stands on a tower in the wind, and for 36 seconds he must stay steady. His guard rating is the earlier quest's `UDojoP17GuardStats` component on the director, and the tower is the earlier quest's `ADojoP17TowerRig`. If the director is given no rig, it makes one when play begins with three joints: Base, Platform (300 above the base), and Lantern (100 above the platform).

Every 1 second, the first at 0.5 seconds, the watch is checked. A check first removes any drink of oil that has worn off, then reads the guard, and if it is below 40 the check is shaky. It also reads the lantern's position for the label. The label reads `Round N  Guard G  Lantern X,Y,Z  Shaky S`, with the lantern rounded to whole numbers, and when the round ends it adds two spaces and the result, `HELD` when there were at most 3 shaky checks and `FELL` otherwise.

Every 5 seconds, the first at 2 seconds, a gust pushes the tower's base 20 units along X. The watchman starts every round with base guard 30. Pressing E puts armour on, worth 15 guard, or takes it off if it is on. Pressing B drinks lantern oil, worth 10 guard for 12 seconds, and drinks can stack. E and B do nothing outside a round. Round 1 starts when play begins, and R starts the next round only after one has ended. Starting a round returns everything to the start through the pieces' own functions: no buffs, no armour, the base guard of 30, the tower's base back where it began, and no shaky checks. A C++ director receives keys only after `EnableInput` with the player controller. Reference game: the character sheet of a Diablo-style action role-playing game, where armour and resistances are totals built from a base, each worn item, and temporary buffs, and that the player keeps checking.

The pieces know nothing about the director. The director never works out a rating or a position itself and never touches a piece's stored values. Every change goes through the pieces' functions (`SetBaseGuard`, `Equip`, `Unequip`, `AddBuff`, `RemoveBuff`, `ClearBuffs`, and `SetLocalOffset`), and every read goes through `GetGuard` and `GetPosition`.

Compiles against earlier quests: p17-guard-rating (`Quests/p17-guard-rating/DojoP17GuardStats.h`, `Quests/p17-guard-rating/DojoP17GuardBuff.h`) and p17-tower-rig (`Quests/p17-tower-rig/DojoP17TowerRig.h`, `Quests/p17-tower-rig/DojoP17RigNode.h`).

Core numbers are fixed: a 36 second round, a check every second, a gust every 5 seconds of 20 units, a base guard of 30, armour worth 15, oil worth 10 for 12 seconds, steady at 40, and held with at most 3 shaky checks.

Extensions, in order of importance:

1. A second watchman on the tower with his own guard stats: the label shows the lower of the two guards, and each guard is worked out only after its own parts change.
2. An autosave: a note that the round state has changed since it was last written, set by every change and cleared by a write once every 10 seconds, so a quiet minute writes nothing.
3. A label line, `Sums G/T`, showing how many times the guard and the tower have been worked out, so the saving can be watched.

Feel: tune the oil's length and the armour's worth so that a player who dresses at once and drinks oil early holds easily, a player who takes the armour off for the last seven seconds falls, and the moment the armour comes off is when a drink of oil feels worth having.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that runs the rounds, the keys, and the timers, owning the guard component and the tower and working out neither
  why: One owner of the round; the numbers belong to the pieces.
- id: changes
  kind: step
  label: Armour, oil, its wearing off, the gusts, and the round reset all change the guard and the tower only through the pieces' functions
  why: A narrow way in is what keeps a change from slipping past the flag.
- id: oil
  kind: data
  label: A record of each drink of oil, its buff id and the time it wears off
  why: The oil wears off by time, so the director must remember which buff to remove and when.
- id: check
  kind: step
  label: Once a second, remove worn-off oil, read the guard, count a shaky check, read the lantern, and update the label
  why: The reads happen far more often than the changes, which is the whole point of the flag.
- id: gust
  kind: step
  label: Every 5 seconds from the 2 second mark the base is pushed 20 along X by setting its local offset
  why: A second source of change, in a different piece, for the counts to tell apart.
- id: round
  kind: step
  label: A 36 second round, E and B only while it runs, R only between rounds, and a reset that puts the guard and the tower back to the start
  why: A second round must play like the first, and its reset must also go through the pieces.
- id: result
  kind: step
  label: HELD with at most 3 shaky checks, FELL otherwise, shown on the label
  why: The round needs an outcome that the checks decide.
```

# Reference Plans

```yaml
- id: cpp-watch
  title: A C++ director that owns the guard component and a tower rig
  pieces:
    - { id: director, kind: class, label: "ADojoP17NightWatch with a text label as its root, a UDojoP17GuardStats component, a TObjectPtr to the rig, and the numbers (starting guard, armour and oil values, steady guard, round length, gust interval and push) in Details", covers: [director] }
    - { id: oil, kind: data, label: "Two parallel TArrays on the director, the buff ids from AddBuff and the world times they wear off", covers: [oil] }
    - { id: changes, kind: step, label: "PressArmour calls Unequip and, when it returns false, Equip; PressOil calls AddBuff and records the id; the director has no other way to change the guard", covers: [changes] }
    - { id: check, kind: step, label: "HandleCheck walks the oil records backwards removing the worn-off ones with RemoveBuff, then calls GetGuard, compares it to the steady guard, reads GetPosition for the lantern joint, and rewrites the label", covers: [check] }
    - { id: gust, kind: step, label: "HandleGust adds the push to the base joint's local offset with SetLocalOffset", covers: [gust] }
    - { id: round, kind: step, label: "StartRound calls ClearBuffs, Unequip, SetBaseGuard, and SetLocalOffset back to the starting offset, then starts a non-looping round timer, a looping check timer with a 0.5 second first delay, and a looping gust timer with a 2 second first delay; PressNextRound calls it only while stopped", covers: [round] }
    - { id: result, kind: step, label: "EndRound clears the timers and sets HELD or FELL from the shaky count", covers: [result] }
  edges:
    - { from: changes, to: check, label: "what the check reads" }
    - { from: gust, to: check, label: "what the check reads" }
    - { from: oil, to: check, label: "the check removes worn-off oil" }
    - { from: round, to: changes, label: "the reset uses the same functions" }
    - { from: check, to: result, label: "the shaky count decides" }
    - { from: director, to: round, label: "start and end" }
- id: blueprint-watch
  title: A Blueprint director that drives the pieces through their Blueprint functions
  pieces:
    - { id: director, kind: class, label: "BP_NightWatch actor with a Text Render component, a Dojo P17 Guard Stats component, a variable for the tower rig, and variables for the numbers and a Running flag", covers: [director] }
    - { id: oil, kind: data, label: "Two array variables, the buff ids that Add Buff returns and the times they wear off", covers: [oil] }
    - { id: changes, kind: step, label: "The E event branches on the return of Unequip and calls Equip when it is false; the B event calls Add Buff and adds the id and the time to the arrays, both behind a Branch on Running", covers: [changes] }
    - { id: check, kind: step, label: "A looping Set Timer by Event with a 0.5 second start delay: a reverse For Each over the oil arrays removing worn-off buffs with Remove Buff, then Get Guard, a Branch against the steady guard that adds to Shaky Checks, Get Position for the lantern joint, and Set Text", covers: [check] }
    - { id: gust, kind: step, label: "A looping Set Timer by Event with a 2 second start delay: Get Local Offset on joint 0 plus the push, into Set Local Offset", covers: [gust] }
    - { id: round, kind: step, label: "A Start Round custom event calls Clear Buffs, Unequip, Set Base Guard, and Set Local Offset, starts the three timers, and sets Running; the R event calls it behind a Branch on Running", covers: [round] }
    - { id: result, kind: step, label: "A 36 second Set Timer by Event stops the timers, sets Running false, and sets HELD or FELL by comparing Shaky Checks with 3", covers: [result] }
  edges:
    - { from: changes, to: check, label: "what the check reads" }
    - { from: gust, to: check, label: "what the check reads" }
    - { from: oil, to: check, label: "the check removes worn-off oil" }
    - { from: round, to: changes, label: "the reset uses the same functions" }
    - { from: check, to: result, label: "the shaky count decides" }
    - { from: director, to: round, label: "start and end" }
```

# Integration Rubric

- The pieces are reused unchanged, and the director never works out a rating or a position and never touches the pieces' stored values: every change and every read goes through their functions.
- Armour toggles with Unequip and Equip, oil adds a buff by id and removes it by id when it has worn off, and the reset clears buffs, armour, the base guard, and the base joint through the same functions.
- The check removes worn-off oil before it reads the guard, so an expired drink is gone the same second.
- A quiet watch with no change reads the guard and the lantern every second and works each out once; after a change, the next check works out only what depends on it.
- A gust moves only the tower: the guard is not worked out again for it, and the tower's joints are each worked out once for each gust.
- A shaky check is a guard below 40, the round holds with at most 3 shaky checks, and the result and the lantern position appear on the label as specified.
- E and B work only while a round runs, R only between rounds, and a new round starts from the starting guard and the starting base, with the shaky count reset.
- The submission says which function of each piece every change goes through, why the director keeps no copy of either value, and gives the tuned oil length and armour value with the feel they produced.
