---
id: m4-spawning-with-care
title: Spawning where there is room, configured before it begins
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [spawning]
terms: [spawnactor, tsubclassof, spawn-collision-handling, spawn-actor-deferred, frandomstream]
prerequisites: [m4-yard-plan]
xp: 30
estimatedMinutes: 9
concepts:
  - A spawn can be told what to do when its spot is blocked, and may then hand back nothing
  - A deferred spawn lets you set properties before BeginPlay runs
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: code spawns a crate whose box blocks everything, at a spot inside a wall, with SpawnCollisionHandlingOverride set to DontSpawnIfColliding. What does SpawnActor return?"
choices:
  - A crate inside the wall, because spawning ignores collision
  - A crate moved to the nearest free spot
  - nullptr, and no crate exists
  - A crate that is hidden until the wall moves
answerIndex: 2
explanation: With that setting the world checks the new actor's shapes against blocking geometry first, and refuses the spawn when they would sit inside something they block. The call hands back nullptr.
```

# Card

`GetWorld()->SpawnActor<T>(Class, Location, Rotation, Parameters)` makes a new actor in the level, and an `FActorSpawnParameters` says how. Three of its fields matter most here.

**What to do if the spot is blocked.** `SpawnCollisionHandlingOverride` takes an `ESpawnActorCollisionHandlingMethod`:

- `AlwaysSpawn`: put it there, inside a wall if need be. This is every actor's default unless its class says otherwise.
- `AdjustIfPossibleButAlwaysSpawn`: try a nearby free spot, and spawn anyway if none is found.
- `AdjustIfPossibleButDontSpawnIfColliding`: try a nearby free spot, and give up if none is found.
- `DontSpawnIfColliding`: give up at once if the spot is blocked.

The check uses the new actor's own shapes and their responses: a crate that blocks walls cannot appear inside a wall, while a trigger that only overlaps can appear anywhere. When the spawn gives up, `SpawnActor` returns **nullptr**, so the result must be checked before it is used or counted. The engine logs the refusal in the `LogSpawn` category.

**Who it belongs to.** `Owner` and `Instigator` record who made the actor and who is responsible for what it does, such as the pawn that fired a projectile; a projectile can then ignore its own instigator.

**Setting it up before it starts.** `SpawnActor` runs the whole construction, including `BeginPlay`, before it returns, so a property you set afterwards is too late for anything `BeginPlay` reads. `SpawnActorDeferred<T>(Class, Transform)` stops just before that point and hands you the actor; set its properties, then call `FinishSpawning(Transform)` to run construction and `BeginPlay` with your values in place. Every deferred spawn must be finished.

Spawn points often come from chance. `FMath::FRandRange` uses the engine's shared random sequence, which changes from run to run. An **`FRandomStream`** built from a seed gives the same sequence every time for that seed: `FRandomStream Stream(Seed)` and then `Stream.FRandRange(Min, Max)` or `Stream.RandPointInBox(Box)`. A designer can replay a layout by its seed, and a test can rely on it.

Spawning many actors every second has a cost, which is where an object pool, a pattern the patterns pack covers later, comes in. For a few dozen props per round, spawning and destroying is fine.

# Example

```cpp
ADojoCannonball* ADojoCannon::Fire(float Speed)
{
	const FTransform Muzzle = MuzzlePoint->GetComponentTransform();

	ADojoCannonball* Ball = GetWorld()->SpawnActorDeferred<ADojoCannonball>(BallClass, Muzzle, this, GetInstigator(), ESpawnActorCollisionHandlingMethod::AlwaysSpawn);
	if (!Ball)
	{
		return nullptr;
	}

	Ball->LaunchSpeed = Speed;
	Ball->FinishSpawning(Muzzle);
	return Ball;
}
```

# Questions

```yaml
- id: null-spawn
  type: spot-the-bug
  prompt: A spawner counts how many crates it has made, but its count is sometimes higher than the number of crates in the level. Which line is wrong?
  code: |
    FActorSpawnParameters Parameters;
    Parameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::DontSpawnIfColliding;
    AActor* Crate = GetWorld()->SpawnActor<AActor>(CrateClass, Spot, FRotator::ZeroRotator, Parameters);
    Made++;
  bugLine: 4
  fix: Count the crate only when SpawnActor returned one, because a blocked spot makes it return nullptr.
  explanation: With DontSpawnIfColliding a blocked spot is a normal outcome, not an error, and it hands back nullptr.
- id: deferred-why
  type: multiple-choice
  prompt: "A bomb reads its fuse length in BeginPlay. Code spawns it with SpawnActor and then sets FuseSeconds. What happens?"
  choices:
    - BeginPlay already ran, with the old FuseSeconds
    - BeginPlay waits a moment and then sees the new FuseSeconds
    - The spawn fails because a property changed afterwards
  answerIndex: 0
  explanation: SpawnActor returns after BeginPlay. SpawnActorDeferred and FinishSpawning put your code in between.
- id: fill-finish
  type: fill-blank
  prompt: "After SpawnActorDeferred and setting its properties, an actor only begins play once you call ___(Transform)."
  acceptedAnswers: [FinishSpawning, "Actor->FinishSpawning"]
  explanation: FinishSpawning runs the construction script and BeginPlay; a deferred actor left unfinished never starts.
- id: seed
  type: multiple-choice
  prompt: "Why would a scatterer take a seed and use FRandomStream instead of FMath::FRandRange?"
  choices:
    - FRandomStream runs faster than the shared global generator does
    - FMath::FRandRange cannot return a negative number in any range
    - The same seed gives the same points, so a layout can replay
  answerIndex: 2
  explanation: A stream's sequence depends only on its seed; the shared generator depends on everything else that used it first.
- id: adjust
  type: multiple-choice
  prompt: "Which collision handling method gives a crate a nearby free spot when its spot is blocked, and spawns nothing if there is none?"
  choices:
    - AlwaysSpawn
    - AdjustIfPossibleButAlwaysSpawn
    - AdjustIfPossibleButDontSpawnIfColliding
    - DontSpawnIfColliding
  answerIndex: 2
  explanation: The Adjust methods look for a free spot near the requested one; the DontSpawn half decides what happens when there is none.
- id: explain-deferred
  type: explain-in-one-sentence
  prompt: In one sentence, say when you need SpawnActorDeferred instead of SpawnActor.
  modelAnswer: When the new actor must have a property set before its construction and BeginPlay run, because SpawnActor runs them before it returns.
  rubric:
    - Says the property must be set before BeginPlay or construction
    - Says SpawnActor has already run BeginPlay when it returns
  explanation: Deferred spawning splits creation from starting, so configuration happens in between.
```
