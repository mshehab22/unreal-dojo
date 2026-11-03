---
id: p18-spatial-partition-card
title: Filed by where they are
order: 3
kind: concept
difficulty: 3
patterns: [spatial-partition]
skills: [spatial-partition]
terms: [uniform-grid, toctree2, physics-broadphase, navigation-octree, overlap-query]
prerequisites: [p18-lantern-grid]
xp: 25
estimatedMinutes: 10
concepts:
  - Spatial Partition keeps objects in a structure organized by position, so a question about a place looks only at what is near it
  - A uniform grid is the simplest form, with cells about as wide as the distance the questions ask about
  - Whatever moves must be refiled, and whatever is destroyed must leave
  - Trees such as octrees and bounding box trees adapt to clumps and empty space at the cost of more work per change
  - Unreal's physics scene, navigation system, and renderer each keep one; you build your own only for what they do not track
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the lantern grid has cells 200 units wide. A designer asks how many lanterns burn within 900 units of the keeper. How many cells does FindNear visit in each direction from the keeper's cell?"
choices:
  - One, the cells right next to it, as always
  - None; it looks only in the keeper's own cell
  - About five, because the circle reaches across four or five cells each way
  - It gives up, because the radius is larger than a cell
answerIndex: 2
explanation: FindNear visits every cell between the one under the circle's lowest corner and the one under its highest. With 200 unit cells and a 900 unit radius, that is four or five cells each way, about a hundred cells in all, which is why a cell near the size of the radius matters.
```

# Card

What you built for the lanterns is the **Spatial Partition** pattern. Objects are kept in a structure organized by where they are, so a question about a place ("what is within 300 of here?") looks only at the part of the structure near that place, and the rest of the level costs it nothing.

**The uniform grid.** Square cells of a fixed size, each with a list of what stands in it, keyed by an integer cell coordinate such as an `FIntPoint` in a `TMap`. Only cells that hold something take memory. A question visits the cells its circle can touch and measures what is in them. The cell size is the one dial: cells about as wide as the radius you usually ask about mean a question visits about three cells across on each axis; cells far smaller mean visiting many cells to collect a few objects; cells far larger mean measuring many objects that are not close.

**The bookkeeping.** A grid is only right if it is kept right. An object that moves must be refiled when it crosses into a new cell, or questions about its new place will miss it. An object that is destroyed must leave, or a question will hand back something that no longer exists; for actors, filing a `TWeakObjectPtr` turns that mistake into an empty entry instead of a crash. The cost is memory for the cells and a little work on every move.

**Questions between all pairs.** When every pair of nearby objects needs to meet, such as two lanterns joined by a thread, each cell measures its own pairs and the pairs it makes with half of its neighbor cells. Measuring against all eight neighbors finds every pair twice.

**Trees instead of a grid.** A grid wastes nothing on empty cells but suffers when objects pile into a few cells. Trees adapt. A quadtree or octree splits a region into four or eight only where it is crowded, so dense clumps get small cells and empty space stays one big cell; `TOctree2` is Unreal's reusable template for one. A bounding volume tree groups the objects themselves into nested boxes, which balances well but costs more to update when things move. Pick the grid when objects are spread fairly evenly and move a lot; pick a tree when they clump or the space is mostly empty.

**Where Unreal already does it.** The physics scene keeps every collision shape in a broadphase structure, a bounding box tree by default in UE 5.8 (the console variable `p.BroadphaseType` chooses), so overlap queries, sweeps, traces, and overlap events never loop over the level. The navigation system files nav-relevant geometry in `FNavigationOctree`. The renderer keeps an octree of primitives to find what each light and shadow touches, and World Partition streams the level by the cells of a grid. Build your own only for what none of them track: plain structs, actors with no shape, or data such as influence on a map.

# Example

```cpp
// The pieces of a uniform grid.
TMap<FIntPoint, TArray<TWeakObjectPtr<AActor>>> Cells;  // what stands in each cell
TMap<TWeakObjectPtr<AActor>, FIntPoint> Filed;          // where each one is filed, for refiling and removal

// A question visits the cells between its corners.
const FIntPoint Low = CellOf(Center - FVector(Radius, Radius, 0.f));
const FIntPoint High = CellOf(Center + FVector(Radius, Radius, 0.f));
```

# Questions

```yaml
- id: cell-size
  type: multiple-choice
  prompt: "Questions in your game usually ask for things within 100 units. Which cell size suits a uniform grid best?"
  choices:
    - 1 unit, so every cell holds almost nothing
    - About 100 units, near the radius the questions ask about
    - 10,000 units, so the whole level is a few cells
    - The size makes no difference to the work a question does
  answerIndex: 1
  explanation: Cells near the radius keep a question to a small block of cells with few objects each. Tiny cells mean visiting many empty cells; huge cells mean measuring many objects that are far away.
- id: fill-refile
  type: fill-blank
  prompt: "An object that moves into a new cell must be ___, or questions about its new place will not find it."
  acceptedAnswers: [refiled, moved to its new cell, re-filed, refiled in its new cell]
  explanation: A cell is worked out from where the object stood when it was filed, so moving the object leaves its entry behind until it is refiled.
- id: half-neighbors
  type: multiple-choice
  prompt: "Every pair of lanterns within reach gets a thread. Why does each cell measure against only half of its eight neighbor cells?"
  choices:
    - To save memory
    - Because the other neighbors are always empty
    - So each pair of neighbor cells is measured from one side only, and no pair is measured or joined twice
    - Because pairs only ever reach to the right
  answerIndex: 2
  explanation: If cell A measured against cell B and B against A, every pair across them would be measured twice. Choosing four of the eight directions covers each neighbor pair exactly once.
- id: tree-or-grid
  type: multiple-choice
  prompt: "When is an octree a better fit than a uniform grid?"
  choices:
    - When objects are spread evenly and move every frame
    - When objects clump in a few places and most of the space is empty
    - When there are fewer than ten objects
    - Never; a grid is always faster
  answerIndex: 1
  explanation: An octree splits only where it is crowded, so clumps get fine cells and empty space costs one node. A grid with fixed cells wastes nothing on empty space but overfills the crowded cells.
- id: spot-dangling
  type: spot-the-bug
  prompt: A grid files actors for proximity questions. Which line lets a question hand back an actor that was destroyed?
  code: |
    void FCrowdGrid::Add(AActor* Actor)
    {
    	const FIntPoint Cell = CellOf(Actor->GetActorLocation());
    	TArray<AActor*>& Bucket = Cells.FindOrAdd(Cell);
    	Bucket.Add(Actor);
    }
  bugLine: 4
  fix: File weak pointers, and skip entries that no longer point at a live actor, or remove each actor when it is destroyed.
  explanation: A raw AActor pointer in a plain container says nothing when the actor is destroyed, so the grid keeps handing it back. A TWeakObjectPtr reads as null once the actor is gone.
- id: unreal-has-one
  type: multiple-choice
  prompt: "Which of these is already a spatial partition that Unreal keeps for you?"
  choices:
    - The physics scene's broadphase, which overlap queries and traces ask
    - The Content Browser's folders
    - A Data Table's rows
    - The order of actors in the World Outliner
  answerIndex: 0
  explanation: The broadphase keeps every collision shape's bounding box in a tree, which is why overlap queries look only near their shape.
- id: explain-pattern
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Spatial Partition pattern.
  modelAnswer: Objects are kept in a structure organized by their position, such as the cells of a grid, so a question about a place looks only at the objects near it instead of at all of them.
  rubric:
    - Says objects are stored by position
    - Says a question looks only near the place it asks about
  explanation: The structure trades memory and bookkeeping for questions that ignore everything far away.
```
