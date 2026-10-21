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
  - Reusing earlier actors inside a bigger system by adding to them, never rewriting them
pieces:
  - f1-training-dummy
  - f1-popup-target
  - f1-score-keeper
  - f1-practice-bell
---

# Spec

The client's training yard runs a timed practice round. The yard holds 6 pop-up targets and 2 training dummies. A round lasts 45 seconds. Every second a lowered target (never a broken one) is chosen at random and raised, unless 2 targets are already up; a raised target that nobody hits within 2.5 seconds drops back by itself. Each target breaks after 2 hits and each dummy goes down after 3 strikes. The score keeper counts 5 points per dummy strike and 25 per broken target, so the most a round can score is 180 (150 from six broken targets, 30 from two downed dummies). When the score first reaches 150 the bell is struck at full force. When the round ends, the keeper shows the final score on its label, then every target is repaired and lowered and every dummy stands up again, so the next round starts the same way. With a rise every second and 2.5 seconds up, an unhit target is still up when the next two rises come, so the 2 at once limit really decides which rises are skipped. Reference game: the archery and shooting galleries of The Legend of Zelda: Ocarina of Time, where a short timed round with targets popping up is the whole game.

How the player hits things: keys 1 to 6 call Hit on the matching pop-up target, and Q and E call Strike on the two dummies. Map them in the level Blueprint with keyboard events, or bind input actions on a C++ director; either way the key only calls the target's own BlueprintCallable function.

The point of the boss is the split. Your four earlier classes keep their rules; something new drives the round, and every number above can be changed by a designer in the editor without a rebuild. The earlier classes need exactly two additions, and nothing else in them changes: the pop-up target gains `Lower` (raised to lowered without counting a hit, for the target nobody hit in time), and the dummy gains `ResetHits` (back to standing for the next round). Timers get a full world later; for the round clock and the rise rhythm you may use the level Blueprint's Delay and Set Timer nodes calling your BlueprintCallable functions, or a C++ director actor with the timer manager.

Core numbers are fixed: 6 targets, 2 dummies, 45 second round, a rise every second, 2.5 seconds up, at most 2 up at once, 2 hits per target, 3 strikes per dummy, 5 and 25 points, bell at 150.

Extensions, in order of importance:

1. A golden target: a second enum on the target, its kind (`EDojoF1TargetKind` with ETK_Normal and ETK_Golden), set on one random target at the start of each round; a broken golden target scores double. The kind is separate from the state, because a golden target still moves through lowered, raised, and broken like any other.
2. A best score kept on the director across rounds, visible read only in the Details panel while playing.
3. A Blueprint child of the bell that overrides Ring to play a sound whose volume follows the ring volume.

Feel: tune the time a target stays up until a missed target feels like your own slow reaction, not the yard cheating you.

# Required Pieces

```yaml
- id: targets
  kind: class
  label: Pop-up targets and dummies reused from the earlier quests
  why: The rules for one target are already written and tested; the boss must not fork them.
- id: additions
  kind: step
  label: Add Lower to the pop-up target and ResetHits to the dummy
  why: The round needs to drop an unhit target and stand dummies up again, and these are the only changes the earlier classes need.
- id: player-input
  kind: step
  label: Map keys 1 to 6 to Hit on each target and Q and E to Strike on each dummy
  why: The player's only verbs; each key calls the target's own function and nothing else.
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
  label: Show the final score, then repair and lower every target and stand every dummy up
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
    - { id: reused, kind: class, label: The dummy and pop-up target classes from the earlier quests, covers: [targets] }
    - { id: added, kind: step, label: Lower on ADojoF1PopupTarget and ResetHits on ADojoF1TrainingDummy as the only new functions, covers: [additions] }
    - { id: director, kind: class, label: ADojoF1YardDirector with StartRound and EndRound and arrays of targets and dummies set in Details, covers: [round-driver, tunables] }
    - { id: keys, kind: step, label: Director binds number keys and Q and E to Hit and Strike on the matching array entries, covers: [player-input] }
    - { id: rise, kind: step, label: Director's rise step counts raised targets with GetState and raises a random lowered one, covers: [rise-rule] }
    - { id: lower, kind: step, label: Director remembers when each target rose and calls Lower after the up time if it is still raised, covers: [auto-lower] }
    - { id: keeper, kind: class, label: The score keeper placed in the level with every target and dummy in its list, covers: [scoring] }
    - { id: bell, kind: step, label: Director checks CountScore after each hit and strikes the bell once past the threshold, covers: [bell-trigger] }
    - { id: reset, kind: step, label: EndRound calls ShowScore on the keeper and then Repair and Lower on every target and ResetHits on every dummy, covers: [round-reset] }
  edges:
    - { from: added, to: reused, label: extends the earlier classes }
    - { from: keys, to: reused, label: calls Hit and Strike }
    - { from: director, to: keys, label: owns the bindings }
    - { from: director, to: rise, label: runs it on the rhythm }
    - { from: director, to: lower, label: runs it after each rise }
    - { from: rise, to: reused, label: raises targets }
    - { from: lower, to: reused, label: lowers targets }
    - { from: director, to: keeper, label: asks for the score }
    - { from: keeper, to: reused, label: casts each entry and reads its state }
    - { from: director, to: bell, label: strikes once at the threshold }
    - { from: director, to: reset, label: runs at the end of the round }
- id: blueprint-director
  title: The level Blueprint drives the round through the C++ API
  pieces:
    - { id: reused, kind: class, label: The four earlier classes placed in the level, covers: [targets, scoring] }
    - { id: added, kind: step, label: Lower on the pop-up target and ResetHits on the dummy as BlueprintCallable additions, covers: [additions] }
    - { id: level, kind: class, label: Level Blueprint with a round timer and a rise timer calling the C++ functions, covers: [round-driver] }
    - { id: keys, kind: step, label: Keyboard events 1 to 6 and Q and E in the level Blueprint call Hit or Strike on placed actors, covers: [player-input] }
    - { id: rise, kind: step, label: Rise event filters the target array by GetState and calls Raise on a random lowered one, covers: [rise-rule] }
    - { id: lower, kind: step, label: A delay of the up time after each Raise calls Lower on that target if it is still raised, covers: [auto-lower] }
    - { id: bell, kind: step, label: After each Hit or Strike the Blueprint compares CountScore with the threshold and strikes the bell once, covers: [bell-trigger] }
    - { id: reset, kind: step, label: Round end calls ShowScore and then loops the targets calling Repair and Lower and the dummies calling ResetHits, covers: [round-reset] }
    - { id: settings, kind: data, label: Blueprint variables marked instance editable for every number, covers: [tunables] }
  edges:
    - { from: added, to: reused, label: extends the earlier classes }
    - { from: keys, to: reused, label: calls Hit and Strike }
    - { from: keys, to: bell, label: each hit triggers the threshold check }
    - { from: level, to: rise, label: fires every rise interval }
    - { from: rise, to: lower, label: schedules the drop }
    - { from: rise, to: reused, label: calls Raise }
    - { from: lower, to: reused, label: calls Lower }
    - { from: bell, to: reused, label: calls Strike on the bell }
    - { from: level, to: reset, label: runs when the round timer ends }
    - { from: settings, to: level, label: numbers read by every step }
```

# Integration Rubric

- The dummy, pop-up target, score keeper, and bell are reused; the only changes to them are the new Lower and ResetHits functions (plus the kind enum if extension 1 is built), with no rewrite of their rules.
- Targets know nothing about the director, the keeper, or the bell; references point from the driver and the keeper toward the targets, and keys only call each target's own function.
- Every fixed number is an editable property or instance editable variable with the given default.
- The up limit of 2 holds even when the rise step and an auto lower happen in the same moment.
- The bell is struck exactly once per round, through Strike, never by calling its reaction directly.
- Ending the round shows the final score first, then leaves every target lowered and repaired and every dummy standing, so a second round plays the same as the first.
- Nothing ticks to poll state; the round runs on timers or delays and on calls into the C++ API.
- The tuned up time is written in the submission with one sentence on why it felt fair.
