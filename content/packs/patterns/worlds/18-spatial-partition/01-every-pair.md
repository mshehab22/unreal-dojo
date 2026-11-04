---
id: p18-every-pair
title: Two thousand moths, four million questions
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [spatial-partition, performance]
terms: [overlap-query, physics-broadphase, navigation-octree, toctree2, uniform-grid, fintpoint]
prerequisites: [p17-boss-night-watch]
xp: 25
estimatedMinutes: 10
concepts:
  - Asking every object about every other object costs the square of the count, and almost all of those checks are between things far apart
  - Filing objects by where they are lets a question look only at the few that could be close
  - For anything with a collision shape, an overlap query already does this through the physics scene, which keeps every shape in its own tree of boxes
  - The engine keeps other position structures of its own, such as the navigation octree, for its own jobs
  - Things the physics scene does not know about, like plain structs or actors with no collision, need a structure you build yourself
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: 2,000 moths each want to know which other moths fly within 50 units of them, every frame. The code loops over every moth, and for each one loops over every other moth and measures the distance. About how many distance checks is that per frame?"
choices:
  - About 2,000, one per moth
  - About 4,000, two per moth
  - About 4 million, every pair
  - About 50, one per unit of range
answerIndex: 2
explanation: Each of 2,000 moths measures 1,999 others, close to four million checks a frame. Doubling the moths quadruples the work, and nearly every check is between moths on opposite sides of the meadow.
```

# Card

The meadow has 2,000 moths, and a moth only cares about moths within 50 units of it. Measuring every pair works for twenty moths and collapses at two thousand: the checks grow with the square of the count, and almost every one of them is between moths so far apart that the answer was obvious before measuring.

**Sort them by place first.** Lay a grid of square cells over the meadow and keep, for each cell, the list of moths inside it. A moth that wants its neighbors within 50 looks only in its own cell and the cells around it, a handful of moths instead of thousands. A grid line is not a wall, and the lists are only right for as long as they match where things stand.

**For things with collision, Unreal already did it.** `UWorld::OverlapMultiByChannel` with an `FCollisionShape::MakeSphere(50.f)` returns every collision shape that overlaps that sphere. It does not loop over the level: it asks the physics scene, whose broadphase keeps every shape's bounding box in its own tree of boxes (an AABB tree by default in UE 5.8), so the query walks only the branches near the sphere. Overlap events, sweeps, and line traces use the same structure. If the things you are looking for are actors with a collision shape, an overlap query is usually the whole answer.

**The engine keeps other structures too.** The navigation system files every piece of geometry that matters for the nav mesh in its own octree, `FNavigationOctree`, so rebuilding a nav tile only gathers the geometry in that tile. The renderer keeps an octree of primitives, `FScenePrimitiveOctree`, to find what each light and shadow touches. `TOctree2` is the template behind both, and you may use it yourself. These are built for the engine's own jobs; you read about them to recognize the idea, not to file gameplay data in them.

**When you build your own.** Some things have no collision shape: 2,000 moths kept as plain structs in one array, or lanterns that are actors with no shape at all. The physics scene has never heard of them, so no overlap query can find them. Making each moth an actor with a sphere just so physics can find it would cost far more than the question saves. That is when you write the grid yourself, as the next quest does.

# Example

```cpp
// Lanterns with a sphere component that overlaps the Visibility channel: let the physics scene answer.
TArray<FOverlapResult> Overlaps;
GetWorld()->OverlapMultiByChannel(Overlaps, Center, FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(300.f));
for (const FOverlapResult& Overlap : Overlaps)
{
	AActor* Found = Overlap.GetActor();
}

// Moths as plain structs, which physics has never heard of: a grid of cells, keyed by an integer point.
TMap<FIntPoint, TArray<int32>> MothsInCell;
```

# Questions

```yaml
- id: square-cost
  type: multiple-choice
  prompt: "Comparing every moth with every other moth costs about 4 million checks for 2,000 moths. About how many for 4,000 moths?"
  choices:
    - About 16 million
    - About 8 million
    - About 4 million, the same
    - About 6 million
  answerIndex: 0
  explanation: The cost grows with the square of the count, so twice the moths is four times the checks.
- id: fill-cell
  type: fill-blank
  prompt: "A grid keeps, for each ___, the list of things inside it, so a question about a spot looks only in the ones near that spot."
  acceptedAnswers: [cell, grid cell, square, tile]
  explanation: Each cell is a bucket of the things standing in it.
- id: overlap-who
  type: multiple-choice
  prompt: "Which of these can UWorld::OverlapMultiByChannel find?"
  choices:
    - Every actor in the level, whatever it is made of
    - Plain structs stored in an array on an actor
    - Only actors that are ticking this frame
    - Collision shapes the physics scene files
  answerIndex: 3
  explanation: An overlap query asks the physics scene, which only knows about shapes with collision. Structs in an array and actors with no shape are invisible to it.
- id: broadphase-what
  type: multiple-choice
  prompt: "Why is an overlap query not a loop over every actor in the level?"
  choices:
    - It remembers the last answer it gave and hands that back again
    - It checks only the actors that moved at some point this frame
    - The shapes' boxes sit in a tree, so it walks nearby branches
    - It runs the whole query on the graphics card, not on the CPU
  answerIndex: 2
  explanation: The broadphase is a spatial structure of its own; the overlap query asks it instead of looking at everything.
- id: nav-octree-for
  type: multiple-choice
  prompt: "What is FNavigationOctree for?"
  choices:
    - Keeping the moths of a gameplay swarm in cells for questions
    - Filing nav mesh geometry so a tile can be gathered quickly
    - Sending every change to actors out to the connected clients
    - Drawing the debug lines of a path on screen for a designer
  answerIndex: 1
  explanation: It is the navigation system's own spatial index, an octree of nav-relevant geometry. It shows the idea; gameplay data does not belong in it.
- id: explain-why-grid
  type: explain-in-one-sentence
  prompt: In one sentence, say when you would write your own grid instead of using an overlap query.
  modelAnswer: When the things you ask about have no collision shape the physics scene knows, such as plain structs or actors with no shape, and there are enough of them that measuring them all is too slow.
  rubric:
    - Says the objects are unknown to the physics scene, with no collision shape
    - Says there are many of them, enough that a full loop is too slow
  explanation: An overlap query can only find what physics knows about; a grid is for everything else.
```
