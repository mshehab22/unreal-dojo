---
id: f2-tsubclassof-and-spawning
title: TSubclassOf picks a class; SpawnActor makes one
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [memory, spawning]
terms: [tsubclassof, spawnactor, constructor-helpers, cdo]
prerequisites: [f2-garbage-collection]
xp: 25
estimatedMinutes: 6
concepts:
  - TSubclassOf holds a class limited to a base type and its children
  - SpawnActor places a new actor of a given class in the world
  - Class choices belong in properties, not in hard-coded asset paths
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a tower has `UPROPERTY(EditAnywhere) TSubclassOf<ADojoF2Arrow> ArrowClass;`. A designer opens its class picker in Details. Which classes can they choose?"
choices:
  - Any class in the project
  - Only ADojoF2Arrow itself
  - ADojoF2Arrow and every C++ or Blueprint class derived from it
  - Only Blueprint classes
answerIndex: 2
explanation: TSubclassOf limits the picker to the base class and its children, including Blueprint children.
```

# Card

Sometimes code needs to know which kind of thing to make, not a specific thing. A pointer like `ADojoF2Arrow*` refers to one arrow in the world; a **class** is the recipe for making arrows.

`TSubclassOf<ADojoF2Arrow>` holds a class, limited to `ADojoF2Arrow` and its children. As a `UPROPERTY(EditAnywhere)` it shows a class picker in Details, and designers can pick a Blueprint child with its own mesh and numbers. In C++, `ADojoF2Arrow::StaticClass()` is the class of the C++ type itself, a sensible default to set in the constructor.

To make an actor of that class at run time, ask the world: `GetWorld()->SpawnActor<ADojoF2Arrow>(ArrowClass, Location, Rotation)`. It returns the new actor, or nullptr if spawning failed (for example when the class is empty). Each new actor starts as a copy of that class's default object, then runs its own BeginPlay.

Old code fills such choices with `ConstructorHelpers::FClassFinder` and a content path typed into the constructor. That breaks when an asset is moved or renamed and hides the choice from designers. A TSubclassOf property is the Unreal way.

# Example

```cpp
UCLASS()
class ADojoF2Tower : public AActor
{
	GENERATED_BODY()

public:
	ADojoF2Tower()
	{
		ArrowClass = ADojoF2Arrow::StaticClass();
	}

	// Any arrow class, C++ or Blueprint, picked in Details.
	UPROPERTY(EditAnywhere, Category = "Tower")
	TSubclassOf<ADojoF2Arrow> ArrowClass;

	// Makes one arrow of the picked class at the tower's tip.
	ADojoF2Arrow* Fire()
	{
		if (!ArrowClass) return nullptr;

		return GetWorld()->SpawnActor<ADojoF2Arrow>(ArrowClass, GetActorLocation(), GetActorRotation());
	}
};
```

# Questions

```yaml
- id: class-or-instance
  type: multiple-choice
  prompt: "A spawner needs to know which kind of enemy to create. Which member type fits?"
  choices:
    - TObjectPtr<ADojoF2Enemy>
    - TSubclassOf<ADojoF2Enemy>
    - ADojoF2Enemy
    - TArray<ADojoF2Enemy>
  answerIndex: 1
  explanation: The spawner needs a class to make new enemies from, not a pointer to one enemy that already exists.
- id: fill-static-class
  type: fill-blank
  prompt: "To default a TSubclassOf to the C++ class ADojoF2Arrow itself, assign ADojoF2Arrow::___()."
  acceptedAnswers: [StaticClass]
  explanation: StaticClass returns the UClass that describes a C++ type.
- id: spot-unchecked-spawn
  type: spot-the-bug
  prompt: A designer cleared the Arrow Class field, and now firing crashes. Which line should have been guarded?
  code: |
    void ADojoF2Tower::Fire()
    {
    	ADojoF2Arrow* Arrow = GetWorld()->SpawnActor<ADojoF2Arrow>(ArrowClass, GetActorLocation(), GetActorRotation());
    	Arrow->Launch(GetActorForwardVector());
    }
  bugLine: 4
  fix: Check that Arrow is not null before calling Launch, and return early if it is.
  explanation: SpawnActor returns nullptr when it cannot spawn, for example with an empty class.
- id: helpers-problem
  type: multiple-choice
  prompt: "Why is a TSubclassOf property preferred over ConstructorHelpers::FClassFinder with a content path?"
  choices:
    - FClassFinder cannot find C++ classes
    - The path breaks when the asset moves, and designers cannot change the choice
    - TSubclassOf loads faster in every case
  answerIndex: 1
  explanation: A property keeps the choice visible and editable and survives asset moves through redirectors.
- id: explain-tsubclassof
  type: explain-in-one-sentence
  prompt: In one sentence, say what TSubclassOf adds over a plain UClass pointer.
  modelAnswer: It limits the class to a given base type and its children, so the editor picker and the compiler both reject unrelated classes.
  rubric:
    - Mentions the limit to a base class and its children
    - Mentions the picker or type safety
  explanation: A bare UClass property would let a designer pick a lamp class for an arrow slot.
```
