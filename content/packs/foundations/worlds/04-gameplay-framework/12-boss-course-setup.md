---
id: f4-boss-course-setup
title: "Boss: course setup"
order: 12
kind: boss
difficulty: 4
patterns: [component]
skills: [planning, framework, components]
terms: [actor-component, scene-component, attach-to-component, world-subsystem, on-construction, beginplay]
prerequisites: [f4-hit-counter, f4-carrier, f4-registry, f4-fence, f4-respawn-loop, f1-training-dummy]
xp: 320
estimatedMinutes: 75
concepts:
  - A round built from components, a subsystem, and a constructed layout, with no piece knowing the round exists
  - Making every tie and reset deterministic so round 2 plays like round 1
pieces:
  - f4-hit-counter
  - f4-carrier
  - f4-registry
  - f4-fence
---

# Spec

The yard must be set up before practice, against the clock. A fence lays out 4 posts, 300 apart. Six training dummies stand loose around the yard; each carries a hit counter (down after 3 hits) and a registry entry. The keeper, a carrier from this world, rides with the player: when play begins the director attaches it to the player's pawn (or to a Follow Target actor a designer picks), snapped on, so walking the default pawn walks the keeper. The world's own attachment lesson does the moving; the carrier needs no movement code.

Setting up: pressing E with empty hands picks up the nearest loose dummy within 250 units of the keeper; if two are equally near, the one that registered first is picked. Pressing E while carrying drops the dummy. If a free post is within 200 units of the keeper, the dummy is placed on that post (moved onto it exactly) and stops being loose; if two free posts are equally near, the lower-numbered post wins. Otherwise the dummy is dropped where it is and stays loose. A post holds one dummy.

Testing: once all 4 posts hold a dummy, pressing T strikes the placed dummy nearest the keeper within 200 units, adding a hit to its counter. Before all 4 posts are filled, T does nothing. When every placed dummy is down, the round ends: the clock stops and the director's label reads READY, the time to one decimal, and UNDER PAR or OVER PAR against a par of 60 seconds. Reference game: Moving Out, where carrying things to the right spots against a timer is the whole job.

How rounds start: round 1 starts when play begins, and R starts the next round, only after a round has ended; E and T do nothing outside a round. Starting a round puts every dummy back where it stood when play began, clears every counter, frees every post, and registers the dummies in the designer's order, so ties break the same way every round. The label shows the par while a round runs.

The point of the boss is that no piece knows the round exists: the counters count, the registry lists loose dummies, the carrier carries, the fence lays out posts, and only the director ties them together. The pieces need no additions; the registry's Register and Unregister are enough to keep only loose dummies listed (placing a dummy unregisters it). A C++ director receives keys only after `EnableInput` with the player controller.

Compiles against earlier quests: f4-hit-counter (`Quests/f4-hit-counter/DojoF4HitCounterComponent.h`), f4-carrier (`Quests/f4-carrier/DojoF4Carrier.h`), f4-registry (`Quests/f4-registry/DojoF4TargetRegistry.h`), f4-fence (`Quests/f4-fence/DojoF4Fence.h`), and f1-training-dummy, in the tests only (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`).

Core numbers are fixed: 4 posts 300 apart, 6 dummies, 3 hits to down, 250 to pick up, 200 to place, 200 to test, a 60 second par.

Extensions, in order of importance:

1. A second keeper for a co-op round, each with its own carrier, sharing the same registry and posts.
2. A harder course with 5 posts, set on the fence before the round starts, with the par scaled by post count.
3. The best time kept on the World 3 score board across rounds.

Feel: tune the pickup range until a missed pickup feels like your own positioning, not the game being fussy.

# Required Pieces

```yaml
- id: course-driver
  kind: class
  label: A director that runs the round, the clock, and the result
  why: One owner ties the pieces together; none of them knows the round exists.
- id: pickup
  kind: step
  label: E picks up the nearest loose dummy in range, first registered on a tie
  why: The keeper's first verb, served by the registry's lookup.
- id: place
  kind: step
  label: E while carrying drops, placing the dummy on the nearest free post in range, lower post on a tie
  why: The keeper's second verb, and where posts and dummies meet.
- id: loose-list
  kind: step
  label: Keep only loose dummies in the registry by unregistering placed ones
  why: Pickup must never find a dummy that is already on a post.
- id: test-strikes
  kind: step
  label: T strikes the nearest placed dummy in range, only once every post is filled
  why: The second phase, counted by the hit counters.
- id: finish
  kind: step
  label: When every placed dummy is down, stop the clock and show the time against par
  why: The result of the round.
- id: reset
  kind: step
  label: R between rounds restores starting places, clears counters and posts, and re-registers in a fixed order
  why: A second round must play exactly like the first, ties included.
- id: tunables
  kind: data
  label: Ranges and par as editable values, post count and spacing on the fence
  why: The feel criterion is met by tuning.
```

# Reference Plans

```yaml
- id: cpp-director
  title: A C++ course director ties the pieces together
  pieces:
    - { id: director, kind: class, label: ADojoF4CourseDirector with references to the keeper and the fence and a list of dummies set in Details and a running flag and a start time and a BeginPlay that records each dummy's starting location and attaches the keeper to the player's pawn with AttachToActor, covers: [course-driver, tunables] }
    - { id: pickup, kind: step, label: PressInteract with empty hands calls FindNearest on the registry from the keeper within PickupRange and Carry on the keeper, covers: [pickup] }
    - { id: place, kind: step, label: PressInteract while carrying calls Drop and then looks for the nearest free post with GetPostLocation keeping the lower index on a tie and moves the dummy onto it, covers: [place] }
    - { id: loose, kind: step, label: A placed dummy is passed to Unregister on the registry, covers: [loose-list] }
    - { id: strikes, kind: step, label: PressTest returns until every post is filled and then calls RegisterHit on the nearest placed dummy's counter found with FindComponentByClass, covers: [test-strikes] }
    - { id: finish, kind: step, label: After each strike the director checks IsDown on every placed counter and stops the clock and writes READY with the time and the par verdict on its label, covers: [finish] }
    - { id: reset, kind: step, label: StartRound runs from BeginPlay and from R between rounds and drops any cargo and unregisters all dummies and then moves each back and calls ResetHits and Register in list order, covers: [reset] }
  edges:
    - { from: director, to: pickup, label: E with empty hands }
    - { from: director, to: place, label: E while carrying }
    - { from: place, to: loose, label: placed dummies leave the list }
    - { from: director, to: strikes, label: T }
    - { from: strikes, to: finish, label: after each strike }
    - { from: director, to: reset, label: start of every round }
- id: blueprint-director
  title: The level Blueprint ties the pieces together through their C++ API
  pieces:
    - { id: level, kind: class, label: Level Blueprint whose Event BeginPlay stores each dummy's location in a map variable of starting locations and attaches the keeper to Get Player Pawn with Attach Actor To Actor and then calls Start Round and that keeps a Running variable and a start time and variables for the ranges and par, covers: [course-driver, tunables] }
    - { id: pickup, kind: step, label: The E event behind a branch on Running and on Is Carrying being false calls Find Nearest on the registry node and Carry on the keeper, covers: [pickup] }
    - { id: place, kind: step, label: The E event while Is Carrying calls Drop and loops over Get Built Post Count with Get Post Location keeping the first strictly nearer free post and sets the dummy's location on it, covers: [place] }
    - { id: loose, kind: step, label: A placed dummy is passed to Unregister on the registry node and stored in a post occupant array, covers: [loose-list] }
    - { id: strikes, kind: step, label: The T event behind branches on Running and all posts filled gets the Hit Counter of the nearest placed dummy and calls Register Hit, covers: [test-strikes] }
    - { id: finish, kind: step, label: After each strike a loop checks Is Down on every placed counter and on all down clears Running and sets the result text on a Text Render actor, covers: [finish] }
    - { id: reset, kind: step, label: Start Round from BeginPlay and from the R event behind a branch on Running being false calls Drop and then Unregister on every dummy and then Set Actor Location from the map of starting locations and Reset Hits and Register in array order, covers: [reset] }
  edges:
    - { from: level, to: pickup, label: E with empty hands }
    - { from: level, to: place, label: E while carrying }
    - { from: place, to: loose, label: placed dummies leave the list }
    - { from: level, to: strikes, label: T }
    - { from: strikes, to: finish, label: after each strike }
    - { from: level, to: reset, label: start of every round }
```

# Integration Rubric

- The hit counter, carrier, registry, and fence are reused with no additions; only the director knows the round exists.
- Pickup uses the registry within 250, the first registered dummy winning a tie, and never finds a placed dummy because placing unregisters it.
- Placing uses the nearest free post within 200, the lower post winning a tie, moves the dummy exactly onto it, and never puts two dummies on one post.
- T does nothing until all four posts are filled, then strikes only the nearest placed dummy within 200.
- The round ends when every placed dummy is down, with the time to one decimal and UNDER PAR or OVER PAR against 60 seconds.
- The keeper is attached to the player's pawn at the start of play, so the player walks it around; round 1 starts with play, R starts later rounds only between rounds, and E and T do nothing outside a round.
- Starting a round restores starting places, clears counters and posts, and re-registers dummies in a fixed order, so round 2 plays exactly like round 1.
- The tuned pickup range is written in the submission with one sentence on why it felt fair.
