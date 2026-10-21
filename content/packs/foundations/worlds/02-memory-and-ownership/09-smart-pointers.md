---
id: f2-smart-pointers
title: TSharedPtr and TUniquePtr for plain C++ objects
order: 9
kind: concept
difficulty: 3
patterns: []
skills: [memory]
terms: [tsharedptr, tuniqueptr, garbage-collection, uobject]
prerequisites: [f2-creating-objects]
xp: 25
estimatedMinutes: 6
concepts:
  - UObjects are managed by the garbage collector; plain C++ objects by smart pointers
  - Shared pointers count owners; a unique pointer has exactly one
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: someone writes `TSharedPtr<UDojoF2Loot> Loot = MakeShared<UDojoF2Loot>();`. What is wrong?"
choices:
  - Nothing, this is the modern way to make UObjects
  - UObjects are made with NewObject and owned by the garbage collector, not by a shared pointer
  - TSharedPtr only works with structs
  - MakeShared needs a world argument
answerIndex: 1
explanation: Shared pointers are for plain C++ types; a UObject must come from NewObject and live under the collector's rules.
```

# Card

Not everything in an Unreal project is a UObject. Small helper classes, parsers, path-finding caches, and the results of background tasks are often plain C++ types (`F` prefix, no reflection). The garbage collector does not know about them, so something else must free them. Unreal's own smart pointers do that.

- `TUniquePtr<T>`, made with `MakeUnique<T>(...)`: exactly one owner. When the owner goes, the object goes. It cannot be copied, only moved. Use it for a helper that one object owns privately.
- `TSharedPtr<T>`, made with `MakeShared<T>(...)`: a reference count. The object lives while any shared pointer to it exists. `TSharedRef<T>` is the same but can never be null. `TWeakPtr<T>` watches a shared object without keeping it alive.

Two rules keep the worlds apart. Never hold a UObject in these pointers: UObjects come from NewObject or SpawnActor and are owned by the collector. And a plain C++ object that holds UObject pointers must tell the collector about them (through `FGCObject`), or those UObjects can be freed under it; most code avoids this by keeping UObject references on a UObject.

Prefer Unreal's versions over `std::shared_ptr` and `std::unique_ptr`: they match the engine's containers, threading options, and Slate.

# Example

```cpp
// A plain C++ helper: no reflection, no garbage collection.
class FDojoF2RangeMap
{
public:
	int32 CountLanes() const { return Lanes; }

private:
	int32 Lanes = 6;
};

UCLASS()
class ADojoF2Range : public AActor
{
	GENERATED_BODY()

protected:
	virtual void BeginPlay() override
	{
		Super::BeginPlay();

		// Owned by this range alone, freed with it.
		Map = MakeUnique<FDojoF2RangeMap>();
	}

private:
	TUniquePtr<FDojoF2RangeMap> Map;
};
```

# Questions

```yaml
- id: pick-smart
  type: multiple-choice
  prompt: "A background task produces a plain C++ result struct that two systems read; it should be freed when both are done. Which pointer fits?"
  choices: [TUniquePtr, TSharedPtr, TObjectPtr, TWeakObjectPtr]
  answerIndex: 1
  explanation: Two owners share the result, so a reference-counted pointer frees it when the last one lets go.
- id: fill-make-unique
  type: fill-blank
  prompt: "To create a plain C++ helper owned by exactly one pointer, write TUniquePtr<FDojoF2RangeMap> Map = ___<FDojoF2RangeMap>();"
  acceptedAnswers: [MakeUnique]
  explanation: MakeUnique creates the object and its single owner in one step.
- id: spot-shared-uobject
  type: spot-the-bug
  prompt: Which line mixes the two memory systems?
  code: |
    void ADojoF2Range::BeginPlay()
    {
    	Super::BeginPlay();
    	Map = MakeUnique<FDojoF2RangeMap>();
    	Scoreboard = MakeShared<UDojoF2Scoreboard>();
    }
  bugLine: 5
  fix: Create the scoreboard with NewObject and keep it in a UPROPERTY TObjectPtr.
  explanation: A UObject belongs to the garbage collector; a shared pointer must not own one.
- id: unique-copy
  type: multiple-choice
  prompt: "What happens when code tries to copy a TUniquePtr into a second variable?"
  choices:
    - Both variables now own the object
    - The copy does not compile; ownership can only be moved
    - The object is duplicated
  answerIndex: 1
  explanation: A unique pointer allows one owner, so copying is forbidden and MoveTemp hands ownership over.
- id: explain-two-worlds
  type: explain-in-one-sentence
  prompt: In one sentence, say how you decide between NewObject and MakeShared for a new type.
  modelAnswer: If the type is a UObject it is made with NewObject and owned by the garbage collector, and if it is a plain C++ type it is made with MakeShared or MakeUnique and owned by smart pointers.
  rubric:
    - Ties UObject to NewObject or the garbage collector
    - Ties plain C++ types to the smart pointers
  explanation: The two systems each manage their own kind of object, and mixing them is a bug.
```
