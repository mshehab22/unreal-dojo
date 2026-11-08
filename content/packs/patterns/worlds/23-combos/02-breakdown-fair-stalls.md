---
id: p23-breakdown-fair-stalls
title: Plan the summer fair's stalls
order: 2
kind: breakdown
difficulty: 4
patterns: [component, observer, event-queue]
skills: [planning, component, observer, event-queue]
terms: [actor-component, dynamic-multicast-delegate, multicast-delegate, tarray, timer-manager]
prerequisites: [p23-patterns-together, p1-observer-when-not, p6-event-queue-when-not, p9-component-when-not]
xp: 100
estimatedMinutes: 25
concepts:
  - Planning one feature that needs parts, listeners, and a mailbox at once
  - Deciding which piece owns each rule and which pieces only listen
  - Choosing what a waiting message carries and when it is handled
  - Keeping the pieces ignorant of the code that joins them
---

# Spec

A summer fair has three kinds of stall: ring toss, fortune teller, and cake stand. Each is built from the same small set of parts:

- **A ticket seller.** It takes a coin for a ticket, and refuses when the stall is closed.
- **A prize shelf.** It holds a number of prizes and gives one out for each winning visitor, until it is empty.
- **A queue sign.** It counts the visitors waiting at the stall.

Designers want to make a fourth stall, balloon darts, out of the same parts with no new code, and later to give a stall a part it did not have, such as a second shelf.

Visitors send requests at any moment of a frame: buy a ticket, claim a prize, join the queue. The fair's till has to settle all the requests of one frame together, in the order they arrived, after every stall has finished its own update for the frame. A request that arrives for a stall that closes in the same frame is answered "closed" and is not lost.

The announcer board shows a line such as "Prize claimed at the ring toss" the moment a shelf gives its last prize away. The shelf must not know the board exists, and neither must the till. Stalls know nothing about the till.

Acceptance:

- A balloon-darts stall is made from the existing parts with no new class.
- Twenty requests that arrive in one frame are settled in one batch, in arrival order, and none is settled before the stalls have updated.
- A stall that closes in the same frame as a request answers "closed" to it.
- The board hears about an emptied shelf and nothing else, and the shelf never calls the board.
- A request that names a stall that has since been removed is dropped without failing.

# Required Pieces

```yaml
- id: parts
  kind: component
  label: Ticket seller, prize shelf, and queue sign, each a part that any stall can carry
  why: A new kind of stall is a different set of parts, not a different class.
- id: assembly
  kind: step
  label: A stall is built by adding the parts its kind names
  why: The kind of a stall is data that picks parts, so designers can make new kinds.
- id: part-events
  kind: event
  label: A part announces what happened to it without knowing who listens
  why: The board must hear about an emptied shelf without the shelf depending on the board.
- id: request
  kind: data
  label: A request as a plain value with the stall's name, the kind of request, and the visitor, not a pointer
  why: A request can wait for the end of the frame and still make sense after its stall is gone.
- id: mailbox
  kind: data
  label: One place where visitors post requests and the till collects them
  why: The sender posts and moves on, and the till chooses when to settle.
- id: settle
  kind: step
  label: At the end of the frame the till takes everything posted before it started and settles it in order
  why: Requests posted while settling must wait for the next batch, or the batch never ends.
- id: closing
  kind: step
  label: A closed stall answers its waiting requests with closed
  why: A request must always get an answer.
- id: board
  kind: class
  label: The announcer board, which listens for emptied shelves and writes the line
  why: Listeners hold the display so the parts hold only their own rules.
```

# Reference Plans

```yaml
- id: native-delegates
  title: Parts with native delegates and one mailbox for the whole fair
  pieces:
    - { id: parts, kind: component, label: "UTicketSeller, UPrizeShelf, and UQueueSign as UActorComponent children, each with its own rules", covers: [parts] }
    - { id: assembly, kind: step, label: "A stall kind is a data asset listing part classes; the fair adds one NewObject component of each to a plain stall actor", covers: [assembly] }
    - { id: part-events, kind: event, label: "The shelf owns a native multicast delegate OnEmptied that it broadcasts once, and listeners bind with AddUObject", covers: [part-events] }
    - { id: request, kind: data, label: "A USTRUCT with the stall's FName, an enum for the kind of request, and the visitor's FName", covers: [request] }
    - { id: mailbox, kind: data, label: "A TArray of requests on the till, with a Post function that only appends", covers: [mailbox] }
    - { id: settle, kind: step, label: "The till ticks in a late tick group, moves the whole array into a local before it starts, and settles the local array in order", covers: [settle] }
    - { id: closing, kind: step, label: "Settling looks the stall up by name, and answers closed when it is missing or its seller says it is closed", covers: [closing] }
    - { id: board, kind: class, label: "An actor that binds to each shelf's OnEmptied when a stall is built and unbinds when it goes", covers: [board] }
  edges:
    - { from: assembly, to: parts, label: "adds the parts a kind names" }
    - { from: parts, to: part-events, label: "announce what happened" }
    - { from: part-events, to: board, label: "the board listens" }
    - { from: request, to: mailbox, label: "requests wait here" }
    - { from: mailbox, to: settle, label: "the till drains it late in the frame" }
    - { from: settle, to: closing, label: "every request gets an answer" }
- id: dynamic-delegates
  title: Parts with dynamic delegates and a mailbox for each stall
  pieces:
    - { id: parts, kind: component, label: "Three UActorComponent subclasses marked BlueprintSpawnableComponent so designers add them in a Blueprint", covers: [parts] }
    - { id: assembly, kind: step, label: "Each stall kind is a data table row listing part classes; the fair spawns one plain stall Blueprint and adds a component of each listed class with Add Component by Class", covers: [assembly] }
    - { id: part-events, kind: event, label: "The shelf owns a dynamic multicast delegate with BlueprintAssignable, and the board binds with Bind Event to On Emptied", covers: [part-events] }
    - { id: request, kind: data, label: "A Blueprint struct with a request type enum, the visitor name, and the time it was posted", covers: [request] }
    - { id: mailbox, kind: data, label: "An array variable on each stall, so a stall that is removed takes its own waiting requests with it", covers: [mailbox] }
    - { id: settle, kind: step, label: "The till's Event Tick, in a late tick group, asks each stall in turn to settle the requests that were in its mailbox when the till started", covers: [settle] }
    - { id: closing, kind: step, label: "A stall that closes empties its own mailbox and answers every waiting request with closed", covers: [closing] }
    - { id: board, kind: class, label: "A Blueprint actor that binds to each shelf in its Begin Play and sets a Text variable when it fires", covers: [board] }
  edges:
    - { from: assembly, to: parts, label: "adds the parts a row lists" }
    - { from: parts, to: part-events, label: "announce what happened" }
    - { from: part-events, to: board, label: "the board binds in Blueprint" }
    - { from: request, to: mailbox, label: "requests wait in the stall's own array" }
    - { from: mailbox, to: settle, label: "the till visits each stall late in the frame" }
    - { from: settle, to: closing, label: "closing answers what is left" }
```

# Rubric

- The three parts are components, and a new kind of stall is a different set of parts with no new class.
- Each part owns its own rules, and nothing outside the parts works out a ticket, a prize, or a queue.
- Parts announce what happened through a delegate and never call a listener by name, so the shelf does not know the board.
- A request is a plain value, never a pointer to a stall, so it survives its stall.
- The till settles the requests that were waiting when it started, in arrival order, after the stalls have updated; requests posted during settling wait for the next batch.
- A request for a closed or missing stall is answered "closed" or dropped, and never left waiting.

# Alternative Note

Both plans pass. One mailbox for the whole fair makes the arrival order across stalls exact and puts the settling in one place, but a request names its stall, and the name must be looked up. A mailbox for each stall removes the lookup and lets a removed stall take its requests with it, but the order across stalls is only as good as the till's visit order. Native delegates are cheaper and keep listeners in C++; dynamic delegates let a designer bind in a Blueprint, at some cost per broadcast.
