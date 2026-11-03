---
id: p23-boss-arena-night
title: "Boss: the arena night"
order: 3
kind: boss
difficulty: 4
patterns: [component, observer, event-queue]
skills: [planning, component, observer, event-queue]
terms: [register-component, findcomponentbyclass, dynamic-multicast-delegate, multicast-delegate, spawnactor, timer-manager]
prerequisites: [p23-breakdown-fair-stalls, p9-arena-parts, p6-knockout-herald]
xp: 340
estimatedMinutes: 80
concepts:
  - Fighters assembled from health and loot parts, with no class for each kind of fighter
  - A loot part that listens to a health part, and a director that listens to the loot part
  - Knockouts posted to a herald with copies of what they need and heard together at the end of the frame
  - A director that orders the blows and the nights and owns no damage, loot, or announcement rule
pieces:
  - p9-arena-parts
  - p6-knockout-herald
---

# Spec

The director runs an arena night. Four fighters on two teams fight a scripted night of six turns, one turn each second, and the night ends half a second after the last turn, at 6.5 seconds. The earlier quests supply every rule: a fighter actor that can be knocked out and posts that to a herald, a health part that takes damage and says once when it runs out, a loot part that drops its item once when the health part it listens to runs out, and a herald that announces the posted knockouts together at the end of the frame.

The designer sets the night up in Details. The roster lists each fighter's name, team, starting health, loot item and count, and where it stands. In the reference night Ash (team 1, 40 health, one Bandage), Birch (team 1, 30, two Coin), Cedar (team 2, 30, three Coin), and Dune (team 2, 50, two Bandage) fight. The script lists blows: on which turn, who strikes, who is struck, and for how much. Every night begins by clearing the last one and building each fighter again from the roster: the fighter actor with a health part and a loot part, set from its plan, the loot part listening to the health part and the director listening to the loot part.

On its turn a blow does nothing if the striker or the target is already out of the arena. Otherwise it goes through the health part. When the health part says it has run out, the director sends the target out of the arena, naming the striker as the winner. The blows of one turn land in the order the script lists them.

Knockouts are posted to the herald and are heard only when the herald announces them, at the end of the frame, so two fighters who go down in one turn are announced together, in the order they fell. The director credits a knockout to the winner's team when it hears the announcement, and adds a fighter's loot to the purse when the loot part reports the drop. The label reads `Night N  Team 1: A  Team 2: B  Standing S`, and when the night ends it adds two spaces and the result: `TEAM 1 WINS`, `TEAM 2 WINS`, or `DRAW` when the teams have the same number of knockouts. R starts the next night only after one has ended. A C++ director receives keys only after `EnableInput` with the player controller.

The fighters and the parts know nothing about the director. The director never works out damage, never decides whether loot drops, and never writes an announcement: it calls the parts, it listens, and it keeps the score. It never touches a part's stored values. Reference game: a platform brawler, where an announcer calls out each knockout once the scuffle in a moment has settled and the fallen leave a drop behind.

Compiles against earlier quests: p9-arena-parts (`Quests/p9-arena-parts/DojoP9HealthComponent.h`, `Quests/p9-arena-parts/DojoP9LootComponent.h`) and p6-knockout-herald (`Quests/p6-knockout-herald/DojoP6ArenaHerald.h`, `Quests/p6-knockout-herald/DojoP6Fighter.h`).

Core numbers are fixed: six turns of one second, a night of 6.5 seconds, a blow that lands only between standing fighters, and a result decided by the knockouts credited to each team.

Extensions, in order of importance:

1. A bounty on the first knockout of each night: a second Coin drop for the team that scores it, added through the loot part's own drop and not by changing the purse.
2. A third team, with a result that names the single team ahead and calls a tie for the lead a draw.
3. A label line that shows the last announcement.

Feel: tune the damage of the blows so that a turn in which two fighters are struck is a close one, and the order the script lists the blows in decides which of them falls first.

# Required Pieces

```yaml
- id: director
  kind: class
  label: A director that builds the fighters, plays the script turn by turn, and keeps the score, the purse, and the log, deciding no damage, loot, or announcement
  why: One owner of the night; the rules belong to the parts and the herald.
- id: plans
  kind: data
  label: The roster of fighters and the script of blows as data a designer edits in Details
  why: A new fighter or a new night is data, so no code changes for it.
- id: fighters
  kind: component
  label: Each fighter is the earlier fighter actor with a health part and a loot part made from its plan, with the loot part listening to the health part
  why: Parts are mixed by plan, so there is no class for each kind of fighter.
- id: blow
  kind: step
  label: A blow checks that the striker and the target are still standing, goes through the target's health part, and sends the target out only when the health part says it ran out
  why: The director never decides that a fighter is down; it only asks the part.
- id: loot
  kind: event
  label: The loot part reports its drop, and the director adds it to the purse
  why: Loot is worked out once, by the loot part, and the director only keeps the total.
- id: knockout
  kind: event
  label: A knockout is posted to the herald as a copy of the names and the team, and is heard when the herald announces it at the end of the frame
  why: Knockouts in one frame are heard together after the blows, and still make sense once the fighter has gone.
- id: score
  kind: step
  label: The winner's team is credited when the announcement is heard, not when the blow lands
  why: The score follows the same moment as the board the crowd sees.
- id: night
  kind: step
  label: Six turns of one second, a night of 6.5 seconds, R only between nights, and a reset that clears the last night and builds every fighter again
  why: A second night must play like the first.
- id: result
  kind: step
  label: TEAM 1 WINS, TEAM 2 WINS, or DRAW from the credited knockouts, shown on the label
  why: The night needs an outcome that the knockouts decide.
```

# Reference Plans

```yaml
- id: cpp-night
  title: A C++ director that owns a herald and a map of fighters
  pieces:
    - { id: director, kind: class, label: "ADojoP23ArenaNight with a text label as its root, a TObjectPtr to the herald, a TMap of fighters by name, and the turn length and count in Details", covers: [director] }
    - { id: plans, kind: data, label: "Two USTRUCTs, a fighter plan and a scripted strike, held in TArrays on the director and copied at the start of each night", covers: [plans] }
    - { id: fighters, kind: component, label: "BuildFighter uses SpawnActorDeferred for the fighter actor, sets its name, team, and herald, then adds a health component and a loot component with NewObject, AddInstanceComponent, and RegisterComponent, and calls ListenTo", covers: [fighters] }
    - { id: blow, kind: step, label: "ApplyStrike looks both fighters up by name, calls ApplyDamage on the health component, and calls KnockOut on the target only when IsDepleted is true", covers: [blow] }
    - { id: loot, kind: event, label: "The director binds a UFUNCTION to each loot component's OnLootDropped and adds the item and count to a TMap purse", covers: [loot] }
    - { id: knockout, kind: event, label: "KnockOut posts to the herald, and the director binds a native delegate to the herald's OnKnockoutAnnounced and logs each announcement with the world time", covers: [knockout] }
    - { id: score, kind: step, label: "The announcement handler looks the winner up in the roster copy made at the start of the night and adds one to that team's count", covers: [score] }
    - { id: night, kind: step, label: "A looping turn timer with the turn length as its first delay and a non-looping night timer of the turn count plus a half turn; PressNextRound calls StartRound only while stopped, and StartRound destroys the old fighters first", covers: [night] }
    - { id: result, kind: step, label: "EndRound compares the two teams' counts and sets the result string", covers: [result] }
  edges:
    - { from: plans, to: fighters, label: "each plan builds one fighter" }
    - { from: fighters, to: loot, label: "the loot part reports its drop" }
    - { from: blow, to: knockout, label: "a depleted target is sent out and posted" }
    - { from: knockout, to: score, label: "heard at the end of the frame" }
    - { from: score, to: result, label: "the counts decide" }
    - { from: director, to: night, label: "start and end" }
- id: cpp-ledger
  title: A C++ director that ticks the turns itself and keeps a ledger
  pieces:
    - { id: director, kind: class, label: "ADojoP23ArenaNight with tick enabled, a text label as its root, a TObjectPtr to the herald, a TMap of fighters by name, and a ledger struct for the score, the purse, and the log", covers: [director] }
    - { id: plans, kind: data, label: "Two USTRUCTs, a fighter plan and a scripted strike, in TArrays on the director, copied into the night's roster at the start", covers: [plans] }
    - { id: fighters, kind: component, label: "BuildFighter spawns the fighter actor deferred, sets its name, team, and herald, then adds a health component and a loot component with NewObject, AddInstanceComponent, and RegisterComponent, and calls ListenTo", covers: [fighters] }
    - { id: blow, kind: step, label: "ApplyStrike looks both fighters up by name, calls ApplyDamage on the health component, and calls KnockOut on the target only when IsDepleted is true", covers: [blow] }
    - { id: loot, kind: event, label: "AddDynamic binds a UFUNCTION on the director to each loot component's OnLootDropped, which adds the item and count to the ledger's purse", covers: [loot] }
    - { id: knockout, kind: event, label: "AddUObject binds a handler to the herald's native OnKnockoutAnnounced, which appends the fallen name, the winner name, and the world time to the ledger's log", covers: [knockout] }
    - { id: score, kind: step, label: "The same handler looks the winner up in the roster copy and adds one to that team's count in the ledger", covers: [score] }
    - { id: night, kind: step, label: "Tick adds DeltaSeconds to an accumulator and plays a turn each time it holds a whole turn, and the night ends when the accumulator passes the turn count plus a half turn; PressNextRound starts a night only while stopped, and a new night clears the ledger and the fighters", covers: [night] }
    - { id: result, kind: step, label: "EndRound compares the two teams' counts in the ledger and sets the result string", covers: [result] }
  edges:
    - { from: plans, to: fighters, label: "each plan builds one fighter" }
    - { from: fighters, to: loot, label: "the loot part reports its drop" }
    - { from: blow, to: knockout, label: "a depleted target is sent out and posted" }
    - { from: knockout, to: score, label: "heard at the end of the frame" }
    - { from: score, to: result, label: "the counts decide" }
    - { from: director, to: night, label: "start and end" }
```

# Integration Rubric

- The health part, the loot part, the fighter, and the herald are reused unchanged, and the director never works out damage, decides that loot drops, or writes an announcement: it calls the parts, listens to them, and keeps the score.
- Each fighter is built from its plan as the fighter actor with a health part and a loot part set from the plan, with the loot part listening to the health part, and no class is made for any kind of fighter.
- A blow does nothing when its striker or its target is out of the arena, and otherwise goes through the health part; the director sends the target out only when the health part reports that it ran out.
- A fighter's loot is added to the purse once, from the loot part's own report, and sending the fighter out does not cut the drop short.
- A knockout is posted to the herald and heard only when the herald announces it at the end of the frame, so the knockouts of one turn are heard together, in the order they fell, and each carries copies that still make sense after the fighter is gone.
- The winner's team is credited when the announcement is heard, using the roster copy made at the start of the night, and the label and result follow the counts as specified.
- R starts a night only between nights, and a new night clears the score, the purse, and the log and builds every fighter again at full health from the current roster and script.
- The submission says what the director calls, what it listens to, and what it keeps, why it sends the target out after the damage call and not from the health part's report, and gives the tuned damage with the feel it produced.
