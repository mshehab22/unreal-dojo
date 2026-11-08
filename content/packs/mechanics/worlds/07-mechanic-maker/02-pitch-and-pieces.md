---
id: m7-pitch-and-pieces
title: Pitch it, break it, map it
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [planning]
terms: [dynamic-multicast-delegate, overlap-event, get-overlapping-actors, actor-component]
prerequisites: [m7-plate-door-plan]
xp: 25
estimatedMinutes: 8
concepts:
  - A pitch names the player's action, the world's response, and the constraint that makes it interesting
  - Every piece has a kind (class, component, data, event, step) and a world that already taught it
  - A reuse audit sorts what exists into reuse as is, retrofit, or build new, with a reason for each
  - A spike is a small throwaway build that answers the one question you cannot answer yet
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: World 3 left you a plate that counts what stands on it, and now a gate must open when a plate is pressed. What is the best first move?"
choices:
  - Copy the World 3 plate into a new file and start editing it, keeping its counting code exactly
  - Make the gate ask the World 3 plate if it is pressed, once on every frame
  - Ignore the old plate and write everything from scratch, so nothing old gets in the way
  - List what already exists, then sort each piece into reuse, retrofit, or build new
answerIndex: 3
explanation: Before any code, a maker checks what the library already offers and sorts it into reuse as is, retrofit, or build new; copying, polling, or starting over are each the right answer only sometimes, and the audit tells you which.
```

# Card

Every mechanic in this world goes through the same five steps before the first line of code.

**1. Pitch it in one sentence.** Name three things: the **player action**, the **response** of the world, and the **constraint** that makes it a decision. "The visitor pushes crates onto plates (action), a stone gate rises (response), but it stays up only while every plate it needs is held (constraint)." A pitch with no constraint is a button; a pitch with no response is a chore.

**2. Break it into pieces, each with a kind.** The five kinds are the ones from every breakdown so far: a **class** (an actor you place), a **component** (an actor component that adds a part to any actor), **data** (values a designer edits, such as a list of plates or a height), an **event** (a delegate that announces something, so listeners never poll), and a **step** (something that happens in order, such as binding at BeginPlay).

**3. Map each piece to the world that taught it.** The plate's zone and its count come from World 3's overlap events and `GetOverlappingActors`. Its pressed and released events are dynamic multicast delegates from Pack 1 and World 6. The gate's steady rise is World 2's constant interpolation. The knobs are Pack 1's UPROPERTY specifiers. A piece no world taught is your **unknown**.

**4. Run a reuse audit.** For each existing class, decide:

- **Reuse as is**: it already does the job. World 3's runner and crate stand on plates exactly as they are.
- **Retrofit**: it almost does the job and changing it is cheap and yours to change.
- **Build new**: changing it would break its own world, or it is the wrong shape. World 3's plate counts well but announces nothing, so a gate would have to ask it every frame; adding events would change World 3's file under every World 3 quest that compiles against it. So this world builds a new plate that announces itself and keeps World 3's counting idea.

**5. Spike the unknown.** A **spike** is a small, throwaway build, usually under 20 minutes, in an empty level or a test, that answers one question and nothing else, such as "how do I move a panel exactly 300 cm in exactly 0.8 s?" You keep the answer and delete the spike, so the real build starts from knowledge, not hope.

# Example

```cpp
// Pitch: the player runs through a coin (action), the coin pays its value and vanishes (response),
// and a new coin appears at the same spot only 5 seconds later (constraint).

// Pieces, their kinds, and where each was taught:
//   class   ADojoCoin              overlap filter for the player only    Pack 3 World 3 (overlap events)
//   event   OnCollected(Value)     announces the pickup                  Pack 3 World 6 (the quest item)
//   step    hide and turn off collision, then show again                 Pack 1 (components)
//   step    respawn timer, 5 s                                           Pack 1 World 5 (timers)
//   data    Value and RespawnSeconds as knobs                            Pack 1 World 1 (UPROPERTY)

// Reuse audit:
//   reuse as is  ADojoM3Runner            the player stand-in for tests
//   retrofit     none
//   build new    ADojoCoin                World 6's quest item destroys itself, and a destroyed coin cannot come back

// Unknown: spawning a fresh coin at runtime is not taught yet.
// Spike (15 minutes): hide the coin and turn its collision off instead of destroying it, then check in a test
// that a hidden coin with no collision is not collected twice. The spike answers the question; the coin keeps the idea.

/** Announces a collected coin and its value. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoOnCoinCollected, int32, Value);
```

# Questions

```yaml
- id: pitch-constraint
  type: multiple-choice
  prompt: "Pitch: the visitor steps on a bell plate, a bridge extends across the gap, but it retracts 4 seconds after the visitor steps off. Which part is the constraint?"
  choices:
    - It retracts 4 seconds after the visitor steps off the plate
    - The visitor steps on a bell plate in front of the gap
    - The bridge extends across the gap so the visitor can walk over it
  answerIndex: 0
  explanation: The action is stepping on the plate and the response is the bridge; the 4 second limit is what turns it into a decision about timing.
- id: piece-kind
  type: multiple-choice
  prompt: "In a plan, which kind of piece is a plate's OnPlatePressed?"
  choices:
    - data
    - step
    - event
    - component
  answerIndex: 2
  explanation: It is a delegate the plate broadcasts so listeners can react without polling, which is an event piece.
- id: audit-crate
  type: multiple-choice
  prompt: "World 7's tests need something heavy to stand on plates. World 3's crate has a solid body, a handle, and a home it can return to. What does the reuse audit say?"
  choices:
    - Build new, because each world needs its own classes and cannot lean on another's
    - Reuse as is, because it already stands on plates as one thing and can be sent home
    - Retrofit, by adding a weight value to World 3's crate so a plate can tell how heavy it is
  answerIndex: 1
  explanation: Nothing about the crate needs to change, so it is reused as it is and listed under the quests a build compiles against.
- id: spike-name
  type: fill-blank
  prompt: "A small throwaway build that answers one unknown question before the real build starts is called a ___."
  acceptedAnswers: [spike, a spike]
  explanation: A spike is thrown away once it has answered its question; only the answer is kept.
- id: explain-new-plate
  type: explain-in-one-sentence
  prompt: In one sentence, say why World 7 builds a new plate instead of reusing World 3's plate as it is.
  modelAnswer: World 3's plate counts what stands on it but announces nothing, so a gate would have to check it every frame; a new plate with pressed and released events lets gates listen, and World 3's file stays unchanged.
  rubric:
    - Says the old plate cannot announce a change, so a gate would have to poll it
    - Says the new plate broadcasts events that gates listen to
  explanation: The audit picks build new when the old class is the wrong shape for listening and changing it would affect its own world.
```
