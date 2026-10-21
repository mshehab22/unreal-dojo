---
id: f4-subsystems
title: Subsystems, services the engine creates for you
order: 8
kind: concept
difficulty: 3
patterns: []
skills: [framework]
terms: [subsystem, world-subsystem, game-instance-subsystem, world, game-instance]
prerequisites: [f4-worlds-and-levels]
xp: 30
estimatedMinutes: 7
concepts:
  - A subsystem is created and destroyed with the object it belongs to
  - Pick the owner by how long the service must live
  - Subsystems replace hand-made singletons
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a class derives from `UWorldSubsystem`. Who creates it?"
choices:
  - You, with NewObject in the game mode's BeginPlay
  - The engine, automatically, once for every world
  - A Blueprint placed in the level
  - The game instance, once for the whole game
answerIndex: 1
explanation: Subsystems are created and destroyed by the engine alongside their owner; a world subsystem gets one instance per world.
```

# Card

Many games need one shared service: a registry of targets, a quest tracker, a save manager. The old answer was a singleton, a global you create yourself and must remember to clean up. Unreal's answer is a **subsystem**: derive from one of the subsystem base classes and the engine creates one instance alongside its owner and destroys it with that owner. You never call NewObject for it.

Pick the owner by how long the service must live:

- `UWorldSubsystem`: one per world. Gone when the level changes. A registry of the targets in this level.
- `UGameInstanceSubsystem`: one per game instance. Survives level changes. A save manager or a quest log.
- `ULocalPlayerSubsystem`: one per local player. Split screen settings, input settings.
- `UEngineSubsystem` and `UEditorSubsystem`: one for the engine or the editor. Tools.

Reach one from anything that knows its owner: `GetWorld()->GetSubsystem<UDojoF4TargetRegistry>()`, or `GetGameInstance()->GetSubsystem<T>()`. Blueprint gets a getter node for each subsystem for free.

Override `Initialize` and `Deinitialize` for setup and teardown, and `ShouldCreateSubsystem` to skip some worlds (for example, not in the editor's preview worlds). A subsystem is a UObject, so its UObject pointer members need UPROPERTY like any other.

A world subsystem does not know which actors exist unless they tell it. The usual shape is a small component that registers its owner in BeginPlay and unregisters in EndPlay.

# Example

```cpp
// One per world: keeps the bells of the current level so anything can ring them all.
UCLASS()
class UDojoF4BellTower : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	void AddBell(ADojoF1PracticeBell* Bell) { Bells.AddUnique(Bell); }

	void RingAll(float Force)
	{
		for (ADojoF1PracticeBell* Bell : Bells)
		{
			if (IsValid(Bell)) Bell->Strike(Force);
		}
	}

private:
	UPROPERTY()
	TArray<TObjectPtr<ADojoF1PracticeBell>> Bells;
};
```

# Questions

```yaml
- id: pick-owner
  type: multiple-choice
  prompt: "A settings service must keep the chosen subtitle size while the player travels from the menu to every level. Which base class fits?"
  choices: [UWorldSubsystem, UGameInstanceSubsystem, UActorComponent, AGameModeBase]
  answerIndex: 1
  explanation: The game instance lives for the whole game, so its subsystem survives level changes.
- id: fill-get-subsystem
  type: fill-blank
  prompt: "From an actor, a world subsystem is reached with GetWorld()->___<UDojoF4TargetRegistry>()."
  acceptedAnswers: [GetSubsystem]
  explanation: GetSubsystem returns the one instance the engine made for this world.
- id: spot-newobject-subsystem
  type: spot-the-bug
  prompt: Two registries exist in the same level and half the targets are missing from each. Which line is wrong?
  code: |
    void ADojoF4Target::BeginPlay()
    {
    	Super::BeginPlay();
    	UDojoF4TargetRegistry* Registry = NewObject<UDojoF4TargetRegistry>(this);
    	Registry->Register(this);
    }
  bugLine: 4
  fix: Get the existing registry with GetWorld()->GetSubsystem instead of creating a new one.
  explanation: The engine already made one registry for this world; NewObject makes a separate, private one.
- id: singleton-why
  type: multiple-choice
  prompt: "Why is a subsystem preferred over a hand-made global singleton?"
  choices:
    - It runs faster
    - The engine creates and destroys it with a clear owner, so it never outlives its world or game
    - It can only be used from Blueprint
  answerIndex: 1
  explanation: Lifetime is managed for you, and each world in the editor gets its own.
- id: explain-registration
  type: explain-in-one-sentence
  prompt: In one sentence, say how a world subsystem learns which targets are in the level without searching every actor.
  modelAnswer: Each target carries a small component that registers its owner with the subsystem in BeginPlay and unregisters it in EndPlay.
  rubric:
    - Mentions the targets registering themselves
    - Mentions unregistering when they leave play
  explanation: The next build quest is exactly this.
```
