---
id: m5-lines-and-hits
title: Asking the world with a line
order: 2
kind: concept
difficulty: 2
patterns: []
skills: [collision, debugging]
terms: [line-trace, fhitresult, collision-query-params, collision-channel, debug-draw, dot-product]
prerequisites: [m5-tower-plan]
xp: 30
estimatedMinutes: 10
concepts:
  - A trace asks what first blocks a channel between two points, and an object answers through its collision response
  - A trace can start inside your own shape, so ignore yourself, and draw every trace to see what it did
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: a single line trace runs from a lamp to a floor. On the way it passes through a glass pane whose response to the trace's channel is Overlap, and the floor's response is Block. What does the trace report?"
choices:
  - It stops at the glass and reports the glass instead
  - It reports both the glass and the floor, nearest first
  - It reports the floor, because a single trace reports one blocker
  - It reports nothing, because two objects confused it at once
answerIndex: 2
explanation: An Overlap response lets the trace pass, and a single trace reports only the first thing that blocks. The glass is skipped and the floor is the answer.
```

# Card

A **line trace** is a question put to the world: starting at `Start` and going to `End`, what is the first thing that blocks this kind of query? You ask it with `GetWorld()->LineTraceSingleByChannel(Hit, Start, End, Channel, Params)`. It returns a `bool`: true when something blocked the line. When it is true, `Hit` has been filled in; when it is false, the line was free and `Hit` holds nothing worth reading.

The answer lives in an **FHitResult**. `bBlockingHit` says the hit was a real stop. `GetActor()` and `GetComponent()` say what was struck. `Distance` is how far along the line the hit was. `ImpactPoint` is the exact spot on the surface and `ImpactNormal` is the direction that surface faces, straight out of it. For a plain line, the point where the line stopped and the point of impact are the same place.

Which things can answer depends on both sides. The trace names a **collision channel**, such as `ECC_Visibility`, which is the kind of question. Every object has a collision response for each channel: **Block**, **Overlap**, or **Ignore**. A blocker ends a single trace, an object that overlaps or ignores lets it through, and so what a trace sees is decided by the channel you chose and by how each object is set up. A trace that finds nothing where a crate plainly stands is very often a response problem, not a position problem.

A trace begins wherever you say, including inside your own collision. If a gun traces from the player's eyes and the player's own shape answers the channel, the shape is the first thing the line meets and the shot "hits" the shooter. The cure is to hand the trace some options: build an **FCollisionQueryParams**, call `Params.AddIgnoredActor(this)`, and pass it as the last argument. The same struct has `bTraceComplex`, which switches the test from the simple shapes (boxes, spheres, capsules) to the full triangle mesh. Leave it off unless you need the exact surface; it costs more.

You cannot see a trace, so draw it. `DrawDebugLine(World, Start, End, Color, bPersistent, LifeTime)` draws the line, and `DrawDebugSphere` marks a point. Colour them by result, green for a hit and red for a miss, so a glance tells you what happened. A positive lifetime keeps the drawing on screen for that many seconds; a persistent line stays until the level is reset, which is handy for a one-off check and noisy for anything per frame. These calls are compiled out of shipping builds, so they cost the player nothing.

A trace tells you whether the line between two points is free, not whether the far point is in front of you. For that angle test, use the **dot product**: for two unit vectors, `FVector::DotProduct(A, B)` is the cosine of the angle between them, 1 for the same direction, 0 for a right angle, and -1 for opposite directions. Take your forward vector and the unit direction toward the target, and compare their dot product with the cosine of the widest angle you allow: a smaller result means a wider angle. The angle test is cheap and the trace is not, so test the angle first and trace only if it passes.

Two editor tools finish the job. Type `show Collision` in the console to draw every object's collision shapes, which shows you what a trace is really meeting. While the game runs in the editor, press F8 to eject from the pawn, then fly around and look at the lines from outside. When a trace misbehaves, those three views, the line, the shapes, and a free camera, usually answer it.

# Example

```cpp
// Traces forward from the actor and draws the line green on a blocker or red on empty air.
void ADojoRangefinder::Measure()
{
	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * 2000.f;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	FHitResult Hit;
	const bool bBlocked = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params);

	if (bBlocked)
	{
		DrawDebugLine(GetWorld(), Start, Hit.ImpactPoint, FColor::Green, false, 3.f);
		DrawDebugSphere(GetWorld(), Hit.ImpactPoint, 12.f, 8, FColor::Green, false, 3.f);
		UE_LOG(LogTemp, Log, TEXT("Hit %s at %.0f units"), *GetNameSafe(Hit.GetActor()), Hit.Distance);
	}
	else
	{
		DrawDebugLine(GetWorld(), Start, End, FColor::Red, false, 3.f);
	}
}
```

# Questions

```yaml
- id: fill-ignore
  type: fill-blank
  prompt: "To make a trace skip the actor that fired it, write Params.AddIgnored___(this)."
  acceptedAnswers: [Actor]
  explanation: AddIgnoredActor on the query params removes that actor from the trace, so the shooter's own shape cannot answer first.
- id: end-is-a-point
  type: spot-the-bug
  prompt: A rangefinder works when its actor stands at the level's origin and gives wrong answers everywhere else. Which line is wrong?
  code: |
    void ADojoRangefinder::Measure()
    {
    	const FVector Start = GetActorLocation();
    	const FVector End = GetActorForwardVector() * 2000.f;
    	FHitResult Hit;
    	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility))
    	{
    		UE_LOG(LogTemp, Log, TEXT("Distance %.0f"), Hit.Distance);
    	}
    }
  bugLine: 4
  fix: Add Start to the scaled direction, so End is the point 2000 units ahead of Start.
  explanation: End is a position in the world, not a direction. A scaled direction alone is a point near the origin, so the line only points the right way from the origin.
- id: shooter-answers-first
  type: multiple-choice
  prompt: "A gun traces from the player's eye point, and the result keeps naming the player as the thing hit, at almost no distance. What is the best fix?"
  choices:
    - Make the trace much longer so it reaches past the player
    - Turn on bTraceComplex so the trace tests the exact mesh
    - Draw the line with a longer lifetime so it can be seen
    - Add the player to the query params as an ignored actor
  answerIndex: 3
  explanation: The line starts inside the shooter's own shape, which answered the channel. Ignoring that actor removes it from the question; length, complexity, and drawing do not.
- id: both-sides
  type: multiple-choice
  prompt: "A crate stands squarely in the line, but a Visibility trace passes straight through it. Which is the most likely cause?"
  choices:
    - The crate's response to the Visibility channel is not Block
    - Single traces cannot see static meshes, only moving actors
    - The trace needs an FRotator before it can find anything
  answerIndex: 0
  explanation: An object takes part in a trace only through its response to the trace's channel. An Overlap or Ignore response lets the line through however large the object is.
- id: explain-draw
  type: explain-in-one-sentence
  prompt: In one sentence, say why you should draw a trace while you build it.
  modelAnswer: A trace is invisible, so drawing the line and its result colour shows at a glance where it started, where it ended, and whether it hit, instead of guessing from numbers.
  rubric:
    - Says a trace cannot otherwise be seen
    - Says the drawing shows its start, end, or result
  explanation: Wrong starts, wrong ends, and wrong channels all look the same as a log line that says nothing hit; a drawn line makes each one obvious.
```
