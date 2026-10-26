---
id: p11-flyweight-when-not
title: When sharing costs more than it saves
order: 6
kind: concept
difficulty: 2
patterns: [flyweight]
skills: [flyweight, architecture]
terms: [instanced-static-mesh, static-mesh-component, profiling]
prerequisites: [p11-torch-refactor]
xp: 25
estimatedMinutes: 7
concepts:
  - A few dozen copies, or a small shared part, are not worth the indirection
  - Copies that each need to change the shared part are not sharing it
  - Instances that need their own collision, physics, or behavior are actors or components, not instances
  - Measure memory and draw calls before and after; do not share on a guess
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: the arena has six banners, each with its own text and color, and nothing else repeats. A teammate proposes a shared banner-style registry and a banner struct with a style index. Is it worth it?"
choices:
  - Yes, always share
  - No; six banners with mostly unique data save nothing, and the registry is extra code to read
  - Yes, but only with an instanced mesh
  - Only if the banners tick
answerIndex: 1
explanation: Sharing pays when many copies repeat the same data. Six mostly unique banners have nothing to share.
```

# Card

Sharing the common part pays when there are many copies and most of their data repeats. Outside that, it is indirection to read through.

**Few copies, or little in common.** A dozen torches, or banners that are mostly unique, cost almost nothing to store separately. A shared part and an index make every read go through one more step, for a saving too small to see.

**Copies that each change the shared part.** If every fan's chant turns personal as the match goes on, the chant is not shared; it is each fan's own. Forcing it into a shared style means either writing to the shared part (and changing everyone) or copying it on every change, which loses the saving and adds bookkeeping.

**Instances that need to be objects.** An instance in an instanced static mesh is a transform and a few floats. It has no collision events of its own, no physics body you can push on its own, no tick, and no Blueprint logic. A destructible pillar that players topple one at a time, with its own hit points and physics, is an actor or at least its own component. Instancing suits many things that look alike and mostly stand still.

**Hot code and indirection.** An index into a shared list is one more memory read per use. In code that touches every copy every frame, that can cost more than the memory it saves, or less; measure both before and after with the engine's profiling tools, such as Unreal Insights and `stat` commands, rather than deciding on a guess.

# Example

```cpp
// Right-sized: six unique banners keep their own data; there is nothing to share.
UPROPERTY(EditAnywhere, Category = "Banner")
FText Motto;

UPROPERTY(EditAnywhere, Category = "Banner")
FColor Color = FColor::Blue;
```

# Questions

```yaml
- id: when-not-few
  type: multiple-choice
  prompt: "Which of these benefits least from sharing a common part?"
  choices:
    - Five thousand fans in four styles
    - Four hundred seats of one mesh
    - Six banners that are each unique
    - Two hundred torches of one mesh
  answerIndex: 2
  explanation: Unique banners repeat nothing, so there is nothing to store once.
- id: when-not-physics
  type: multiple-choice
  prompt: "Thirty pillars look alike, but players topple them one at a time, each with its own hit points and a physics fall. What should a pillar be?"
  choices:
    - An instance in an instanced static mesh component
    - Its own actor or component, sharing the same mesh asset
    - A float in a list
    - A data table row
  answerIndex: 1
  explanation: Each pillar needs its own physics and state. They can still share one mesh asset, which is itself a form of sharing.
- id: spot-private-change
  type: spot-the-bug
  prompt: Fans share chant styles, but the design lets each fan make up a personal chant. Which line shows the chant was never shared state?
  code: |
    void ADojoArenaCrowd::Improvise(int32 FanIndex, const FText& Line)
    {
    	FDojoArenaFan& Fan = Fans[FanIndex];
    	Styles[Fan.StyleIndex].Chant = Line;
    	Fan.Excitement = 1.f;
    }
  bugLine: 4
  fix: Keep a personal chant on the fan when it has one, and fall back to the style's chant otherwise; or drop the chant from the shared style.
  explanation: A value each fan sets for itself belongs to the fan; writing it to the style rewrites the chant of every fan in that style.
- id: when-not-measure
  type: multiple-choice
  prompt: "Before swapping a per-copy struct for an index into a shared list in code that runs every frame, what should you do?"
  choices:
    - Nothing; sharing is always faster
    - Measure memory and frame time before and after, with Unreal Insights or stat commands
    - Add a mutex
    - Make the list a singleton
  answerIndex: 1
  explanation: The extra read can cost or save time depending on the data layout; only measurement tells.
- id: explain-when-not
  type: explain-in-one-sentence
  prompt: In one sentence, say when sharing a common part is the wrong choice.
  modelAnswer: When there are few copies or little data in common, when each copy needs to change the supposedly shared part, or when each copy needs its own physics or behavior, since then the indirection costs more than it saves.
  rubric:
    - Names a case such as few copies, little in common, per-copy changes, or per-copy physics or behavior
    - Says the indirection or bookkeeping outweighs the saving
  explanation: Share when many copies repeat the same data and only read it.
```
