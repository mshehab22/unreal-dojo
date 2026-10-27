---
id: m2-bumper
title: A ball that bounces off walls
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [math, movement, collision]
terms: [add-actor-offset, sweep, fhitresult, fvector, tick, deltatime]
prerequisites: [m2-patrol]
xp: 70
estimatedMinutes: 18
concepts:
  - A swept move stops at the blocker and hands back what it hit
  - A bounce mirrors the heading about the surface's normal, so a glancing hit keeps its sideways motion
---

# Brief

When you place a bumper between two walls and press Play, the ball rolls until it touches a wall, stops against it without going in, leaves the way a ball would, and keeps going; after the first touch its bounce count reads 1, and a ball that hits a wall at a slant keeps moving along the wall.

A wall class is provided for you in full. Most of the bumper is written too. Write the body of `ADojoM2Bumper::Tick`:

1. Move the ball along its heading by this frame's share of the speed, with a sweep, and keep the hit result the move fills in.
2. When a blocker stopped the move, bounce: turn the heading the way a ball turns off that surface, and count the bounce.

Dependency direction: the bumper knows nothing about the walls; it only reacts to what its own sweep hits. The walls know nothing about the bumper.

This bumper is the third piece of the Clockwork Hall boss, where it is the bouncing ball.

## See it in the editor

Place a `DojoM2Bumper` and two `DojoM2Wall` actors, one 300 units to each side of it along Y. Press Play: the ball rolls to one wall, turns, rolls to the other, and keeps going. Select the bumper and set its Heading to X 1, Y 1 in Details to see it bounce at a slant. Show the collision shapes with `show Collision` in the console to see the ball's sphere and the walls' boxes. In the level Blueprint, on the 1 key, add a Print String of Get Bounces.

# Files

## DojoM2Wall.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Wall.generated.h"

class UBoxComponent;

/** A solid box that blocks everything that moves into it with a sweep; size it through its Box in Details. */
UCLASS()
class ADojoM2Wall : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the blocking box as the root. */
	ADojoM2Wall();

	/** The solid shape; its extent is half the wall's size on each axis. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Wall")
	TObjectPtr<UBoxComponent> Box;
};
```

## DojoM2Wall.cpp

```cpp
#include "DojoM2Wall.h"

#include "Components/BoxComponent.h"

ADojoM2Wall::ADojoM2Wall()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(300.f, 20.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	RootComponent = Box;
}
```

## DojoM2Bumper.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Bumper.generated.h"

class USphereComponent;

/** A ball that rolls along a heading and bounces off whatever blocks it. */
UCLASS()
class ADojoM2Bumper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid ball as the root and turns ticking on. */
	ADojoM2Bumper();

	/** The solid shape that sweeps through the world. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Bumper")
	TObjectPtr<USphereComponent> Ball;

	/** The direction the ball rolls in the world; it changes at every bounce. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bumper")
	FVector Heading = FVector::RightVector;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Bumper", meta = (ClampMin = "0"))
	float Speed = 400.f;

	/** How many times the ball has bounced. */
	UFUNCTION(BlueprintPure, Category = "Bumper")
	int32 GetBounces() const;

	/** Rolls by this frame's share of the speed, stopping at a blocker and bouncing off it. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Turns the heading into a direction of length one. */
	virtual void BeginPlay() override;

private:
	int32 Bounces = 0;
};
```

## DojoM2Bumper.cpp

```cpp
#include "DojoM2Bumper.h"

#include "Components/SphereComponent.h"

ADojoM2Bumper::ADojoM2Bumper()
{
	PrimaryActorTick.bCanEverTick = true;

	Ball = CreateDefaultSubobject<USphereComponent>(TEXT("Ball"));
	Ball->SetSphereRadius(40.f);
	Ball->SetCollisionProfileName(TEXT("BlockAllDynamic")); // @explain: A swept move only stops at things the moving shape blocks, so the ball needs a profile that blocks, not a bare scene root.
	RootComponent = Ball;
}

void ADojoM2Bumper::BeginPlay()
{
	Super::BeginPlay();

	Heading = Heading.GetSafeNormal(); // @explain: A heading of length one means Speed is the whole story: Heading times Speed is exactly Speed units a second.
}

int32 ADojoM2Bumper::GetBounces() const
{
	return Bounces;
}

void ADojoM2Bumper::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Your code: move the ball along Heading by this frame's share of Speed, with a sweep, and keep the hit result the move fills in.
	// Your code: when a blocker stopped the move, turn Heading the way a ball turns off that surface, and count the bounce.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m2-bumper/DojoM2Bumper.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2BumperTest
{
	/** Places a wall 40 thick, 600 wide, and 400 tall at the given spot. */
	ADojoM2Wall* PlaceWall(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		ADojoM2Wall* Wall = TestWorld.SpawnActor<ADojoM2Wall>();
		Wall->Box->SetBoxExtent(FVector(300.0, 20.0, 200.0));
		Wall->SetActorLocation(Where);
		return Wall;
	}

	/** Spawns a bumper at the origin with the settings a designer would give it in Details. */
	ADojoM2Bumper* PlaceBumper(FDojoTestWorld& TestWorld, const FVector& Heading, float Speed)
	{
		ADojoM2Bumper* Bumper = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Bumper>(ADojoM2Bumper::StaticClass(), FTransform::Identity);
		Bumper->Heading = Heading;
		Bumper->Speed = Speed;
		Bumper->FinishSpawning(FTransform::Identity);
		return Bumper;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Bumper_StopsAtTheWallAndBounces, "Dojo.M2.Bumper.StopsAtTheWallAndBounces", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rolls a ball at a wall whose face is 280 away and checks it never goes in, bounces once, and rolls back. */
bool FDojo_M2_Bumper_StopsAtTheWallAndBounces::RunTest(const FString& Parameters)
{
	using namespace DojoM2BumperTest;

	FDojoTestWorld TestWorld;

	PlaceWall(TestWorld, FVector(0.0, 300.0, 0.0));
	ADojoM2Bumper* Bumper = PlaceBumper(TestWorld, FVector(0.0, 1.0, 0.0), 600.f);
	if (!TestNotNull(TEXT("Bumper spawned"), Bumper)) return false;

	double FurthestIn = 0.0;
	for (int32 Frame = 0; Frame < 60; ++Frame)
	{
		TestWorld.Tick(1);
		FurthestIn = FMath::Max(FurthestIn, Bumper->GetActorLocation().Y);
	}

	TestTrue(TEXT("The ball never goes into the wall: its edge stops at 280, so its center stops at 240"), FurthestIn > 235.0 && FurthestIn < 241.0);
	TestEqual(TEXT("It bounced once"), Bumper->GetBounces(), 1);
	TestTrue(TEXT("It now rolls back the way it came"), Bumper->Heading.Equals(FVector(0.0, -1.0, 0.0), 0.01));
	TestTrue(TEXT("and has left the wall behind"), Bumper->GetActorLocation().Y < 100.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Bumper_BounceMirrorsTheHeading, "Dojo.M2.Bumper.BounceMirrorsTheHeading", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rolls a ball at a wall at a slant and checks it keeps its sideways motion instead of turning straight back. */
bool FDojo_M2_Bumper_BounceMirrorsTheHeading::RunTest(const FString& Parameters)
{
	using namespace DojoM2BumperTest;

	FDojoTestWorld TestWorld;

	PlaceWall(TestWorld, FVector(0.0, 300.0, 0.0));
	ADojoM2Bumper* Bumper = PlaceBumper(TestWorld, FVector(1.0, 1.0, 0.0), 600.f);
	if (!TestNotNull(TEXT("Bumper spawned"), Bumper)) return false;

	TestWorld.Tick(60);

	TestEqual(TEXT("It bounced once"), Bumper->GetBounces(), 1);
	TestTrue(TEXT("It keeps rolling the same way along the wall"), Bumper->Heading.X > 0.69 && Bumper->Heading.X < 0.72);
	TestTrue(TEXT("and its way toward the wall has turned round"), Bumper->Heading.Y < -0.69 && Bumper->Heading.Y > -0.72);
	TestTrue(TEXT("The heading is still of length one"), FMath::IsNearlyEqual(Bumper->Heading.Size(), 1.0, 0.01));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Bumper_TwoWallsKeepItInside, "Dojo.M2.Bumper.TwoWallsKeepItInside", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rolls a ball between two walls, including through the longest frames the engine allows, and checks it never gets out. */
bool FDojo_M2_Bumper_TwoWallsKeepItInside::RunTest(const FString& Parameters)
{
	using namespace DojoM2BumperTest;

	FDojoTestWorld TestWorld;

	PlaceWall(TestWorld, FVector(0.0, 300.0, 0.0));
	PlaceWall(TestWorld, FVector(0.0, -300.0, 0.0));
	ADojoM2Bumper* Bumper = PlaceBumper(TestWorld, FVector(0.0, 1.0, 0.0), 600.f);
	if (!TestNotNull(TEXT("Bumper spawned"), Bumper)) return false;

	bool bStayedInside = true;
	for (int32 Frame = 0; Frame < 180; ++Frame)
	{
		TestWorld.Tick(1);
		if (FMath::Abs(Bumper->GetActorLocation().Y) > 241.0) bStayedInside = false;
	}

	TestTrue(TEXT("At 60 frames a second the ball stays between the walls"), bStayedInside);
	TestTrue(TEXT("It bounced at least three times in 3 seconds"), Bumper->GetBounces() >= 3);

	for (int32 Frame = 0; Frame < 20; ++Frame)
	{
		TestWorld.Tick(1, 0.4f);
		if (FMath::Abs(Bumper->GetActorLocation().Y) > 241.0) bStayedInside = false;
	}

	TestTrue(TEXT("Even with 0.4 second frames the ball cannot skip through a wall"), bStayedInside);

	return true;
}

#endif
```

# Hints

- One call moves the actor and also tells you whether something stopped it. Keep what it fills in, and ask it whether the stop was a real block.
- The offset functions take a sweep flag and a place for the hit result. A hit result knows which way the surface it struck faces, and a ball leaves a surface the way light leaves a mirror.
- `FHitResult::IsValidBlockingHit` and `ImpactNormal` are in `Engine/HitResult.h`; `FVector::MirrorByVector` is in `Math/Vector.h`.

# Rubric

- The move is swept (the flag is on) and the hit result is read after it.
- Only a valid blocking hit bounces, and free flight leaves the heading alone.
- A bounce mirrors the heading about the surface's normal, so a glancing hit keeps its sideways motion, and each bounce is counted once.
- The step is scaled by `DeltaSeconds`, and the ball has a collision shape as its root, so the sweep has something to stop against.
- The bumper reacts only to its own sweep and holds no pointer to the walls; the walls know nothing about the bumper.
- While testing in the editor the collision is made visible, with `show Collision` or a debug line along the heading.

# Alternative

A `UProjectileMovementComponent` with bouncing turned on does the same job with no Tick code: it sweeps, reflects the velocity off the surface, and loses a set share of its speed at each bounce. The cost is that its bounce rules are the component's rules: you count bounces by binding its bounce event, and a special rule at the wall, such as scoring or a changing speed, has to be hung from that event. Writing the move by hand puts the rule exactly where the mechanic is. A later quest in this world compares the two in full.
