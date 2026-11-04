---
id: p19-data-locality-when-not
title: When an actor is the right size after all
order: 6
kind: concept
difficulty: 3
patterns: [data-locality]
skills: [data-locality, architecture]
terms: [profiling, actor, mass-entity, instanced-static-mesh, fvector, hot-cold-split]
prerequisites: [p19-ember-refactor]
xp: 25
estimatedMinutes: 10
concepts:
  - A few dozen of anything are not a memory problem, so the layout work buys nothing
  - Things that need collision, physics, Blueprint behavior, or one-by-one networking are actors for good reasons
  - Measure before and after, and split hot from cold by what the loop really reads
  - Effects that are only seen belong in Niagara, copies that are only drawn in an instanced static mesh, and very large simulations in Mass Entity
  - An index into a packed array is not a name, and floats lose precision far from the world's origin
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the village has 24 lanterns that each glow when the player walks past, can be knocked over by physics, and run a little Blueprint script. A teammate wants to turn them into a struct array in one actor for speed. What is the best answer?"
choices:
  - Do it, because struct arrays are always faster than actors
  - Keep them as actors; 24 lanterns cost almost nothing
  - Do it, and add a hot and cold split to the records as well
  - Move all of them into Mass Entity as a first step
answerIndex: 1
explanation: The pattern pays when one loop walks thousands of records. Two dozen lanterns need collision, physics, and Blueprint scripting, which is what an actor gives them, and would only lose those for a gain no profiler would show.
```

# Card

Data Locality buys speed by giving up what made each thing an object. That trade is right for ten thousand fireflies and wrong for most things in a level.

**Small numbers.** A loop over 24 lanterns finishes before the processor notices. Below a few hundred simple things the layout rarely shows in a profile at all, and the code that comes with it, records, handles, parallel arrays, is harder to read and to change than an actor per thing.

**Things that need to be actors.** A record cannot collide, simulate physics, run a Blueprint graph, receive its own input, or be replicated on its own. A door, a lever, a pickup, an enemy with an AI controller: each needs what an actor gives it, and turning it into a row in an array means writing all of that again by hand. Keep actors for things that do something on their own, and records for things that are only numbers in a crowd.

**Measure, and measure the right thing.** Unreal Insights shows where the frame goes; a CPU profiler that counts cache misses, such as the one your processor's maker provides, shows whether memory is the wait. Measure before the change and after it. A hot and cold split made by guessing which fields are hot often splits the wrong way and leaves two arrays to keep in step for nothing; split by what the loop really reads.

**Use what the engine already has.**

- Sparks, smoke, and embers that are only seen belong in a Niagara system, which keeps its particles packed for you, on the processor or the graphics card.
- Thousands of copies of one mesh that only need to be drawn belong in an instanced static mesh.
- Tens of thousands of agents with several kinds of data and many systems, such as a city's crowd and traffic, are what Mass Entity is for. A meadow with one loop does not need it, and Mass brings its own concepts to learn.

**Two traps in packed records.** An index into a packed array is not a name for a record: removing from the middle moves another record into the gap, so anything that remembered an index must use a handle that survives the move, as the meadow's did. And `FVector3f` saves half the memory of `FVector` by using floats, which lose precision far from the world's origin; that is why UE 5 moved `FVector` to doubles. A meadow near the origin is fine with floats; records for a world many kilometers across may need doubles or positions kept relative to a nearby origin.

**Other quiet costs.** A `TMap` lookup inside the hot loop can send it jumping around memory, much as the pointers did, unless the map is small enough to stay in the cache. Sorting the whole array every frame to keep it in order costs more than keeping it packed as records come and go. And `UObject` pointers inside hot records bring back the scattered memory, and every one is something the garbage collector has to follow.

# Example

```cpp
// The right size: a lantern with collision, physics, and a script is an actor, and 24 of them cost nothing.
UCLASS()
class ALantern : public AActor
{
	GENERATED_BODY()

public:
	ALantern();

	UPROPERTY(VisibleAnywhere)
	TObjectPtr<UStaticMeshComponent> Body;
};
```

# Questions

```yaml
- id: few-things
  type: multiple-choice
  prompt: "A quest log keeps 40 quests as UObjects, and opening the log takes a moment. A teammate wants to move the quests into a hot and cold split of structs. What comes first?"
  choices:
    - Profile; forty objects read once are not a layout problem
    - Write the hot and cold split first; quests suit it well
    - Move the quests to Mass Entity to make the menu quicker
    - Make every quest an actor instead, to give each one a tick
  answerIndex: 0
  explanation: Forty objects read once cannot stall on memory long enough to notice. Find the real cost, such as loading or building the widgets, before changing the layout.
- id: needs-actor
  type: multiple-choice
  prompt: "Which of these should stay an actor rather than become a record in an array?"
  choices:
    - One of 10,000 ambient fireflies that only drift
    - One of 5,000 embers drifting up from a fire basket
    - One of 20,000 grass blades drawn by an instanced mesh
    - An enemy with an AI controller and collision
  answerIndex: 3
  explanation: The enemy needs the controller and the collision an actor provides. The others are only numbers in a crowd.
- id: fill-niagara
  type: fill-blank
  prompt: "Embers that are only seen and never read by gameplay belong in a ___ system, which keeps its particles packed for you."
  acceptedAnswers: [Niagara]
  explanation: Niagara simulates particles in packed buffers on the processor or the graphics card.
- id: spot-map
  type: spot-the-bug
  prompt: A swarm's hot loop runs over 10,000 records every frame. Which line can bring back scattered memory reads inside the loop?
  code: |
    void ASwarm::Step(float DeltaSeconds)
    {
    	for (FFirefly& Firefly : Fireflies)
    	{
    		const float Wind = WindByCell.FindRef(Firefly.Cell);
    		Firefly.Position.X += Wind * DeltaSeconds;
    	}
    }
  bugLine: 5
  fix: Read the wind from an array indexed by cell, or from a value worked out once before the loop, instead of a TMap lookup per firefly.
  explanation: Each FindRef hashes the key and jumps into the map's storage, which can be anywhere; unless the map is small enough to stay in the cache, the loop pays a scattered read for every firefly.
- id: float-far
  type: multiple-choice
  prompt: "A space game keeps ships 300 kilometers from the world's origin in records with FVector3f positions. What goes wrong?"
  choices:
    - Nothing; floats are always precise enough out there
    - The records become larger than they would be with FVector
    - Floats lose precision far out, so the ships jitter
    - FVector3f cannot be stored in a TArray of records
  answerIndex: 2
  explanation: Far from the origin a float can only hold positions some distance apart, which is why UE 5's FVector uses doubles. Use doubles there, or keep positions relative to a nearby origin.
- id: explain-mass
  type: explain-in-one-sentence
  prompt: In one sentence, say when you would choose Mass Entity over an array of structs in one actor.
  modelAnswer: When there are tens of thousands of agents with several kinds of data and many systems working on them, such as a city crowd, because Mass organizes the data by archetype and runs processors over it in bulk, while one swarm with one loop is simpler as an array of structs.
  rubric:
    - Names a very large count or many systems working on the same agents
    - Says why the simple array is enough otherwise
  explanation: Mass is the engine's answer at scale; below that scale it is more machinery than the problem needs.
```
