---
id: m5-feeler
title: A feeler that checks whether a ball can roll through
order: 6
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [collision, math]
terms: [sweep, fhitresult, collision-shape, collision-query-params, debug-draw]
prerequisites: [m5-shapes-and-queries]
xp: 70
estimatedMinutes: 20
concepts:
  - A sweep asks whether a whole shape fits along a path, which a line cannot say
  - Where the shape stopped and where it touched are two different points
---

# Brief

When you place a feeler facing a gap between two posts and ask it to probe with a ball of radius 40, it says the path is clear, and with a ball of radius 60 it says the path is blocked, names the post, and draws the ball where it would have stopped; face it at a wall and it reports two points: where the ball's centre would stop, one radius short of the wall, and where the ball would touch, on the wall's face.

Most of the code is written for you, including the path and the drawing. Fill the gap in `ADojoM5Feeler::Probe`:

1. Sweep a ball of `Radius` from `Start` to `End` on the Visibility channel, with no rotation, and set `bBlocked` from the sweep.
2. Remember how far the ball's centre travelled before it stopped, or the whole travel distance when the path is clear.
3. Remember where the ball's centre stopped and the point it touched, which are both the end of the path when it is clear, and the actor in the way, or none.

Dependency direction: the feeler asks the world and keeps the answer; the world, and whatever uses the answer, are separate.

This feeler is the extension of the Watchtower boss: a gate that closes after an alarm asks it whether anyone is in the way before every step.

## See it in the editor

Place a `DojoM5Feeler` and two cubes either side of its line, 100 units apart and 500 units ahead. In the level Blueprint, on the 1 key, call Probe and print the returned Boolean and Get Clear Distance. Press Play and press 1 with Radius 40: true and the full travel distance, with a green ball drawn at the end. Select the feeler and change Radius to 60 in Details, and press 1 again: false, a shorter clear distance, and a red ball stopped in front of the cubes. Replace the cubes with one wall and read Get Stop Location and Get Impact Point: they differ by exactly the radius.

# Files

## DojoM5Feeler.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Feeler.generated.h"

/** Checks whether a ball of a given size can roll straight ahead for a distance, and where it would stop if something is in the way. */
UCLASS()
class ADojoM5Feeler : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a scene root and an arrow that shows the way the ball would roll. */
	ADojoM5Feeler();

	/** The radius of the ball that has to fit, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Feeler", meta = (ClampMin = "1"))
	float Radius = 40.f;

	/** How far ahead the ball has to roll, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Feeler", meta = (ClampMin = "1"))
	float TravelDistance = 600.f;

	/** Sweeps the ball along the path once and draws it. True when the whole path is clear. */
	UFUNCTION(BlueprintCallable, Category = "Feeler")
	bool Probe();

	/** How far the ball's centre can travel before it touches something, or the whole travel distance when the path is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	float GetClearDistance() const;

	/** Where the ball's centre would stop. At the end of the path when it is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	FVector GetStopLocation() const;

	/** The point on the blocking surface that the ball touched. At the end of the path when it is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	FVector GetImpactPoint() const;

	/** The actor the ball would touch, or nullptr when the path is clear. */
	UFUNCTION(BlueprintPure, Category = "Feeler")
	AActor* GetBlocker() const;

private:
	float ClearDistance = 0.f;

	FVector StopLocation = FVector::ZeroVector;

	FVector ImpactPoint = FVector::ZeroVector;

	TWeakObjectPtr<AActor> Blocker;
};
```

## DojoM5Feeler.cpp

```cpp
#include "DojoM5Feeler.h"

#include "CollisionQueryParams.h"
#include "CollisionShape.h"
#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Feeler::ADojoM5Feeler()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

bool ADojoM5Feeler::Probe()
{
	const FVector Start = GetActorLocation();
	const FVector End = Start + GetActorForwardVector() * TravelDistance;

	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);

	FHitResult Hit;
	bool bBlocked = false;

	// Your code: sweep a ball of Radius from Start to End with FQuat::Identity on the Visibility channel, and set bBlocked from the sweep.
	// Your code: remember in ClearDistance how far the ball's centre travelled before it stopped, or the whole TravelDistance when the path is clear.
	// Your code: remember where the ball's centre stopped in StopLocation, and the point it touched in ImpactPoint; both are End when the path is clear.
	// Your code: remember the actor it would touch in Blocker, or clear it.

	DrawDebugSphere(GetWorld(), Start, Radius, 12, FColor::Cyan, false, 1.f);
	DrawDebugSphere(GetWorld(), StopLocation, Radius, 12, bBlocked ? FColor::Red : FColor::Green, false, 1.f);
	DrawDebugLine(GetWorld(), Start, StopLocation, FColor::White, false, 1.f);
	return !bBlocked;
}

float ADojoM5Feeler::GetClearDistance() const
{
	return ClearDistance;
}

FVector ADojoM5Feeler::GetStopLocation() const
{
	return StopLocation;
}

FVector ADojoM5Feeler::GetImpactPoint() const
{
	return ImpactPoint;
}

AActor* ADojoM5Feeler::GetBlocker() const
{
	return Blocker.Get();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m5-feeler/DojoM5Feeler.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5FeelerTest
{
	/** Spawns a solid box that blocks everything, centred at Where. */
	ADojoTestActor* SpawnSolid(FDojoTestWorld& TestWorld, const FVector& Where, const FVector& HalfExtent)
	{
		ADojoTestActor* Host = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator::ZeroRotator);
		if (!Host) return nullptr;

		UBoxComponent* Box = TestWorld.AddComponent<UBoxComponent>(Host);
		Box->SetBoxExtent(HalfExtent);
		Box->SetCollisionProfileName(TEXT("BlockAll"));
		Box->AttachToComponent(Host->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Host;
	}

	/** Spawns a feeler at Where, turned by Facing, with the given ball radius and travel distance. */
	ADojoM5Feeler* SpawnFeeler(FDojoTestWorld& TestWorld, const FVector& Where, const FRotator& Facing, float Radius, float TravelDistance)
	{
		const FTransform Placement(Facing, Where);
		ADojoM5Feeler* Feeler = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Feeler>(ADojoM5Feeler::StaticClass(), Placement);
		Feeler->Radius = Radius;
		Feeler->TravelDistance = TravelDistance;
		Feeler->FinishSpawning(Placement);
		return Feeler;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Feeler_OnlyANarrowBallFitsTheGap, "Dojo.M5.Feeler.OnlyANarrowBallFitsTheGap", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Builds a gap 100 units wide between two posts and checks that a ball of radius 40 rolls through it and a ball of radius 60 is stopped by a post. */
bool FDojo_M5_Feeler_OnlyANarrowBallFitsTheGap::RunTest(const FString& Parameters)
{
	using namespace DojoM5FeelerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* LeftPost = SpawnSolid(TestWorld, FVector(500.0, 90.0, 0.0), FVector(20.f, 40.f, 200.f));
	ADojoTestActor* RightPost = SpawnSolid(TestWorld, FVector(500.0, -90.0, 0.0), FVector(20.f, 40.f, 200.f));
	ADojoM5Feeler* Feeler = SpawnFeeler(TestWorld, FVector::ZeroVector, FRotator::ZeroRotator, 40.f, 800.f);
	if (!TestNotNull(TEXT("Posts spawned"), LeftPost) || !TestNotNull(TEXT("Right post spawned"), RightPost)) return false;
	if (!TestNotNull(TEXT("Feeler spawned"), Feeler)) return false;

	TestWorld.Tick(1);
	TestTrue(TEXT("A ball of radius 40 fits through a gap 100 units wide"), Feeler->Probe());
	TestEqual(TEXT("so the whole travel distance is clear"), Feeler->GetClearDistance(), 800.f, 0.5f);
	TestNull(TEXT("and nothing is named"), Feeler->GetBlocker());

	Feeler->Radius = 60.f;
	TestFalse(TEXT("A ball of radius 60 does not fit"), Feeler->Probe());
	TestTrue(TEXT("and one of the posts is named"), Feeler->GetBlocker() == LeftPost || Feeler->GetBlocker() == RightPost);
	TestTrue(TEXT("It stopped short of the posts' front faces, which are 480 units out"), Feeler->GetClearDistance() < 480.f);

	Feeler->Radius = 1.f;
	TestTrue(TEXT("A ball almost as thin as a line goes through"), Feeler->Probe());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Feeler_StopsWhereTheBallCanGo, "Dojo.M5.Feeler.StopsWhereTheBallCanGo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a wall across a turned feeler's path and checks the clear distance, the stop location, and the impact point for two ball sizes. */
bool FDojo_M5_Feeler_StopsWhereTheBallCanGo::RunTest(const FString& Parameters)
{
	using namespace DojoM5FeelerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Wall = SpawnSolid(TestWorld, FVector(100.0, 700.0, 0.0), FVector(400.f, 20.f, 200.f));
	ADojoM5Feeler* Feeler = SpawnFeeler(TestWorld, FVector(100.0, 0.0, 0.0), FRotator(0.0, 90.0, 0.0), 40.f, 1000.f);
	if (!TestNotNull(TEXT("Wall spawned"), Wall) || !TestNotNull(TEXT("Feeler spawned"), Feeler)) return false;

	TestWorld.Tick(1);
	TestFalse(TEXT("A wall across the path blocks the ball"), Feeler->Probe());
	TestTrue(TEXT("and it is named"), Feeler->GetBlocker() == Wall);
	TestEqual(TEXT("The ball's centre stops one radius short of the wall's face at 680, so it has travelled 640"), Feeler->GetClearDistance(), 640.f, 1.f);
	TestTrue(TEXT("The stop location is the centre of the stopped ball, along the feeler's own forward"), Feeler->GetStopLocation().Equals(FVector(100.0, 640.0, 0.0), 1.0));
	TestTrue(TEXT("The impact point is on the wall's face, not at the ball's centre"), Feeler->GetImpactPoint().Equals(FVector(100.0, 680.0, 0.0), 1.0));

	Feeler->Radius = 100.f;
	TestFalse(TEXT("A bigger ball is blocked too"), Feeler->Probe());
	TestEqual(TEXT("and stops further from the wall, at 580"), Feeler->GetClearDistance(), 580.f, 1.f);
	TestEqual(TEXT("while the touched point on the wall has not moved"), Feeler->GetImpactPoint().Y, 680.0, 1.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Feeler_ShortPathsAreClear, "Dojo.M5.Feeler.ShortPathsAreClear", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Shortens the travel distance so the wall lies beyond it and checks that the path is clear and ends at the end of the travel. */
bool FDojo_M5_Feeler_ShortPathsAreClear::RunTest(const FString& Parameters)
{
	using namespace DojoM5FeelerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Wall = SpawnSolid(TestWorld, FVector(700.0, 0.0, 0.0), FVector(20.f, 400.f, 200.f));
	ADojoM5Feeler* Feeler = SpawnFeeler(TestWorld, FVector::ZeroVector, FRotator::ZeroRotator, 40.f, 500.f);
	if (!TestNotNull(TEXT("Wall spawned"), Wall) || !TestNotNull(TEXT("Feeler spawned"), Feeler)) return false;

	TestWorld.Tick(1);
	TestTrue(TEXT("A wall beyond the travel distance does not block the ball"), Feeler->Probe());
	TestTrue(TEXT("and the stop location is the end of the path"), Feeler->GetStopLocation().Equals(FVector(500.0, 0.0, 0.0), 0.5));
	TestEqual(TEXT("with the whole distance clear"), Feeler->GetClearDistance(), 500.f, 0.5f);

	Feeler->TravelDistance = 650.f;
	TestFalse(TEXT("A ball that reaches the wall with its leading edge is blocked even though its centre would not get there"), Feeler->Probe());

	return true;
}

#endif
```

# Hints

- A sweep needs three things a line does not: a shape, a rotation for the shape, and the same start and end. Decide the shape from the radius, and the rotation can be none.
- The sweep reports two positions. One is where the moving shape came to rest, and the other is the spot on the surface it touched. The hit result also says how far the shape travelled.
- `UWorld::SweepSingleByChannel`, `FCollisionShape::MakeSphere`, and `FQuat::Identity`; `FHitResult::Location`, `ImpactPoint`, and `Distance`; the shape type is in `CollisionShape.h`.

# Rubric

- The probe is a sweep of a sphere of the configured radius, not a line, so a gap too narrow for the ball blocks it.
- The clear distance is how far the ball's centre travelled, and the whole travel distance when nothing blocks.
- The stop location is the centre of the stopped ball and the impact point is on the surface, and both are the end of the path when it is clear.
- The blocking actor is remembered when there is one and cleared when there is not, so a later clear probe never names an old blocker.
- A debug sphere is drawn at the start and at the stop location on every probe, red when blocked and green when clear.
- Radius and travel distance are properties a designer can tune, and the feeler probes when asked, not every frame.

# Alternative

A box sweep fits a crate or a doorway better than a sphere, and a capsule fits a character best of all; the same call takes any of them, and only the shape and its rotation change. A sphere is the most forgiving because it has no orientation, so it cannot be caught by a corner the way a tilted box can. Another option is a few line traces spread across the width of the ball; it is cheaper per query but can miss a post that stands between two of the lines, which is the reason a swept shape exists.
