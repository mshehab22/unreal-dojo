---
id: f3-rotations
title: FRotator and FQuat for facing a direction
order: 8
kind: concept
difficulty: 3
patterns: []
skills: [math]
terms: [frotator, fquat, fvector, fmath]
prerequisites: [f3-vectors-and-fmath]
xp: 30
estimatedMinutes: 7
concepts:
  - FRotator is pitch, yaw, and roll in degrees
  - Yaw turns around the vertical axis and is worked out with Atan2
  - FQuat is the form the engine uses to combine and blend rotations without gimbal lock
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: an actor at the origin should face a target at (0, 500, 0). Which FRotator faces it?"
choices:
  - "FRotator(90, 0, 0)"
  - "FRotator(0, 90, 0)"
  - "FRotator(0, 0, 90)"
  - "FRotator(0, -90, 0)"
answerIndex: 1
explanation: The constructor's order is pitch, yaw, roll, and turning from +X toward +Y is a yaw of 90 degrees.
```

# Card

`FRotator` holds three angles in degrees, stored as doubles in UE 5 like FVector's components. The constructor's order trips people up: `FRotator(Pitch, Yaw, Roll)`.

- **Yaw** turns around the vertical Z axis: left and right, like a head shaking no.
- **Pitch** tilts around Y: up and down, like nodding.
- **Roll** spins around X: like tilting your head to the side.

To face a point on the ground, only yaw matters. Take the flat offset to the target and ask for its angle: `FMath::RadiansToDegrees(FMath::Atan2(Offset.Y, Offset.X))` gives a yaw from -180 to 180, with 0 along +X and 90 along +Y. `Offset.Rotation()` does the same and also fills in a pitch, which a ground turret usually does not want.

Apply it with `SetActorRotation(FRotator(0, Yaw, 0))`. Angles wrap: 190 and -170 face the same way, so compare yaws with `FMath::FindDeltaAngleDegrees` rather than a plain subtraction.

`FQuat` is a quaternion: another way to store a rotation that has no gimbal lock and blends smoothly. The engine uses it inside transforms and for combining rotations. You rarely build one by hand; convert with `Rotator.Quaternion()` and `Quat.Rotator()`, and use `FQuat::Slerp` for a smooth turn between two orientations.

# Example

```cpp
// Turns the cannon to face Target on the ground plane, never tilting.
void ADojoF3Cannon::FaceGround(const AActor* Target)
{
	FVector Offset = Target->GetActorLocation() - GetActorLocation();
	Offset.Z = 0.f;

	const double Yaw = FMath::RadiansToDegrees(FMath::Atan2(Offset.Y, Offset.X));
	SetActorRotation(FRotator(0.f, Yaw, 0.f));
}
```

# Questions

```yaml
- id: yaw-axis
  type: multiple-choice
  prompt: "Which angle of an FRotator turns an actor left and right on flat ground?"
  choices: [Pitch, Yaw, Roll]
  answerIndex: 1
  explanation: Yaw turns around the vertical axis.
- id: fill-atan2
  type: fill-blank
  prompt: "The yaw toward a flat offset is FMath::RadiansToDegrees(FMath::___(Offset.Y, Offset.X))."
  acceptedAnswers: [Atan2]
  explanation: Atan2 takes Y first, then X, and handles every quadrant.
- id: spot-constructor-order
  type: spot-the-bug
  prompt: This turret should turn to yaw 45 but tips forward instead. Which line is wrong?
  code: |
    void ADojoF3Cannon::TurnToDiagonal()
    {
    	SetActorRotation(FRotator(45.f, 0.f, 0.f));
    }
  bugLine: 3
  fix: Put the 45 in the middle, FRotator(0.f, 45.f, 0.f), because the order is pitch, yaw, roll.
  explanation: The first argument is pitch, which tilts.
- id: angle-wrap
  type: multiple-choice
  prompt: "A sentry faces yaw 170 and its target is at yaw -170. How far does it need to turn?"
  choices: ["340 degrees", "20 degrees", "0 degrees"]
  answerIndex: 1
  explanation: Angles wrap at 180, so the short way round is 20 degrees; FindDeltaAngleDegrees gives that answer.
- id: explain-quat
  type: explain-in-one-sentence
  prompt: In one sentence, say why the engine keeps rotations as FQuat inside transforms.
  modelAnswer: Quaternions combine and blend rotations smoothly without gimbal lock, which three separate angles cannot always do.
  rubric:
    - Mentions combining or blending rotations
    - Mentions gimbal lock or the limits of three angles
  explanation: For setting a facing in gameplay code, FRotator is easier to read; the engine converts as needed.
```
