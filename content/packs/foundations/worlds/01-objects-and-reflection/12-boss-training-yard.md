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

The client's training yard runs a timed practice round. The yard holds 6 pop-up targets and 2 training dummies. A round lasts 45 seconds. Every second a lowered target (never a broken one) is chosen at random and raised, unless 2 targets are already up; a raised target that nobody hits within 2.5 seconds drops back by itself. Each target breaks after 2 hits and each dummy goes down after 3 strikes. The score keeper counts 5 points per dummy strike and 25 per broken target, so the most a round can score is 180 (150 from six broken targets, 30 from two downed dummies). A hit on a target that is lowered or broken is a miss: it costs 5 points, the score never drops below 0, and the target's label reads MISS until its next state change. Mashing every key as targets rise therefore loses points instead of breaking everything for free. When the score first reaches 150 in a round, the bell is struck once at full force; a flag for "bell rung this round" stops it ringing again until the next round. When the round ends, the rise and lower timers stop, keys stop doing anything, and the keeper shows the final score on its label, which stays there until the next round starts. Starting a round resets everything first: every target goes back to lowered with no hits and no misses, whatever state it ended in, every dummy stands up again, the bell flag and the remembered rise times are cleared, and only then do the timers and keys start, so round 2 plays exactly like round 1. With a rise every second and 2.5 seconds up, an unhit target is still up when the next two rises come, so the 2 at once limit really decides which rises are skipped. Reference game: the archery and shooting galleries of The Legend of Zelda: Ocarina of Time, where a short timed round with targets popping up is the whole game.

How a round starts: round 1 starts when play begins, and pressing R starts the next round, but only while no round is running; R is the one key that works between rounds. How the player hits things: keys 1 to 6 call Hit on the matching pop-up target, and Q and E call Strike on the two dummies. Map them in the level Blueprint with keyboard events, or bind keys on a C++ director (an actor only receives keys after `EnableInput` with the player controller); either way the key only calls the target's own BlueprintCallable function, and only while a round is running.

The point of the boss is the split. Your four earlier classes keep their rules; something new drives the round, and every number above can be changed by a designer in the editor without a rebuild. The earlier classes need exactly five additions, and nothing else in their rules changes: the pop-up target gains `Lower` (raised to lowered without counting a hit, for the target nobody hit in time), a miss count (a refused hit adds one and shows MISS), and `ResetForRound` (lowered from any state, with hits and misses cleared and the label refreshed; Repair only works on a broken target, so it cannot do this job); the dummy gains `ResetHits` (back to standing for the next round); and the score keeper gains `PointsPerMiss` (5), subtracting all misses from the points earned and clamping the total at 0, so misses made while the score is 0 still count against points earned later. Timers get a full world later; for the round clock, the rise rhythm, and the auto lower you may use the level Blueprint's Set Timer by Event node calling your BlueprintCallable functions, or a C++ director actor with the timer manager. A Delay node will not do for the auto lower: a Delay that is already counting ignores new calls, so with a rise every second only the first target would ever drop. Remember when each target rose and check them all on a short looping timer instead.

Compiles against earlier quests: f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`), f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`), f1-score-keeper (`Quests/f1-score-keeper/DojoF1ScoreKeeper.h`), and f1-practice-bell (`Quests/f1-practice-bell/DojoF1PracticeBell.h`).

Core numbers are fixed: 6 targets, 2 dummies, 45 second round, a rise every second, 2.5 seconds up, at most 2 up at once, 2 hits per target, 3 strikes per dummy, 5 and 25 points, 5 points lost per miss with a floor of 0, bell at 150.

Extensions, in order of importance:

1. A golden target: a second enum on the target, its kind (`EDojoF1TargetKind` with ETK_Normal and ETK_Golden), set on one random target at the start of each round; a broken golden target scores double. The kind is separate from the state, because a golden target still moves through lowered, raised, and broken like any other.
2. A best score kept on the director across rounds, visible read only in the Details panel while playing.
3. A Blueprint child of the bell that overrides Ring to play a sound whose volume follows the ring volume.

Feel: tune the time a target stays up until a missed target feels like your own slow reaction, not the yard cheating you, and a 5 point miss feels like a reason to wait for the target rather than a punishment for trying.

# Required Pieces

```yaml
- id: targets
  kind: class
  label: Pop-up targets and dummies reused from the earlier quests
  why: The rules for one target are already written and tested; the boss must not fork them.
- id: additions
  kind: step
  label: Add Lower, a miss count, and ResetForRound to the pop-up target, ResetHits to the dummy, and a miss penalty to the score keeper
  why: The round needs to drop an unhit target, punish mashing, and stand dummies up again, and these are the only changes the earlier classes need.
- id: player-input
  kind: step
  label: Map keys 1 to 6 to Hit on each target and Q and E to Strike on each dummy during a round, and R to start the next round between rounds
  why: The player's only verbs; each key calls one function and nothing else, and R is how round 2 begins.
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
  label: Remember when each target rose and lower any target that has been up for the up time
  why: Without it targets stay up forever and the round has no pressure; it must work for every raised target at once, not only the latest.
- id: scoring
  kind: class
  label: The score keeper wired to every target and dummy
  why: One place totals the score, so the bell threshold and the final label read the same number.
- id: bell-trigger
  kind: step
  label: Strike the bell when the score first reaches the threshold, guarded by a bell rung this round flag
  why: The reward moment, once per round, and a check that the systems talk in the right direction.
- id: round-reset
  kind: step
  label: End the round by stopping timers and keys and showing the score; start the next by resetting targets, dummies, the bell flag, and rise times
  why: A second round must start from the same state as the first, and nothing pressed between rounds may count.
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
    - { id: added, kind: step, label: Lower and a miss count and ResetForRound on ADojoF1PopupTarget and ResetHits on ADojoF1TrainingDummy and PointsPerMiss on the keeper as the only additions, covers: [additions] }
    - { id: director, kind: class, label: ADojoF1YardDirector with StartRound called from BeginPlay and EndRound and a bRoundRunning flag and arrays of targets and dummies plus the keeper and the bell set in Details, covers: [round-driver, tunables] }
    - { id: keys, kind: step, label: Director calls EnableInput in BeginPlay and binds keys 1 to 6 and Q and E to HitTarget and StrikeDummy which do nothing unless bRoundRunning and R to RestartRound which only calls StartRound while no round runs, covers: [player-input] }
    - { id: rise, kind: step, label: Director's rise step counts raised targets with GetState and raises a random lowered one, covers: [rise-rule] }
    - { id: lower, kind: step, label: Director stores each target's rise time in a map when it raises it and a 0.1 second looping timer calls Lower on every target still raised for the up time or longer, covers: [auto-lower] }
    - { id: keeper, kind: class, label: The score keeper placed in the level with every target and dummy in its list, covers: [scoring] }
    - { id: bell, kind: step, label: After each hit or strike the director checks CountScore and if bBellRungThisRound is false and the score has reached the threshold strikes the bell and sets the flag, covers: [bell-trigger] }
    - { id: reset, kind: step, label: EndRound clears the rise and check timers and bRoundRunning and calls ShowScore; StartRound calls ResetForRound on every target and ResetHits on every dummy and clears bBellRungThisRound and the rise times and calls ShowScore before starting a non-looping 45 second round timer that calls EndRound and the looping rise and lower timers, covers: [round-reset] }
  edges:
    - { from: added, to: reused, label: extends the earlier classes }
    - { from: keys, to: reused, label: calls Hit and Strike }
    - { from: director, to: keys, label: owns the bindings }
    - { from: director, to: rise, label: runs it on the rhythm }
    - { from: director, to: lower, label: runs it on a short looping timer }
    - { from: rise, to: reused, label: raises targets }
    - { from: lower, to: reused, label: lowers targets }
    - { from: director, to: keeper, label: asks for the score }
    - { from: keeper, to: reused, label: casts each entry and reads its state and misses }
    - { from: director, to: bell, label: strikes once at the threshold }
    - { from: director, to: reset, label: runs at the end and the start of every round }
- id: blueprint-director
  title: The level Blueprint drives the round through the C++ API
  pieces:
    - { id: reused, kind: class, label: The four earlier classes placed in the level, covers: [targets, scoring] }
    - { id: added, kind: step, label: Lower and a miss count and ResetForRound on the pop-up target and ResetHits on the dummy and PointsPerMiss on the keeper as the only additions, covers: [additions] }
    - { id: level, kind: class, label: Level Blueprint with Start Round called from Event BeginPlay and End Round called by a non-looping 45 second round timer and a Round Running variable and timer handles for the round and rise and check timers, covers: [round-driver] }
    - { id: keys, kind: step, label: Keyboard events 1 to 6 and Q and E in the level Blueprint call Hit or Strike on placed actors behind a branch on Round Running and the R event calls Start Round behind a branch on Round Running being false, covers: [player-input] }
    - { id: rise, kind: step, label: Rise event filters the target array by GetState and calls Raise on a random lowered one and records Get Game Time in Seconds for it in a target to time map, covers: [rise-rule] }
    - { id: lower, kind: step, label: A 0.1 second looping Set Timer by Event loops over the map and calls Lower on every target still raised for the up time or longer, covers: [auto-lower] }
    - { id: bell, kind: step, label: After each Hit or Strike the Blueprint checks a Bell Rung This Round variable and compares CountScore with the threshold and strikes the bell and sets the variable, covers: [bell-trigger] }
    - { id: reset, kind: step, label: End Round clears the timer handles and Round Running and calls ShowScore; Start Round loops the targets calling ResetForRound and the dummies calling ResetHits and clears Bell Rung This Round and the map and calls ShowScore before starting the timers, covers: [round-reset] }
    - { id: settings, kind: data, label: Blueprint variables marked instance editable for every number, covers: [tunables] }
  edges:
    - { from: added, to: reused, label: extends the earlier classes }
    - { from: keys, to: reused, label: calls Hit and Strike }
    - { from: keys, to: bell, label: each hit triggers the threshold check }
    - { from: level, to: rise, label: fires every rise interval }
    - { from: rise, to: lower, label: records the rise time the check reads }
    - { from: rise, to: reused, label: calls Raise }
    - { from: lower, to: reused, label: calls Lower }
    - { from: bell, to: reused, label: calls Strike on the bell }
    - { from: level, to: reset, label: runs when the round timer ends and when a round starts }
    - { from: settings, to: level, label: numbers read by every step }
```

# Integration Rubric

- The dummy, pop-up target, score keeper, and bell are reused; the only changes to them are Lower, the miss count, ResetForRound, ResetHits, and PointsPerMiss (plus the kind enum if extension 1 is built), with no rewrite of their rules.
- Targets know nothing about the director, the keeper, or the bell; references point from the driver and the keeper toward the targets, and keys only call each target's own function.
- Every fixed number is an editable property or instance editable variable with the given default.
- The up limit of 2 holds even when the rise step and an auto lower happen in the same moment; every raised target drops after the up time, not only the latest; and a hit on a lowered or broken target costs 5 points without taking the score below 0.
- The bell is struck exactly once per round, through Strike, never by calling its reaction directly, and the bell rung this round flag is cleared when the next round starts so round 2 can ring too.
- Round 1 starts with play and R starts each later round only between rounds; a 45 second round timer ends it, stopping the timers and the keys and showing the score; starting a round resets every target (lowered, no hits or misses), every dummy, the bell flag, and the rise times first, so a second round plays the same as the first.
- Nothing uses Tick; the round runs on timers and on calls into the C++ API.
- The tuned up time is written in the submission with one sentence on why it felt fair.
