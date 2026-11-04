---
id: m2-interpolation
title: Easing toward a target, or at a fixed rate
order: 6
kind: concept
difficulty: 3
patterns: []
skills: [math, movement]
terms: [interpolation, fmath, deltatime, frotator, fvector, fquat]
prerequisites: [m2-bumper]
xp: 30
estimatedMinutes: 9
concepts:
  - The ease-out helpers close a share of the gap each frame and the constant helpers close a fixed amount
  - Rotator helpers take the short way round
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a camera arm runs Height = FMath::FInterpTo(Height, WantedHeight, DeltaSeconds, 5.f) every frame. As it nears the wanted height, what happens to its speed?"
choices:
  - It stays the same until the last frame, then stops
  - It slows down, because each frame closes a share of what is left
  - It speeds up, because the target is pulling harder
  - It depends only on the frame rate
answerIndex: 1
explanation: Each frame closes a share of the remaining gap, and the gap shrinks, so the steps shrink and the arm starts fast and eases into place.
```

# Card

A thing that has to get from where it is to where it should be, over several frames, uses an **interpolation** helper from `FMath`. They all take the current value, the target, the frame's `DeltaTime`, and a speed, and return the value for this frame. Two families:

- **Ease out:** `FInterpTo` for a float, `VInterpTo` for a vector, `RInterpTo` for a rotator. Each frame closes a share of the remaining gap, `DeltaTime * InterpSpeed` of it, never more than all of it. It starts fast and slows as it nears, like a door settling shut. The speed is a rate, not units per second: a speed of 5 closes most of a gap in about a second. Because `DeltaTime` is in the share, a 30 frames per second game and a 120 frames per second game end up in nearly the same place after the same time.
- **Constant:** `FInterpConstantTo`, `VInterpConstantTo`, `RInterpConstantTo`. Each frame moves a fixed amount, `Speed * DeltaTime`, and never overshoots: it lands exactly on the target. For the vector version the speed is units per second; for the rotator version it is degrees per second, limited on each axis separately, so it is the natural tool for a speed limit or a turn-rate limit. For the rotator version, a speed of 0 or less jumps straight to the target; the float and vector versions do not move at all.

Easing is not the same as `FMath::Lerp(A, B, Alpha)`. A lerp blends by an alpha you choose and has no idea of time. Calling `Lerp(Current, Target, 0.1f)` every frame looks like an ease-out, but the share is per frame, not per second, so it closes far more of the gap each second at 120 frames per second than at 60.

The rotator helpers take the short way round. A turret facing 350 degrees told to face 10 degrees turns 20 degrees through zero, not 340 the long way. For orientations stored as quaternions the matching blend is `FQuat::Slerp`.

The ease-out helpers close a share of the gap, so they approach the target without a clean finish. They return the target itself once they are within a tiny distance, but if you need to know the thing has arrived, for example to stop ticking, decide your own tolerance and snap to the target when you are inside it.

Choose by feel: ease out for things that should settle (lifts, doors, cameras), constant for things with a rule about their rate (a patrol's speed, a searchlight that may turn no faster than a set rate).

# Example

```cpp
void ADojoM2HoverCamera::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!IsValid(Subject)) return;

	const FVector Wanted = Subject->GetActorLocation() + FVector(-300.f, 0.f, 200.f);
	SetActorLocation(FMath::VInterpTo(GetActorLocation(), Wanted, DeltaSeconds, 4.f));

	const FRotator Look = (Subject->GetActorLocation() - GetActorLocation()).Rotation();
	SetActorRotation(FMath::RInterpTo(GetActorRotation(), Look, DeltaSeconds, 4.f));
}
```

# Questions

```yaml
- id: fill-constant
  type: fill-blank
  prompt: "To limit how fast something turns, in degrees per second, use FMath::RInterp___To(Current, Target, DeltaTime, DegreesPerSecond)."
  acceptedAnswers: [Constant]
  explanation: The constant family moves a fixed amount per second and lands exactly, so its speed is a real limit. The ease-out family's speed is a rate that closes a share of the gap.
- id: fixed-alpha
  type: spot-the-bug
  prompt: A platform eases up to its target height, but at 120 frames per second it arrives much sooner than at 30. Which line is wrong?
  code: |
    void ADojoM2Riser::Tick(float DeltaSeconds)
    {
    	const float Height = FMath::Lerp(GetActorLocation().Z, TargetHeight, 0.1f);
    	SetActorLocation(FVector(GetActorLocation().X, GetActorLocation().Y, Height));
    }
  bugLine: 3
  fix: Use FMath::FInterpTo with DeltaSeconds and a speed, so the share closed depends on time and not on how many frames there are.
  explanation: An alpha of 0.1 is applied once per frame, so more frames mean more shares closed every second.
- id: short-way
  type: multiple-choice
  prompt: "A searchlight faces yaw 350 and is told to face yaw 10 with RInterpConstantTo at 40 degrees per second. What does it do?"
  choices:
    - Turns 340 degrees the long way round, because 10 is smaller than 350
    - Turns 20 degrees through zero, the short way, and arrives in half a second
    - Snaps to yaw 10 at once, because the two angles are close
  answerIndex: 1
  explanation: The rotator helpers compare angles as angles, not as plain numbers, so the shorter turn through zero is chosen.
- id: constant-overshoot
  type: multiple-choice
  prompt: "A VInterpConstantTo mover has a target 3 units away and moves 10 units a frame. What does this frame's result do?"
  choices:
    - It lands exactly on the target and stops there
    - It overshoots by 7 units and comes back next frame
    - It moves 10 units toward the target and past it
  answerIndex: 0
  explanation: The constant helpers never overshoot. When the step is bigger than the gap they land on the target.
- id: slerp-name
  type: multiple-choice
  prompt: "What is the quaternion counterpart of Lerp for blending two orientations smoothly?"
  choices:
    - FQuat::Slerp
    - FQuat::Normalize
    - FRotator::Clamp
  answerIndex: 0
  explanation: Slerp blends two orientations along the shortest arc between them, which a component-wise lerp of angles does not.
- id: explain-families
  type: explain-in-one-sentence
  prompt: In one sentence, say how an ease-out interp helper differs from a constant one.
  modelAnswer: The ease-out helper closes a share of the remaining gap each frame so it slows as it nears the target, while the constant helper moves a fixed amount per second and lands exactly on it.
  rubric:
    - Says the ease-out one slows down as it gets close or closes a share of the gap
    - Says the constant one moves at a fixed rate
  explanation: Pick ease-out for settling and constant for a limit on the rate.
```
