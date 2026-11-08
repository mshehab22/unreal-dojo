---
id: m7-key-door-plan
title: Plan a key and a locked door
order: 6
kind: breakdown
difficulty: 3
patterns: [component, observer]
skills: [planning, collision, delegates]
terms: [actor-component, findcomponentbyclass, fname, tset, overlap-event, dynamic-multicast-delegate]
prerequisites: [m7-plate-gate]
xp: 90
estimatedMinutes: 20
concepts:
  - A second ready mechanic run through the same method, pitch, pieces, reuse audit, acceptance
  - Keys belong to the visitor, so whatever reads them looks them up on the visitor at the moment of contact
---

# Spec

The temple keeper's second request is the old favorite of every dungeon: a key and a locked door. Pitch: the visitor picks up a key and opens the door that matches it; without the key, the door stays shut and says so.

The finished behavior, with its numbers fixed:

- A key pickup is a small sphere 60 cm in radius with a key id, `ShrineKey` by default, floating above it as text.
- A visitor that carries a key ring (an actor component added to it) and touches the pickup adds the pickup's key id to its ring, and the pickup disappears: it is hidden and no longer touchable.
- A visitor whose ring already holds that id leaves the pickup where it is for someone else. A visitor with no ring at all, such as a rolling crate, is ignored.
- A door is a solid slab 40 cm thick, 300 cm wide, and 300 cm tall, with a required key id, `ShrineKey` by default, and a label.
- A visitor tries the door. If its ring holds the required id, the door opens: the slab stops blocking, the label reads Open, and the door announces it was unlocked, naming itself and the visitor, exactly once. Trying an open door again succeeds and announces nothing.
- Otherwise the door stays shut, the label reads Locked, and the door counts the locked try.
- The door does not take the key: it stays on the ring.
- For the next visitor, a designer can put the pickup back and relock the door, which keeps its count of locked tries.

You are planning, not coding. Start with the method from this world: write the pitch in one sentence, list the pieces by kind, map each piece to the world that taught it, and run the reuse audit. The runner from the collision world is reused as is for the visitor. The satchel from the delegates world counts items by tag, but it is an actor that listens to items, not a store the visitor carries; decide whether to retrofit it or build the ring new, and say why.

Acceptance:

- A visitor without the key never opens the door, and each of its tries is counted.
- A visitor with the key opens it on the first try, and the announcement names that visitor.
- One key opens any number of doors that need it, because no door takes it.
- The pickup, the ring, and the door each work alone in any level, with no pointer to each other.
- Putting the pickup back and relocking the door makes a second visitor's run play like the first.

# Required Pieces

```yaml
- id: pickup
  kind: class
  label: Key pickup with a key id and a small overlap zone
  why: Something in the level has to own the key until a visitor takes it.
- id: ring
  kind: component
  label: Key ring on the visitor that holds key ids with no repeats
  why: Keys belong to whoever carries them, and any actor can be given a ring.
- id: find-ring
  kind: step
  label: The pickup and the door look the ring up on the visitor at the moment of contact
  why: Neither keeps a pointer to a visitor; they ask the one in front of them.
- id: door
  kind: class
  label: Locked door with a required key id and a blocking slab
  why: The obstacle the key exists for.
- id: try-entry
  kind: step
  label: One try entry that opens the door or reads Locked and counts the try
  why: The player's verb at the door, with both answers in one place.
- id: unlocked-event
  kind: event
  label: OnUnlocked announcing the door and the visitor once
  why: Rewards, sounds, and a director listen instead of the door calling them.
- id: key-data
  kind: data
  label: Key ids as names set in Details on the pickup and the door
  why: A designer matches a key to a door without code.
- id: reset
  kind: step
  label: Put the pickup back and relock the door for the next visitor
  why: A second run must play like the first.
```

# Reference Plans

```yaml
- id: ring-component
  title: A key ring component that the pickup and the door look up
  pieces:
    - { id: pickup, kind: class, label: ADojoM7KeyPickup with a sphere zone and a KeyId and a taken flag, covers: [pickup] }
    - { id: ring, kind: component, label: UDojoM7KeyRing holding a TSet of FName with AddKey and HasKey and RemoveKey, covers: [ring] }
    - { id: lookup, kind: step, label: FindComponentByClass on the overlapping actor in the pickup and on the visitor in the door, covers: [find-ring] }
    - { id: door, kind: class, label: ADojoM7LockedDoor with a blocking box panel and a label and a RequiredKey, covers: [door] }
    - { id: try, kind: step, label: TryOpen opens and returns true or sets Locked and counts the try and returns false, covers: [try-entry] }
    - { id: unlocked, kind: event, label: OnUnlocked dynamic multicast delegate with the door and the visitor, covers: [unlocked-event] }
    - { id: ids, kind: data, label: KeyId and RequiredKey as EditAnywhere FName properties, covers: [key-data] }
    - { id: reset, kind: step, label: ResetPickup shows the pickup and turns its zone back on and Relock closes the panel, covers: [reset] }
  edges:
    - { from: pickup, to: lookup, label: on begin overlap }
    - { from: lookup, to: ring, label: AddKey }
    - { from: try, to: lookup, label: asks the visitor for its ring }
    - { from: try, to: unlocked, label: broadcasts on opening }
    - { from: ids, to: door, label: RequiredKey }
    - { from: reset, to: pickup, label: shows it again }
- id: tags-and-bump
  title: Keys kept as actor tags and a door that tries itself when bumped
  pieces:
    - { id: pickup, kind: class, label: A key pickup actor with an overlap zone and a key name, covers: [pickup] }
    - { id: store, kind: component, label: A small key store component that wraps the visitor's actor tags with add and has, covers: [ring] }
    - { id: ask, kind: step, label: The pickup and the door call ActorHasTag through the store found on the visitor, covers: [find-ring] }
    - { id: door, kind: class, label: A door actor with a solid slab and a required key name, covers: [door] }
    - { id: bump, kind: step, label: The slab's hit event is the try and either opens or shows Locked and counts, covers: [try-entry] }
    - { id: opened, kind: event, label: A door unlocked delegate with the door and the visitor, covers: [unlocked-event] }
    - { id: names, kind: data, label: Key names typed in Details on both actors, covers: [key-data] }
    - { id: restore, kind: step, label: A reset function on each actor that a level Blueprint calls between visitors, covers: [reset] }
  edges:
    - { from: pickup, to: ask, label: on overlap }
    - { from: ask, to: store, label: adds the key name }
    - { from: bump, to: ask, label: does the visitor hold it }
    - { from: bump, to: opened, label: broadcasts on opening }
    - { from: names, to: door, label: required key }
    - { from: restore, to: door, label: relocks }
```

# Rubric

- Keys live on the visitor in a component or store it carries, not on the pickup or the door.
- The pickup and the door find the visitor's keys at the moment of contact and keep no pointer to any visitor.
- The plan names one try entry with both answers: open and announce, or Locked and count the try.
- The unlock is an event that names the door and the visitor, and an open door announces nothing on a second try.
- Key ids are data a designer sets, and the plan says the door leaves the key on the ring.
- The plan includes the pitch sentence and a reuse audit that says what is reused, retrofitted, or built new, and why.

# Alternative Note

Both reference plans pass. The first keeps the keys in their own component, so a key added can be announced, a key can be removed at reset, and nothing else that uses actor tags can collide with a key name. The second stores keys as actor tags behind a thin store and lets a bump be the try, which needs no interaction key but opens the door the moment anything with the key brushes it, and a crate pushed into it counts as a locked try. A plan that keeps keys in a world subsystem mapped by visitor also passes if the pickup and the door still reach the keys through the visitor and the unlock is still an event. In the reuse audit, the satchel is a poor fit for the ring: it hears items through their events and is placed in the level, while a ring must travel with the visitor and answer a question, so the ring is built new.
