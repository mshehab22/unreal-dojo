---
id: p22-every-system-every-hit
title: Three systems in every hit
order: 1
kind: concept
difficulty: 3
patterns: []
skills: [facade, architecture]
terms: [subsystem, world-subsystem, game-instance-subsystem, subsystem-dependency, gameplay-statics, niagara-function-library]
prerequisites: [p13-bytecode-when-not]
xp: 25
estimatedMinutes: 10
concepts:
  - When many callers each drive several systems for one job, every caller has to know every system's rules, and they drift apart
  - One class with a few calls named for the job, such as PlayHitFeedback, can hold those rules in one place
  - Callers depend on that front; the systems behind it never know it exists
  - A world or game instance subsystem is a natural home for the front, and it can ask for the systems it needs before it starts
  - The engine has fronts of its own, such as UGameplayStatics, whose one call stands for many steps
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: eight kinds of weapon and trap each play a hit by calling the sound system, the spark effects, and the HUD themselves, in their own code. A designer wants every heavy hit to flash the screen edge orange instead of red. How many places change?"
choices:
  - One, the HUD
  - At least eight, one in every weapon and trap that flashes, and any that someone forgot will stay red
  - None; colors are data
  - Two, the HUD and the sound system
answerIndex: 1
explanation: Each caller decided for itself when and how to flash. The rule lives in eight places, so it changes in eight places, and the one that is missed becomes a bug report.
```

# Card

A hit in the training gauntlet should feel the same wherever it comes from. That takes three systems: the sound desk plays a cue on the effects bus, but only after the bus has been opened; the spark pool fires a burst, but only after sparks were reserved, and a reservation that is never fired or cancelled keeps those sparks forever; the HUD ticker shows the damage and flashes the edge for a heavy hit. A turret, a spike trap, a sword, and an arrow each call all three, in their own code.

**The rules spread.** Every caller has to know how heavy a hit must be to count as heavy, how many sparks a hit throws, what the HUD line says, and in what order the calls must come. Written four times, those rules drift: one trap forgets the flash, one arrow reserves sparks and returns early before firing them, and changing the heavy threshold means finding every place that copied it.

**Put a front in the way.** Give the game one class with a few calls named for what the caller wants, `PlayHitFeedback(Where, Damage)` and `PlayMissFeedback(Where)`, and let that class drive the three systems. The rules live there once. The turret and the trap shrink to one call each, and they no longer include the sound desk, the spark pool, or the HUD at all. The arrow points one way: callers depend on the front, the front depends on the systems, and the systems know nothing about the front or the callers.

**A subsystem is a good home.** A `UWorldSubsystem` is created once per world and reached from anything in it with `GetWorld()->GetSubsystem<>()`; a `UGameInstanceSubsystem` lives for the whole session across level loads. In its `Initialize`, a subsystem can call `Collection.InitializeDependency<>()` on the systems it drives, which makes sure they exist first and hands them back to keep.

**The engine already does this.** `UGameplayStatics::PlaySoundAtLocation` is one call in front of finding the audio device, making an active sound, and setting its place, volume, and attenuation. `UNiagaraFunctionLibrary::SpawnSystemAtLocation` is one call in front of making, registering, and activating a particle component. Your front sits one level above those: it decides what a hit is for your game.

# Example

```cpp
// Before: every caller drives every system.
Sound->PlayCue(Sound->FindCue(TEXT("HeavyHit")), Where);
const int32 Ticket = Sparks->Reserve(10);
if (Ticket != INDEX_NONE) Sparks->Fire(Ticket, Where, FVector::UpVector);
Hud->PushLine(TEXT("-50"));
Hud->FlashEdge(FLinearColor::Red);

// After: every caller makes one call.
GetWorld()->GetSubsystem<UDojoP22HitFeedback>()->PlayHitFeedback(Where, 50.f);
```

# Questions

```yaml
- id: why-drift
  type: multiple-choice
  prompt: "Four callers each play hit feedback by calling the sound, spark, and HUD systems directly. What goes wrong first as the game grows?"
  choices:
    - The game runs out of memory
    - The callers' copies of the rules drift apart, so the same hit feels different depending on who caused it
    - The sound system stops working
    - Nothing; four copies of a rule are as good as one
  answerIndex: 1
  explanation: Each copy is changed or forgotten on its own schedule. One front keeps one copy.
- id: fill-direction
  type: fill-blank
  prompt: "Callers depend on the front, and the front depends on the systems behind it; the systems ___ about the front."
  acceptedAnswers: [know nothing, do not know, know nothing at all]
  explanation: The arrow points one way, so the systems can be reused or tested without the front.
- id: home-subsystem
  type: multiple-choice
  prompt: "Which home suits a hit feedback front that every actor in a level should reach, and that can start over with each level?"
  choices:
    - A UWorldSubsystem, created once per world and reached with GetWorld()->GetSubsystem
    - A static global variable set from the first actor that hits something
    - A component copied onto every weapon
    - The level Blueprint
  answerIndex: 0
  explanation: A world subsystem is made for each world by the engine, one of it, with no actor to place and nothing global to clear.
- id: dependency-call
  type: multiple-choice
  prompt: "In UDojoP22HitFeedback::Initialize, what does Collection.InitializeDependency<UDojoP22SoundDesk>() do?"
  choices:
    - It creates a second sound desk only for the facade
    - It makes sure the world's sound desk exists and is initialized before the facade goes on, and returns it
    - It deletes the sound desk when the facade is done
    - It does nothing unless the sound desk ticks
  answerIndex: 1
  explanation: Subsystems of one kind start in no promised order; asking for a dependency puts that one first and hands it back.
- id: engine-front
  type: multiple-choice
  prompt: "Why can UGameplayStatics::PlaySoundAtLocation be called a front over a bigger system?"
  choices:
    - It is the only way to play a sound
    - One call stands for several steps inside the audio system that the caller never sees
    - It runs on its own thread
    - It saves the sound to disk
  answerIndex: 1
  explanation: The caller names what it wants; the function does the work of finding the device and starting a sound.
- id: explain-front
  type: explain-in-one-sentence
  prompt: In one sentence, say what a hit feedback front buys the turret, the trap, and the sword.
  modelAnswer: Each of them makes one call that says what happened, and the rules for how a hit sounds, sparks, and shows live in one place instead of being copied into every caller.
  rubric:
    - Says the callers make one simple call
    - Says the rules live in one place instead of in every caller
  explanation: Fewer things to know for every caller, and one place to change.
```
