---
id: m2-sled
title: A sled that glides in its own frame or the world's
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [math, movement]
terms: [world-and-local-space, add-actor-offset, deltatime, fvector, tick]
prerequisites: [m2-space-and-sweeps]
xp: 50
estimatedMinutes: 12
concepts:
  - One checkbox decides whether a direction is read in the sled's frame or the world's
  - A step scaled by the frame's duration covers the same distance at any frame rate
---

# Brief

When you place a sled that has been turned 90 degrees, press Play, and leave its Local Space box ticked, it glides 200 units a second the way its arrow points; untick the box and it glides along the world's X axis instead, whichever way it faces, and in both cases it travels equally far in a second at any frame rate.

Most of the code is written for you. Explain the marked lines, then fill the two gaps in `ADojoM2Sled::Tick`:

1. Turn the step into this frame's share of the speed.
2. Move by the step in the sled's own frame when `bLocalSpace` is set, and in the world's frame otherwise.

Dependency direction: the sled knows nothing about anything else in the level; it only moves itself.

This sled is the first piece of the Clockwork Hall boss, where it rolls as a boulder.

## See it in the editor

Place a `DojoM2Sled` and turn it 90 degrees about Z in Details (Rotation Z = 90); its arrow now points along Y. Press Play: it glides along Y. Stop, untick Local Space, and press Play again: it glides along X while the arrow still points along Y. Then open the console with the backtick key and type `t.MaxFPS 30`, then `t.MaxFPS 120`, and watch that it reaches the same spot after the same number of seconds both times. In the level Blueprint, on the 1 key, add a Print String of the sled's Get Distance Travelled to read the distance.

# Files

## DojoM2Sled.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Sled.generated.h"

/** A block that glides along a direction at a steady speed, measured in its own frame or in the world's. */
UCLASS()
class ADojoM2Sled : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and an arrow that shows the sled's forward, and turns ticking on. */
	ADojoM2Sled();

	/** Which way to glide; only the direction matters, not the length of this vector. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled")
	FVector Direction = FVector::ForwardVector;

	/** Units per second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled", meta = (ClampMin = "0"))
	float Speed = 200.f;

	/** True: Direction is seen from the sled itself, so turning the sled turns its path. False: Direction is a direction in the world. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Sled")
	bool bLocalSpace = true;

	/** Total distance glided since play began. */
	UFUNCTION(BlueprintPure, Category = "Sled")
	float GetDistanceTravelled() const;

	/** Glides by this frame's share of the speed. */
	virtual void Tick(float DeltaSeconds) override;

private:
	float DistanceTravelled = 0.f;
};
```

## DojoM2Sled.cpp

```cpp
#include "DojoM2Sled.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"

ADojoM2Sled::ADojoM2Sled()
{
	PrimaryActorTick.bCanEverTick = true; // @explain: Actors do not tick unless the constructor allows it, and this one moves every frame.

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root); // @explain: The arrow is a child of the root, so it turns with the sled and shows which way the sled's forward points.
}

float ADojoM2Sled::GetDistanceTravelled() const
{
	return DistanceTravelled;
}

void ADojoM2Sled::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	FVector Step = Direction.GetSafeNormal() * Speed; // @explain: Dividing a vector by its own length gives a direction of length one, so Direction (3, 0, 0) glides at the same Speed as (1, 0, 0), and a zero vector gives zero rather than an error.
	// Your code: turn Step into this frame's share, so the distance per second does not depend on how long frames are.
	// Your code: move by Step in the sled's own frame when bLocalSpace is set, and in the world's frame otherwise.

	DistanceTravelled += Step.Size(); // @explain: The counter adds the length of what was asked for this frame, so it is only right once Step has been scaled to the frame.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m2-sled/DojoM2Sled.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2SledTest
{
	/** Spawns a sled turned by Yaw degrees, with the settings a designer would give it in Details. */
	ADojoM2Sled* SpawnSled(FDojoTestWorld& TestWorld, double Yaw, const FVector& Direction, bool bLocalSpace)
	{
		const FTransform Where(FRotator(0.0, Yaw, 0.0));
		ADojoM2Sled* Sled = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Sled>(ADojoM2Sled::StaticClass(), Where);
		Sled->Direction = Direction;
		Sled->bLocalSpace = bLocalSpace;
		Sled->FinishSpawning(Where);
		return Sled;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Sled_SpaceDecidesTheWay, "Dojo.M2.Sled.SpaceDecidesTheWay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Glides three sleds for one second and checks which way each went in the world. */
bool FDojo_M2_Sled_SpaceDecidesTheWay::RunTest(const FString& Parameters)
{
	using namespace DojoM2SledTest;

	FDojoTestWorld TestWorld;

	ADojoM2Sled* LocalFrame = SpawnSled(TestWorld, 90.0, FVector::ForwardVector, true);
	ADojoM2Sled* WorldFrame = SpawnSled(TestWorld, 90.0, FVector::ForwardVector, false);
	ADojoM2Sled* Sideways = SpawnSled(TestWorld, 90.0, FVector::RightVector, true);
	if (!TestNotNull(TEXT("Sleds spawned"), Sideways)) return false;

	TestWorld.Tick(60);

	TestTrue(TEXT("A local forward follows the way the sled faces, here along Y"), LocalFrame->GetActorLocation().Equals(FVector(0.0, 200.0, 0.0), 0.5));
	TestTrue(TEXT("A world direction ignores the way the sled faces, here along X"), WorldFrame->GetActorLocation().Equals(FVector(200.0, 0.0, 0.0), 0.5));
	TestTrue(TEXT("A local right is the sled's own right, here toward minus X"), Sideways->GetActorLocation().Equals(FVector(-200.0, 0.0, 0.0), 0.5));
	TestTrue(TEXT("Moving never turns the sled"), LocalFrame->GetActorRotation().Equals(FRotator(0.0, 90.0, 0.0), 0.01));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Sled_FrameRateDoesNotChangeTheDistance, "Dojo.M2.Sled.FrameRateDoesNotChangeTheDistance", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Glides the same sled for one second at 60 frames and at 15 frames and checks both covered the same ground. */
bool FDojo_M2_Sled_FrameRateDoesNotChangeTheDistance::RunTest(const FString& Parameters)
{
	using namespace DojoM2SledTest;

	FVector Fast = FVector::ZeroVector;
	float FastDistance = 0.f;
	{
		FDojoTestWorld TestWorld;
		ADojoM2Sled* Sled = SpawnSled(TestWorld, 0.0, FVector::ForwardVector, false);
		TestWorld.Tick(60, 1.f / 60.f);
		Fast = Sled->GetActorLocation();
		FastDistance = Sled->GetDistanceTravelled();
	}

	FVector Slow = FVector::ZeroVector;
	float SlowDistance = 0.f;
	{
		FDojoTestWorld TestWorld;
		ADojoM2Sled* Sled = SpawnSled(TestWorld, 0.0, FVector::ForwardVector, false);
		TestWorld.Tick(15, 1.f / 15.f);
		Slow = Sled->GetActorLocation();
		SlowDistance = Sled->GetDistanceTravelled();
	}

	TestTrue(TEXT("A second of 60 short frames covers the speed, 200 units"), Fast.Equals(FVector(200.0, 0.0, 0.0), 0.5));
	TestTrue(TEXT("A second of 15 long frames covers the same ground"), Slow.Equals(Fast, 0.5));
	TestTrue(TEXT("The distance counter agrees at both frame rates"), FMath::IsNearlyEqual(FastDistance, 200.f, 0.5f) && FMath::IsNearlyEqual(SlowDistance, 200.f, 0.5f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Sled_OnlyTheDirectionCounts, "Dojo.M2.Sled.OnlyTheDirectionCounts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Gives one sled a long direction and one a zero direction and checks the first glides at Speed and the second stays put. */
bool FDojo_M2_Sled_OnlyTheDirectionCounts::RunTest(const FString& Parameters)
{
	using namespace DojoM2SledTest;

	FDojoTestWorld TestWorld;

	ADojoM2Sled* Long = SpawnSled(TestWorld, 0.0, FVector(5.0, 0.0, 0.0), false);
	ADojoM2Sled* Still = SpawnSled(TestWorld, 0.0, FVector::ZeroVector, false);
	if (!TestNotNull(TEXT("Sleds spawned"), Still)) return false;

	TestWorld.Tick(60);

	TestTrue(TEXT("A long direction still glides at Speed"), Long->GetActorLocation().Equals(FVector(200.0, 0.0, 0.0), 0.5));
	TestTrue(TEXT("A zero direction goes nowhere"), Still->GetActorLocation().Equals(FVector::ZeroVector, 0.01));
	TestTrue(TEXT("A zero direction is not an error"), !Still->GetActorLocation().ContainsNaN());

	return true;
}

#endif
```

# Hints

- Tick is where a steady glide lives. Two numbers decide each frame's step: how fast per second, and how long this frame lasted.
- Two sibling functions on `AActor` move an actor by a change instead of to a place; one measures the change in the actor's own frame and the other in the world's.
- Both take the change vector first and can leave their other parameters at the defaults; they are in `GameFramework/Actor.h`.

# Rubric

- The step is multiplied by `DeltaSeconds`, so the distance per second is `Speed` at any frame rate.
- `bLocalSpace` picks `AddActorLocalOffset` or `AddActorWorldOffset`; the sled does no rotation math of its own.
- The direction is normalized, so only its direction matters and a zero direction does not move or fail.
- `DistanceTravelled` grows by the length of the step actually taken each frame.
- The sled holds no pointer to anything else; it moves itself and nothing else moves it.

# Alternative

The sled could keep its start position and set its location every frame from the elapsed time, `Start + Direction * Speed * Time`. That is exact and easy to pause or rewind, but it overwrites whatever else moves the actor, such as a push from another actor, and it needs the transform math written out for local space. The offset functions say "by this much, in this space", and they compose with anything else that moves the actor. Use the offset form for a mover that other things may touch, and the elapsed-time form for something that must always be exactly where a clock says.

# Parsons

```yaml
- id: sled-tick
  prompt: Put Tick in order.
  lines:
    - "void ADojoM2Sled::Tick(float DeltaSeconds)"
    - "{"
    - "	Super::Tick(DeltaSeconds);"
    - "	const FVector Step = Direction.GetSafeNormal() * Speed * DeltaSeconds;"
    - "	if (bLocalSpace) AddActorLocalOffset(Step);"
    - "	else AddActorWorldOffset(Step);"
    - "	DistanceTravelled += Step.Size();"
    - "}"
  distractors:
    - line: "	AddActorWorldOffset(Step, bLocalSpace);"
      mistake: The second parameter of the offset functions is the sweep flag, not a switch between spaces.
    - line: "	const FVector Step = Direction * Speed;"
      mistake: Without DeltaSeconds the step is per frame, so a faster computer would make the sled faster.
```
