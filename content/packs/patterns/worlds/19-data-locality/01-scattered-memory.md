---
id: p19-scattered-memory
title: Ten thousand fireflies, ten thousand actors
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [data-locality, performance]
terms: [tarray, ustruct, cache-line, fvector3f, tick, profiling]
prerequisites: [p13-bytecode-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - The processor reads memory a cache line at a time, 64 bytes on PC, so data stored side by side arrives together
  - An array of pointers keeps the pointers side by side, but every object they point at can sit anywhere
  - Every actor carries its own components, its own tick, and its own bookkeeping, which is a lot for a dot of light
  - A TArray of small structs keeps every record side by side, and one loop can walk them front to back
  - FVector is three doubles in UE 5, so a compact record often uses FVector3f
  - Only measuring says whether memory is the cost
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the meadow has 10,000 fireflies, each an actor with a sphere component that moves itself in Tick. The frame takes far too long and the fireflies' own math is tiny. Where does most of the time go?"
choices:
  - The square roots in the movement math
  - Drawing the spheres, always
  - Running 10,000 separate ticks and reaching 10,000 objects scattered across memory, each carrying far more than a position
  - Nowhere in particular; 10,000 of anything is free on a modern PC
answerIndex: 2
explanation: Each actor's tick is dispatched on its own, and each firefly's few bytes of position sit inside a large object somewhere in memory. The processor spends the frame fetching and dispatching, not adding velocities.
```

# Card

The summer meadow needs ten thousand fireflies. The first version is the obvious one: a firefly actor with a little sphere, a velocity, and a `Tick` that moves it. Place a few and it looks lovely. Place ten thousand and the frame rate falls through the floor, although each firefly only adds a velocity to a position.

**Memory arrives in lines.** The processor does not fetch one byte at a time. It fetches a **cache line**, 64 bytes on PC, and keeps recent lines in small, fast caches close to it. Reading a byte that is already in a cache is quick; reading one that must come from main memory makes the processor wait, often for hundreds of steps of work it could have done. So data that is used together should sit together: when one record arrives, its neighbors arrive with it.

**Pointers scatter.** A `TArray<AFirefly*>` keeps ten thousand pointers side by side, but each pointer leads somewhere else in memory, and each firefly's position sits inside a large object among fields the movement never reads. Walking the array means a fresh trip to memory for nearly every firefly.

**An actor is heavy for a dot of light.** Every actor is a `UObject` with its own bookkeeping, its own root component, and its own tick function, which the world dispatches one by one. Ten thousand fireflies are ten thousand ticks, ten thousand components in the scene, and ten thousand objects for every garbage collection to look at. The movement math is the smallest part of the bill.

**Records side by side.** A `USTRUCT` with just what the movement needs, kept by value in one `TArray`, stores every firefly's data next to the next one's. One actor owns the array and one loop walks it from front to back, so each cache line brings two whole fireflies at once. There is one tick for the whole meadow instead of ten thousand.

**Small types for small records.** In UE 5 `FVector` holds three doubles, 24 bytes, so that very large worlds keep their precision. A firefly's position and velocity as two `FVector`s are already 48 bytes. `FVector3f` holds three floats, 12 bytes, which is plenty for things that drift over one meadow, and brings a whole firefly down to 32 bytes.

**Measure it.** None of this matters for twenty fireflies, and nothing here is worth doing before a profiler such as **Unreal Insights** shows the meadow's frame time going where this card says it goes.

# Example

```cpp
// One small record per firefly: 32 bytes, so two fit in each 64 byte cache line.
USTRUCT()
struct FFirefly
{
	GENERATED_BODY()

	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector;

	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	UPROPERTY()
	float Glow = 0.f;

	UPROPERTY()
	float GlowRate = 0.f;
};

// One actor holds them all by value, side by side.
UPROPERTY()
TArray<FFirefly> Fireflies;
```

# Questions

```yaml
- id: cache-line
  type: multiple-choice
  prompt: "Why does it help to keep the data one loop reads side by side in memory?"
  choices:
    - The processor fetches a whole cache line at a time, so neighbors of the record it needs arrive for free
    - Memory is cheaper when it is full
    - Side by side data is never garbage collected
    - The compiler refuses to loop over scattered data
  answerIndex: 0
  explanation: A fetch brings a whole line, 64 bytes on PC, into the cache. Records packed together make every fetch useful.
- id: pointer-array
  type: multiple-choice
  prompt: "A TArray<UFirefly*> stores its elements side by side. Why is walking it still slow for movement?"
  choices:
    - TArray stores pointers out of order
    - Pointers are larger than structs
    - UObject pointers cannot be read in a loop
    - Only the pointers are side by side; each firefly object sits somewhere else in memory among fields the loop never reads
  answerIndex: 3
  explanation: The array of pointers is compact, but every dereference is another trip to a different place in memory.
- id: fill-vector3f
  type: fill-blank
  prompt: "In UE 5 FVector holds three doubles. The vector type with three floats, 12 bytes, is ___."
  acceptedAnswers: [FVector3f]
  explanation: FVector3f is UE::Math::TVector<float>. It keeps small records small when the precision of doubles is not needed.
- id: spot-copy
  type: spot-the-bug
  prompt: The meadow's loop is meant to move every firefly. Which line makes it move none of them?
  code: |
    void AMeadow::Step(float DeltaSeconds)
    {
    	for (FFirefly Firefly : Fireflies)
    	{
    		Firefly.Position += Firefly.Velocity * DeltaSeconds;
    	}
    }
  bugLine: 3
  fix: "Loop by reference, for (FFirefly& Firefly : Fireflies), so the loop changes the records in the array."
  explanation: A loop by value moves a copy of each record and throws the copy away. With records kept by value, the reference is what reaches the array.
- id: actor-cost
  type: multiple-choice
  prompt: "Which of these is not part of what each firefly actor costs?"
  choices:
    - Its own tick function, dispatched by the world
    - Its own components in the scene
    - Its own object for the garbage collector to look at
    - A separate copy of the firefly class's code
  answerIndex: 3
  explanation: The code exists once for the class. What multiplies is the data and bookkeeping of every instance.
- id: explain-measure
  type: explain-in-one-sentence
  prompt: In one sentence, say why you would not turn twenty fireflies into a struct array.
  modelAnswer: Twenty actors cost almost nothing, so a profiler would show no gain, and the struct array would only give up the conveniences of actors, such as components and Blueprints, for nothing.
  rubric:
    - Says the cost of twenty actors is negligible or that measuring would show no gain
    - Names something the struct array gives up
  explanation: Layout work pays off only where the numbers show memory and dispatch are the cost.
```
