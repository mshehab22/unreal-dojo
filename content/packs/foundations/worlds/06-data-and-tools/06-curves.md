---
id: f6-curves
title: Curves
order: 6
kind: concept
difficulty: 2
patterns: []
skills: [data]
terms: [curve-float]
prerequisites: [f6-target-table]
xp: 25
estimatedMinutes: 6
concepts:
  - A curve asset maps one number to another, drawn by a designer
  - GetFloatValue reads it anywhere, including between and beyond keys
  - What the input number means is a promise between the code and the designer
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a float curve has keys at (0, 0) and (1, 100). What does GetFloatValue(2) return with the default settings?"
choices:
  - "200, the line continues"
  - "100, the value holds after the last key"
  - "0, nothing is defined there"
  - It crashes
answerIndex: 1
explanation: By default a curve holds its first value before the first key and its last value after the last key.
```

# Card

A **curve asset** (`UCurveFloat`) maps one number to another: time to height for a door, charge time to launch speed for a jump pad, level to XP needed. A designer makes one in the Content Browser (Miscellaneous, then Curve, then CurveFloat), adds keys, and drags them in the curve editor until the shape feels right.

Code holds it as a `TObjectPtr<UCurveFloat>` UPROPERTY and asks it for a value with `Curve->GetFloatValue(X)`:

- **Between keys**, the value follows the curve's shape: straight lines for linear keys, or a smooth bend for auto or user tangents.
- **Before the first key and after the last**, it holds the end value by default. The curve editor can change that to repeat or continue the line.

The important design choice is **what X means**, because both sides must agree on it.

- A door's curve could be drawn from 0 to 1, a fraction of the way open. The code then passes elapsed time divided by duration, and changing the duration never means redrawing the curve.
- A level curve's X is the level itself.

Write the meaning in the UPROPERTY's comment so the tooltip tells the designer.

Curves pair with timelines in Blueprint, and with Tick or a timer in C++, to animate a value over time. Unreal also has `UCurveVector` and `UCurveLinearColor` for three values or a color, and `UCurveTable` for many named curves in one asset. Reading a curve is cheap, so it is fine to call every frame.

# Example

```cpp
/** How high the platform is over its trip: X is the fraction of the trip from 0 to 1, Y the fraction of the full height. */
UPROPERTY(EditAnywhere, Category = "Lift")
TObjectPtr<UCurveFloat> RiseCurve;

float ADojoLift::HeightAt(float ElapsedSeconds) const
{
	const float Fraction = FMath::Clamp(ElapsedSeconds / TripSeconds, 0.f, 1.f);
	return RiseCurve ? RiseCurve->GetFloatValue(Fraction) * FullHeight : 0.f;
}
```

# Questions

```yaml
- id: read-curve
  type: fill-blank
  prompt: "A UCurveFloat is read with Curve->___(X)."
  acceptedAnswers: [GetFloatValue]
  explanation: GetFloatValue returns the curve's value at X.
- id: normalized
  type: spot-the-bug
  prompt: A lift's curve is drawn from 0 to 1 and the lift takes 4 seconds, but it reaches the top after only 1 second. Which line is wrong?
  code: |
    void ADojoLift::Tick(float DeltaSeconds)
    {
    	Super::Tick(DeltaSeconds);
    	Elapsed += DeltaSeconds;
    	SetActorLocation(Base + FVector(0.f, 0.f, RiseCurve->GetFloatValue(Elapsed) * FullHeight));
    }
  bugLine: 5
  fix: Pass Elapsed / TripSeconds so X runs from 0 to 1 over the whole trip.
  explanation: The curve's X is a fraction of the trip, but the code passes seconds.
- id: why-curve
  type: multiple-choice
  prompt: "Why draw XP per level as a curve instead of writing 100 * Level in code?"
  choices:
    - Curves are faster than multiplication
    - A designer can reshape the pace, such as one hard level, without a code change
    - Code cannot compute XP
  answerIndex: 1
  explanation: The curve moves the shape into data a designer controls.
- id: past-end
  type: multiple-choice
  prompt: "By default, what does a curve return after its last key?"
  choices: [Zero, The last key's value, An extrapolated straight line]
  answerIndex: 1
  explanation: The default extrapolation holds the end value.
- id: explain-x
  type: explain-in-one-sentence
  prompt: In one sentence, say why the meaning of a curve's X belongs in the property's comment.
  modelAnswer: The designer drawing the curve and the code reading it must agree on what X is, and the comment becomes the tooltip the designer reads.
  rubric:
    - Mentions agreement between designer and code
    - Mentions the tooltip or comment being seen in the editor
  explanation: A curve drawn for the wrong X looks right in the editor and plays wrong in the game.
```
