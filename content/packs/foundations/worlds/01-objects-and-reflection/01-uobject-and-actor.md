---
id: f1-uobject-and-actor
title: UObjects, actors, and the class default object
order: 1
kind: concept
difficulty: 1
patterns: []
skills: [object-model]
terms: [uobject, actor, cdo, coding-standard, beginplay]
prerequisites: []
xp: 20
estimatedMinutes: 5
concepts:
  - Every engine type the editor can see derives from UObject
  - An actor is a UObject that can be placed in a world
  - The constructor builds the class default object, so it only sets defaults
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a new actor class logs a line from its constructor. You open the editor, but you have not placed the actor anywhere and nobody has pressed Play. Does the line appear in the log?"
choices:
  - No, constructors only run when an actor is spawned during play
  - Yes, at least once, because the engine builds a template object of the class
  - Only if the class is also used by a Blueprint
  - Only in a packaged game, never in the editor
answerIndex: 1
explanation: The engine runs each constructor once at startup to build the class default object, the template every later instance copies, so the line appears before anything is placed.
```

# Card

Almost every type you will write in Unreal sits on one family tree with **UObject** at the root. Deriving from UObject is what lets the engine save the object, collect it when nothing uses it, and show it in the editor.

An **actor** (`AActor`) is a UObject that can live in a level: it has a place in the world, it can be spawned and destroyed, and it gets lifecycle calls such as `BeginPlay`. Doors, pickups, and the player's character are actors. Data that never needs a place in the world, such as an item definition, can stay a plain UObject.

Names carry the type, following Epic's coding standard: `A` for actors, `U` for other UObjects, `F` for plain structs, `E` for enums, `b` for booleans. The header tool relies on these prefixes and refuses a reflected class without the right one.

When the engine starts, it runs each class's constructor once to build the **class default object** (CDO). Every actor you place or spawn begins as a copy of it. That is why a constructor should only create components and set default values: it often runs when no world exists, so it cannot find other actors or start gameplay. Runtime setup belongs in `BeginPlay`.

# Example

```cpp
// A crate the yard places in a level: it needs a location, so it is an actor.
UCLASS()
class ADojoF1SupplyCrate : public AActor
{
	GENERATED_BODY()

public:
	ADojoF1SupplyCrate()
	{
		// Runs for the class default object too: defaults only.
		PrimaryActorTick.bCanEverTick = false;
	}

protected:
	virtual void BeginPlay() override
	{
		Super::BeginPlay();

		// Runs once this crate is in a world that has started play.
		UE_LOG(LogTemp, Log, TEXT("%s is ready"), *GetName());
	}

	// Copied from the class default object into every crate, unless a designer edits that crate.
	UPROPERTY(EditAnywhere, Category = "Crate")
	int32 StartingRations = 4;
};
```

# Questions

```yaml
- id: pick-the-base
  type: multiple-choice
  prompt: "Which of these should be a plain UObject rather than an actor?"
  choices:
    - A door that swings open in the level
    - A turret the player can destroy
    - A recipe describing which items craft a sword
    - A trigger box that starts a cutscene
  answerIndex: 2
  explanation: A recipe has no position and never appears in the level, so the extra weight of an actor buys nothing.
- id: fill-prefix
  type: fill-blank
  prompt: "Following Epic's coding standard, a class that derives from AActor and represents a lever is named ___DojoLever."
  acceptedAnswers: [A]
  explanation: Actor classes take the A prefix; the header tool checks it on reflected classes.
- id: spot-constructor-lookup
  type: spot-the-bug
  prompt: This crate is meant to remember the first player pawn in the world. Which line belongs somewhere else?
  code: |
    ADojoF1SupplyCrate::ADojoF1SupplyCrate()
    {
    	PrimaryActorTick.bCanEverTick = false;
    	CachedPawn = UGameplayStatics::GetPlayerPawn(this, 0);
    }
  bugLine: 4
  fix: Move the lookup into BeginPlay, where the crate is in a world that has started play.
  explanation: The constructor also builds the class default object, often with no world at all, so a world lookup there finds nothing.
- id: explain-cdo
  type: explain-in-one-sentence
  prompt: In one sentence, say why a constructor should only set defaults and create components.
  modelAnswer: The constructor runs to build the class default object, often before any world exists, so anything that needs a world or other actors must wait for BeginPlay.
  rubric:
    - Mentions the class default object or a template every instance copies
    - Says no world or other actors are available yet
  explanation: Treat the constructor as filling in a form that every copy starts from, not as the moment the actor comes alive.
```
