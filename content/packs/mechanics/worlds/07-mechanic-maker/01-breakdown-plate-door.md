---
id: m7-plate-door-plan
title: Plan a pressure plate door
order: 1
kind: breakdown
difficulty: 3
patterns: [observer]
skills: [planning, collision, delegates]
terms: [overlap-event, get-overlapping-actors, dynamic-multicast-delegate, adddynamic, interpolation, tick]
prerequisites: [m6-boss-quest-system]
xp: 100
estimatedMinutes: 20
concepts:
  - A plate's state is whether anything stands on it, and only a change of that state is news
  - A gate owns its list of plates and its own movement; plates never know which gates use them
---

# Spec

A temple keeper wants stone gates that open when visitors weigh down pressure plates. A plate is pressed while at least one runner or crate stands on it: the first arrival presses it, and it is released only when the last one leaves. A gate is given a list of plates in the editor. It rises 300 cm over 0.8 s while all of its plates are pressed, and sinks back the same way, at the same steady speed, when that stops being true. One plate can serve several gates, and one gate can need several plates. Each gate announces when it has fully opened and when it is fully closed again, so a sound, a lamp, or a puzzle director can react. Designers tune the height and the time on each gate without code.

You are planning, not coding. Name the classes, the data, and the events; for each pair, say which side holds a pointer to the other, which side broadcasts, and which side only listens. World 3 already has a runner, a crate, and a plate that counts what stands on it: say for each whether you reuse it.

Acceptance:

- A plate holds no pointer to any gate, and a gate never asks its plates for their state every frame.
- Two things on a plate and one stepping off does not release it; nothing is announced until the last one leaves.
- Height and time are values on each gate, with lower limits a designer cannot type past.
- The World 3 runner and crate stand on the plates, in play and in tests, without changes.

# Required Pieces

```yaml
- id: plate
  kind: class
  label: A plate whose trigger zone tells how many things stand on it, counting a runner or a crate once each
  why: Pressed and released come from what stands on the plate, not from who walked past.
- id: plate-events
  kind: event
  label: Pressed and released events fired only when the plate changes between empty and occupied
  why: Gates and lamps listen instead of polling, and a second arrival is not news.
- id: gate
  kind: class
  label: A gate whose panel rises and sinks at a steady speed toward open or closed
  why: 300 cm over 0.8 s in both directions, the same feel every time.
- id: plate-list
  kind: data
  label: Each gate's own list of plates, filled in the editor
  why: One gate can need several plates, and one plate can serve several gates.
- id: gate-events
  kind: event
  label: Opened and closed events fired when the panel arrives at either end
  why: Sounds and directors react to the gate without checking it.
- id: knobs
  kind: data
  label: Open height and open time as tunable values with lower limits
  why: Designers change the feel per gate, and a zero time cannot break the speed.
- id: wiring
  kind: step
  label: Each gate subscribes to its plates when play begins, and can subscribe again when plates are added
  why: The plates stay ignorant of the gates, so the gate does the connecting.
```

# Reference Plans

```yaml
- id: plate-and-gate
  title: A plate class that announces and a gate class that listens
  pieces:
    - { id: plate, kind: class, label: ADojoM7SignalPlate with a box Zone that recounts with GetOverlappingActors on every begin and end overlap, covers: [plate] }
    - { id: events, kind: event, label: OnPlatePressed and OnPlateReleased dynamic multicast delegates carrying the plate and broadcast only on the edge between zero and one or more, covers: [plate-events] }
    - { id: gate, kind: class, label: ADojoM7PlateGate with a Frame root and a Panel box whose relative height moves with FInterpConstantTo in Tick, covers: [gate] }
    - { id: plates, kind: data, label: An EditAnywhere TArray of plate pointers on the gate, covers: [plate-list] }
    - { id: moved, kind: event, label: OnOpened and OnClosed on the gate fired once when the panel arrives, covers: [gate-events] }
    - { id: knobs, kind: data, label: OpenHeight and OpenSeconds as EditAnywhere floats with ClampMin and Units, covers: [knobs] }
    - { id: bind, kind: step, label: A public BindPlates called from BeginPlay that binds one handler to both events of every plate with AddUniqueDynamic, covers: [wiring] }
  edges:
    - { from: events, to: bind, label: one handler for both events }
    - { from: plates, to: bind, label: the list it walks }
    - { from: bind, to: gate, label: decides whether to open }
    - { from: knobs, to: gate, label: speed is height over time }
    - { from: gate, to: moved, label: on arrival }
- id: plate-and-opener
  title: A plate class and an opener component that turns any actor into a gate
  pieces:
    - { id: plate, kind: class, label: A plate actor that counts actors on its zone, covers: [plate] }
    - { id: events, kind: event, label: Pressed and released delegates on the plate fired on the change between empty and occupied, covers: [plate-events] }
    - { id: opener, kind: component, label: UDojoPlateOpener actor component that moves a chosen scene component of its owner up and down at a steady speed, covers: [gate] }
    - { id: plates, kind: data, label: The opener's EditAnywhere array of plates, covers: [plate-list] }
    - { id: moved, kind: event, label: OnOpened and OnClosed delegates on the opener, covers: [gate-events] }
    - { id: knobs, kind: data, label: Height and seconds on the opener with ClampMin, covers: [knobs] }
    - { id: bind, kind: step, label: The opener binds to every plate in its BeginPlay and exposes a Rebind function, covers: [wiring] }
  edges:
    - { from: events, to: bind, label: subscribed by the opener }
    - { from: plates, to: bind, label: the list it walks }
    - { from: bind, to: opener, label: decides whether to open }
    - { from: knobs, to: opener, label: speed }
    - { from: opener, to: moved, label: on arrival }
```

# Rubric

- The plate counts things, not shapes, and announces only the changes between empty and occupied.
- Plates broadcast and hold no pointer to gates; each gate holds its plates and subscribes to them.
- Each gate keeps its own list of plates, so one plate can serve several gates and one gate can need several plates.
- The panel moves at a steady speed taken from the height and the time, and both are tunable with lower limits.
- The gate announces arriving open and arriving closed, so other actors can react without polling.
- The plan says what is reused from World 3 as it is and what is built new, with a reason.

# Alternative Note

Both plans pass. A gate class keeps the panel and its rule in one actor, which is simple to place and test; the cost is that every new kind of door is a new class. An opener component can turn a portcullis, a bridge, or a lift into something plates control, at the cost of telling the component which of its owner's parts to move. World 3's plate could be reused if the gate checked it every frame, but that breaks the first acceptance line, and changing World 3's file to add events means every World 3 quest changes too; building a new plate that announces itself, while reusing the runner and the crate as they are, keeps both worlds intact. A plan where the plate holds a pointer to its gate fails as soon as one plate must serve two gates.
