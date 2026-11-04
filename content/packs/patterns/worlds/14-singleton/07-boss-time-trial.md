---
id: p14-boss-time-trial
title: "Boss: the time trial"
order: 7
kind: boss
difficulty: 4
patterns: [singleton]
skills: [planning, singleton]
terms: [dependency-injection, newobject, spawnactor, tactoriterator, timer-manager, beginplay]
prerequisites: [p14-lap-log, p14-start-lights, p14-standings-refactor, p14-singleton-when-not]
xp: 320
estimatedMinutes: 75
concepts:
  - One director owns both lap logs for the whole session and decides which one each round writes into
  - Every round gets a fresh finish line, handed the log of that round's mode
  - The track's one set of start lights is found in the track, not reached through a global, and placed only when none runs
  - Nothing in the time trial is static, so a second play session or a second track starts clean
pieces:
  - p14-lap-log
  - p14-start-lights
---

# Spec

The trial director runs time trial rounds on one track. The champion drives laps across a finish line that stands at a spot on the director; the champion crosses the line by moving from smaller X to an X at or past the line's X, and moving back the other way is not a crossing. The director owns two lap logs, ranked and practice, made when play begins and kept for the whole session, and each round writes into exactly one of them.

A round goes like this. The director puts a fresh finish line at the spot, hands it the log of the round's mode, and starts the countdown on the track's start lights. The lights are the set already running on the track; when none runs, the director places one set of its own and keeps using it for every later round. While the lights are red, crossing the line is a false start: it is counted and timed as nothing. The moment the lights turn green the first lap starts, and every crossing after that finishes a lap. Three laps finish the round, and 120 seconds from the start of the round without that end it as a timeout; the laps already finished stay in the log. The label's wording is fixed. While a round runs it starts with the mode, RANKED or PRACTICE, and then holds the laps finished as "Lap 2/3", the false starts as "False starts 1", and the best ranked lap as "Best ranked 10.0" to one decimal, which never counts a practice lap. After the third lap it starts with FINISH, then the seconds from green to the last crossing to one decimal, and holds "Best ranked" and the best ranked lap the same way. On a timeout it reads exactly TIME UP. Reference game: Trackmania's time attack, where a player's best time on a track is kept as their record. Here, laps driven in practice on the same track must never reach that record.

How rounds start: round 1 is ranked and starts on the first frame of play, after every actor placed in the level has begun play, so lights placed after the director in the level are already running when it looks for them. R starts the next round, only after one has ended. P switches the next round between ranked and practice, only between rounds; during a round it does nothing. Starting a round replaces the finish line, so no lap of the last round is still being timed, and zeroes the laps and false starts; it does not clear either log. A C++ director receives keys only after `EnableInput` with the player controller.

Every piece is the earlier quests' own: the finish line is an `ADojoP14FinishLine` handed a `UDojoP14LapLog` with `UseLog`, and the lights are an `ADojoP14StartLights`, counted down with `BeginCountdown` and read with `IsGreen`. The director finds the running lights by asking its own world, and it never reaches a log, a line, or the lights through anything static. The pieces need no changes.

Compiles against earlier quests: p14-lap-log (`Quests/p14-lap-log/DojoP14FinishLine.h`, `Quests/p14-lap-log/DojoP14LapLog.h`) and p14-start-lights (`Quests/p14-start-lights/DojoP14StartLights.h`).

Core numbers are fixed: three laps a round, a 120 second round counted from its start, the lights' own 3 second countdown, and round 1 ranked.

Extensions, in order of importance:

1. Checkpoints: the round counts a lap only when the champion touched every checkpoint of the track in order during that lap, using the standings from the refactor, which the director finds through its world. Those standings count one pass and have no reset, so the director has to find its own way to start each lap's count afresh.
2. Career records: the ranked log moves into a `UGameInstanceSubsystem`, so the best ranked lap survives a level change while practice laps still do not.
3. A ghost: the best ranked lap's positions are recorded and replayed as a second actor in the next ranked round.

Feel: tune the track so that a clean lap takes about 20 seconds, three good laps finish with about a minute to spare, and the FINISH label gives a player enough to judge a round against their best ranked lap.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that runs the rounds, owns both logs, and keeps the counts
  why: One owner for everything the time trial keeps; no line or light knows the director exists.
- id: logs
  kind: data
  label: A ranked and a practice lap log made when play begins and kept for the whole session
  why: The records must survive every round, and practice must never reach them.
- id: line
  kind: step
  label: Each round spawns a fresh finish line and hands it the log of that round's mode
  why: The line writes wherever it is told, so the mode is one decision in one place.
- id: lights
  kind: step
  label: The track's running start lights are found in the director's own world, and one set is placed only when none runs
  why: One set of lights per track is the lights' own rule; the director must not break it or reach around it.
- id: laps
  kind: step
  label: A crossing on red is a counted false start; green starts lap 1, and every crossing after it finishes a lap
  why: Laps are timed from the same moment for every round.
- id: round
  kind: step
  label: Three laps show FINISH with the time, 120 seconds without that shows TIME UP; R and P act only between rounds
  why: A second round must play like the first, in either mode.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ trial director hands every round its line and its log
  pieces:
    - { id: director, kind: class, label: "ADojoP14TrialDirector with a text label, the champion, the driver's name, the line and lights spots, and numbers for the laps per round and the round length in Details", covers: [director] }
    - { id: logs, kind: data, label: "Two UDojoP14LapLog UPROPERTY pointers made with NewObject in BeginPlay, before round 1, and never replaced", covers: [logs] }
    - { id: line, kind: step, label: "StartRound destroys the old ADojoP14FinishLine, spawns a new one at LineSpot with SpawnActor, and calls UseLog with the practice or the ranked log", covers: [line] }
    - { id: lights, kind: step, label: "FindOrSpawnLights walks TActorIterator over GetWorld() for lights whose IsRunning is true, and spawns one set at LightsSpot only when it finds none; the result is kept for later rounds", covers: [lights] }
    - { id: laps, kind: step, label: "Tick sees IsGreen once and calls CrossLine at that time to start lap 1, then compares the champion's X with the line's X each frame: before green a crossing adds a false start, after green it calls CrossLine and counts a lap", covers: [laps] }
    - { id: round, kind: step, label: "BeginPlay starts round 1 with SetTimerForNextTick, so placed lights have begun play; a non-looping 120 second timer set in StartRound ends the round as TIME UP, the third lap ends it as FINISH with the time since green, and R and P return early while a round runs", covers: [round] }
  edges:
    - { from: logs, to: line, label: "the mode picks which log the new line gets" }
    - { from: lights, to: laps, label: "green starts lap 1" }
    - { from: line, to: laps, label: "every lap is timed by the line" }
    - { from: laps, to: round, label: "the third lap ends the round" }
    - { from: director, to: round, label: "start and end" }
    - { from: director, to: logs, label: "owns both for the session" }
- id: blueprint-director
  title: A Blueprint trial director wires the pieces through their Blueprint API
  pieces:
    - { id: director, kind: class, label: "BP_TrialDirector actor with a Text Render component and variables for the champion, the driver's name, the spots, the laps per round, the round length, a Practice flag, and a Running flag", covers: [director] }
    - { id: logs, kind: data, label: "Two Dojo P14 Lap Log variables set with Construct Object from Class on Begin Play, before round 1", covers: [logs] }
    - { id: line, kind: step, label: "A Start Round function destroys the old line, spawns a Dojo P14 Finish Line with Spawn Actor from Class, and calls Use Log with a Select node on the Practice flag", covers: [line] }
    - { id: lights, kind: step, label: "Get All Actors Of Class for Dojo P14 Start Lights, a loop that keeps the first whose Is Running is true, and a Spawn Actor only when none is found, stored in a Lights variable", covers: [lights] }
    - { id: laps, kind: step, label: "Event Tick checks Is Green once to call Cross Line at the green time, then compares the champion's X with the line's X: a Branch on a Racing flag adds a false start or calls Cross Line and adds a lap", covers: [laps] }
    - { id: round, kind: step, label: "Begin Play starts round 1 after a Delay of 0 so placed lights have begun play; a 120 second Set Timer by Event shows TIME UP, the third lap shows FINISH with the time since green, and the R and P events, enabled with Enable Input on the player controller in Begin Play, sit behind a Branch on Running", covers: [round] }
  edges:
    - { from: logs, to: line, label: "the mode picks which log the new line gets" }
    - { from: lights, to: laps, label: "green starts lap 1" }
    - { from: line, to: laps, label: "every lap is timed by the line" }
    - { from: laps, to: round, label: "the third lap ends the round" }
    - { from: director, to: round, label: "start and end" }
    - { from: director, to: logs, label: "owns both for the session" }
```

# Integration Rubric

- The lap log, finish line, and start lights pieces are reused unchanged and know nothing about the director, and the director reaches none of them through anything static or global.
- Both logs are made once when play begins and kept for the whole session; each round writes into exactly the log of its mode, and practice laps never reach the ranked log or the label's best ranked lap.
- Every round has a fresh finish line handed its log, so no lap of the last round is still being timed.
- The director counts down on the lights already running on the track, places one set only when none runs, and keeps using that set.
- A crossing on red is a counted false start that times nothing; green starts lap 1 and each later crossing finishes a lap.
- Three laps show FINISH with the seconds since green and the best ranked lap; 120 seconds without that shows TIME UP and keeps the finished laps.
- Round 1 starts ranked on the first frame of play; R starts later rounds and P switches the mode only between rounds, and a new round zeroes the laps and false starts without clearing either log.
- The submission says who owns each log and why nothing in the time trial is static, and gives the tuned track with the lap time it aimed for.
