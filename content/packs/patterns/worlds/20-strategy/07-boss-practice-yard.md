---
id: p20-boss-practice-yard
title: "Boss: the practice yard"
order: 7
kind: boss
difficulty: 4
patterns: [strategy]
skills: [planning, strategy]
terms: [timer-manager, spawnactor, tsubclassof, newobject, tarray]
prerequisites: [p20-target-rules, p20-mover-rules, p20-turret-refactor, p20-strategy-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole round of play where a launcher aims by a rule and dummies move by rules, none of which the director names
  - A director that hands the launcher the dummies as they are now and reads back the one it picked
  - A targeting rule swapped by the player in the middle of a round, so the next shot follows the new rule
  - Rules chosen from lists set in Details, so a new rule class needs no change to the director
pieces:
  - p20-target-rules
  - p20-mover-rules
---

# Spec

The director runs the practice yard. A launcher fires at three practice dummies for 29 seconds, the dummies move about while it does, and the player can change how the launcher chooses its target at any moment. The launcher is the earlier quest's `ADojoP20Launcher` and each dummy is an `ADojoP20Mover`; the director makes them when play begins, the launcher at the director's own place and each dummy at its start place.

The designer sets the yard up in Details. Each dummy has a name, a start place, a starting health, and a movement rule class. In the reference yard Anvil has 30 health and stands 100 out along X, Barrel has 50 health and stands 480 out, and Crate has 40 health, starts 450 out, and circles a point 500 out. A separate list holds the targeting rule classes, the nearest, weakest, and farthest rules in that order.

Every 0.5 seconds, the first at 0.25 seconds, every dummy that is still standing takes one step of 0.5 seconds through its own mover. Every 2 seconds, the first at 2 seconds, the launcher fires once. Before it fires, the director gives it the dummies as they are right now, with their names, their places, and their health. The launcher's rule picks, and a hit takes 10 health from the dummy the launcher names. A shot at nothing is a miss. Each shot is added to a log that keeps the name hit, or a dash for a miss. The round ends at 29 seconds, and the yard is `CLEARED` when no dummy is standing and `ESCAPED` otherwise.

The first rule class in the list is the launcher's rule when play begins. Pressing T gives the launcher a new rule, made from the next class in the list, going round to the start after the last, and it works at any time, in a round or between rounds. With an empty list the launcher has no rule and every shot is a miss. Round 1 starts when play begins, and R starts the next round only after one has ended. Starting a round puts every dummy back at its start place with its full health, clears the hits, the log, and the result, and starts the timers again. The rule the launcher is using does not change when a round starts. A C++ director receives keys only after `EnableInput` with the player controller. The label reads `Round N  <rule class name>  Hits H  Standing S`, with `None` where the rule class name goes when the launcher has no rule, and when the round ends it adds two spaces and the result.

The launcher and the dummies know nothing about the director. The director never names a targeting rule class or a movement rule class, never tests which kind of rule a piece holds, and never decides who is aimed at: it hands over the dummies and reads the name that comes back. Reference game: a tower defence game, where each tower has a target priority such as first, last, strongest, or closest that the player switches in the middle of a wave, and where the enemies on the path move by their own patterns.

Compiles against earlier quests: p20-target-rules (`Quests/p20-target-rules/DojoP20Candidate.h`, `Quests/p20-target-rules/DojoP20TargetRule.h`, `Quests/p20-target-rules/DojoP20Launcher.h`) and p20-mover-rules (`Quests/p20-mover-rules/DojoP20MoveRule.h`, `Quests/p20-mover-rules/DojoP20Mover.h`).

Core numbers are fixed: a 29 second round, a step every 0.5 seconds from 0.25, a shot every 2 seconds from 2, a hit worth 10 health, and the dummies' starting health of 30, 50, and 40. They are the defaults of three public properties on the director, `RoundSeconds` and `FireInterval` (both `float`) and `HitDamage` (an `int32`), and the tests set those properties to other values: a round lasts `RoundSeconds`, a shot comes every `FireInterval` with the first after one interval, and a hit takes `HitDamage`.

Extensions, in order of importance:

1. A second launcher with its own list of rule classes: the label shows both rules in use.
2. A new targeting rule that aims at the standing dummy after the one it hit last. It remembers, so each launcher needs an object of its own, and adding it must change nothing in the director.
3. A label line showing the shot log, so a swap can be seen in the order of the hits.

Feel: judge the fixed numbers by whether a player who never touches T clears the yard with only a little time to spare, and a player who swaps to the right rule at the right moment clears it earlier. Make the moment the circling crate comes close the moment a swap feels worth having.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that owns the launcher and the dummies, runs the rounds, the keys, and the timers, and decides no aim
  why: One owner of the round; the choosing belongs to the rules.
- id: setup
  kind: data
  label: The designer's list of dummies with a name, a start place, a starting health, and a movement rule class, and the list of targeting rule classes
  why: The classes come from Details, so a new rule needs no change to the director.
- id: step
  kind: step
  label: Every 0.5 seconds from 0.25 each standing dummy takes one step through its own mover
  why: The dummies move by their own rules, and a dummy that is down stops.
- id: fire
  kind: step
  label: Every 2 seconds from 2 the launcher is given the dummies as they are now, fires, and the dummy it names loses 10 health
  why: The rule can only choose well from fresh places and health, and the director only reads the answer.
- id: swap
  kind: step
  label: T gives the launcher a new object of the next targeting rule class in the list, at any time, and the list goes round
  why: The player changes the rule from outside, and the next shot has to follow it.
- id: round
  kind: step
  label: A 29 second round, R only between rounds, and a reset that puts the dummies back and clears the log without changing the rule
  why: A second round must play like the first, and the rule the player chose stays.
- id: result
  kind: step
  label: CLEARED when no dummy is standing at the end of the round and ESCAPED otherwise, shown on the label
  why: The round needs an outcome that the shots decide.
```

# Reference Plans

```yaml
- id: cpp-yard
  title: A C++ director that owns a launcher and a mover for each dummy
  pieces:
    - { id: director, kind: class, label: "ADojoP20PracticeYard with a text label as its root, a TObjectPtr to the launcher, a TArray of TObjectPtr to the movers, and the numbers (round length, fire interval, hit damage) in Details", covers: [director] }
    - { id: setup, kind: data, label: "A USTRUCT with the dummy's name, start place, starting health, and a TSubclassOf of the movement rule, in a TArray on the director, plus a TArray of TSubclassOf of the targeting rule", covers: [setup] }
    - { id: step, kind: step, label: "HandleStep calls Step with 0.5 on the mover of every dummy whose health is above 0", covers: [step] }
    - { id: fire, kind: step, label: "HandleFire fills the launcher's Candidates from the movers' places and the health the director keeps, calls Fire, logs the name, and takes the damage from the dummy with that name", covers: [fire] }
    - { id: swap, kind: step, label: "PressCycleRule moves a rule index along the list and assigns NewObject of that class, with the launcher as its outer, to the launcher's Rule", covers: [swap] }
    - { id: round, kind: step, label: "StartRound resets the health, puts each mover back with SetActorLocation and SetRuleClass, clears the log and hits, and starts a non-looping round timer, a looping step timer with a 0.25 second first delay, and a looping fire timer with a 2 second first delay; PressNextRound calls it only while stopped", covers: [round] }
    - { id: result, kind: step, label: "EndRound clears the timers and sets CLEARED or ESCAPED from the number of dummies with health above 0", covers: [result] }
  edges:
    - { from: setup, to: director, label: "read when play begins" }
    - { from: step, to: fire, label: "moved places are what the launcher is given" }
    - { from: swap, to: fire, label: "the next shot asks the new rule" }
    - { from: round, to: step, label: "restarts the timers" }
    - { from: fire, to: result, label: "the health left decides" }
    - { from: director, to: round, label: "start and end" }
- id: blueprint-yard
  title: A Blueprint director that drives the launcher and the dummies through their Blueprint functions
  pieces:
    - { id: director, kind: class, label: "BP_PracticeYard actor with a Text Render component, variables for the launcher, an array of the movers, an array of health values, the shot log, a Running flag, and the numbers", covers: [director] }
    - { id: setup, kind: data, label: "A Blueprint struct for a dummy with a name, a start place, a starting health, and a class variable of the movement rule, in an array variable, plus an array of the targeting rule classes", covers: [setup] }
    - { id: step, kind: step, label: "A looping Set Timer by Event with a 0.25 second start delay and a 0.5 second time, a For Each over the movers that calls Step with 0.5 behind a Branch on that dummy's health", covers: [step] }
    - { id: fire, kind: step, label: "A looping Set Timer by Event with a 2 second start delay: a For Each building the launcher's Candidates from Get Actor Location and the health array, then Fire, an append to the log, and a subtract of 10 from the health of the named dummy", covers: [fire] }
    - { id: swap, kind: step, label: "The T event adds one to a rule index with a modulo on the array length, then Construct Object from Class with the class at that index and the launcher as outer, into Set Rule on the launcher", covers: [swap] }
    - { id: round, kind: step, label: "A Start Round custom event resets the health array, calls Set Actor Location and Set Rule Class on each mover, clears the log and the hits, starts the three timers, and sets Running; the R event calls it behind a Branch on Running", covers: [round] }
    - { id: result, kind: step, label: "A 29 second Set Timer by Event stops the timers, sets Running false, and sets CLEARED or ESCAPED by counting the health values above 0", covers: [result] }
  edges:
    - { from: setup, to: director, label: "read when play begins" }
    - { from: step, to: fire, label: "moved places are what the launcher is given" }
    - { from: swap, to: fire, label: "the next shot asks the new rule" }
    - { from: round, to: step, label: "restarts the timers" }
    - { from: fire, to: result, label: "the health left decides" }
    - { from: director, to: round, label: "start and end" }
```

# Integration Rubric

- The launcher and the movers are reused unchanged, and the director never names a targeting or movement rule class, tests which kind of rule a piece holds, or decides who is aimed at: it hands the launcher the dummies and reads the name that comes back.
- The targeting rule classes and each dummy's movement rule class come from Details, so a new rule class is chosen there with no change to the director; with an empty list the launcher has no rule and every shot is a miss.
- T gives the launcher a new rule object made from the next class, so the next shot follows the new rule, in a round and between rounds, and the list goes round to its start.
- Every standing dummy is stepped through its own mover every 0.5 seconds from 0.25, and a dummy that is down is neither stepped nor aimed at.
- Before each shot the launcher is given the dummies' current names, places, and health, a hit takes 10 health from the named dummy, and a shot at nothing is a miss that is logged.
- A round lasts 29 seconds, the result is CLEARED when no dummy is standing and ESCAPED otherwise, and the label shows the round, the rule class in use, the hits, the dummies standing, and the result as specified.
- R starts a round only between rounds, and a new round puts every dummy back at its start with full health, clears the hits, the log, and the result, restarts the timers, and keeps the rule the player chose.
- The submission says which function decides each shot, why the director holds a list of classes instead of a switch, and says how the fixed damage and interval felt in play.
