---
id: f2-destroy-and-lifetime
title: Destroy, IsValid, and the end of an actor's play
order: 4
kind: concept
difficulty: 2
patterns: []
skills: [memory, lifecycle]
terms: [destroy, isvalid, endplay, garbage-collection]
prerequisites: [f2-dummy-spawner]
xp: 25
estimatedMinutes: 6
concepts:
  - Destroy removes an actor from play now and frees it later
  - IsValid catches null and actors on their way out
  - EndPlay is the place to clean up, for every reason play can end
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: `ADojoF2Crate* Crate` points at a crate. Code calls `Crate->Destroy();` and on the next line checks `if (Crate != nullptr)`. What does the check say?"
choices:
  - False, Destroy sets every pointer to the crate to null
  - True, the pointer still holds the crate's address
  - It crashes, because the crate is already freed
  - It depends on whether the crate had a mesh
answerIndex: 1
explanation: Destroy removes the crate from play and marks it as garbage, but no pointer of yours is changed and the memory is freed later.
```

# Card

`Destroy()` takes an actor out of play: it stops being part of the level, its components unregister, and it is marked as garbage. The memory itself is freed later by the garbage collector. Your pointers to it are not touched, so a destroyed actor's pointer is not null.

That is why Unreal code checks with `IsValid(Actor)` rather than `Actor != nullptr`. IsValid answers false for null and also for an object that is marked as garbage, the state a destroyed actor is in until it is collected. Use it on anything you did not just create yourself.

`SetLifeSpan(Seconds)` asks the actor to destroy itself after a delay, the easy way to remove shell casings or expired effects without a timer of your own.

Whenever an actor leaves play, for any reason, the engine calls `EndPlay(EEndPlayReason::Type Reason)` on it. The reason says why: `Destroyed`, `LevelTransition`, `EndPlayInEditor`, `RemovedFromWorld`, or `Quit`. EndPlay is where an actor cleans up what it started: timers, bindings, actors it owns. Override it, do your cleanup, and call `Super::EndPlay(Reason)` last.

Never clean up in a UObject's C++ destructor. It runs during garbage collection, long after play ended, when the world may already be gone.

# Example

```cpp
void ADojoF2Flare::BeginPlay()
{
	Super::BeginPlay();

	// The flare removes itself; nobody has to remember to destroy it.
	SetLifeSpan(BurnSeconds);
}

void ADojoF2Flare::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// The smoke actor belongs to this flare, so it leaves with it.
	if (IsValid(Smoke)) Smoke->Destroy();

	Super::EndPlay(EndPlayReason);
}
```

# Questions

```yaml
- id: check-after-destroy
  type: multiple-choice
  prompt: "A turret keeps a pointer to its current target, which another system may destroy at any moment. Which check is right before using it?"
  choices:
    - "Target != nullptr"
    - IsValid(Target)
    - "Target->GetName() != TEXT(\"\")"
    - No check, the turret owns the pointer
  answerIndex: 1
  explanation: IsValid catches both null and an actor that was destroyed but not yet collected.
- id: fill-lifespan
  type: fill-blank
  prompt: "To have a shell casing remove itself 5 seconds after it spawns, call ___(5.f) in its BeginPlay."
  acceptedAnswers: [SetLifeSpan]
  explanation: SetLifeSpan schedules the actor's own Destroy.
- id: spot-destructor-cleanup
  type: spot-the-bug
  prompt: This flare should remove its smoke when it goes, but the cleanup sometimes crashes during level changes. Which line is the problem?
  code: |
    ADojoF2Flare::~ADojoF2Flare()
    {
    	if (Smoke) Smoke->Destroy();
    }
  bugLine: 1
  fix: Do the cleanup in an EndPlay override instead of the destructor, then call Super::EndPlay.
  explanation: The destructor runs during garbage collection, when the world may already be torn down.
- id: endplay-reasons
  type: multiple-choice
  prompt: "Which of these does not cause EndPlay to be called on an actor?"
  choices:
    - The actor is destroyed
    - The level is unloaded
    - Play in the editor is stopped
    - The actor's Details panel is opened
  answerIndex: 3
  explanation: EndPlay runs whenever the actor leaves play; looking at it in the editor does not end anything.
- id: explain-isvalid
  type: explain-in-one-sentence
  prompt: In one sentence, say why a null check is not enough after another system may have destroyed an actor.
  modelAnswer: A destroyed actor keeps its address until garbage collection, so the pointer is not null even though the actor is gone from play, and IsValid is what catches that.
  rubric:
    - Says the pointer is not null after Destroy
    - Names IsValid or the garbage-marked state
  explanation: The gap between Destroy and collection is where null checks lie.
```
