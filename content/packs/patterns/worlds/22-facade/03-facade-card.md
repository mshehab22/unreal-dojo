---
id: p22-facade-card
title: One front, a few calls
order: 3
kind: concept
difficulty: 3
patterns: [facade]
skills: [facade, architecture]
terms: [subsystem, gameplay-statics, kismet-system-library, blueprint-function-library, savegame, save-game-to-memory, god-object]
prerequisites: [p22-hit-feedback]
xp: 25
estimatedMinutes: 10
concepts:
  - A facade puts a few calls named for the caller's job in front of several systems and keeps their rules in one place
  - It hides how the systems are used, not that they exist; a caller that needs one system's full power still uses that system
  - Callers depend on the facade, and the systems behind it know nothing about it
  - A good facade stays small and owns no state of the game; one that gathers state and pass-through calls turns into a god object
  - UGameplayStatics and UKismetSystemLibrary are collections of small fronts; your own facade decides what a job means for your game
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: after the hit feedback facade lands, a programmer writing a slow-motion replay needs to play a cue at half volume on a different bus. The facade has no call for that. What should the replay do?"
choices:
  - Add a call for half volume on the replay bus to the facade, named for the replay
  - Copy the whole facade into the replay and change the volume in the copy
  - Call the sound desk directly, since the facade does not forbid using the desk
  - Give up on the replay, because the facade has no call that can do it
answerIndex: 2
explanation: A facade is a shortcut for the common job, not a wall. Callers with an unusual need talk to the system behind it, and the facade stays small.
```

# Card

What you built for the hits is the **Facade** pattern. A facade is a class with a few calls named for what its callers want, such as `PlayHitFeedback` or `SaveCheckpoint`, standing in front of several systems whose own interfaces are bigger, stricter, or more tangled. The callers learn the facade; the facade knows the systems.

**What it hides.** The order calls must come in, the ids and tickets one system hands to another, the numbers that make a hit heavy, the bytes a save becomes. A caller that only wants the common job never sees them, so they can change in one place.

**What it does not hide.** The systems are still there and still public. A caller with a job the facade does not cover, like the replay's half-volume cue, talks to the system directly. A facade that tries to cover every call of every system behind it is no longer a shortcut; it is a second copy of all of their interfaces.

**The arrow.** Callers depend on the facade, the facade depends on the systems, and the systems never depend on the facade. That keeps each system usable and testable alone, and it keeps the facade replaceable: a test can drive the systems without it, and a new front for a new job can sit beside it.

**Small, and stateless about the game.** The hit facade keeps pointers to its systems and one tuning number. It does not keep the score, the inventory, or the current level. When a facade starts gathering that kind of state, and the pass-through calls that come with it, every class starts depending on it and every change risks the rest: it has become a **god object**. Split it by job, and give state to the class that owns it.

**Unreal's own.** `UGameplayStatics` and `UKismetSystemLibrary` are libraries of small, separate fronts: `PlaySoundAtLocation`, `SaveGameToSlot`, `SaveGameToMemory`, `LineTraceSingle`, `PrintString`, each one call in front of an engine system. They are a good model for keeping each front small. A `UBlueprintFunctionLibrary` of your own is the lightest facade of all, static calls with nothing to keep; a world or game instance subsystem is the home when the front needs to hold its systems or a setting.

# Example

```cpp
// A facade with a few calls named for the job.
UCLASS()
class UDojoP22HitFeedback : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	void PlayHitFeedback(FVector Where, float Damage);
	void PlayMissFeedback(FVector Where);
	void SetHeavyDamage(float Damage);
};
```

# Questions

```yaml
- id: facade-hides
  type: multiple-choice
  prompt: "What does a facade hide from its callers?"
  choices:
    - How the systems are used for the common job, such as the order of calls and ids
    - That the systems behind it exist at all, so no caller can ever reach them directly
    - Every bug in the systems, so that a caller never has to see one of them fail
    - The game's memory use, so that the callers can never run short of it at all
  answerIndex: 0
  explanation: The systems stay public; the facade hides the steps of the common job.
- id: fill-direction
  type: fill-blank
  prompt: "The systems behind a facade never ___ on the facade, so each can be used and tested alone."
  acceptedAnswers: [depend, rely]
  explanation: The dependency runs from callers to the facade to the systems, never back.
- id: god-sign
  type: multiple-choice
  prompt: "Which change is the clearest sign a facade is turning into a god object?"
  choices:
    - It gains a second call that handles misses next to the call that handles hits
    - It asks for the systems it drives as dependencies in its Initialize function
    - It is made a world subsystem so that every actor in the level can reach it
    - It keeps the player's score and forwards every call of the systems behind it
  answerIndex: 3
  explanation: State of the game and a mirror of every system's interface make every class depend on it for everything.
- id: engine-model
  type: multiple-choice
  prompt: "Why are UGameplayStatics and UKismetSystemLibrary good models for keeping a front small?"
  choices:
    - They have no functions of their own, only a large set of data that other classes read
    - Each function is a short front over one engine system and keeps no state of the game
    - They can only be called from Blueprint graphs and never from any C++ code at all
    - They replace every engine system so that no other class is needed in the game
  answerIndex: 1
  explanation: Many small fronts, each about one job, never become one class that owns everything.
- id: spot-pass-through
  type: spot-the-bug
  prompt: A feedback facade is growing. Which line makes it a mirror of the system behind it instead of a shortcut?
  code: |
    void UHitFeedback::PlayHitFeedback(FVector Where, float Damage)
    {
    	Sounds->PlayCue(Sounds->FindCue(TEXT("Hit")), Where);
    }
    int32 UHitFeedback::FindCue(FName Cue) const { return Sounds->FindCue(Cue); }
  bugLine: 5
  fix: Delete the pass-through; a caller that needs cue ids talks to the sound desk directly.
  explanation: A call that only forwards to the system adds nothing but another place every caller now depends on. A facade's calls should each do a job.
- id: explain-facade
  type: explain-in-one-sentence
  prompt: In one sentence, describe the Facade pattern.
  modelAnswer: A facade is one class with a few calls named for the caller's job that drives several systems behind it, so callers depend on those calls instead of on the systems' own rules.
  rubric:
    - Says it is a small set of calls in front of several systems
    - Says callers depend on it instead of on the systems' details
  explanation: One front for the common job; the systems stay where they are.
```
