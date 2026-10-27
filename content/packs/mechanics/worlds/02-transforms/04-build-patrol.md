---
id: m2-patrol
title: A block that swings between two ends
order: 4
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [math, movement]
terms: [add-actor-offset, deltatime, fvector, tick, world-and-local-space]
prerequisites: [m2-sled]
xp: 70
estimatedMinutes: 18
concepts:
  - A mover that turns round has to keep track of where it is on its path
  - The block must be on its path at the end of every frame, however long the frame was
---

# Brief

When you place a patrol that faces along Y, with a travel distance of 500 and a speed of 250, and press Play, it slides 500 units out in two seconds, turns round, slides back to where it started, and keeps swinging, and it never stands outside the stretch between those two points.

Most of the code is written for you, including the numbers the patrol remembers. Write the body of `ADojoM2Patrol::Tick`:

1. Move the distance along the path by this frame's share of the speed, outward while `bOutbound` is set and back toward the start otherwise.
2. Turn round at an end and count it in `EndsReached`.
3. Put the actor at the start plus the path direction times that distance.

Dependency direction: the patrol knows nothing about anything else in the level; whatever wants to be hurt by it, or carried by it, looks at it.

This patrol is the second piece of the Clockwork Hall boss, where it swings as the crusher.

## See it in the editor

Place a `DojoM2Patrol`, turn it 90 degrees about Z so its arrow points along Y, and set Travel Distance to 500 and Speed to 250 in Details. Press Play: the block swings along Y between its start and 500 units away, forever. In the level Blueprint, on the 1 key, add a Print String of Get Ends Reached; press 1 after 2, 4, and 6 seconds and read 1, 2, and 3. Type `slomo 0.2` in the console to watch a turn up close, and `t.MaxFPS 20` to see it still turn at the same two points.

# Files

## DojoM2Patrol.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Patrol.generated.h"

/** A block that swings between its start and a far end along its own forward, at a steady speed, forever. */
UCLASS()
class ADojoM2Patrol : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and an arrow that shows the path's direction, and turns ticking on. */
	ADojoM2Patrol();

	/** How far the far end is from the start, along the actor's forward at the moment play begins. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol", meta = (ClampMin = "0"))
	float TravelDistance = 600.f;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Patrol", meta = (ClampMin = "0"))
	float Speed = 300.f;

	/** How far along the path the block is: 0 at the start, TravelDistance at the far end. */
	UFUNCTION(BlueprintPure, Category = "Patrol")
	float GetOffsetAlongPath() const;

	/** How many times an end of the path has been reached. */
	UFUNCTION(BlueprintPure, Category = "Patrol")
	int32 GetEndsReached() const;

	/** Moves along the path by this frame's share of the speed, turning round at each end. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers where the path starts and which way it runs. */
	virtual void BeginPlay() override;

private:
	FVector StartLocation = FVector::ZeroVector;

	FVector PathDirection = FVector::ForwardVector;

	float Offset = 0.f;

	bool bOutbound = true;

	int32 EndsReached = 0;
};
```

## DojoM2Patrol.cpp

```cpp
#include "DojoM2Patrol.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"

ADojoM2Patrol::ADojoM2Patrol()
{
	PrimaryActorTick.bCanEverTick = true;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM2Patrol::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation(); // @explain: The path is measured from where the patrol stands when play begins, so a designer places it at one end and the far end follows.
	PathDirection = GetActorForwardVector(); // @explain: The direction is read once, as the actor's forward, so turning the patrol in the editor turns its whole swing.
}

float ADojoM2Patrol::GetOffsetAlongPath() const
{
	return Offset;
}

int32 ADojoM2Patrol::GetEndsReached() const
{
	return EndsReached;
}

void ADojoM2Patrol::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Your code: move Offset along the path by this frame's share of Speed, outward while bOutbound is set and back toward the start otherwise.
	// Your code: turn round at an end, and count it in EndsReached.
	// Your code: put the actor at StartLocation plus PathDirection times Offset.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m2-patrol/DojoM2Patrol.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2PatrolTest
{
	/** Spawns a patrol at Where, with the settings a designer would give it in Details. */
	ADojoM2Patrol* SpawnPatrol(FDojoTestWorld& TestWorld, const FTransform& Where, float TravelDistance, float Speed)
	{
		ADojoM2Patrol* Patrol = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Patrol>(ADojoM2Patrol::StaticClass(), Where);
		Patrol->TravelDistance = TravelDistance;
		Patrol->Speed = Speed;
		Patrol->FinishSpawning(Where);
		return Patrol;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Patrol_SwingsAlongItsOwnForward, "Dojo.M2.Patrol.SwingsAlongItsOwnForward", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Swings a turned patrol out and back at 60 frames a second and checks where it is at the quarter points and how many ends it has reached. */
bool FDojo_M2_Patrol_SwingsAlongItsOwnForward::RunTest(const FString& Parameters)
{
	using namespace DojoM2PatrolTest;

	FDojoTestWorld TestWorld;

	const FTransform Where(FRotator(0.0, 90.0, 0.0), FVector(100.0, 50.0, 0.0));
	ADojoM2Patrol* Patrol = SpawnPatrol(TestWorld, Where, 500.f, 250.f);
	if (!TestNotNull(TEXT("Patrol spawned"), Patrol)) return false;

	TestWorld.Tick(60);
	TestTrue(TEXT("After 1 second it is halfway out along its own forward"), Patrol->GetActorLocation().Equals(FVector(100.0, 300.0, 0.0), 1.0));
	TestEqual(TEXT("Its distance along the path is 250"), Patrol->GetOffsetAlongPath(), 250.f, 1.f);

	TestWorld.Tick(61);
	TestEqual(TEXT("A little over 2 seconds in, it has reached the far end once"), Patrol->GetEndsReached(), 1);
	TestTrue(TEXT("and is on its way back"), Patrol->GetOffsetAlongPath() < 500.f && Patrol->GetOffsetAlongPath() > 480.f);

	TestWorld.Tick(120);
	TestEqual(TEXT("A little over 4 seconds in, it has reached the start again"), Patrol->GetEndsReached(), 2);
	TestTrue(TEXT("and is just setting out again"), Patrol->GetOffsetAlongPath() >= 0.f && Patrol->GetOffsetAlongPath() < 20.f);
	TestTrue(TEXT("It never left the line of its forward"), FMath::IsNearlyEqual(Patrol->GetActorLocation().X, 100.0, 0.01));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Patrol_SlowFramesStayOnThePath, "Dojo.M2.Patrol.SlowFramesStayOnThePath", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Swings a fast patrol through long frames and checks that at the end of every frame it stands between its two ends. */
bool FDojo_M2_Patrol_SlowFramesStayOnThePath::RunTest(const FString& Parameters)
{
	using namespace DojoM2PatrolTest;

	FDojoTestWorld TestWorld;

	ADojoM2Patrol* Patrol = SpawnPatrol(TestWorld, FTransform(FRotator(0.0, 90.0, 0.0)), 500.f, 400.f);
	if (!TestNotNull(TEXT("Patrol spawned"), Patrol)) return false;

	bool bStayedOnThePath = true;
	for (int32 Frame = 0; Frame < 20; ++Frame)
	{
		TestWorld.Tick(1, 0.45f);

		const double Along = Patrol->GetActorLocation().Y;
		if (Along < -0.01 || Along > 500.01 || Patrol->GetOffsetAlongPath() < -0.01f || Patrol->GetOffsetAlongPath() > 500.01f) bStayedOnThePath = false;
	}

	TestTrue(TEXT("Even with slow frames, the patrol stays between its two ends"), bStayedOnThePath);
	TestTrue(TEXT("It kept swinging, turning round several times in 9 seconds"), Patrol->GetEndsReached() >= 5 && Patrol->GetEndsReached() <= 8);
	TestTrue(TEXT("It never left the line of its forward"), FMath::IsNearlyEqual(Patrol->GetActorLocation().X, 0.0, 0.01));

	return true;
}

#endif
```

# Hints

- Tick keeps one number: how far along the path the block is. Where the block stands is then the start plus the path direction times that number.
- Think about the frame in which that number would pass an end: at the end of every frame the block should be standing on the stretch between the ends, however long the frame was.
- `FMath::Min` and `FMath::Clamp` are in `Math/UnrealMathUtility.h`; `SetActorLocation` is on `AActor` in `GameFramework/Actor.h`.

# Rubric

- The distance along the path is the one stored fact, and the location is set from it every frame.
- The movement per frame is `Speed` times `DeltaSeconds`.
- At the end of every frame the block stands between the start and the far end.
- Turning round at an end is counted once per end in `EndsReached`.
- The path direction is the actor's forward at BeginPlay, so turning the patrol in the editor turns its swing.

# Alternative

The patrol could compute its position from a clock instead of stepping: the distance along the path is a triangle wave of `Speed * Time`, so it is wherever the clock says, and several patrols given the same clock stay in step. The cost is that changing the speed in the middle of a swing makes the block jump, because the whole position is recomputed from the time. Stepping from the current offset lets the speed change at any moment, which is why this quest steps.
