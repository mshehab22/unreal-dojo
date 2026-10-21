---
id: f5-tick-and-deltatime
title: Tick and DeltaTime for things that truly change every frame
order: 8
kind: concept
difficulty: 2
patterns: []
skills: [time]
terms: [tick, deltatime, primary-actor-tick, tick-groups]
prerequisites: [f5-cooldown]
xp: 25
estimatedMinutes: 7
concepts:
  - Tick runs once per frame; DeltaTime is how long that frame took
  - Multiply rates by DeltaTime so speed does not depend on frame rate
  - Tick only while there is work to do
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a drone's Tick does `SetActorLocation(GetActorLocation() + FVector(10, 0, 0));`. How far does it move in one second at 30 frames per second, and at 120?"
choices:
  - "300 and 1200 units"
  - "10 units at both"
  - "600 units at both"
  - "1200 and 300 units"
answerIndex: 0
explanation: A fixed step per frame moves four times as far when the game runs four times as many frames.
```

# Card

`Tick(float DeltaSeconds)` runs once per frame on every actor and component that has ticking enabled. **DeltaSeconds** is how long the last frame took, in game time: about 0.033 at 30 frames per second, 0.008 at 120.

Anything that changes continuously must scale by it. A drone that moves `Speed * DeltaSeconds` per frame covers Speed units every second at any frame rate. A fixed step per frame makes the game run faster on faster machines, which is the classic Tick bug.

Ticking is set up in the constructor through `PrimaryActorTick` (or `PrimaryComponentTick` for components):

- `bCanEverTick = false`: never tick. The right default for anything that reacts to events and timers.
- `bStartWithTickEnabled = false`: may tick, but starts off; turn it on with `SetActorTickEnabled(true)` when there is work, and off again when there is none.
- `TickInterval`: tick less often than every frame.
- `TickGroup`: when in the frame to tick relative to physics (`TG_PrePhysics` by default, `TG_PostPhysics` to see this frame's physics results).

Every tick costs something, even an empty one. Before reaching for Tick, ask whether an event or a timer says it better: Tick is for things that truly change every frame, such as smooth movement, aiming, or a camera.

# Example

```cpp
ADojoF5Glider::ADojoF5Glider()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;
}

void ADojoF5Glider::Launch()
{
	SetActorTickEnabled(true);
}

void ADojoF5Glider::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Speed is units per second, so scale it by the frame's duration.
	AddActorWorldOffset(GetActorForwardVector() * Speed * DeltaSeconds);
}
```

# Questions

```yaml
- id: when-tick
  type: multiple-choice
  prompt: "Which of these is a good reason to use Tick?"
  choices:
    - Checking every frame whether a door should open
    - Smoothly turning a camera toward a target every frame
    - Firing a turret twice a second
    - Waiting 3 seconds before closing a door
  answerIndex: 1
  explanation: Smooth turning changes every frame; the others are events or timers.
- id: fill-delta
  type: fill-blank
  prompt: "To move Speed units per second, a Tick moves Speed * ___ per frame."
  acceptedAnswers: [DeltaSeconds, DeltaTime]
  explanation: Scaling by the frame's duration makes the movement frame-rate independent.
- id: spot-fixed-step
  type: spot-the-bug
  prompt: This glider crosses the arena in 2 seconds on a fast PC and 8 on a slow one. Which line is wrong?
  code: |
    void ADojoF5Glider::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	AddActorWorldOffset(GetActorForwardVector() * Speed);
    }
  bugLine: 4
  fix: Multiply the step by DeltaSeconds so Speed means units per second.
  explanation: Without DeltaSeconds the step is per frame, so more frames means more distance.
- id: start-off
  type: multiple-choice
  prompt: "A glider only moves after it is launched. How should its ticking be set up?"
  choices:
    - bCanEverTick false
    - bCanEverTick true and bStartWithTickEnabled false, enabled at launch
    - Tick every frame and check a bLaunched flag
  answerIndex: 1
  explanation: It can tick, but costs nothing until there is work.
- id: explain-delta
  type: explain-in-one-sentence
  prompt: In one sentence, say why movement in Tick is multiplied by DeltaSeconds.
  modelAnswer: DeltaSeconds is the time the frame took, so multiplying a per-second speed by it moves the same distance per second whatever the frame rate.
  rubric:
    - Says DeltaSeconds is the frame's duration
    - Says the result is the same per second at any frame rate
  explanation: The follower build quest tests exactly this at 30 and 120 frames per second.
```
