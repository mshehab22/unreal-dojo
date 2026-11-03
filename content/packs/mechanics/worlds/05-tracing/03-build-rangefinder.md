---
id: m5-rangefinder
title: A rangefinder that measures what is in front of it
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [collision, math]
terms: [line-trace, fhitresult, collision-query-params, debug-draw, fvector]
prerequisites: [m5-lines-and-hits]
xp: 50
estimatedMinutes: 12
concepts:
  - One line trace answers how far away the first blocker is and what it is
  - A trace that starts inside the shooter's own shape needs to leave the shooter out
---

# Brief

When you place a rangefinder facing a wall, call Measure, and read its distance, it reports how far the wall's face is from the rangefinder's centre and which actor it is, and a green line is drawn to the spot the ray touched; turn it to face an empty stretch and the distance is its whole reach, nothing is found, and a red line is drawn to the end of the reach.

Most of the code is written for you. Explain the marked lines, then fill the gaps in `ADojoM5Rangefinder::Measure`:

1. Remember whether the trace found something.
2. Remember how far it was, or the whole reach when nothing was found, and which actor it was.
3. Draw the line for one second: green to the impact point, or red to the end of the reach.

Dependency direction: the rangefinder looks at the world and keeps what it saw; nothing in the world knows it exists.

This rangefinder is the first of five small tracing tools; the Watchtower boss builds on the second and the fifth.

## See it in the editor

Place a `DojoM5Rangefinder` in the level and a cube a few hundred units in front of it along the arrow. In the level Blueprint, on the 1 key, call Measure on the rangefinder, then Print String of its Get Distance. Press Play and press 1: a green line appears for a second and the number is the gap between the rangefinder's centre and the cube's face. Turn the rangefinder away and press 1 again: a red line, and the number is Reach. Select the cube, find Collision in Details, and change its Visibility response from Block to Ignore: the line now passes straight through it. Type `show Collision` in the console to see the shapes the ray can hit.

# Files

## DojoM5Rangefinder.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Rangefinder.generated.h"

/** A small block that measures the distance to whatever stands first in front of it and draws the line it measured along. */
UCLASS()
class ADojoM5Rangefinder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a solid box as the root, so the rangefinder has a shape of its own, and an arrow that shows where it looks. */
	ADojoM5Rangefinder();

	/** How far ahead it looks, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rangefinder", meta = (ClampMin = "1"))
	float Reach = 1000.f;

	/** Looks straight ahead once, remembers what it found, and draws the line for one second. */
	UFUNCTION(BlueprintCallable, Category = "Rangefinder")
	void Measure();

	/** True when the last measurement found something in reach. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	bool HasTarget() const;

	/** The distance to what the last measurement found, or the full reach when it found nothing. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	float GetDistance() const;

	/** The actor the last measurement found, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Rangefinder")
	AActor* GetTargetActor() const;

private:
	bool bHasTarget = false;

	float MeasuredDistance = 0.f;

	TWeakObjectPtr<AActor> TargetActor;
};
```

## DojoM5Rangefinder.cpp

```cpp
#include "DojoM5Rangefinder.h"

#include "Components/ArrowComponent.h"
#include "Components/BoxComponent.h"
#include "CollisionQueryParams.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Rangefinder::ADojoM5Rangefinder()
{
	PrimaryActorTick.bCanEverTick = false;

	UBoxComponent* Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(20.f, 20.f, 20.f));
	Body->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Body;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Body);
}

void ADojoM5Rangefinder::Measure()
{
	const FVector Start = GetActorLocation(); // @explain: The ray starts at the rangefinder's own centre, inside its own box.
	const FVector End = Start + GetActorForwardVector() * Reach; // @explain: The end is a point Reach units straight ahead, along the way the actor faces.

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this); // @explain: The ray begins inside the rangefinder's own solid box, so without this it would report the rangefinder itself at distance zero.

	FHitResult Hit;
	const bool bFound = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params); // @explain: It returns true when something blocks the Visibility channel on the line, and fills Hit with the first thing it met.

	// Your code: remember whether something was found in bHasTarget.
	// Your code: remember the distance in MeasuredDistance: the hit's distance when something was found, otherwise the whole Reach.
	// Your code: remember the actor that was found in TargetActor, or clear it.
	// Your code: draw a debug line for one second from Start to the impact point, green, or to End, red, when nothing was found.
}

bool ADojoM5Rangefinder::HasTarget() const
{
	return bHasTarget;
}

float ADojoM5Rangefinder::GetDistance() const
{
	return MeasuredDistance;
}

AActor* ADojoM5Rangefinder::GetTargetActor() const
{
	return TargetActor.Get();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m5-rangefinder/DojoM5Rangefinder.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5RangefinderTest
{
	/** Spawns a solid box centred at Where that answers the Visibility channel with the given response. */
	ADojoTestActor* SpawnBox(FDojoTestWorld& TestWorld, const FVector& Where, const FVector& HalfExtent, ECollisionResponse VisibilityResponse)
	{
		ADojoTestActor* Host = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator::ZeroRotator);
		if (!Host) return nullptr;

		UBoxComponent* Box = TestWorld.AddComponent<UBoxComponent>(Host);
		Box->SetBoxExtent(HalfExtent);
		Box->SetCollisionProfileName(TEXT("BlockAll"));
		Box->SetCollisionResponseToChannel(ECC_Visibility, VisibilityResponse);
		Box->AttachToComponent(Host->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Host;
	}

	/** Spawns a rangefinder at Where, turned by Facing, with the given reach. */
	ADojoM5Rangefinder* SpawnFinder(FDojoTestWorld& TestWorld, const FVector& Where, const FRotator& Facing, float Reach)
	{
		const FTransform Placement(Facing, Where);
		ADojoM5Rangefinder* Finder = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Rangefinder>(ADojoM5Rangefinder::StaticClass(), Placement);
		Finder->Reach = Reach;
		Finder->FinishSpawning(Placement);
		return Finder;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Rangefinder_MeasuresTheFirstThingAhead, "Dojo.M5.Rangefinder.MeasuresTheFirstThingAhead", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts two walls ahead of a turned rangefinder and checks that it reports the near one's face, the wall itself, and a hit, and not itself. */
bool FDojo_M5_Rangefinder_MeasuresTheFirstThingAhead::RunTest(const FString& Parameters)
{
	using namespace DojoM5RangefinderTest;

	FDojoTestWorld TestWorld;

	ADojoM5Rangefinder* Finder = SpawnFinder(TestWorld, FVector(0.0, 100.0, 0.0), FRotator(0.0, 90.0, 0.0), 1000.f);
	ADojoTestActor* NearWall = SpawnBox(TestWorld, FVector(0.0, 600.0, 0.0), FVector(200.f, 20.f, 200.f), ECR_Block);
	ADojoTestActor* FarWall = SpawnBox(TestWorld, FVector(0.0, 900.0, 0.0), FVector(200.f, 20.f, 200.f), ECR_Block);
	if (!TestNotNull(TEXT("Rangefinder spawned"), Finder)) return false;
	if (!TestNotNull(TEXT("Walls spawned"), NearWall) || !TestNotNull(TEXT("Far wall spawned"), FarWall)) return false;

	Finder->Measure();

	TestTrue(TEXT("It found something ahead"), Finder->HasTarget());
	TestEqual(TEXT("The distance runs from its centre to the near wall's face, 480 units along its own forward"), Finder->GetDistance(), 480.f, 1.f);
	TestTrue(TEXT("What it found is the near wall"), Finder->GetTargetActor() == NearWall);
	TestTrue(TEXT("It did not find itself"), Finder->GetTargetActor() != Finder);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Rangefinder_SaysSoWhenNothingIsInReach, "Dojo.M5.Rangefinder.SaysSoWhenNothingIsInReach", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Measures an empty hall, then a hall whose only wall lies beyond the reach, and then the same hall after a wall is destroyed. */
bool FDojo_M5_Rangefinder_SaysSoWhenNothingIsInReach::RunTest(const FString& Parameters)
{
	using namespace DojoM5RangefinderTest;

	FDojoTestWorld TestWorld;

	ADojoM5Rangefinder* Finder = SpawnFinder(TestWorld, FVector::ZeroVector, FRotator::ZeroRotator, 300.f);
	if (!TestNotNull(TEXT("Rangefinder spawned"), Finder)) return false;

	Finder->Measure();
	TestFalse(TEXT("An empty hall gives no target"), Finder->HasTarget());
	TestEqual(TEXT("and the distance is the whole reach"), Finder->GetDistance(), 300.f, 0.01f);
	TestNull(TEXT("and no actor"), Finder->GetTargetActor());

	ADojoTestActor* FarWall = SpawnBox(TestWorld, FVector(500.0, 0.0, 0.0), FVector(20.f, 200.f, 200.f), ECR_Block);
	if (!TestNotNull(TEXT("Wall spawned"), FarWall)) return false;

	Finder->Measure();
	TestFalse(TEXT("A wall beyond the reach is not found"), Finder->HasTarget());

	Finder->Reach = 1000.f;
	Finder->Measure();
	TestTrue(TEXT("With a longer reach the same wall is found"), Finder->HasTarget());
	TestEqual(TEXT("at the face of the wall"), Finder->GetDistance(), 480.f, 1.f);

	FarWall->Destroy();
	Finder->Measure();
	TestFalse(TEXT("After the wall is destroyed the next measurement finds nothing"), Finder->HasTarget());
	TestNull(TEXT("and no stale actor is kept"), Finder->GetTargetActor());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Rangefinder_OnlyBlockersAnswer, "Dojo.M5.Rangefinder.OnlyBlockersAnswer", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a box that ignores the Visibility channel in front of a solid wall and checks that the rangefinder measures to the wall. */
bool FDojo_M5_Rangefinder_OnlyBlockersAnswer::RunTest(const FString& Parameters)
{
	using namespace DojoM5RangefinderTest;

	FDojoTestWorld TestWorld;

	ADojoM5Rangefinder* Finder = SpawnFinder(TestWorld, FVector::ZeroVector, FRotator::ZeroRotator, 1000.f);
	ADojoTestActor* Glass = SpawnBox(TestWorld, FVector(300.0, 0.0, 0.0), FVector(20.f, 200.f, 200.f), ECR_Ignore);
	ADojoTestActor* Wall = SpawnBox(TestWorld, FVector(700.0, 0.0, 0.0), FVector(20.f, 200.f, 200.f), ECR_Block);
	if (!TestNotNull(TEXT("Rangefinder spawned"), Finder)) return false;
	if (!TestNotNull(TEXT("Glass spawned"), Glass) || !TestNotNull(TEXT("Wall spawned"), Wall)) return false;

	Finder->Measure();

	TestTrue(TEXT("It found the wall"), Finder->GetTargetActor() == Wall);
	TestEqual(TEXT("A box that ignores the channel does not answer, so the distance runs to the wall's face"), Finder->GetDistance(), 680.f, 1.f);

	return true;
}

#endif
```

# Hints

- The result of the trace has two parts: a yes or no that the call returns, and the details it writes into the hit result you passed in. Each remembered value comes from one of the two.
- The hit result carries how far along the line the first blocker was, the actor it belongs to, and the exact point the ray touched. The debug helper draws a line between two points in a colour and keeps it for a number of seconds.
- `FHitResult::Distance`, `FHitResult::GetActor`, and `FHitResult::ImpactPoint`; `DrawDebugLine` is in `DrawDebugHelpers.h`, and `FColor::Green` and `FColor::Red` are ready-made colours.

# Rubric

- The distance is the hit's distance when something was found and the whole reach otherwise.
- The target is the actor that was hit, and it is cleared when nothing was found, so a later miss never reports an old target.
- The rangefinder leaves itself out of the trace, so its own solid shape never answers first.
- A debug line is drawn on every measurement, green to where the ray touched when something was found, and red to the end of the reach when not.
- Only things that block the Visibility channel answer; a shape that ignores it is measured through.
- The reach is a property a designer can tune, and the rangefinder looks once per call rather than every frame.

# Alternative

The rangefinder could trace by object type instead of by channel, asking for static walls and nothing else. That answers a different question: what the thing is, rather than how it responds to looking at it. A channel trace follows the designer's collision settings, so a glass pane set to ignore Visibility is invisible to the rangefinder with no code change; an object-type trace would still report the glass unless the glass was left off the list. This quest uses the channel because the point is to see how settings on the target change the answer.

# Parsons

```yaml
- id: rangefinder-measure
  prompt: Put Measure in order.
  lines:
    - "void ADojoM5Rangefinder::Measure()"
    - "{"
    - "	const FVector Start = GetActorLocation();"
    - "	const FVector End = Start + GetActorForwardVector() * Reach;"
    - "	FCollisionQueryParams Params;"
    - "	Params.AddIgnoredActor(this);"
    - "	FHitResult Hit;"
    - "	const bool bFound = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params);"
    - "	MeasuredDistance = bFound ? Hit.Distance : Reach;"
    - "}"
  distractors:
    - line: "	const bool bFound = GetWorld()->LineTraceSingleByChannel(Hit, End, Start, ECC_Visibility, Params);"
      mistake: The start and end are swapped, so the line runs backwards and never meets what is ahead.
    - line: "	Params.AddIgnoredActor(Hit.GetActor());"
      mistake: The hit result is empty until the trace has run, so there is nothing in it to ignore yet.
```
