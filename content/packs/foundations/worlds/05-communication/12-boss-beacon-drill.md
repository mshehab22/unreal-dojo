---
id: f5-boss-beacon-drill
title: "Boss: the beacon drill"
order: 12
kind: boss
difficulty: 4
patterns: [observer]
skills: [planning, communication, time]
terms: [dynamic-multicast-delegate, adddynamic, uinterface, timer-manager, tick, deltatime]
prerequisites: [f5-lever, f5-interact, f5-cooldown, f5-follower, f5-quest-tracker]
xp: 320
estimatedMinutes: 75
concepts:
  - One round that needs every channel of this world, each for its own job
  - Comparing states on a shared event when the event does not say who sent it
pieces:
  - f5-lever
  - f5-interact
  - f5-cooldown
  - f5-follower
---

# Spec

The yard runs a beacon drill. Three levers stand in a row; levers 0 and 1 are 300 units apart and lever 2 stands farther off. The keeper is a prodder from this world that rides on the player's pawn: when play begins the director attaches it to the player's pawn (or to a Follow Target a designer picks), so walking the pawn walks the keeper.

Pressing E lights the lever nearest the keeper within 200 units, through the interactable interface; if two are equally near, the lower-numbered lever wins. A lit lever stays lit for 6 seconds and then goes dark by itself. A lever that goes dark, for any reason, cools down for 4 seconds, during which E cannot relight it. When all three levers are lit at the same moment, the alarm rings: the count goes up, the label shows ALARM and the count, and every lever goes dark at once (and so cools down). A drone follows the most recently lit lever, gliding at its own speed. Three alarms within 60 seconds win: the label shows WIN and the time to one decimal. If the 60 seconds run out first, the label shows TIME UP. Reference game: the torch rooms of Zelda's dungeons, where every torch must burn at once before the first one goes out.

How rounds start: round 1 starts when play begins, and R starts the next round, only after one has ended; E does nothing outside a round. Starting a round puts every lever out without starting a cooldown, cancels any running cooldown, applies the 4 second cooldown to every lever, stops the drone, and zeroes the alarms. A C++ director receives keys only after `EnableInput` with the player controller.

The levers' pull event carries only the new position, not which lever was pulled. So the director listens to every lever's event and, on each one, compares every lever with the position it last saw: a lever newly lit records when it lit and becomes the drone's target; a lever newly dark starts its cooldown. The pieces need two additions, and their rules stay as they are: the lever implements the interactable interface, lighting itself if it is dark and its own cooldown is ready; and the cooldown gains `Cancel`, which stops a running cooldown without broadcasting, for a clean round start.

Compiles against earlier quests: f5-lever (`Quests/f5-lever/DojoF5Lever.h`), f5-interact (`Quests/f5-interact/DojoF5Interactable.h`, `Quests/f5-interact/DojoF5Prodder.h`), f5-cooldown (`Quests/f5-cooldown/DojoF5CooldownComponent.h`), and f5-follower (`Quests/f5-follower/DojoF5Follower.h`).

Core numbers are fixed: 3 levers, 200 to interact, 6 seconds lit, 4 seconds of cooldown, 3 alarms to win, a 60 second round.

Extensions, in order of importance:

1. A fourth lever that only lights while the drone hovers within 100 units of it.
2. A wind gust every 15 seconds that puts out the lever lit longest.
3. The best win time kept on the World 3 score board.

Feel: tune the lit time until lighting the third lever feels like a scramble you can just make, not a stroll and not a wall.

# Required Pieces

```yaml
- id: drill-driver
  kind: class
  label: A director that runs the round, listens to the levers, and keeps the alarm count
  why: One owner of the rules; no lever knows the drill exists.
- id: keeper-hands
  kind: step
  label: The keeper rides on the player's pawn and E lights the nearest lever in range through the interface, lower lever on a tie
  why: The player's one verb, sent as an interface call so the keeper never knows the lever's class.
- id: lever-news
  kind: event
  label: Every lever's pull event reaches the director, which compares each lever with its last known position
  why: The event does not say who pulled, so the director works it out from the levers' states.
- id: lit-timeout
  kind: step
  label: A lit lever goes dark after 6 seconds
  why: The pressure of the drill, run on a timer and not on Tick.
- id: cooldown
  kind: step
  label: A lever that goes dark cools down for 4 seconds before E can relight it
  why: Stops the player relighting the same lever in place.
- id: alarm
  kind: step
  label: All three lit at once rings the alarm and puts every lever out
  why: The drill's goal, counted toward the win.
- id: drone
  kind: step
  label: The drone follows the newest lit lever at its own speed
  why: The one piece that truly moves every frame.
- id: round
  kind: step
  label: Three alarms in 60 seconds win; R starts a clean round only between rounds
  why: A second round must play like the first.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ beacon director listens to every lever
  pieces:
    - { id: director, kind: class, label: ADojoF5BeaconDirector with the levers and keeper and drone set in Details and numbers for range and lit time and cooldown and alarms and round length, covers: [drill-driver] }
    - { id: hands, kind: step, label: BeginPlay attaches the keeper to the player's pawn with AttachToActor and PressInteract finds the nearest lever within range keeping the lower index on a tie and calls Prod on the keeper, covers: [keeper-hands] }
    - { id: news, kind: event, label: BeginPlay binds one UFUNCTION handler to every lever's OnPulled with AddDynamic and EndPlay unbinds it and the handler compares each lever's IsOn with a remembered array, covers: [lever-news] }
    - { id: timeout, kind: step, label: A 0.1 second looping check timer pulls any lever lit for 6 seconds or longer, covers: [lit-timeout] }
    - { id: cool, kind: step, label: The handler calls TryStart on the cooldown component of every lever it sees go dark and the lever's interface implementation refuses while it is cooling, covers: [cooldown] }
    - { id: alarm, kind: step, label: When the comparison finds every lever on it counts the alarm and pulls every lever off and ends the round on the third, covers: [alarm] }
    - { id: drone, kind: step, label: A lever newly lit is passed to Follow on the drone which moves in its own Tick scaled by DeltaSeconds, covers: [drone] }
    - { id: round, kind: step, label: A non-looping 60 second timer ends the round as TIME UP and R calls StartRound only between rounds which puts levers out while the round is stopped so the handler starts no cooldown and then cancels cooldowns, covers: [round] }
  edges:
    - { from: hands, to: news, label: a lit lever broadcasts }
    - { from: news, to: cool, label: newly dark levers }
    - { from: news, to: drone, label: newly lit levers }
    - { from: news, to: alarm, label: all on }
    - { from: timeout, to: news, label: its pulls broadcast too }
    - { from: director, to: round, label: start and end }
- id: blueprint-director
  title: The level Blueprint listens to the levers through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint with variables for every number and an array of the levers and a Running variable, covers: [drill-driver] }
    - { id: hands, kind: step, label: Event BeginPlay attaches the keeper to Get Player Pawn and the E event finds the nearest lever within range keeping the first on a tie and calls Prod, covers: [keeper-hands] }
    - { id: news, kind: event, label: Event BeginPlay binds a custom event to each lever's On Pulled and the event compares each lever's Is On with a Boolean array of last positions, covers: [lever-news] }
    - { id: timeout, kind: step, label: A 0.1 second looping Set Timer by Event pulls any lever whose recorded lit time is 6 seconds old, covers: [lit-timeout] }
    - { id: cool, kind: step, label: Each lever's cooldown component has Cooldown Seconds set to 4 in Details since Blueprint can only read it and the compare event calls Try Start on each newly dark lever's cooldown component, covers: [cooldown] }
    - { id: alarm, kind: step, label: When all are on the compare event adds to the alarm count and pulls every lever and on the third shows the win on a Text Render actor, covers: [alarm] }
    - { id: drone, kind: step, label: The compare event calls Follow on the drone with each newly lit lever, covers: [drone] }
    - { id: round, kind: step, label: A non-looping 60 second Set Timer by Event shows TIME UP and the R event behind a branch on Running being false pulls lit levers off before setting Running so the compare event ignores them and calls Cancel on each cooldown and calls Follow with nothing on the drone and sets the alarm count to 0, covers: [round] }
  edges:
    - { from: hands, to: news, label: a lit lever broadcasts }
    - { from: news, to: cool, label: newly dark levers }
    - { from: news, to: drone, label: newly lit levers }
    - { from: news, to: alarm, label: all on }
    - { from: timeout, to: news, label: its pulls broadcast too }
    - { from: level, to: round, label: start and end }
```

# Integration Rubric

- The lever, interface, cooldown, and follower are reused; the only additions are the lever implementing the interface and the cooldown's Cancel.
- No lever knows the director: the director binds to every lever's event in BeginPlay and unbinds in EndPlay, and works out what changed by comparing states.
- E lights only the nearest lever within 200 through the interface, the lower lever on a tie, and never a cooling lever.
- A lit lever goes dark after 6 seconds, and any lever going dark cools down for 4, both on timers.
- All three lit at once rings the alarm and puts every lever out; three alarms within 60 seconds win, otherwise the round shows TIME UP.
- The drone follows the newest lit lever and moves in Tick scaled by DeltaSeconds; nothing else ticks.
- Round 1 starts with play, R starts later rounds only between rounds, and a round start puts levers out without cooldowns, so round 2 plays like round 1.
- The submission names the channel for each link (delegate, interface, timer, Tick, or direct call) with one reason each, and gives the tuned lit time with why it felt fair.
