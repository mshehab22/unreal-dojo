---
id: f2-creating-objects
title: CreateDefaultSubobject, NewObject, and SpawnActor
order: 8
kind: concept
difficulty: 2
patterns: []
skills: [memory, object-model]
terms: [createdefaultsubobject, newobject, spawnactor, cdo]
prerequisites: [f2-spotter]
xp: 25
estimatedMinutes: 6
concepts:
  - Three ways to make a UObject, each for one situation
  - The outer passed to NewObject says which object it belongs to
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: inside an actor's BeginPlay, code calls `CreateDefaultSubobject<USphereComponent>(TEXT(\"Extra\"))`. What happens?"
choices:
  - A new sphere is added, the same as in the constructor
  - The engine reports an error, because that function only works inside a constructor
  - The sphere replaces the root component
  - Nothing, the call is ignored silently
answerIndex: 1
explanation: CreateDefaultSubobject is for building the class default object's parts, so the engine stops you from calling it outside a constructor.
```

# Card

Plain `new` is never used for UObjects. There are three creators, and each has one job.

- `CreateDefaultSubobject<T>(TEXT("Name"))` makes the parts every instance has from the start, almost always components. It only works inside a constructor, because those parts become part of the class default object and are copied into every instance. The name must be unique inside the class.
- `NewObject<T>(Outer)` makes a UObject at run time that is not an actor: an item instance, a quest step, a component added later. The **outer** is the object it belongs to; it decides the object's full path, and an object made with a short-lived outer goes when that outer goes. Hold the result in a UPROPERTY, or the collector may free it.
- `GetWorld()->SpawnActor<T>(Class, Location, Rotation)` makes an actor and places it in the world. Actors are never made with NewObject, because they need a level, a location, and BeginPlay.

A component made with NewObject during play also needs `RegisterComponent()` before it works. Components made with CreateDefaultSubobject are registered for you when the actor enters the world, spawned or loaded with its level.

# Example

```cpp
ADojoF2Chest::ADojoF2Chest()
{
	// A part of every chest: made once into the class default object.
	Lid = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Lid"));
	RootComponent = Lid;
}

void ADojoF2Chest::Open()
{
	// Not an actor, made at run time, owned by this chest.
	Contents = NewObject<UDojoF2Loot>(this);

	// An actor, so the world makes it.
	GetWorld()->SpawnActor<ADojoF2Sparkle>(SparkleClass, GetActorLocation(), FRotator::ZeroRotator);
}
```

# Questions

```yaml
- id: pick-creator
  type: multiple-choice
  prompt: "A quest system creates a quest-step object each time the player accepts a quest. The step has no location. Which creator fits?"
  choices: [CreateDefaultSubobject, NewObject, SpawnActor, "new"]
  answerIndex: 1
  explanation: A run-time UObject that is not an actor is made with NewObject and an outer.
- id: fill-outer
  type: fill-blank
  prompt: "In NewObject<UDojoF2Loot>(this), the argument this is the new object's ___."
  acceptedAnswers: [outer, Outer]
  explanation: The outer is the object the new one belongs to.
- id: spot-new-actor
  type: spot-the-bug
  prompt: This sparkle never appears in the level and never runs BeginPlay. Which line is wrong?
  code: |
    void ADojoF2Chest::Open()
    {
    	Contents = NewObject<UDojoF2Loot>(this);
    	ADojoF2Sparkle* Sparkle = NewObject<ADojoF2Sparkle>(this);
    }
  bugLine: 4
  fix: Spawn the sparkle with GetWorld()->SpawnActor so it is placed in the level.
  explanation: NewObject makes the object but never puts an actor into a world.
- id: runtime-component
  type: multiple-choice
  prompt: "A component is added to an actor at run time with NewObject. What else must happen before it works?"
  choices:
    - Nothing, NewObject is enough
    - It must be registered with RegisterComponent
    - The level must be reloaded
  answerIndex: 1
  explanation: Registering hooks the component into the world; the engine does that for constructor-made parts when their actor is spawned or loaded.
- id: explain-cds
  type: explain-in-one-sentence
  prompt: In one sentence, say why CreateDefaultSubobject only works in a constructor.
  modelAnswer: It builds parts of the class default object that every instance copies, and the default object is only built by running the constructor.
  rubric:
    - Mentions the class default object or parts every instance copies
    - Links that to the constructor
  explanation: Run-time additions take the NewObject and register route instead.
```
