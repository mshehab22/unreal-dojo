---
id: p11-thousands-of-the-same
title: Three thousand fans, three thousand copies of the same scarf
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [flyweight, memory]
terms: [static-mesh-component, instanced-static-mesh, ustruct, tarray]
prerequisites: [p8-subclass-sandbox-when-not]
xp: 25
estimatedMinutes: 7
concepts:
  - Many copies that each carry the same heavy data waste memory, and drawing each one separately wastes draw calls
  - What every copy shares can be stored once and pointed at; each copy keeps only what differs
  - Shared data must not be changed by one copy, or every copy changes with it
  - Unreal draws many copies of one mesh with one instanced static mesh component, one transform per copy
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the arena crowd is 3,000 fans in three supporter styles. Each fan struct stores its seat, its excitement, and its own copy of its style's name, scarf color, chant text, and cheer volume. What is most of the crowd's memory spent on?"
choices:
  - Seats
  - Excitement values
  - The same three styles copied about a thousand times each
  - The crowd actor itself
answerIndex: 2
explanation: Only seat and excitement differ between fans. The style fields repeat for every fan of a style, so nearly all of the memory is duplicates.
```

# Card

A full arena is mostly repetition. Three thousand fans in three supporter styles. Four hundred seats of one design. Forty torches along the wall. Each copy differs from the others in a few small ways, such as where it is or how excited it is, and is the same in every other way.

**Copies of the same data.** If every fan struct carries its style's name, scarf color, chant, and volume, the crowd holds about a thousand identical copies of each style. Per fan, the style fields take several times the room of the seat and the excitement together. Changing a style also means touching every fan of it.

**Store it once.** Split each copy into two parts. The shared part (the style) is stored once per style. The per-copy part (seat and excitement) stays with each fan, along with a small reference to its style: an index into the crowd's list of styles, or a pointer. Three thousand fans now cost three thousand small structs plus three styles.

**Shared means read-only from the copy.** A fan must never change its style; the change would land on every fan who shares it. Anything one fan changes about itself belongs in its own part.

**The same idea for drawing.** Forty torches as forty actors with forty `UStaticMeshComponent`s means forty components to register, move, and draw one by one. A `UInstancedStaticMeshComponent` draws one mesh many times: the mesh and material are given once, and each copy is only a transform added with `AddInstance`. The renderer can then draw all of them together.

# Example

```cpp
// Before: every fan carries its own copy of its style.
struct FDojoArenaFanCopy
{
	int32 Seat;
	float Excitement;
	FName StyleName;
	FColor ScarfColor;
	FText Chant;
	float CheerVolume;
};

// After: the style is stored once in the crowd, and each fan keeps an index to it.
struct FDojoArenaFan
{
	int32 Seat;
	float Excitement;
	uint8 StyleIndex;
};
```

# Questions

```yaml
- id: shared-or-own
  type: multiple-choice
  prompt: "Which of these belongs in each fan, not in the shared style?"
  choices:
    - The chant text
    - The scarf color
    - How excited this fan is right now
    - The style's cheer volume
  answerIndex: 2
  explanation: Excitement differs from fan to fan; the rest is the same for everyone of a style.
- id: fill-instance
  type: fill-blank
  prompt: "An instanced static mesh component draws another copy of its mesh when you call ___(FTransform(Location))."
  acceptedAnswers: [AddInstance]
  explanation: Each instance is just a transform; the mesh and material are shared by all of them.
- id: spot-shared-write
  type: spot-the-bug
  prompt: Fans point at shared styles. Which line changes every fan of a style when one fan catches a souvenir?
  code: |
    void ADojoArenaCrowd::GiveSouvenir(int32 FanIndex)
    {
    	FDojoArenaFan& Fan = Fans[FanIndex];
    	Fan.Excitement = 1.f;
    	Styles[Fan.StyleIndex].CheerVolume += 0.5f;
    }
  bugLine: 5
  fix: Keep any extra loudness on the fan itself, for example a per-fan bonus field, and leave the shared style untouched.
  explanation: The style is shared by about a thousand fans, so raising its volume makes all of them louder.
- id: why-instancing
  type: multiple-choice
  prompt: "Why draw forty identical torches with one instanced static mesh component instead of forty actors?"
  choices:
    - Instanced torches can be different meshes each
    - One component shares the mesh and draws every copy from a list of transforms, instead of forty components each with its own overhead
    - Actors cannot hold meshes
    - Instancing makes torches tick faster
  answerIndex: 1
  explanation: The shared mesh is given once and each torch is only a transform, which saves components and lets the renderer draw them together.
- id: explain-sharing
  type: explain-in-one-sentence
  prompt: In one sentence, say how the crowd stops paying for three thousand copies of three styles.
  modelAnswer: Each style is stored once in the crowd, and each fan keeps only its own seat and excitement plus a small index to its style, which it never changes.
  rubric:
    - Says the shared style is stored once and referenced by each fan
    - Says each fan keeps only what differs, or that the shared part is not changed by a fan
  explanation: Store the common part once; keep the differences per copy.
```
