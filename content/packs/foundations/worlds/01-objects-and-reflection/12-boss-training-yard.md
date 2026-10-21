---
id: f1-boss-training-yard
title: "Boss: the training yard"
order: 12
kind: boss
difficulty: 3
patterns: [state]
skills: [planning, reflection, object-model]
terms: [uproperty, ufunction, blueprintcallable, blueprintnativeevent, uenum, cast, isa, editanywhere]
prerequisites: [f1-training-dummy, f1-popup-target, f1-score-keeper, f1-practice-bell, f1-dash-with-cooldown]
xp: 300
estimatedMinutes: 60
concepts:
  - C++ owns the rules while the editor and Blueprint drive the round
  - Reusing earlier actors unchanged inside a bigger system
pieces:
  - f1-training-dummy
  - f1-popup-target
  - f1-score-keeper
  - f1-practice-bell
---

# Spec

The client's training yard runs a timed practice round. The yard holds 6 pop-up targets and 2 training dummies. A round lasts 45 seconds. Every 3 seconds a lowered target is chosen at random and raised; a raised target that nobody hits within 2 seconds drops back by itself. No more than 2 targets are up at once. Each dummy goes down after 3 strikes. The score keeper counts 5 points per dummy strike and 25 per broken target, and when the score first reaches 150 the bell is struck at full force. When the round ends, every target is repaired and lowered and the final score stays on the keeper's label. Reference game: the archery and shooting galleries of The Legend of Zelda: Ocarina of Time, where a short timed round with targets popping up is the whole game.

The point of the boss is the split. Your four earlier classes keep the rules and stay unchanged; something new drives the round, and every number above can be changed by a designer in the editor without a rebuild. Timers get a full world later; for the round clock and the rise rhythm you may use the level Blueprint's Delay and Set Timer nodes calling your BlueprintCallable functions, or a C++ director actor with the timer manager.

Core numbers are fixed: 6 targets, 2 dummies, 45 second round, a rise every 3 seconds, 2 seconds up, at most 2 up at once, 3 strikes per dummy, 5 and 25 points, bell at 150.

Extensions, in order of importance:

1. A golden target: one target per round is marked golden through a new enum value and scores double when broken.
2. A best score kept on the director across rounds, visible read only in the Details panel while playing.
3. A Blueprint child of the bell that overrides Ring to play a sound whose volume follows the ring volume.

Feel: tune the time a target stays up until a missed target feels like your own slow reaction, not the yard cheating you.

# Required Pieces

```yaml
- id: targets
  kind: class
  label: Pop-up targets and dummies reused from the earlier quests
  why: The rules for one target are already written and tested; the boss must not fork them.
- id: round-driver
  kind: class
  label: Something that runs the round clock and the rise rhythm
  why: A round has a start, a rhythm, and an end that no single target should own.
- id: rise-rule
  kind: step
  label: Pick a random lowered target and raise it, respecting the up limit
  why: This is where the 2 at once rule and the random choice live.
- id: auto-lower
  kind: step
  label: Lower a raised target that was not hit in time
  why: Without it targets stay up forever and the round has no pressure.
- id: scoring
  kind: class
  label: The score keeper wired to every target and dummy
  why: One place totals the score, so the bell threshold and the final label read the same number.
- id: bell-trigger
  kind: step
  label: Strike the bell once when the score first reaches the threshold
  why: The reward moment, and a check that the systems talk in the right direction.
- id: round-reset
  kind: step
  label: Repair and lower everything when the round ends
  why: A second round must start from the same state as the first.
- id: tunables
  kind: data
  label: Round length, rhythm, up time, up limit, points, and threshold as editable values
  why: The feel criterion is met by tuning, not by rebuilding.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director actor runs the round
  pieces:
    - { id: reused, kind: class, label: The dummy and pop-up target classes from the earlier quests unchanged, covers: [targets] }
    - { id: director, kind: class, label: ADojoF1YardDirector with StartRound and EndRound and a TArray of targets set in Details, covers: [round-driver, tunables] }
    - { id: rise, kind: step, label: Director's rise step counts raised targets with GetState and raises a random lowered one, covers: [rise-rule] }
    - { id: lower, kind: step, label: Director remembers when each target rose and lowers it after the up time, covers: [auto-lower] }
    - { id: keeper, kind: class, label: The score keeper placed in the level with every target and dummy in its list, covers: [scoring] }
    - { id: bell, kind: step, label: Director checks CountScore after each rise step and strikes the bell once past the threshold, covers: [bell-trigger] }
    - { id: reset, kind: step, label: EndRound repairs every target and then calls ShowScore on the keeper, covers: [round-reset] }
  edges:
    - { from: director, to: rise, label: runs it on the rhythm }
    - { from: director, to: lower, label: runs it on the rhythm }
    - { from: rise, to: reused, label: raises targets }
    - { from: lower, to: reused, label: lowers targets }
    - { from: director, to: keeper, label: asks for the score }
    - { from: keeper, to: reused, label: casts each entry and reads its state }
    - { from: director, to: bell, label: strikes once at the threshold }
    - { from: director, to: reset, label: runs at the end of the round }
- id: blueprint-director
  title: The level Blueprint drives the round through the C++ API
  pieces:
    - { id: reused, kind: class, label: The four earlier classes unchanged and placed in the level, covers: [targets, scoring] }
    - { id: level, kind: class, label: Level Blueprint with a round timer and a rise timer calling the C++ functions, covers: [round-driver] }
    - { id: rise, kind: step, label: Rise event filters the target array by GetState and calls Raise on a random lowered one, covers: [rise-rule] }
    - { id: lower, kind: step, label: A delay of the up time after each Raise calls a lower step on that target if it is still raised, covers: [auto-lower] }
    - { id: bell, kind: step, label: After each Hit the Blueprint compares CountScore with the threshold and strikes the bell once, covers: [bell-trigger] }
    - { id: reset, kind: step, label: Round end loops the targets calling Repair and then calls ShowScore on the keeper, covers: [round-reset] }
    - { id: settings, kind: data, label: Blueprint variables marked instance editable for every number, covers: [tunables] }
  edges:
    - { from: level, to: rise, label: fires every rise interval }
    - { from: rise, to: lower, label: schedules the drop }
    - { from: rise, to: reused, label: calls Raise }
    - { from: lower, to: reused, label: lowers the target }
    - { from: level, to: bell, label: checks the threshold }
    - { from: bell, to: reused, label: calls Strike on the bell }
    - { from: level, to: reset, label: runs when the round timer ends }
    - { from: settings, to: level, label: numbers read by every step }
```

# Integration Rubric

- The dummy, pop-up target, score keeper, and bell classes are reused; any change to them is an addition (such as a Lower function on the target), never a rewrite of their rules.
- Targets know nothing about the director, the keeper, or the bell; references point from the driver and the keeper toward the targets.
- Every fixed number is an editable property or instance editable variable with the given default.
- The up limit of 2 holds even when the rise step and an auto lower happen in the same moment.
- The bell is struck exactly once per round, through Strike, never by calling its reaction directly.
- Ending the round leaves every target lowered and repaired, so a second round plays the same as the first.
- Nothing ticks to poll state; the round runs on timers or delays and on calls into the C++ API.
- The tuned up time is written in the submission with one sentence on why it felt fair.
