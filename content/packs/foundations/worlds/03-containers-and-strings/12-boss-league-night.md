---
id: f3-boss-league-night
title: "Boss: league night"
order: 12
kind: boss
difficulty: 4
patterns: []
skills: [planning, containers, strings, math]
terms: [tarray, tmap, fname, ftext, fvector, frotator]
prerequisites: [f3-score-board, f3-roster, f3-announcer, f3-sentry, f3-league-table, f2-target-rack, f1-popup-target]
xp: 320
estimatedMinutes: 75
concepts:
  - Results flow from one turn into three containers with three different jobs
  - Strings for keys, for logs, and for players, each in its place
pieces:
  - f3-score-board
  - f3-roster
  - f3-announcer
  - f3-sentry
---

# Spec

The yard hosts a league night. Three players, Ana, Bo, and Cy, take turns in that order, two turns each, so a league is six turns. A turn lasts 15 seconds. During a turn the target rack from World 2 lends one of its 3 targets every 2 seconds, raised, starting the moment the turn begins. The sentry from this world always aims at the nearest raised lent target. Pressing Space hits the target the sentry aims at; every hit that counts scores 10 points. A hit that does not break the target drops it, and the league raises it again at once; a broken target (2 hits) goes straight back to the rack. A lent target nobody breaks goes back after 4 seconds. Space with nothing aimed does nothing.

When a turn ends, every lent target goes back to the rack. The turn's score is added to the score board (which keeps the last five turns), recorded on the roster under the player's name (which keeps each player's best turn), and announced: "Ana scored 40 (best 60)". A 3 second break follows, during which keys do nothing and the announcement stays up. After the sixth turn's break, the announcer names the roster's leader: "Ana leads with 60", ties going to the name that sorts first. Reference game: the bowling in Wii Sports, where players take turns and the board between turns carries the drama.

How leagues start: the first league starts when play begins, and R starts a new league, only after the last one has ended; Space only works during a turn. Starting a league clears the board and the roster first. A C++ director receives keys only after `EnableInput` with the player controller.

The pieces need two additions, and their rules stay as they are: the roster and the score board each gain `Clear`, which empties them (the board also refreshes its label). The director hands each lent target to the sentry's target list and takes it away again when the target goes back, so the sentry never aims at a target that is resting in the rack.

Compiles against earlier quests: f3-score-board (`Quests/f3-score-board/DojoF3ScoreBoard.h`), f3-roster (`Quests/f3-roster/DojoF3Roster.h`), f3-announcer (`Quests/f3-announcer/DojoF3Announcer.h`), f3-sentry (`Quests/f3-sentry/DojoF3Sentry.h`), f2-target-rack (`Quests/f2-target-rack/DojoF2TargetRack.h`), and f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`).

Core numbers are fixed: 3 players, 2 turns each, 15 second turns, a 3 second break, a lend every 2 seconds, 4 seconds per unbroken target, 2 hits to break, 10 points per hit, a rack of 3, a board of 5.

Extensions, in order of importance:

1. A catch-up rule: a player's turn lasts 2 seconds longer for every 50 points their best trails the leader's, read from the roster when the turn starts.
2. A top three shown on the board, sorted by best turn, built from the roster into a sorted array of a small USTRUCT.
3. The announcer's formats translated into a second culture, switched at the start of each league.

Feel: tune the lend interval until a strong turn can swing the lead but a single lucky turn cannot end the league on its own.

# Required Pieces

```yaml
- id: league-driver
  kind: class
  label: A director that runs the turn order, the turn clock, and the breaks
  why: One owner decides whose turn it is and when the league ends.
- id: turn-order
  kind: data
  label: Player names in order and turns per player as editable data
  why: The league's shape is a designer's choice, kept as FNames that also key the roster.
- id: lend-rhythm
  kind: step
  label: Lend a raised target every 2 seconds, give it to the sentry, and take it back when broken or after 4 seconds
  why: The turn's pressure, and the only way targets reach the sentry.
- id: aim-and-shoot
  kind: step
  label: Space hits whatever the sentry aims at, raising an unbroken target again
  why: The player's verb, routed through the piece that does the math.
- id: turn-results
  kind: step
  label: At turn end, return every target, add the score to the board, record it on the roster, and announce it
  why: Three containers with three jobs, fed from one number.
- id: league-end
  kind: step
  label: After the last break, announce the roster's leader
  why: The payoff of the night, computed from the roster rather than tracked twice.
- id: restart
  kind: step
  label: R starts a new league between leagues, clearing the board and the roster first
  why: A second league must start like the first, and nothing pressed between leagues may count.
- id: tunables
  kind: data
  label: Turn length, break, lend interval, lend time, and points as editable values
  why: The feel criterion is met by tuning, not by rebuilding.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ league director owns the night
  pieces:
    - { id: director, kind: class, label: ADojoF3LeagueDirector with StartLeague called from BeginPlay and timers for the turn and the break and flags for league and turn running, covers: [league-driver, tunables] }
    - { id: players, kind: data, label: An editable TArray of FName players and an editable TurnsPerPlayer on the director, covers: [turn-order] }
    - { id: lend, kind: step, label: A looping lend timer calls Deploy on the rack and adds the target to a map of lend times and to the sentry's Targets and a 0.1 second check returns any target out for 4 seconds, covers: [lend-rhythm] }
    - { id: shoot, kind: step, label: ShootAimed calls AimAtNearestRaised on the sentry and Hit on the result and adds 10 for a hit that counts and Raise again unless the target broke in which case it is returned, covers: [aim-and-shoot] }
    - { id: results, kind: step, label: EndTurn returns every lent target and calls AddScore on the board and RecordScore on the roster and AnnounceTurn with the roster best and starts the break timer, covers: [turn-results] }
    - { id: finale, kind: step, label: When the last break ends the director clears its league flag and calls AnnounceLeader with GetLeader and that player's best, covers: [league-end] }
    - { id: keys, kind: step, label: EnableInput in BeginPlay binds Space to ShootAimed which acts only during a turn and R to RestartLeague which acts only between leagues and calls Clear on the board and the roster, covers: [restart] }
  edges:
    - { from: director, to: lend, label: runs it during turns }
    - { from: lend, to: shoot, label: lent targets become aimable }
    - { from: director, to: results, label: at turn end }
    - { from: results, to: finale, label: after the last turn }
    - { from: keys, to: shoot, label: Space }
    - { from: keys, to: director, label: R starts a new league }
    - { from: players, to: director, label: whose turn it is }
- id: blueprint-director
  title: The level Blueprint drives the night through the C++ pieces
  pieces:
    - { id: level, kind: class, label: Level Blueprint with a Start League event from Event BeginPlay and turn and break timers by event and variables for every number, covers: [league-driver, tunables] }
    - { id: players, kind: data, label: An instance editable array of Name variables for the players and a turns per player integer, covers: [turn-order] }
    - { id: lend, kind: step, label: A looping Set Timer by Event calls Deploy and adds the target to a map of lend times and to the sentry's Targets and a short looping check calls Recall on any target out for 4 seconds and removes it from both, covers: [lend-rhythm] }
    - { id: shoot, kind: step, label: The Space event behind a branch on Turn Running calls AimAtNearestRaised and Hit and adds 10 when it returns true and calls Raise or Recall depending on the target's state, covers: [aim-and-shoot] }
    - { id: results, kind: step, label: The turn timer's event recalls every lent target and calls AddScore and RecordScore and AnnounceTurn and starts the break timer, covers: [turn-results] }
    - { id: finale, kind: step, label: The break timer's event starts the next turn or after the last one calls AnnounceLeader with GetLeader, covers: [league-end] }
    - { id: keys, kind: step, label: The R event behind a branch on League Running being false calls Clear on the board and the roster and then Start League, covers: [restart] }
  edges:
    - { from: level, to: lend, label: runs it during turns }
    - { from: lend, to: shoot, label: lent targets become aimable }
    - { from: level, to: results, label: at turn end }
    - { from: results, to: finale, label: after the last turn }
    - { from: keys, to: level, label: R starts a new league }
    - { from: players, to: level, label: whose turn it is }
```

# Integration Rubric

- The score board, roster, announcer, and sentry are reused; the only additions are Clear on the board and the roster, with no rewrite of their rules.
- Player names are FNames from one editable list, used both for turn order and as roster keys.
- The sentry only ever aims at lent targets: each one is added to its list when lent and removed when it goes back.
- Every target goes back to the rack when broken, after 4 seconds unbroken, and at the end of every turn.
- Each turn's score is added to the board, recorded on the roster, and announced through the announcer's formats, never with a hand-built string.
- The leader comes from the roster at the end of the league, not from a second running tally.
- The first league starts with play, R starts later ones only between leagues and clears the board and the roster first, and Space does nothing outside a turn.
- The tuned lend interval is written in the submission with one sentence on why it felt fair.
