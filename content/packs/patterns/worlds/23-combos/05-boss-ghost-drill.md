---
id: p23-boss-ghost-drill
title: "Boss: the ghost drill"
order: 5
kind: boss
difficulty: 5
patterns: [command, game-loop, double-buffer]
skills: [planning, command, game-loop, double-buffer]
terms: [tick, deltatime, timer-manager, spawnactor, tarray]
prerequisites: [p23-breakdown-instant-replay, p5-drill-orders, p4-drum-pad]
xp: 360
estimatedMinutes: 85
concepts:
  - Moves recorded as small values with the fixed step they ran on, and run again on a second dummy
  - A fixed step loop that runs the same whole steps at any frame rate, with a limit on a long frame
  - Pads that count every hit from one finished snapshot, so the live and the ghost scores agree
  - A director that runs the clock and the order of things and works out no lane, block, or score
pieces:
  - p5-drill-orders
  - p4-drum-pad
---

# Spec

The director runs a ghost drill. A round has two halves of equal length. In the first, the player drills a live dummy by pressing moves, and every move is recorded. In the second, a ghost dummy runs the recording, and at the end the two dummies and their pads are compared. The earlier quests supply the rules: a drill dummy that steps between three lanes and blocks, an order that carries a move out on a dummy as a plain value, and a drum pad that counts hits from one finished snapshot for each frame.

The director owns a clock. Real time collects frame by frame, and the clock runs whole fixed steps of 0.1 seconds from it, however long a frame was, at most 8 steps in one frame. A frame that owes more steps than are allowed forgets the rest instead of catching up later. A round has 100 steps in all: steps 1 to 50 are the live run and steps 51 to 100 are the replay.

During the live run, A is a step left, D a step right, and Space a block. A press does nothing at any other time. A pressed move waits until the next fixed step and then runs on the live dummy, in the order pressed, and is recorded with the number of that step. Each time a move runs, in either half, the director hits the pad lane that the dummy is in after the move. In the replay, the commands recorded on step N run on the ghost dummy on step 50 plus N, the same way, and hit the ghost's pad.

The round is scored 10.5 seconds after it starts, after the last pad has counted its last hit. The result is `GHOST MATCHES` when the two dummies are in the same lane with the same number of blocks and the two pads have the same score, and `GHOST DRIFTED` otherwise. The label reads `Round N  PHASE  Live L  Ghost G`, with the phase `LIVE`, `REPLAY`, or `DONE`, and when the round is scored it adds two spaces and the result. R starts the next round only after one has been scored, and a new round makes fresh dummies and pads and forgets the recording. A C++ director receives keys only after `EnableInput` with the player controller.

The dummies and the pads know nothing about the director. The director never works out a lane, a block, or a score, and never changes a pad's counts: it carries orders out on the dummies and hits the pads. Reference game: a racing game, where a ghost car drives your best lap again, exactly as you drove it, on any machine.

Compiles against earlier quests: p5-drill-orders (`Quests/p5-drill-orders/DojoP5DrillDummy.h`, `Quests/p5-drill-orders/DojoP5DrillSergeant.h`) and p4-drum-pad (`Quests/p4-drum-pad/DojoP4DrumPad.h`).

Core numbers are fixed: a step of 0.1 seconds, 50 live steps and 50 replay steps, at most 8 steps in a frame, a score 10.5 seconds after the round starts, and 10 points for a hit.

Extensions, in order of importance:

1. A half speed replay, which shows each recorded step for two steps of the clock and skips none.
2. Pause, and one step forward while paused.
3. A second ghost that runs the recording of the previous round.

Feel: tune the step length so that a rapid pair of presses reads as two moves in one beat, and the ghost's repeat of the pair feels like the same beat.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that runs the clock, the live run, the replay, and the scoring, working out no lane, block, or score
  why: One owner of the order of things; the rules belong to the dummies and the pads.
- id: moves
  kind: data
  label: A recorded command as the fixed step it ran on and the move, never a pointer to a dummy
  why: A recording of small values replays on any dummy and costs almost nothing to keep.
- id: clock
  kind: step
  label: Real time collects each frame and whole fixed steps of 0.1 seconds run from it, up to 8 a frame, with the rest of a long frame forgotten
  why: The same whole steps run on every machine, and a long frame cannot start a spiral of catching up.
- id: live-run
  kind: step
  label: Presses wait for the next fixed step, run on the live dummy in the order pressed, and are recorded with that step
  why: Input is taken at step boundaries, so the live run and the replay see moves in the same units.
- id: replay-run
  kind: step
  label: On step 50 plus N the commands recorded on step N run on the ghost dummy through the same function that ran them live
  why: One function runs a move in both halves, so the ghost cannot do something the live dummy did not.
- id: pads
  kind: data
  label: A drum pad for the live dummy and one for the ghost, each hit once for every move that runs
  why: The pads' own snapshot is what counts a hit once and the same in both halves.
- id: scoring
  kind: step
  label: Ten and a half seconds in, compare lanes, blocks, and scores, and show GHOST MATCHES or GHOST DRIFTED
  why: The round needs an outcome, and it must wait until the pads have counted their last hit.
- id: round
  kind: step
  label: R only after a round was scored, and a new round makes fresh dummies and pads and clears the recording
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-drill
  title: A C++ director with an accumulator clock and one function that runs a move
  pieces:
    - { id: director, kind: class, label: "ADojoP23GhostDrill with a text label as its root, tick enabled, TObjectPtr members for the two dummies and two pads, and the step length, live steps, and step limit in Details", covers: [director] }
    - { id: moves, kind: data, label: "A plain struct of an int for the step and the earlier quest's EDojoP5DrillMove enum, in a TArray on the director", covers: [moves] }
    - { id: clock, kind: step, label: "Tick adds DeltaSeconds to a double accumulator and runs RunStep while the accumulator holds a whole step and fewer than the limit have run this frame, then clamps the accumulator to one step", covers: [clock] }
    - { id: live-run, kind: step, label: "PressMove adds to a pending TArray only while the live run is on, and RunStep, for steps up to 50, runs each pending move, records it, and clears the array", covers: [live-run] }
    - { id: replay-run, kind: step, label: "RunStep, for later steps, walks the recording for entries whose step equals the step minus 50 and runs them through the same Perform function that the live run used", covers: [replay-run] }
    - { id: pads, kind: data, label: "Perform builds a FDojoP5DrillOrder for the dummy and calls CarryOut, then calls Hit on that dummy's pad with the dummy's lane", covers: [pads] }
    - { id: scoring, kind: step, label: "A non-looping timer of 10.5 seconds compares GetLane, GetBlocks, and GetScore on both sides and sets the result", covers: [scoring] }
    - { id: round, kind: step, label: "PressNextRound calls StartRound only while stopped; StartRound destroys the old dummies and pads, spawns new ones, and clears the pending moves, the recording, and the accumulator", covers: [round] }
  edges:
    - { from: clock, to: live-run, label: "runs the live steps" }
    - { from: clock, to: replay-run, label: "runs the replay steps" }
    - { from: live-run, to: moves, label: "records each command" }
    - { from: moves, to: replay-run, label: "the recording is replayed" }
    - { from: live-run, to: pads, label: "hits the live pad" }
    - { from: replay-run, to: pads, label: "hits the ghost pad" }
    - { from: pads, to: scoring, label: "scores are compared" }
    - { from: director, to: round, label: "start and end" }
- id: blueprint-drill
  title: A Blueprint director with a looping timer for the clock
  pieces:
    - { id: director, kind: class, label: "BP_GhostDrill actor with a Text Render component, variables for the two dummies and two pads, and variables for the step length and live steps", covers: [director] }
    - { id: moves, kind: data, label: "A Blueprint struct of a step integer and the earlier quest's drill move enum, in an array variable", covers: [moves] }
    - { id: clock, kind: step, label: "A looping Set Timer by Event of 0.1 seconds whose event is one fixed step; the timer manager runs a missed step again inside a long frame, and the step counter stops the clock after 100 steps", covers: [clock] }
    - { id: live-run, kind: step, label: "Input events add to a pending array behind a Branch on the step counter being under 50; the step event runs the pending moves, appends each to the recording with the step counter, and clears the array", covers: [live-run] }
    - { id: replay-run, kind: step, label: "The step event, for later steps, loops the recording and calls the Perform function for entries whose step equals the counter minus 50", covers: [replay-run] }
    - { id: pads, kind: data, label: "Perform makes an order with Make DojoP5DrillOrder, calls Carry Out, then calls Hit on the matching pad with Get Lane", covers: [pads] }
    - { id: scoring, kind: step, label: "A 10.5 second Set Timer by Event compares the dummies and pads and sets the result string", covers: [scoring] }
    - { id: round, kind: step, label: "The R event calls Start Round behind a Branch on Running; Start Round destroys the old actors, spawns new ones, clears the arrays and the counter, and restarts the timers", covers: [round] }
  edges:
    - { from: clock, to: live-run, label: "runs the live steps" }
    - { from: clock, to: replay-run, label: "runs the replay steps" }
    - { from: live-run, to: moves, label: "records each command" }
    - { from: moves, to: replay-run, label: "the recording is replayed" }
    - { from: live-run, to: pads, label: "hits the live pad" }
    - { from: replay-run, to: pads, label: "hits the ghost pad" }
    - { from: pads, to: scoring, label: "scores are compared" }
    - { from: director, to: round, label: "start and end" }
```

# Integration Rubric

- The drill dummy, the order, and the drum pad are reused unchanged, and the director never works out a lane, a block, or a score, and never changes a pad's counts: it carries orders out and hits the pads.
- Real time collects frame by frame and whole fixed steps of the same length run from it, so the live run, the recording, and the replay come out the same at 30, 60, and 144 frames a second, and a long frame runs at most the allowed steps and forgets the rest.
- A move pressed during the live run waits for the next fixed step and runs in the order pressed, several in one step if need be, and a move pressed at any other time does nothing.
- Every command is recorded with the step it ran on and carries no pointer, so it still makes sense on a new dummy.
- The replay runs the commands recorded on step N on step 50 plus N through the same function that ran them live, and hits the ghost's pad, so nothing the ghost does differs from the live run.
- Each move that runs hits the pad lane the dummy ended in, and the round is scored after the pads have counted their last hit, comparing lane, blocks, and score as specified.
- R starts a round only after one has been scored, and a new round makes fresh dummies and pads and forgets the recording, pending moves, and leftover time.
- The submission says which function runs a move in both halves, why moves are taken at step boundaries and not at the moment of the press, and gives the tuned step length with the feel it produced.
