---
id: p19-data-locality-card
title: Lay data out the way the loop reads it
order: 3
kind: concept
difficulty: 3
patterns: [data-locality]
skills: [data-locality, performance]
terms: [hot-cold-split, remove-at-swap, mass-entity, instanced-static-mesh, tarray, profiling]
prerequisites: [p19-firefly-swarm]
xp: 25
estimatedMinutes: 10
concepts:
  - Data Locality lays out the data a hot loop reads side by side, in the order it reads it
  - Records by value in one array beat objects behind pointers when one loop touches thousands of them
  - A packed array has no dead records for the loop to skip, and removing by swapping keeps it packed without shifting the rest
  - A hot and cold split keeps fields the loop never reads out of its records
  - Mass Entity is Unreal's framework for this at scale; most gameplay code needs only an array of structs in one actor
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: each firefly record gains a name, a 200 character description for the field guide, and the time it was first seen. The movement loop reads none of them. What happens to the movement loop?"
choices:
  - Nothing; fields the loop does not read cost nothing
  - It slows down, because each record is now much larger, so each cache line brings fewer fireflies and the loop fetches far more memory for the same work
  - It speeds up, because larger records are aligned better
  - It stops compiling
answerIndex: 1
explanation: The loop reads whole cache lines. Fields it never uses still fill those lines, so fewer fireflies arrive per fetch. That is the reason for a hot and cold split.
```

# Card

The swarm from the last quest is the **Data Locality** pattern: lay out the data a frequently run loop reads side by side, in the order the loop reads it, so that each fetch from memory brings the next records too. It is a pattern about memory rather than about classes, and in game code it can decide whether a hundred moving things fit in a frame or a hundred thousand.

**Records, not objects.** Keep the data of many similar things as small structs by value in one array, owned by one actor or subsystem, and update them with one loop. The loop then reads memory in order, the processor can fetch ahead of it, and there is one call to dispatch instead of thousands. The things themselves stop being objects with identity and become rows of numbers.

**Packed, with nothing to skip.** A loop that walks dead records and checks a flag on each one wastes fetches and branches. Keep the array packed instead: every record in it is live. Adding puts a record at the end. Removing from the middle with `RemoveAtSwap` moves the last record into the gap, so nothing after the gap has to shift down; the order of the records changes, and for a swarm the order does not matter. `RemoveAt` keeps the order and shifts every record after the gap.

**Hot and cold.** Some fields are read every frame and some almost never: the position against the name in the field guide. A **hot and cold split** keeps the hot fields in the records the loop walks and moves the cold ones to a second array, kept in step with the first, so the hot records stay small. Keep a record's size in view; `static_assert(sizeof(...))` is a cheap guard.

**Different kinds, different arrays.** Keeping every kind behind base class pointers, with a virtual call per element, brings back scattered memory and adds an indirect call each time. When fireflies, moths, and sparks move differently, give each kind its own array and its own loop.

**In Unreal.** **Mass Entity** is the engine's framework for this at scale: an entity is an ID, its data are fragments, plain structs deriving from `FMassFragment`, entities with the same fragments share an archetype whose data sits in chunks, and a `UMassProcessor` walks those chunks in bulk. It suits tens of thousands of agents, as in large crowds and traffic, and brings its own learning curve. Niagara keeps its particles in packed buffers, and an instanced static mesh draws thousands of copies from one component. For most gameplay code the whole pattern is a `TArray` of small `USTRUCT`s in one actor, like the swarm.

**Measure.** This is an optimization with a cost: things that were actors lose their components, collision, Blueprints, and easy debugging. Do it where a profiler shows the loop's memory traffic is the cost, and check afterwards that it helped.

# Example

```cpp
// Hot: what the loop reads every frame, 32 bytes.
USTRUCT()
struct FFireflyHot
{
	GENERATED_BODY()

	UPROPERTY() FVector3f Position = FVector3f::ZeroVector;
	UPROPERTY() FVector3f Velocity = FVector3f::ZeroVector;
	UPROPERTY() float Glow = 0.f;
	UPROPERTY() float GlowRate = 0.f;
};

// Cold: what the field guide reads now and then, kept at the same index in its own array.
USTRUCT()
struct FFireflyCold
{
	GENERATED_BODY()

	UPROPERTY() FName Name;
	UPROPERTY() FString Description;
};
```

# Questions

```yaml
- id: pattern-intent
  type: multiple-choice
  prompt: "What does the Data Locality pattern do?"
  choices:
    - Makes sure only one instance of a class exists
    - Lays out the data a hot loop reads side by side, in the order it reads it, so memory arrives ahead of the loop
    - Delays work until a value is needed
    - Reuses objects instead of creating new ones
  answerIndex: 1
  explanation: It is about where data sits in memory relative to the loop that reads it.
- id: swap-or-shift
  type: multiple-choice
  prompt: "A packed array of 10,000 sparks loses the spark at index 3. Which removal keeps it packed without moving the 9,996 records after it?"
  choices:
    - RemoveAt(3)
    - RemoveAtSwap(3), which moves the last record into index 3
    - Setting a bAlive flag to false at index 3
    - Empty, then adding the 9,999 others again
  answerIndex: 1
  explanation: RemoveAtSwap fills the gap with the last record, so only one record moves. RemoveAt keeps the order by shifting every later record down, and a flag leaves a dead record for the loop to skip.
- id: fill-hot-cold
  type: fill-blank
  prompt: "Moving fields the loop rarely reads into a second array, so the records the loop walks stay small, is a hot and ___ split."
  acceptedAnswers: [cold]
  explanation: The hot records hold what every frame reads; the cold array holds the rest at the same index.
- id: spot-virtual
  type: spot-the-bug
  prompt: Ten thousand creatures of three kinds are updated every frame. Which line brings back scattered memory and an indirect call for every creature?
  code: |
    void ACreatureField::Step(float DeltaSeconds)
    {
    	for (FDojoMoth& Moth : Moths) Moth.Position += Moth.Velocity * DeltaSeconds;
    	for (FDojoSpark& Spark : Sparks) Spark.Heat -= DeltaSeconds;
    	for (UDojoCreature* Creature : Creatures) Creature->Step(DeltaSeconds);
    }
  bugLine: 5
  fix: Give the third kind its own array of structs and its own loop, like the moths and the sparks, instead of an array of object pointers with a virtual Step.
  explanation: Each pointer leads to an object somewhere else in memory, and each virtual call is an indirect jump; the typed arrays above it stream in order.
- id: mass-when
  type: multiple-choice
  prompt: "When is Mass Entity the better fit than an array of structs in one actor?"
  choices:
    - For a door that opens twice a level
    - For tens of thousands of agents with several kinds of data and many systems processing them, such as a city crowd
    - For any game with more than ten actors
    - Never; it is only for the editor
  answerIndex: 1
  explanation: Mass shines at very large counts with many processors. A single swarm with one loop is simpler as an array of structs.
- id: explain-cost
  type: explain-in-one-sentence
  prompt: In one sentence, say what turning actors into records in an array gives up.
  modelAnswer: The records stop being objects, so they lose components, collision, Blueprint scripting, and easy one-at-a-time debugging, and the owner has to do by hand what each actor did for itself.
  rubric:
    - Names at least one thing actors had that records lose
    - Says the owner now does the work by hand, or that it costs flexibility
  explanation: The speed is paid for in flexibility, which is why the pattern waits for a measured problem.
```
