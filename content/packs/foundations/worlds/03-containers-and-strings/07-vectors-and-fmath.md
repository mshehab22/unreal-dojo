---
id: f3-vectors-and-fmath
title: FVector and FMath for positions and distances
order: 7
kind: concept
difficulty: 2
patterns: []
skills: [math]
terms: [fvector, fmath, kismet-math-library]
prerequisites: [f3-announcer]
xp: 25
estimatedMinutes: 7
concepts:
  - A position, an offset, and a direction are all FVectors
  - Compare squared distances to avoid a square root
  - FMath holds the clamps, interpolations, and angles gameplay code needs
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a sentry at (0, 0, 0) and a target at (300, 400, 0). What does `FVector::Dist(SentryLocation, TargetLocation)` return?"
choices: ["700", "500", "250000", "350"]
answerIndex: 1
explanation: Distance is the length of the offset (300, 400, 0), which is the square root of 300 squared plus 400 squared.
```

# Card

`FVector` is three numbers, X, Y, and Z, in centimeters, stored as doubles in UE 5 so large worlds stay precise; write `double` for the values you compute from it. In Unreal, X points forward, Y right, and Z up. The same type means three things, and keeping them apart avoids most math bugs:

- a position, such as `GetActorLocation()`;
- an offset between two positions, `Target - Origin`;
- a direction, an offset scaled to length 1 with `GetSafeNormal()` (safe because it returns zero instead of dividing by zero).

`FVector::Dist(A, B)` is the distance between two positions. To compare distances, such as finding the nearest target, use `FVector::DistSquared` instead: the order is the same, and it skips a square root per target. Compare it against a squared range.

To flatten an offset onto the ground, multiply by `FVector(1, 1, 0)`, or set Z to zero. Dot and cross products (`FVector::DotProduct`, `FVector::CrossProduct`) answer "is it in front of me" and "is it to my left".

`FMath` is the engine's math library for C++: `Clamp`, `Max`, `Min`, `Abs`, `Square`, `Lerp` and `FInterpTo` for smooth movement, `Atan2` and `RadiansToDegrees` for angles, `RandRange` for random numbers. Blueprint nodes for the same jobs live in `UKismetMathLibrary`, which you can also call from C++, but FMath is the usual choice in C++ code.

# Example

```cpp
// The candidate nearest to the spotlight within Range, or nullptr; uses squared distances, so no square roots.
ADojoF1PopupTarget* ADojoF3Spotlight::FindNearest(const TArray<ADojoF1PopupTarget*>& Candidates) const
{
	ADojoF1PopupTarget* Nearest = nullptr;
	double NearestSquared = FMath::Square(Range);

	for (ADojoF1PopupTarget* Candidate : Candidates)
	{
		const double DistanceSquared = FVector::DistSquared(GetActorLocation(), Candidate->GetActorLocation());
		if (DistanceSquared < NearestSquared)
		{
			Nearest = Candidate;
			NearestSquared = DistanceSquared;
		}
	}

	return Nearest;
}
```

# Questions

```yaml
- id: squared-why
  type: multiple-choice
  prompt: "Why compare DistSquared rather than Dist when finding the nearest of many targets?"
  choices:
    - DistSquared is more accurate
    - It gives the same order without a square root per target
    - Dist only works in two dimensions
  answerIndex: 1
  explanation: The square root never changes which distance is smaller, so it can be skipped.
- id: fill-normal
  type: fill-blank
  prompt: "To turn an offset into a direction of length 1 without dividing by zero, call Offset.___()."
  acceptedAnswers: [GetSafeNormal]
  explanation: GetSafeNormal returns a zero vector for a zero offset instead of a broken one.
- id: spot-squared-range
  type: spot-the-bug
  prompt: This sentry ignores targets at 600 units with a range of 1000. Which line is wrong?
  code: |
    const double DistanceSquared = FVector::DistSquared(Origin, Target);
    if (DistanceSquared <= Range)
    {
    	return true;
    }
  bugLine: 2
  fix: Compare against the squared range, FMath::Square(Range).
  explanation: 600 squared is 360000, far more than 1000, so the squared distance must be compared with a squared range.
- id: axis-meaning
  type: multiple-choice
  prompt: "In Unreal's default axes, which way does +Z point?"
  choices: [Forward, Right, Up, Toward the camera]
  answerIndex: 2
  explanation: X is forward, Y is right, Z is up.
- id: explain-flatten
  type: explain-in-one-sentence
  prompt: In one sentence, say why a ground sentry flattens the offset to its target before working out its turn.
  modelAnswer: Setting the height to zero keeps a target that is higher or lower from tilting the aim, so the sentry only turns around the vertical axis.
  rubric:
    - Mentions removing the height or Z
    - Mentions turning only around the vertical axis or not tilting
  explanation: The quest's sentry turns but never tilts.
```
