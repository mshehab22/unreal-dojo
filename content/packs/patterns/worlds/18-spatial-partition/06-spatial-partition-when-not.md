---
id: p18-spatial-partition-when-not
title: When the engine already knows where things are
order: 6
kind: concept
difficulty: 3
patterns: [spatial-partition]
skills: [spatial-partition, architecture]
terms: [overlap-query, physics-broadphase, overlap-event, navigation-octree, toctree2, ai-perception, profiling]
prerequisites: [p18-thread-refactor]
xp: 25
estimatedMinutes: 8
concepts:
  - With a few dozen objects, a plain loop is simpler and as fast as anything you would build
  - Actors with collision shapes are already filed by the physics scene, so an overlap query or an overlap event is the grid
  - Senses, navigation, and streaming have structures of their own; asking them beats copying their data into yours
  - A structure of your own is a second copy of every position, and every place that moves or destroys an object must keep it in step
  - Build one when many things the engine does not track are asked about often, and a profile shows the questions cost real time
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a puzzle room has 16 floor switches, each a box component that overlaps pawns, and the game needs to know which switch the player stands on. A teammate wants to file the switches in a uniform grid. What is the better approach?"
choices:
  - The grid; it scales to any number of switches
  - Let each switch's box report its own begin and end overlap events, because the physics scene already knows where the boxes and the player are
  - Loop over every actor in the level each frame and measure
  - An octree, because switches never move
answerIndex: 1
explanation: The switches and the player all have collision shapes, so the physics scene already files them and tells each box when the player steps in. A grid would be a second copy of positions physics already keeps, for sixteen objects.
```

# Card

A spatial structure of your own is a second copy of where everything is. Every piece of code that moves, spawns, or destroys one of those objects has to keep that copy in step, and a copy that falls behind fails quietly: a question misses the moth that just crossed a line, or hands back a lantern that was destroyed. Leave it out in these cases.

**There are only a few.** Measuring 40 lanterns against a spot is 40 distance checks, faster than visiting cells and far simpler to read. The square cost of every pair only hurts in the hundreds and thousands. Write the loop; reach for cells when a profile says the loop costs real time.

**They have collision shapes.** Actors with a collision component are already filed by the physics scene's broadphase. `OverlapMultiByChannel` or `OverlapMultiByObjectType` with an `FCollisionShape::MakeSphere` answers "what is within this radius" for them, and a trigger shape's `OnComponentBeginOverlap` tells you when something arrives without anyone asking at all. Adding a grid on top means two structures to keep in step for no gain.

**Another system already asks the question.** AI perception decides which actors a sense can reach, and an Environment Query asks for points and actors around a querier. The navigation system keeps `FNavigationOctree` for the geometry that shapes the nav mesh, and World Partition loads the level by the cells of its own grid. Use those systems for their jobs; copying their data into a structure of yours only adds a copy to maintain.

**The data does not change and is asked rarely.** Fifty static pickups checked once when the player presses a key are a loop. If they are many and asked every frame, file them once, in a grid or a `TOctree2`, and never refile them, because they never move.

**When your own structure earns it.** Thousands of things the engine does not track, like moths stored as plain structs, cells of an influence map, or tiles of a board, asked about many times a frame. That is the swarm from this world: no actor per moth, no physics body, one grid of indices that the swarm keeps current as it flies them. Even then, choose the cell size from the radius the questions ask, and measure before and after.

# Example

```cpp
// Right-sized: lanterns whose sphere components have the WorldDynamic object type. The physics scene is the grid.
TArray<FOverlapResult> Overlaps;
const FCollisionObjectQueryParams LanternTypes(ECC_WorldDynamic);
GetWorld()->OverlapMultiByObjectType(Overlaps, KeeperSpot, FQuat::Identity, LanternTypes, FCollisionShape::MakeSphere(300.f));
```

# Questions

```yaml
- id: when-not-few
  type: multiple-choice
  prompt: "Which job is the poorest fit for a grid of your own?"
  choices:
    - Finding the neighbors of each of 3,000 starlings stored as structs, every frame
    - Finding which of 30 shrines is closest to the player when a key is pressed
    - Scoring 4,000 cover points against guard positions every second
    - Finding crowd members near each of 2,000 crowd members every frame
  answerIndex: 1
  explanation: Thirty objects asked about once per key press is a tiny loop. The others are thousands of questions over thousands of objects.
- id: when-not-collision
  type: multiple-choice
  prompt: "The objects you ask about are actors with sphere components that overlap your query channel. What answers \"which are within 400\" best?"
  choices:
    - A uniform grid refiled every frame
    - UWorld::OverlapMultiByChannel with a 400 sphere, which asks the physics scene that already files the spheres
    - A loop over every actor in the level
    - FNavigationOctree
  answerIndex: 1
  explanation: The physics scene keeps those spheres in its broadphase already; an overlap query asks it.
- id: when-not-copy
  type: multiple-choice
  prompt: "What is the main hidden cost of keeping your own grid of actors?"
  choices:
    - It cannot hold more than 1,000 actors
    - It is a second copy of every position, so every move and every destroy must update it or questions silently go wrong
    - It makes the physics scene slower
    - It only works in the editor
  answerIndex: 1
  explanation: The grid knows only what it was told. Code that moves or destroys an actor without telling it leaves stale entries that no compiler warning will catch.
- id: spot-stale
  type: spot-the-bug
  prompt: A lantern keeper files lanterns in its own grid. Which line leaves the grid answering for where the lantern used to be?
  code: |
    void ALanternKeeper::Carry(ALantern* Lantern, const FVector& To)
    {
    	if (!IsValid(Lantern)) return;
    	Grid.Refile(Lantern);
    	Lantern->SetActorLocation(To);
    }
  bugLine: 4
  fix: Refile the lantern after moving it, not before, so the grid files it by the cell under its new place.
  explanation: Refile looks at where the lantern stands when it is called. Called before the move, it files the lantern where it already was, and the move then leaves the entry behind.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when building your own spatial structure is the wrong choice.
  modelAnswer: When there are only a few objects, when they already have collision shapes the physics scene files, or when another engine system already answers the question, a loop, an overlap query, or that system is simpler than a second copy of every position to keep in step.
  rubric:
    - Names a case such as few objects, objects with collision, or an engine system that already answers
    - Names the simpler choice such as a loop, an overlap query, or that system
  explanation: Your own structure earns its upkeep only for many objects the engine does not track, asked about often.
```
