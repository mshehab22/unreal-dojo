---
id: m5-shapes-and-queries
title: Shapes, many hits, and asking by kind
order: 5
kind: concept
difficulty: 3
patterns: []
skills: [collision, math]
terms: [sweep, collision-shape, multi-trace, object-type-query, line-trace, reflection-vector]
prerequisites: [m5-sightline]
xp: 40
estimatedMinutes: 12
concepts:
  - A sweep is a trace with volume, and its hit result separates where the shape stopped from where it touched
  - Multi traces, by-object-type queries, and overlap queries answer different questions than a single channel trace
---

# Predict

```yaml
id: predict
type: multiple-choice
prompt: "Guess, no penalty: two pillars stand with a gap of 30 units between them. A line trace and a sphere sweep of radius 50 both travel along the middle of the gap. What happens?"
choices:
  - Both pass through, because the gap is open to them
  - The line is stopped and the sphere passes through the gap
  - The line passes through and a pillar stops the sphere
  - Both are stopped, because the gap is too narrow
answerIndex: 2
explanation: A line has no width, so it slips through any gap. A sphere 100 units across cannot fit a 30 unit gap, so a pillar blocks it.
```

# Card

A line asks "is this exact path clear?", which is often too thin a question. A **sweep** is a trace with volume: it carries a shape along the path and reports the first blocker the shape meets. The call is `SweepSingleByChannel(Hit, Start, End, Rotation, Channel, Shape, Params)`. The rotation is an `FQuat`, and for a sphere it does not matter, so `FQuat::Identity` is fine; a box or capsule turned to face a direction needs the matching quaternion. A door that must not close on a pallet, or a placement preview that must find a clear patch of floor, wants a sweep, because a line down the middle would call a narrow gap clear.

The shape is an `FCollisionShape`, built with `FCollisionShape::MakeSphere(Radius)`, `MakeBox(HalfExtent)`, or `MakeCapsule(Radius, HalfHeight)`. Box and capsule sizes are half sizes, measured from the centre outward, so a box 100 wide takes 50.

A sweep's `FHitResult` has two places, and they are different. `Location` is where the shape's centre stopped. `ImpactPoint` is where the shape touched the surface. A sphere of radius 50 that runs head-on into a wall stops with its centre 50 units short of the wall, while the impact point sits on the wall itself. `Distance` is how far the shape travelled. Put a preview marker at `Location`, since that is where the shape fits; put a scorch mark at `ImpactPoint`, since that is the surface.

A single trace answers only the first blocker. **Multi traces** such as `LineTraceMultiByChannel(Hits, Start, End, Channel, Params)` fill an array, ordered by distance. Anything that responds Overlap is listed along the way, as a hit whose `bBlockingHit` is false, nearest first, and the line ends at the first Block, so the blocker closes the list and nothing behind it is tested. So a shot that passes through glass and ends at a wall returns the glass and then the wall, and a line that meets only overlaps returns them all and a `false` result. Walk the array and decide for each entry what it means.

A channel trace asks how things answer a kind of question. A **by-object-type query**, such as `LineTraceSingleByObjectType`, asks what things are. You describe the kinds in an `FCollisionObjectQueryParams` with `AddObjectTypesToQuery(ECC_Pawn)`, and the query looks only for objects whose own object type is on that list, whatever their responses are. Use a channel when "what blocks my sight" is the question and an object type when "is there a pawn here" is.

The third query kind has no path at all: `OverlapMultiByChannel(Overlaps, Centre, Rotation, Channel, Shape, Params)` asks "what is inside this shape right now?" and fills an array of `FOverlapResult`, each with `GetActor()` and `GetComponent()`. An explosion's blast and a pickup radius are overlap questions.

A hit also gives you a direction to work with. The **reflection vector** of a heading and a surface normal is the heading as a ball would leave the surface: `FMath::GetReflectionVector(Heading, Hit.ImpactNormal)` turns a heading that runs into a wall into one that runs away from it, at the same angle on the other side of the normal. Aim the next query along that and a trace becomes a bounce.

One more setting belongs to every one of these. The query params can ask for simple or complex collision, as you saw with `bTraceComplex`. Simple means the object's boxes, spheres, and capsules; complex means its triangle mesh. Simple is fast and usually enough; reach for complex only when the exact surface matters.

# Example

```cpp
// Sweeps a sphere forward and draws where its centre stopped and where it touched.
void ADojoProbe::SweepAhead()
{
	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * 1000.f;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	FHitResult Hit;
	const bool bBlocked = GetWorld()->SweepSingleByChannel(Hit, Start, End, FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(50.f), Params);

	if (bBlocked)
	{
		DrawDebugSphere(GetWorld(), Hit.Location, 50.f, 12, FColor::Orange, false, 3.f);
		DrawDebugPoint(GetWorld(), Hit.ImpactPoint, 12.f, FColor::Red, false, 3.f);
	}
}

// Logs everything the line passes through, nearest first, and whether each entry blocks.
void ADojoProbe::ListAhead()
{
	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * 1000.f;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	TArray<FHitResult> Hits;
	GetWorld()->LineTraceMultiByChannel(Hits, Start, End, ECC_Visibility, Params);

	for (const FHitResult& Entry : Hits)
	{
		UE_LOG(LogTemp, Log, TEXT("%s at %.0f, %s"), *GetNameSafe(Entry.GetActor()), Entry.Distance, Entry.bBlockingHit ? TEXT("blocks") : TEXT("overlaps"));
	}
}

// Counts the components inside a sphere around a point.
int32 ADojoProbe::CountInside(const FVector& Centre, float Radius) const
{
	TArray<FOverlapResult> Overlaps;
	GetWorld()->OverlapMultiByChannel(Overlaps, Centre, FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(Radius));
	return Overlaps.Num();
}
```

# Questions

```yaml
- id: location-versus-impact
  type: multiple-choice
  prompt: "A sphere of radius 50 sweeps head-on into a flat wall and is stopped. How do Hit.Location and Hit.ImpactPoint compare?"
  choices:
    - Location is the sphere's centre, 50 short of the wall; ImpactPoint is on the wall
    - They are the same point, on the wall's face, right where the sphere is stopped
    - Location is on the wall and ImpactPoint is the sphere's centre, 50 short
    - Location is where the sweep started and ImpactPoint is where it ended
  answerIndex: 0
  explanation: For a sweep, Location is where the shape's centre came to rest and ImpactPoint is where the shape touched the surface, so a head-on sphere stops one radius short of the wall.
- id: multi-order
  type: multiple-choice
  prompt: "A multi line trace passes through a glass pane that responds Overlap, then a bush that responds Overlap, then a wall that responds Block. What does the array hold?"
  choices:
    - Only the wall, because the overlaps are not hits
    - The wall, the bush and the pane, from the farthest to the nearest
    - Nothing at all, because the overlaps cancel the whole multi trace
    - The pane, the bush and the wall by distance, only the wall blocking
  answerIndex: 3
  explanation: A multi trace lists overlaps as non-blocking hits ordered by distance, and the first Block is the last element and ends the trace.
- id: half-extent
  type: spot-the-bug
  prompt: A probe is meant to test a footprint 100 wide, 100 deep, and 50 tall, but it reports blockers well outside that. Which line is wrong?
  code: |
    bool ADojoPlacementProbe::IsClear(const FVector& Spot) const
    {
    	const FCollisionShape Footprint = FCollisionShape::MakeBox(FVector(100.f, 100.f, 50.f));
    	FHitResult Hit;
    	return !GetWorld()->SweepSingleByChannel(Hit, Spot + FVector(0.f, 0.f, 200.f), Spot, FQuat::Identity, ECC_Visibility, Footprint);
    }
  bugLine: 3
  fix: Pass half the size on each axis, FVector(50.f, 50.f, 25.f), because a box shape takes half extents.
  explanation: MakeBox measures from the centre outward, so the numbers given are half sizes and the box built here is twice as big as intended on every axis.
- id: by-kind
  type: multiple-choice
  prompt: "A fireball should react only to pawns, whatever channels the scenery uses. Which query fits?"
  choices:
    - A by-channel trace on Visibility, with the scenery set to ignore it
    - A by-object-type query listing only the Pawn type
    - An overlap query with a huge sphere around the fireball
  answerIndex: 1
  explanation: A by-object-type query asks what an object is, so listing only the Pawn type makes the query look at pawns and nothing else.
- id: explain-sweep
  type: explain-in-one-sentence
  prompt: In one sentence, say why a sweep can catch something that a line trace along the same path misses.
  modelAnswer: A sweep carries a shape with width along the path, so it is blocked by anything that shape cannot fit past, while a line has no width and slips through any gap.
  rubric:
    - Says the sweep has volume or width
    - Says a line can pass through a gap the shape cannot
  explanation: A line answers whether one exact path is clear; a sweep answers whether a whole body can travel it.
```
