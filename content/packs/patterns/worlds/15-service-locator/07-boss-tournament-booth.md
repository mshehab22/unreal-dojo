---
id: p15-boss-tournament-booth
title: "Boss: the tournament booth"
order: 7
kind: boss
difficulty: 4
patterns: [service-locator]
skills: [planning, service-locator]
terms: [world-subsystem, uinterface, null-object, timer-manager, spawnactor, tsubclassof]
prerequisites: [p15-announcer-desk, p15-crier-trace, p15-gong-refactor, p15-service-locator-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - A whole tournament round announced and scored through two services the director never builds itself
  - A second service made with the same shape as the first, and found the same way
  - Providers chosen in Details or swapped in between rounds, with the director unchanged
  - A tracer slipped in front of the announcer and taken out again while a round runs
pieces:
  - p15-announcer-desk
  - p15-crier-trace
---

# Spec

The director runs the tournament booth. A round is 30 seconds long and is fought between the player's fighter, Ayla, and a rival, Brom. Pressing H lands a hit for Ayla, only while a round runs. Brom lands one hit every 4 seconds on his own, the first at 4 seconds. Every moment of a round is announced: "Round N begins" when round N starts, "Ayla hits (n)" and "Brom hits (n)" each time, with that fighter's running count for the round, and when the 30 seconds are up "Time" and then "Winner: Ayla", "Winner: Brom", or "Draw". The fighter with more hits wins the round and equal hits are a draw.

The lines reach the announcer in two steps that the director never skips. The director spawns one crier from the earlier quest and calls out through it with `CallOut`, and the crier announces through the announcer that the announcer desk holds at that moment.

Points go through a second service that you build in this quest, with the same shape as the announcer desk: a scoreboard interface with `AddPoints(Fighter, Points)` and `GetPoints(Fighter)`, a do-nothing scoreboard that counts the calls it drops and always reads 0, a scoreboard that keeps each fighter's total in memory, and a world subsystem, the scoreboard desk, that holds the one in place and finds the world's desk with a static `Locate`. When a round ends, the winner gets 3 points and a draw gives each fighter 1, written once through the scoreboard desk. Totals carry over from round to round. Reference game: the commentary and score overlay of a fighting game tournament stream, where the commentators and the score bug are separate services the stream operator can mute, swap, or log without touching the match.

How the services are chosen: the director has two class slots in Details, an announcer class and a scoreboard class. When play begins it makes one object of each chosen class and provides it to the matching desk; an empty slot provides nothing and the do-nothing service stays in place. Setup code outside the director may provide other services at any time, including between rounds. The director never names a concrete announcer or scoreboard class in its code.

Pressing T slips a tracer, the one from the earlier quest, in front of the announcer in place; pressing T again takes it out and puts back exactly the announcer it wrapped. Round 1 starts when play begins, and R starts the next round only after one has ended; H and R do nothing at other times. Starting a round resets the hits and starts both timers; it leaves the providers and the totals alone. While a round runs the label reads "Round N  Ayla a  Brom b"; when it ends the label adds the result and each fighter's total read from the scoreboard desk, for example "Round 1  Ayla 10  Brom 7  Winner: Ayla  Points Ayla 3  Brom 0". A C++ director receives keys only after `EnableInput` with the player controller.

Compiles against earlier quests: p15-announcer-desk (`Quests/p15-announcer-desk/DojoP15Announcer.h`, `Quests/p15-announcer-desk/DojoP15AnnouncerDesk.h`, `Quests/p15-announcer-desk/DojoP15NullAnnouncer.h`, `Quests/p15-announcer-desk/DojoP15RecordingAnnouncer.h`) and p15-crier-trace (`Quests/p15-crier-trace/DojoP15Crier.h`, `Quests/p15-crier-trace/DojoP15TracingAnnouncer.h`).

Core numbers are fixed: a 30 second round, a rival hit every 4 seconds, 3 points for a win, and 1 point for a draw.

Extensions, in order of importance:

1. A provider chosen by a console variable or a developer setting instead of the Details slots, read by the setup code and not by the director's round logic.
2. A real announcer that writes each line to the Output Log, and a console command that swaps it in and out of the desk while a round runs.
3. A scoped service: only the director may write points, while the UI may only read them, through a getter that unrelated classes cannot reach.

Feel: tune the rival so that a player who matches his pace draws, a player who hits twice as often wins easily, and the announcer's lines arrive in the same order as the hits happen.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that runs the rounds, the keys, and the timers, and owns no announcer or scoreboard class
  why: One owner of the round; the services are found, never built by the round logic.
- id: scoreboard
  kind: class
  label: A scoreboard interface, a do-nothing scoreboard that counts what it drops, a memory scoreboard, and a world subsystem desk that holds the one in place
  why: A second service built with the same shape as the announcer desk, so the pattern is yours and not copied.
- id: wiring
  kind: step
  label: At play start the director makes one object of each chosen class and provides it to its desk; an empty slot provides nothing
  why: The choice of providers is made in one place, outside the code that plays the round.
- id: announce
  kind: step
  label: Every line goes through the piece's crier, which announces through the announcer in place at that moment
  why: A provider swapped in between rounds, or a tracer slipped in, must be what the next line reaches.
- id: score
  kind: step
  label: A win gives the winner 3, a draw gives each fighter 1, once at the end of the round, through the scoreboard desk; totals carry over
  why: Points are a service too, and a round must not hold on to a scoreboard of its own.
- id: trace
  kind: step
  label: T wraps the announcer in place in the piece's tracer and T again restores exactly what was wrapped
  why: A decorator proves that callers depend on the interface and not on a class.
- id: round
  kind: step
  label: A 30 second round, a rival hit every 4 seconds, H only while running, and R only between rounds, resetting hits and timers but not providers or totals
  why: A second round must play like the first and keep what the first left behind.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ director with a second desk beside the first
  pieces:
    - { id: director, kind: class, label: "ADojoP15TournamentDirector with a text label, two TSubclassOf slots, the round length, the rival interval, the two fighter names, and the point values in Details", covers: [director] }
    - { id: scoreboard, kind: class, label: "IDojoP15Scoreboard, a null and a memory scoreboard, and UDojoP15ScoreboardDesk, a world subsystem with Locate, Provide, AddPoints, and GetPoints that pass every call to the scoreboard in place", covers: [scoreboard] }
    - { id: wiring, kind: step, label: "BeginPlay makes one object of each chosen class with NewObject and gives it to the matching desk through Provide, after spawning the crier", covers: [wiring] }
    - { id: announce, kind: step, label: "Say calls the crier's CallOut for every line, and the director holds no announcer pointer of its own", covers: [announce] }
    - { id: score, kind: step, label: "EndRound compares the hits, then calls AddPoints on the scoreboard desk once for a win or twice for a draw", covers: [score] }
    - { id: trace, kind: step, label: "PressTrace stores the desk's GetProvider, makes a tracer that wraps it, and provides the tracer; pressing again provides the stored one and drops the tracer", covers: [trace] }
    - { id: round, kind: step, label: "StartRound sets a non-looping 30 second timer and a looping 4 second timer, EndRound clears both, and PressNextRound calls StartRound only while stopped", covers: [round] }
  edges:
    - { from: wiring, to: announce, label: "the providers the lines will reach" }
    - { from: wiring, to: score, label: "the scoreboard the points will reach" }
    - { from: round, to: announce, label: "every event of a round is a line" }
    - { from: round, to: score, label: "the end of a round writes the points" }
    - { from: trace, to: announce, label: "the tracer sits between the lines and the announcer" }
    - { from: director, to: round, label: "start and end" }
- id: blueprint-director
  title: A Blueprint director that drives both desks through their Blueprint functions
  pieces:
    - { id: director, kind: class, label: "BP_TournamentDirector actor with a Text Render component and variables for the two class slots, the round length, the rival interval, the fighter names, the point values, and a Running flag", covers: [director] }
    - { id: scoreboard, kind: class, label: "A C++ scoreboard interface, providers, and desk as in the other plan, because a Blueprint cannot implement a native-only interface; the desk's Provide, Add Points, and Get Points are Blueprint functions", covers: [scoreboard] }
    - { id: wiring, kind: step, label: "Begin Play spawns a Dojo P15 Crier with Spawn Actor from Class, then for each non-empty slot uses Construct Object from Class and calls Provide on the Get World Subsystem result", covers: [wiring] }
    - { id: announce, kind: step, label: "A Say function calls Call Out on the crier for every line", covers: [announce] }
    - { id: score, kind: step, label: "The end-of-round event compares the hit integers, then calls Add Points on the scoreboard desk once or twice", covers: [score] }
    - { id: trace, kind: step, label: "The T event, behind a Branch on a Tracer variable, either makes a Dojo P15 Tracing Announcer, calls Wrap with the desk's Get Provider, and provides it, or provides the stored announcer and clears the variable", covers: [trace] }
    - { id: round, kind: step, label: "Set Timer by Event for the 30 second end and a looping 4 second rival hit, Clear Timer at the end, and the R event behind a Branch on Running", covers: [round] }
  edges:
    - { from: wiring, to: announce, label: "the providers the lines will reach" }
    - { from: wiring, to: score, label: "the scoreboard the points will reach" }
    - { from: round, to: announce, label: "every event of a round is a line" }
    - { from: round, to: score, label: "the end of a round writes the points" }
    - { from: trace, to: announce, label: "the tracer sits between the lines and the announcer" }
    - { from: director, to: round, label: "start and end" }
```

# Integration Rubric

- The pieces are reused unchanged: every line goes through the crier and the announcer desk, and the tracer is the piece's own.
- The director names no concrete announcer or scoreboard class in its code; the classes come from Details or from setup code, and a provider swapped in between rounds takes over completely, with the old one hearing nothing more.
- The scoreboard is a second service built the same way as the announcer: an interface, a do-nothing provider that counts what it drops, a memory provider, and a world subsystem found through the world.
- Every event of a round is announced in time order: the start, each hit with its running count, Time, and then the result.
- A win gives the winner 3 points and a draw gives each fighter 1, written once at the end through the scoreboard desk, and the totals carry over to the next round.
- T slips the tracer in front of the announcer in place and T again restores exactly the announcer it wrapped, with every line reaching the announcer either way.
- With nothing provided, the round plays exactly the same: the do-nothing services take every line and point, nothing crashes, and the next round starts as usual.
- The submission says why the director owns no service of its own and which dependencies stay visible, and gives the tuned rival interval with the feel it produced.
