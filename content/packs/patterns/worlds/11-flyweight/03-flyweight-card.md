---
id: p11-flyweight-card
title: Share the common part, keep the differences
order: 3
kind: concept
difficulty: 2
patterns: [flyweight]
skills: [flyweight]
terms: [instanced-static-mesh, static-mesh-component, primary-data-asset, ustruct]
prerequisites: [p11-crowd-styles]
xp: 25
estimatedMinutes: 9
concepts:
  - Flyweight splits many similar objects into shared intrinsic state, stored once, and small extrinsic state per copy
  - Shared state is read-only from the copies, because a change would reach all of them
  - "Unreal's forms: shared assets, instanced static meshes where each copy is a transform plus optional floats, and small structs that index shared definitions"
  - Flyweight and Type Object have the same shape; Flyweight is chosen for memory, Type Object for authoring kinds
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: four hundred seats in the stands use one seat mesh, but each row's seats should be a slightly different shade. With one instanced static mesh component, where does each seat's shade go?"
choices:
  - A separate mesh asset per row
  - A per-instance custom data value that the seat material reads
  - A separate component per seat
  - The shade cannot vary when instancing
answerIndex: 1
explanation: An instance can carry a few floats of its own besides its transform, and the material reads them; the mesh and material stay shared.
```

# Card

What you built for the crowd is the **Flyweight** pattern. Many objects are mostly alike. Each one's data splits into two parts: the **intrinsic** state, which every copy of a kind has in common and which is stored once and shared, and the **extrinsic** state, which belongs to one copy and is kept with it or passed in when needed. Thousands of copies then cost thousands of small parts plus a handful of shared ones.

**Shared means read-only.** A shared part is seen by every copy that points at it. Copies read it and never write it; anything one copy changes about itself is extrinsic and lives with that copy.

**Unreal is full of it.**

- **Assets.** One `UStaticMesh`, `UMaterialInterface`, or `UTexture` asset serves every component that points at it. A hundred barrels with one mesh hold one mesh in memory. A Material Instance shares its parent's shader and changes only parameters.
- **Instanced static meshes.** `UInstancedStaticMeshComponent` draws one mesh many times: the mesh is intrinsic, and each instance is a transform at an index in the component's list (`AddInstance`, `GetInstanceTransform`, `ClearInstances`). `NumCustomDataFloats` gives every instance a few extra floats that the material reads with its Per Instance Custom Data node, such as a shade or a damage amount. `UHierarchicalInstancedStaticMeshComponent` adds clustering so large sets cull and switch detail in groups, which is what foliage uses.
- **Gameplay data.** Thousands of small structs, each with an index or a const pointer to a shared definition: a style in a list, a row in a table, or a data asset.

**Same shape as Type Object.** A fan pointing at its style looks like a weapon pointing at its kind. The difference is why: Type Object is chosen so designers can create and tune kinds as data; Flyweight is chosen so thousands of copies stay cheap. Often one design gets both.

**Where shared parts live.** Keep shared parts somewhere with a clear owner and lifetime: a list on the actor that owns the copies, a data table, or assets. When the set of shared parts is open-ended, a small registry can hand out the existing part for a key and create it the first time.

# Example

```cpp
// The mesh is shared; each seat is only a transform added to one component.
for (int32 Seat = 0; Seat < SeatCount; Seat++)
{
	const int32 Instance = SeatComponent->AddInstance(FTransform(SeatLocation(Seat)));
	SeatComponent->SetCustomDataValue(Instance, 0, RowShade(Seat));
}
```

# Questions

```yaml
- id: intrinsic-extrinsic
  type: multiple-choice
  prompt: "For a seat drawn as an instance, which is intrinsic state?"
  choices:
    - The seat's location
    - The seat's shade, stored as per-instance custom data
    - The seat mesh and its material
    - Whether this seat is broken
  answerIndex: 2
  explanation: The mesh and material are shared by every seat; location, shade, and broken belong to each seat.
- id: fill-intrinsic
  type: fill-blank
  prompt: "The shared, unchanging part of a flyweight is its ___ state; each copy's own part is its extrinsic state."
  acceptedAnswers: [intrinsic]
  explanation: Intrinsic state is stored once and shared; extrinsic state belongs to each copy.
- id: hism-when
  type: multiple-choice
  prompt: "A slope of 50,000 scattered stones should cull and lower detail in groups as the camera moves. Which component fits best?"
  choices:
    - 50,000 static mesh components
    - One hierarchical instanced static mesh component
    - One skeletal mesh component
    - A data table of stones
  answerIndex: 1
  explanation: The hierarchical version clusters instances so large sets can be culled and switch detail in groups.
- id: flyweight-or-type-object
  type: multiple-choice
  prompt: "A team wants designers to add new kinds of crowd banner as assets, and there are only twelve banners in the arena. Which pattern names the main goal?"
  choices:
    - Flyweight, because the banners share data
    - Type Object, because the goal is authoring kinds as data, not saving memory on twelve banners
    - Object Pool
    - Singleton
  answerIndex: 1
  explanation: Same shape, different reason. Twelve banners cost nothing to duplicate; what the team wants is kinds as data.
- id: explain-flyweight
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Flyweight pattern.
  modelAnswer: Many similar objects share one stored copy of the data they have in common, read-only, and each keeps only its own small differing state, so thousands of them cost little.
  rubric:
    - Mentions shared common state stored once
    - Mentions small per-copy state, or that the shared state is not changed by copies
  explanation: Share the common part; keep the differences.
```
