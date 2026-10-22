---
id: p7-breakdown-champion
title: Plan the arena champion's fight
order: 6
kind: breakdown
difficulty: 3
patterns: [state]
skills: [planning, state]
terms: [finite-state-machine, state-tree, timer-manager, multicast-delegate, uenum]
prerequisites: [p7-drawbridge-refactor]
xp: 90
estimatedMinutes: 20
concepts:
  - Planning a character whose behavior is a set of modes with entries, exits, and rules for each input
  - Handling a temporary mode that must return to whatever came before
  - Keeping an independent concern, such as rage, out of the mode list
---

# Spec

The arena's champion is the final opponent of a round. It has a small set of behaviors:

- **Taunting.** It struts in place for 3 seconds, then starts a charge.
- **Charging.** It rushes along a straight line for up to 2 seconds. If it reaches the player it lands a hit and goes back to Taunting; if the time runs out it also goes back to Taunting.
- **Staggered.** A ballista bolt that hits the champion staggers it for 1.5 seconds, whatever it was doing. When the stagger ends, it goes back to exactly what it was doing before, with that behavior's timer continuing from where it stopped.
- **Down.** At 0 health it falls and ignores everything from then on.

Separately, once its health first drops below half, the champion is **enraged** for the rest of the fight: every duration above is 30 percent shorter, in every behavior. A HUD banner shows the current behavior, and the crowd cheers when the champion becomes enraged.

Acceptance:

- A bolt during Taunting, and a bolt during Charging, both return the champion to the same behavior after the stagger, with its time left unchanged.
- A bolt while already staggered restarts the stagger instead of stacking a second one.
- Becoming enraged never resets or changes the current behavior.
- Once Down, no bolt, timer, or player contact changes anything.
- The HUD banner and the crowd learn about changes without the champion knowing them.

# Required Pieces

```yaml
- id: champion
  kind: class
  label: Champion actor that owns the fight
  why: Something in the level holds health, the current behavior, and the rage, and receives bolts and contacts.
- id: behaviors
  kind: class
  label: One current behavior out of Taunting, Charging, Staggered, Down
  why: The champion is always in exactly one behavior, and each input means something different in each.
- id: resume
  kind: data
  label: Remembered behavior and its time left for the stagger to return to
  why: The stagger must hand control back to whatever was interrupted, mid-way, without a copy of the stagger per behavior.
- id: enter-exit
  kind: step
  label: Entry and exit work run on every behavior change
  why: Timers and the HUD update belong to arriving in a behavior, whichever input caused it.
- id: rage
  kind: data
  label: Rage as a separate flag that scales durations
  why: Rage is independent of the behavior; folding it into the behavior list would double every behavior.
- id: inputs
  kind: event
  label: Bolt hit, player contact, timer end, and health change inputs
  why: The behaviors react to these; listing them makes each behavior's rules explicit.
- id: announce
  kind: event
  label: Behavior changed and enraged announcements
  why: The HUD banner and the crowd listen instead of the champion calling them.
- id: tuning
  kind: data
  label: Durations, rage threshold, and rage factor as editable data
  why: Designers balance the fight without touching code.
```

# Reference Plans

```yaml
- id: mode-objects
  title: Mode objects in C++ with a one-deep resume slot
  pieces:
    - { id: champ, kind: class, label: "ADojoArenaChampion with health, rage flag, and a current mode pointer", covers: [champion, rage] }
    - { id: modes, kind: class, label: "UDojoChampionMode base with Taunting, Charging, Staggered, Down subclasses", covers: [behaviors] }
    - { id: change, kind: step, label: "ChangeMode runs Exit and Enter; Enter starts the mode's timer", covers: [enter-exit] }
    - { id: stack, kind: data, label: "Interrupted mode pointer and its time left, kept while Staggered", covers: [resume] }
    - { id: hits, kind: event, label: "OnBoltHit, OnPlayerContact, OnTimerEnd, OnHealthChanged forwarded to the current mode", covers: [inputs] }
    - { id: events, kind: event, label: "OnModeChanged and OnEnraged multicast delegates", covers: [announce] }
    - { id: data, kind: data, label: "Durations and rage settings as editable properties", covers: [tuning] }
  edges:
    - { from: champ, to: modes, label: "forwards every input to the current mode" }
    - { from: modes, to: change, label: "asks the champion to change mode" }
    - { from: change, to: stack, label: "Staggered remembers the interrupted mode on entry and restores it on exit" }
    - { from: hits, to: champ, label: "inputs arrive at the champion" }
    - { from: change, to: events, label: "every change is announced" }
    - { from: data, to: modes, label: "timers read durations scaled by rage" }
- id: state-tree
  title: A StateTree asset driving C++ actions
  pieces:
    - { id: champ, kind: class, label: "ADojoArenaChampion with health, rage flag, and actions such as StartCharge and Stagger", covers: [champion, rage] }
    - { id: tree, kind: class, label: "StateTree asset with Fight parent state holding Taunting and Charging children, plus Staggered and Down", covers: [behaviors] }
    - { id: tasks, kind: step, label: "State tasks that start and stop each behavior's timer on enter and exit", covers: [enter-exit] }
    - { id: resume, kind: data, label: "The champion records the interrupted behavior and its time left; Staggered has a guarded transition back to each Fight child", covers: [resume] }
    - { id: hits, kind: event, label: "Bolt, contact, and health events sent with UStateTreeComponent SendStateTreeEvent as transition triggers", covers: [inputs] }
    - { id: events, kind: event, label: "OnModeChanged and OnEnraged multicast delegates on the champion", covers: [announce] }
    - { id: data, kind: data, label: "Durations in a data asset read by the tasks", covers: [tuning] }
  edges:
    - { from: hits, to: tree, label: "events trigger transitions" }
    - { from: tree, to: tasks, label: "entering a state runs its task" }
    - { from: tasks, to: champ, label: "tasks call the champion's actions" }
    - { from: resume, to: tree, label: "conditions pick which child Staggered returns to" }
    - { from: champ, to: events, label: "the champion announces changes" }
    - { from: data, to: tasks, label: "tasks read durations scaled by rage" }
```

# Rubric

- The champion is always in exactly one behavior, and each behavior's rules for bolts, contacts, and timers are explicit.
- Entry and exit work (timers, banner updates) runs on every change of behavior, in one place.
- The stagger returns to the interrupted behavior with its time left, without a stagger copy per behavior, and a second bolt restarts rather than stacks it.
- Rage is a separate concern that scales durations and never changes the current behavior.
- Down ignores every input from then on.
- The HUD and crowd learn about changes through announcements, and the durations are editable data.

# Alternative Note

Both reference plans are valid. The mode-object plan keeps everything in C++, easy to test with automation tests and to read in one place; the StateTree plan moves the behavior graph into an asset a designer can rearrange and debug visually, with C++ supplying the actions and the events. A plan with an enum and a switch per input also passes if it keeps the interrupted behavior and its time left for the stagger and keeps rage out of the enum. A plan that adds Enraged versions of every behavior to one list, or that copies the stagger once per behavior, misses the point of the exercise.
