---
id: f4-worlds-and-levels
title: Worlds, levels, and GameplayStatics
order: 7
kind: concept
difficulty: 2
patterns: []
skills: [framework]
terms: [world, level, open-level, gameplay-statics, game-instance]
prerequisites: [f4-actor-lifecycle]
xp: 25
estimatedMinutes: 6
concepts:
  - A world holds the levels and every actor in play
  - Opening a level replaces the world and everything in it except the game instance
  - GameplayStatics is a toolbox of world-wide helpers
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an actor calls `UGameplayStatics::OpenLevel(this, TEXT(\"L_Arena\"))`. What happens to the actor that called it?"
choices:
  - It is carried over into L_Arena
  - It is destroyed with the rest of the current world when the new level loads
  - It keeps running in the background
  - Nothing; OpenLevel only works from the game instance
answerIndex: 1
explanation: Opening a level tears down the current world and its actors; only objects that live outside the world, such as the game instance, survive.
```

# Card

A **world** (`UWorld`) is the running game space: its levels, its actors, its timers, its physics. Every actor and component can reach it with `GetWorld()`, which is how they spawn actors, set timers, or find subsystems. In the editor there are separate worlds for editing and for Play in Editor.

A **level** (`ULevel`, saved as a map asset) is a set of placed actors. A world has one persistent level and may stream more levels in and out while the game runs, which is how large maps load piece by piece.

`UGameplayStatics::OpenLevel(WorldContext, LevelName)` travels to another map: the current world and all its actors are torn down and a fresh world is built from the new map. Anything that must survive the trip lives on the game instance or a game instance subsystem.

`UGameplayStatics` is a toolbox of static functions that need a world context object (usually `this`): `GetPlayerController`, `GetPlayerPawn`, `GetGameMode`, `GetAllActorsOfClass`, `ApplyDamage`, `SpawnSound2D`, `OpenLevel`. They are convenient, but some are slow when used often: `GetAllActorsOfClass` walks every actor in the world, so call it once and keep the result, or better, let actors register themselves with something that keeps the list.

# Example

```cpp
// Ends the practice session and returns to the menu, keeping the best score on the game instance.
void ADojoF4YardExit::Leave()
{
	if (UDojoF4YardInstance* Instance = GetGameInstance<UDojoF4YardInstance>())
	{
		Instance->BestScore = FMath::Max(Instance->BestScore, CurrentScore);
	}

	UGameplayStatics::OpenLevel(this, TEXT("L_Menu"));
}
```

# Questions

```yaml
- id: survives-travel
  type: multiple-choice
  prompt: "Which of these survives OpenLevel?"
  choices: [The game mode, The player's pawn, The game instance, Every placed actor]
  answerIndex: 2
  explanation: The game instance lives outside the world and lasts for the whole game.
- id: fill-world
  type: fill-blank
  prompt: "From inside an actor, the world it belongs to is returned by ___()."
  acceptedAnswers: [GetWorld]
  explanation: GetWorld is the door to spawning, timers, and subsystems.
- id: spot-get-all-in-tick
  type: spot-the-bug
  prompt: The frame rate drops as the level fills up with actors. Which line is the cost?
  code: |
    void ADojoF4Radar::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	UGameplayStatics::GetAllActorsOfClass(this, ADojoF1PopupTarget::StaticClass(), Found);
    	ShowCount(Found.Num());
    }
  bugLine: 4
  fix: Find the targets once, or have targets register with a registry, instead of searching every actor every frame.
  explanation: GetAllActorsOfClass walks every actor in the world each time it is called.
- id: streaming
  type: multiple-choice
  prompt: "A huge open map should load the area around the player and unload far areas. Which feature fits?"
  choices: [OpenLevel every time the player moves, Level streaming, A bigger game instance]
  answerIndex: 1
  explanation: Streaming levels load and unload into the same world without tearing it down.
- id: explain-world-context
  type: explain-in-one-sentence
  prompt: In one sentence, say why GameplayStatics functions take a world context object.
  modelAnswer: They are static functions with no world of their own, so the context object tells them which world to act on, since the editor can have several worlds at once.
  rubric:
    - Says the functions are static or have no world of their own
    - Mentions choosing the right world
  explanation: Passing this from an actor is almost always the right context.
```
