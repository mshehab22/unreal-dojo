---
id: f2-weak-and-soft-references
title: Weak and soft references point without owning
order: 6
kind: concept
difficulty: 3
patterns: []
skills: [memory, references]
terms: [tweakobjectptr, tsoftobjectptr, tobjectptr, isvalid]
prerequisites: [f2-clay-disc]
xp: 30
estimatedMinutes: 7
concepts:
  - A strong reference keeps an object alive; a weak one only watches it
  - A soft reference names an asset by path and loads it when asked
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a camera holds `TWeakObjectPtr<AActor> Followed;` set to an enemy. The enemy is destroyed. What does `Followed.IsValid()` return right after?"
choices:
  - True, until garbage collection runs
  - False, straight away
  - It crashes the game
  - True forever, weak pointers never change
answerIndex: 1
explanation: A weak pointer's validity check also answers false for an object marked as garbage, so it turns false as soon as the enemy is destroyed.
```

# Card

There are three ways to point at a UObject, and the difference is ownership.

A **strong** reference, a `UPROPERTY` `TObjectPtr<T>`, tells the garbage collector "I need this": an object nobody destroyed stays alive as long as the holder is reachable. An actor that someone destroys is different: the strong reference does not save it, it only keeps pointing at a ghost until the next collection sets it to null. Use strong references for things you own or must keep, such as your own components and the targets in your own list.

A **weak** reference, `TWeakObjectPtr<T>`, only watches. It never keeps the object alive, and `IsValid()` on it answers false as soon as the object is destroyed or collected; `Get()` then returns nullptr. Use it for things you do not own: a camera following an enemy, a turret's current target, a widget showing a pawn's health. It needs no UPROPERTY.

A **soft** reference, `TSoftObjectPtr<T>` or `TSoftClassPtr<T>`, names an asset by its path and does not load it. A designer picks the asset in Details like any other; your code loads it only when needed, with `LoadSynchronous()` or the asynchronous streamable manager. Use it for big things you might never need, such as the mesh for every skin in a shop, so they do not all load with the level.

Choosing wrong has costs that go both ways: a strong reference to something you do not own claims an ownership you do not have and needs an IsValid check on every read to avoid the ghost, and a weak reference to something you do own can let it be collected under you.

# Example

```cpp
UCLASS()
class ADojoF2ChaseCamera : public AActor
{
	GENERATED_BODY()

public:
	// Owned and always needed: strong.
	UPROPERTY(VisibleAnywhere, Category = "Camera")
	TObjectPtr<UCameraComponent> Camera;

	// Picked in Details, loaded only when the photo mode opens: soft.
	UPROPERTY(EditAnywhere, Category = "Camera")
	TSoftObjectPtr<UTexture2D> PhotoFrame;

	// Not ours; any system may destroy it: weak.
	TWeakObjectPtr<AActor> Followed;
};
```

# Questions

```yaml
- id: pick-pointer
  type: multiple-choice
  prompt: "A health bar widget shows the health of whichever pawn the player is aiming at. The pawn can die at any time. How should the widget refer to the pawn?"
  choices:
    - A UPROPERTY TObjectPtr, so the pawn stays alive while shown
    - A TWeakObjectPtr, checked before every read
    - A TSoftObjectPtr, loaded when the bar opens
    - A raw pointer, because widgets are not actors
  answerIndex: 1
  explanation: The widget does not own the pawn, and it must notice when the pawn is gone.
- id: fill-load
  type: fill-blank
  prompt: "To load the asset behind a TSoftObjectPtr right now and get a pointer to it, call ___()."
  acceptedAnswers: [LoadSynchronous]
  explanation: LoadSynchronous blocks until the asset is loaded; for big assets the asynchronous streamable manager avoids the hitch.
- id: spot-strong-watch
  type: spot-the-bug
  prompt: After an enemy is destroyed, this camera keeps following its ghost until the next garbage collection, because code checks Followed against nullptr. Which line is wrong?
  code: |
    UCLASS()
    class ADojoF2ChaseCamera : public AActor
    {
    	GENERATED_BODY()
    	UPROPERTY()
    	TObjectPtr<AActor> Followed;
    };
  bugLine: 6
  fix: Make Followed a TWeakObjectPtr, without UPROPERTY, and check IsValid before using it.
  explanation: A strong reflected reference is only set to null when the collector runs, so between Destroy and the next collection it still points at an enemy that has left play; a weak pointer reports it gone at once.
- id: soft-use
  type: multiple-choice
  prompt: "Which case is the best fit for a soft reference?"
  choices:
    - The mesh component every door has
    - The current target of a turret
    - A shop listing fifty character skins, each with its own mesh asset
  answerIndex: 2
  explanation: Soft references keep fifty meshes out of memory until a player actually picks one.
- id: explain-weak
  type: explain-in-one-sentence
  prompt: In one sentence, say when to use a weak pointer instead of a strong one.
  modelAnswer: Use a weak pointer for an object you do not own and that someone else may destroy, so you never keep it alive and can tell when it is gone.
  rubric:
    - Mentions not owning the object
    - Mentions that the weak pointer does not keep it alive or detects that it is gone
  explanation: Ownership decides the pointer type.
```
