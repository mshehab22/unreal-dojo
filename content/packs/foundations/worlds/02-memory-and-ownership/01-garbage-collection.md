---
id: f2-garbage-collection
title: Garbage collection keeps what is reachable
order: 1
kind: concept
difficulty: 2
patterns: []
skills: [memory]
terms: [garbage-collection, uproperty, tobjectptr, uobject]
prerequisites: [f1-practice-bell]
xp: 25
estimatedMinutes: 6
concepts:
  - UObjects are freed when nothing reachable refers to them
  - Only references reflection knows about count
  - Freeing happens later, during a collection pass, not at the moment of destruction
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an actor creates a UObject with NewObject in BeginPlay and stores it in a plain member `UDojoF2Recipe* Recipe;` with no macro. Nothing else refers to the recipe. A minute later the actor reads Recipe. What is most likely?"
choices:
  - The recipe is fine, because the actor still points at it
  - The recipe may have been freed, and reading it can crash
  - The engine refuses to compile a UObject pointer without a macro
  - The recipe was copied into the actor, so it cannot be freed
answerIndex: 1
explanation: The garbage collector never saw the unmarked pointer, so it treated the recipe as unreachable and was free to delete it.
```

# Card

You never call `delete` on a UObject. Unreal's **garbage collector** does it for you: every so often it starts from a set of roots (the world, its levels, objects marked as roots) and follows every reference it knows about. Any UObject it cannot reach is freed.

The key words are "it knows about". The collector follows references through reflection: a `UPROPERTY` pointer member, a `UPROPERTY` array of pointers, a struct with UPROPERTY pointers inside. A plain C++ pointer member is invisible to it. The object behind such a pointer can be freed while your pointer still holds its old address, and the crash happens somewhere far away, later.

So the World 1 rule has a second reason: every UObject pointer member gets `UPROPERTY()` and is written as `TObjectPtr<T>`. `TObjectPtr` behaves like a raw pointer in a shipped game; in the editor it adds tracking that helps the engine load and check references.

Collection does not happen the moment an object stops being used. It runs on a schedule, between frames. That is why an actor that has been destroyed still sits in memory for a while, and why a pointer to it is not null afterwards; the next quests deal with that gap.

Actors are a special case: the world holds every actor in play, so an actor stays alive while it is in a level, even if nothing of yours points at it.

# Example

```cpp
UCLASS()
class ADojoF2Workbench : public AActor
{
	GENERATED_BODY()

protected:
	virtual void BeginPlay() override
	{
		Super::BeginPlay();

		// The workbench is the recipe's outer and its owner in the reference graph.
		CurrentRecipe = NewObject<UDojoF2Recipe>(this);
	}

private:
	// Reflected, so the collector follows it and keeps the recipe alive with the workbench.
	UPROPERTY()
	TObjectPtr<UDojoF2Recipe> CurrentRecipe;

	// Invisible to the collector: never do this for a UObject.
	UDojoF2Recipe* ForgottenRecipe = nullptr;
};
```

# Questions

```yaml
- id: what-keeps-alive
  type: multiple-choice
  prompt: "Which of these keeps a UObject alive through a garbage collection pass?"
  choices:
    - A local variable in a function that finished an hour ago
    - A plain pointer member with no macro
    - A UPROPERTY TObjectPtr member on an actor that is in the level
    - A log line that printed the object's name
  answerIndex: 2
  explanation: The actor is reachable from the world, and its reflected member is followed from there.
- id: fill-macro
  type: fill-blank
  prompt: "A UObject pointer member is only followed by the garbage collector when it carries ___()."
  acceptedAnswers: [UPROPERTY]
  explanation: Reflection is how the collector finds references, and UPROPERTY is what records the member.
- id: spot-unmarked-array
  type: spot-the-bug
  prompt: Recipes in this list sometimes turn into garbage reads after a few minutes of play. Which line is wrong?
  code: |
    UCLASS()
    class ADojoF2Workbench : public AActor
    {
    	GENERATED_BODY()
    	TArray<TObjectPtr<UDojoF2Recipe>> KnownRecipes;
    };
  bugLine: 5
  fix: Put UPROPERTY() on the line above the array so the collector follows every entry.
  explanation: An array of UObject pointers needs the macro just like a single pointer; otherwise every entry is invisible.
- id: when-freed
  type: multiple-choice
  prompt: "An actor is destroyed during frame 100. When is its memory freed?"
  choices:
    - Immediately inside Destroy
    - At the end of frame 100, always
    - At a later garbage collection pass, once nothing reachable refers to it
    - Never; actors are kept until the level unloads
  answerIndex: 2
  explanation: Destroy removes the actor from play; the collector frees the memory on a later pass.
- id: explain-reachable
  type: explain-in-one-sentence
  prompt: In one sentence, say how the garbage collector decides which UObjects to free.
  modelAnswer: It starts from the roots and follows every reflected reference, and frees any UObject it could not reach.
  rubric:
    - Mentions following references from roots or reachability
    - Says only reflected references count, or that unreached objects are freed
  explanation: That is why a missing UPROPERTY is a memory bug, not a style issue.
```
