---
id: m2-space-and-sweeps
title: Moving by a change, in a space, with a sweep
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [math, movement]
terms: [world-and-local-space, add-actor-offset, sweep, fhitresult, fquat, ftransform]
prerequisites: [m2-hall-plan]
xp: 30
estimatedMinutes: 9
concepts:
  - The same offset means different things in local space and in world space
  - A sweep stops a move at the first blocker and reports what it hit
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a crate has been turned so it faces along the level's +Y axis. Code calls AddActorLocalOffset(FVector(100, 0, 0)) on it. Where does the crate end up?"
choices:
  - 100 units along the level's +X axis, because X is always the first number
  - 100 units along the level's +Y axis, the way the crate faces
  - 100 units along the level's -Y axis
  - Where it started, because a local offset only moves its components
answerIndex: 1
explanation: A local offset is measured in the actor's own frame, where X is the way the actor faces. The crate faces +Y, so its forward 100 is the world's +Y.
```

# Card

The same three numbers mean different things in two **spaces**. In **world space** they are measured from the level's origin along its fixed axes. In **local space** they are measured from the actor itself, along its own forward, right, and up. An offset of 100 forward in local space heads wherever the actor faces; the same 100 in world space always heads along the level's X axis. The test is the sentence you would say aloud: "slide it east" is world, "slide it forward" is local.

Two ways to move an actor from code:

- `SetActorLocation(Place)` says where the actor should end up.
- `AddActorWorldOffset(Change)` and `AddActorLocalOffset(Change)` say how far to move from where it is, with the change measured in the world or in the actor's own frame. A mover that glides every frame wants these, with the change scaled by the frame's duration.

Turning works the same way. `AddActorWorldRotation` turns around the world's axes and `AddActorLocalRotation` around the actor's own. Both combine the new turn with the old one as **quaternions**. An `FQuat` stores an orientation without the angle tangles an `FRotator` can get into, and it combines by multiplication instead of by adding three numbers. You rarely build one by hand: `Rotator.Quaternion()` and `Quat.Rotator()` convert, and `FQuat::Slerp` blends two orientations smoothly.

Components keep the same idea in a tree: a child's relative location and rotation (`SetRelativeLocation`, `GetRelativeLocation`) are measured in its parent's space, and the engine multiplies the chain together into the world `FTransform`.

Both offset functions take a **sweep** flag and an optional place to put an `FHitResult`:

```cpp
AddActorWorldOffset(Change, true, &Hit);
```

With the flag off, the actor is placed at the end of the move, even inside a wall. With it on, the root component sweeps its shape along the whole move and stops at the first blocking hit, and `Hit` says what stopped it. `Hit.IsValidBlockingHit()` tells a real stop from free flight; `Hit.ImpactNormal` is the direction the struck surface faces, straight out of the surface. A ball that mirrors its heading about that normal bounces the way a ball does: `Heading.MirrorByVector(Hit.ImpactNormal)`.

A sweep covers the whole move, so a fast mover cannot skip through a thin wall in one long frame, which checking its position after the move can. The sweep needs the moving root to have a collision shape that blocks the wall; a plain scene root sweeps against nothing.

# Example

```cpp
void ADojoM2Pusher::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	const FVector Change = FVector::ForwardVector * 300.f * DeltaSeconds;

	FHitResult Hit;
	AddActorLocalOffset(Change, true, &Hit);

	if (Hit.IsValidBlockingHit())
	{
		UE_LOG(LogTemp, Log, TEXT("Stopped by %s"), *GetNameSafe(Hit.GetActor()));
		SetActorTickEnabled(false);
	}
}
```

# Questions

```yaml
- id: fill-local
  type: fill-blank
  prompt: "To slide an actor forward along the way it faces, stopping at the first blocker, write AddActor___Offset(Change, true, &Hit)."
  acceptedAnswers: [Local]
  explanation: The local version measures the change in the actor's own frame, so forward follows the actor's facing.
- id: wrong-space
  type: spot-the-bug
  prompt: A marker is meant to step 100 units ahead of itself, but it only does that when it happens to face along the level's X axis. Which line is wrong?
  code: |
    void ADojoM2MuzzleMarker::StepAhead()
    {
    	const FVector Ahead(100.f, 0.f, 0.f);
    	AddActorWorldOffset(Ahead);
    }
  bugLine: 4
  fix: Use the local version, so the 100 is measured along the way the marker faces.
  explanation: A world offset ignores the actor's facing. The same vector, passed to the local version, follows it.
- id: why-sweep
  type: multiple-choice
  prompt: "A mover covers 300 units in one very long frame, and a wall 20 units thick stands in the middle of that move. What happens with the sweep flag on?"
  choices:
    - It lands on the far side of the wall, because the frame was too long to notice it
    - It stops at the wall and the hit result says what it hit
    - It is stopped only if its position at the end of the move is inside the wall
  answerIndex: 1
  explanation: A sweep checks the whole path of the move, not only where it ends, so the wall stops it however long the frame was.
- id: normal-meaning
  type: multiple-choice
  prompt: "A ball rolling along +Y hits a wall whose face looks toward -Y. Which way does ImpactNormal point?"
  choices:
    - Along +Y, the way the ball was rolling
    - Along -Y, straight out of the wall's face
    - Down into the floor
  answerIndex: 1
  explanation: The impact normal points straight out of the surface that was struck, so a bounce is the heading mirrored about it.
- id: why-quat
  type: multiple-choice
  prompt: "Why do the engine's transforms keep rotation as an FQuat rather than as three angles?"
  choices:
    - A quaternion combines and blends orientations without the tangles that three angles can get into
    - A quaternion is smaller than three numbers
    - Angles in degrees cannot be stored in a transform
  answerIndex: 0
  explanation: Combining turns by multiplying quaternions, and blending them with Slerp, behave well where adding angles can misbehave.
- id: explain-sweep
  type: explain-in-one-sentence
  prompt: In one sentence, say what turning the sweep flag on changes about AddActorWorldOffset.
  modelAnswer: With it on, the move stops at the first blocking hit along its whole path and reports it, instead of placing the actor at the end of the move whatever is in the way.
  rubric:
    - Says the move stops at a blocker
    - Says it reports the hit, or checks the whole path
  explanation: The flag turns a teleport by a change into a move that respects collision and tells you what stopped it.
```
