---
id: example-breakdown-campfire
title: Plan a campfire that warms the player
order: 7
kind: breakdown
difficulty: 3
patterns: [observer, component]
skills: [planning]
terms: [actor-component, overlap-event, multicast-delegate, timer-manager]
prerequisites: [example-build-blank-proximity-lantern]
xp: 90
estimatedMinutes: 20
concepts:
  - Splitting a mechanic into classes, components, data, events, and steps
  - Deciding who knows about whom before writing code
---

# Spec

A campfire sits in a cold level. While the player stands within 400 units of a lit campfire, their warmth rises by 10 per second up to 100; away from every fire it falls by 4 per second down to 0. At 0 warmth the player takes 5 damage every 2 seconds. A warmth bar on the HUD shows the current value, and the fire can be put out by rain, which stops it warming anyone.

Acceptance:

- Warmth never leaves the range 0 to 100.
- Standing near two fires warms at the same rate as one.
- The HUD bar updates only when warmth changes.
- Putting a fire out while the player stands at it starts the cooling right away.

# Required Pieces

```yaml
- id: fire-actor
  kind: class
  label: Campfire actor with a warm zone
  why: Something in the level has to own the zone and the lit state.
- id: warmth-store
  kind: component
  label: Warmth component on the player
  why: Warmth belongs to the player and must work no matter which fire is near.
- id: zone-events
  kind: event
  label: Enter and leave warm zone events
  why: The player must learn about fires through events, not by searching every frame.
- id: warmth-changed
  kind: event
  label: OnWarmthChanged broadcast
  why: The HUD listens instead of polling.
- id: rate-step
  kind: step
  label: Rate update on a timer
  why: Warmth changes over time; a timer keeps it off Tick.
- id: tunables
  kind: data
  label: Rates, limits, and radius as editable data
  why: Designers tune the feel without touching code.
- id: hud-bar
  kind: class
  label: HUD warmth bar listener
  why: Shows the value and proves the event works.
```

# Reference Plans

```yaml
- id: component-counts-fires
  title: The warmth component counts nearby fires
  pieces:
    - { id: fire, kind: class, label: ADojoCampfire with a sphere and a lit flag, covers: [fire-actor, zone-events] }
    - { id: warmth, kind: component, label: UDojoWarmthComponent counting fires in range, covers: [warmth-store, rate-step] }
    - { id: changed, kind: event, label: OnWarmthChanged multicast delegate, covers: [warmth-changed] }
    - { id: settings, kind: data, label: Editable rates on the component and radius on the fire, covers: [tunables] }
    - { id: bar, kind: class, label: Warmth bar widget bound to OnWarmthChanged, covers: [hud-bar] }
  edges:
    - { from: fire, to: warmth, label: tells the component it entered or left a lit zone }
    - { from: warmth, to: changed, label: broadcasts when the value changes }
    - { from: changed, to: bar, label: bar updates its fill }
- id: fire-broadcasts
  title: Each fire broadcasts and the component subscribes
  pieces:
    - { id: fire, kind: class, label: ADojoCampfire broadcasting OnWarmZoneEntered and OnWarmZoneLeft, covers: [fire-actor, zone-events] }
    - { id: registry, kind: step, label: Component finds fires at BeginPlay and binds to each, covers: [zone-events] }
    - { id: warmth, kind: component, label: UDojoWarmthComponent with a set of fires in range and a rate timer, covers: [warmth-store, rate-step] }
    - { id: changed, kind: event, label: OnWarmthChanged multicast delegate, covers: [warmth-changed] }
    - { id: settings, kind: data, label: A warmth settings data asset, covers: [tunables] }
    - { id: bar, kind: class, label: Warmth bar widget bound to OnWarmthChanged, covers: [hud-bar] }
  edges:
    - { from: registry, to: fire, label: binds to each fire's zone events }
    - { from: fire, to: warmth, label: zone events reach the component }
    - { from: warmth, to: changed, label: broadcasts when the value changes }
    - { from: changed, to: bar, label: bar updates its fill }
    - { from: settings, to: warmth, label: rates read at BeginPlay }
```

# Rubric

- Warmth lives on the player in a component, not on the fires.
- Fires and player meet through overlap or zone events, never through a per-frame search.
- Two fires do not double the rate: the plan counts or collects fires in range.
- The HUD listens to an event and does not poll.
- Rates, limits, and radius are named as editable data.
- The plan states the dependency direction: fires know nothing about the HUD.

# Alternative Note

Both reference plans are valid. The first keeps fires simple and puts all logic in the component; the second makes fires broadcasters, which scales better if other systems (wolves that fear fire, a quest that counts lit fires) also need to know. A third split, a world subsystem that tracks every fire, also passes if it keeps the warmth on the player and the HUD on an event.
