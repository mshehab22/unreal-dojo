---
id: m2-dart
title: A dart that curves toward you but can be dodged
order: 8
kind: build
scaffold: blank
difficulty: 4
patterns: []
skills: [math, movement]
terms: [interpolation, frotator, fvector, tick, deltatime, add-actor-offset, kismet-math-library]
prerequisites: [m2-lift]
xp: 120
estimatedMinutes: 30
concepts:
  - A turn-rate limit is a constant-rate interpolation of the nose toward the target direction
  - Hold a target without owning it, so the dart survives its target being destroyed
---

# Brief

When you place a dart facing along X and tell it to chase an actor off to the side, it flies at 600 units a second while its nose swings toward the actor at no more than 90 degrees a second, so it curves in; an actor that jumps behind its nose makes it swing round again at the same limited rate, and if the actor is destroyed it flies straight on.

Write `ADojoM2Dart` from nothing. It has a scene root, ticks every frame, and holds its target without owning it. Each frame, in this order, it turns its nose toward the target by at most the frame's share of the turn rate, the short way round, and then flies forward along its nose by the frame's share of the speed.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float Speed = 600.f;` units per second, 0 or more.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float TurnRate = 90.f;` degrees per second, 0 or more.
- `UFUNCTION(BlueprintCallable) void Launch(AActor* NewTarget);` starts chasing; nullptr means fly straight.
- `UFUNCTION(BlueprintPure) AActor* GetTarget() const;` the chased actor, or nullptr once it is gone.
- `virtual void Tick(float DeltaSeconds) override;`

Dependency direction: the dart holds a pointer to its target, and the target knows nothing about the dart.

This dart is the last piece of the Clockwork Hall boss, where it is fired at the hero.

## See it in the editor

Place a `DojoM2Dart` at the origin facing along X, and a crate 1500 units away along Y. In the level Blueprint, on BeginPlay, call Launch on the dart with the crate. Press Play: the dart curves toward the crate in a wide arc. Select the dart and lower Turn Rate to 30 for a wider arc, or raise it to 360 for a sharp one. In the level Blueprint, on the 1 key, call Destroy Actor on the crate: the dart carries straight on. In the level Blueprint's Event Tick, add a Draw Debug Line from the dart's location to the crate's location to see where it aims.

# Files

## DojoM2Dart.h

```cpp
// Declare ADojoM2Dart here.
```

## DojoM2Dart.cpp

```cpp
// Define ADojoM2Dart here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m2-dart/DojoM2Dart.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2DartTest
{
	/** Spawns a dart at the origin turned by Yaw degrees, with the settings a designer would give it in Details. */
	ADojoM2Dart* SpawnDart(FDojoTestWorld& TestWorld, double Yaw)
	{
		const FTransform Where(FRotator(0.0, Yaw, 0.0));
		ADojoM2Dart* Dart = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Dart>(ADojoM2Dart::StaticClass(), Where);
		Dart->Speed = 600.f;
		Dart->TurnRate = 90.f;
		Dart->FinishSpawning(Where);
		return Dart;
	}

	/** Spawns a bare actor to chase, very far away so the direction to it barely changes while the dart flies. */
	ADojoTestActor* SpawnFarTarget(FDojoTestWorld& TestWorld, const FVector& Direction)
	{
		ADojoTestActor* Target = TestWorld.SpawnActor<ADojoTestActor>();
		Target->SetActorLocation(Direction.GetSafeNormal() * 100000.0);
		return Target;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Dart_TurnsNoFasterThanItsRate, "Dojo.M2.Dart.TurnsNoFasterThanItsRate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Chases a target off to the side and checks the nose swings steadily at the turn rate and stops when it faces the target. */
bool FDojo_M2_Dart_TurnsNoFasterThanItsRate::RunTest(const FString& Parameters)
{
	using namespace DojoM2DartTest;

	FDojoTestWorld TestWorld;

	ADojoM2Dart* Dart = SpawnDart(TestWorld, 0.0);
	ADojoTestActor* Target = SpawnFarTarget(TestWorld, FVector(0.0, 1.0, 0.0));
	if (!TestNotNull(TEXT("Dart spawned"), Dart) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	Dart->Launch(Target);
	TestTrue(TEXT("The dart reports its target"), Dart->GetTarget() == Target);

	double Previous = Dart->GetActorRotation().Yaw;
	double Fastest = 0.0;
	for (int32 Frame = 1; Frame <= 150; ++Frame)
	{
		TestWorld.Tick(1);

		const double Yaw = Dart->GetActorRotation().Yaw;
		Fastest = FMath::Max(Fastest, FMath::Abs(FMath::FindDeltaAngleDegrees(Previous, Yaw)));
		Previous = Yaw;

		if (Frame == 30) TestTrue(TEXT("Half a second in, the nose has turned about 45 degrees"), FMath::Abs(Yaw - 45.0) < 1.5);
		if (Frame == 120) TestTrue(TEXT("Two seconds in, the nose faces the target"), FMath::Abs(Yaw - 90.0) < 2.0);
	}

	TestTrue(TEXT("No frame turned the nose more than 90 degrees a second allows, 1.5 degrees"), Fastest <= 1.51);
	TestTrue(TEXT("It kept facing the target once it had come round"), FMath::Abs(Dart->GetActorRotation().Yaw - 90.0) < 2.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Dart_FliesAtItsSpeedAndTakesTheShortWay, "Dojo.M2.Dart.FliesAtItsSpeedAndTakesTheShortWay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks every frame's flight is Speed times the frame, and that a turn across the 180 degree line goes the short way. */
bool FDojo_M2_Dart_FliesAtItsSpeedAndTakesTheShortWay::RunTest(const FString& Parameters)
{
	using namespace DojoM2DartTest;

	FDojoTestWorld TestWorld;

	ADojoM2Dart* Dart = SpawnDart(TestWorld, 170.0);
	ADojoTestActor* Target = SpawnFarTarget(TestWorld, FVector(FMath::Cos(FMath::DegreesToRadians(-170.0)), FMath::Sin(FMath::DegreesToRadians(-170.0)), 0.0));
	if (!TestNotNull(TEXT("Dart spawned"), Dart) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	Dart->Launch(Target);

	bool bEveryFrameFliesTenUnits = true;
	FVector Previous = Dart->GetActorLocation();
	for (int32 Frame = 0; Frame < 6; ++Frame)
	{
		TestWorld.Tick(1);

		const FVector Now = Dart->GetActorLocation();
		if (!FMath::IsNearlyEqual(FVector::Dist(Previous, Now), 10.0, 0.05)) bEveryFrameFliesTenUnits = false;
		Previous = Now;
	}

	TestTrue(TEXT("Every frame flies Speed times the frame, 10 units"), bEveryFrameFliesTenUnits);

	const double Turned = FMath::FindDeltaAngleDegrees(170.0, Dart->GetActorRotation().Yaw);
	TestTrue(TEXT("From yaw 170 toward yaw -170, a tenth of a second turns about 9 degrees through 180, the short way"), Turned > 8.0 && Turned < 10.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Dart_ADodgeTakesTimeToAnswer, "Dojo.M2.Dart.ADodgeTakesTimeToAnswer", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Chases a target, moves it to a spot behind the dart's nose, and checks the dart needs time to swing round again. */
bool FDojo_M2_Dart_ADodgeTakesTimeToAnswer::RunTest(const FString& Parameters)
{
	using namespace DojoM2DartTest;

	FDojoTestWorld TestWorld;

	ADojoM2Dart* Dart = SpawnDart(TestWorld, 0.0);
	ADojoTestActor* Target = SpawnFarTarget(TestWorld, FVector(0.0, 1.0, 0.0));
	if (!TestNotNull(TEXT("Dart spawned"), Dart) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	Dart->Launch(Target);
	TestWorld.Tick(120);
	TestTrue(TEXT("After 2 seconds the dart faces the first target spot"), FMath::Abs(Dart->GetActorRotation().Yaw - 90.0) < 2.0);

	Target->SetActorLocation(FVector(100000.0, 0.0, 0.0));
	TestWorld.Tick(30);
	TestTrue(TEXT("Half a second after the dodge the dart is only halfway round"), FMath::Abs(Dart->GetActorRotation().Yaw - 45.0) < 2.5);

	TestWorld.Tick(90);
	TestTrue(TEXT("Two seconds after the dodge it faces the new spot"), FMath::Abs(Dart->GetActorRotation().Yaw) < 3.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Dart_FliesOnWhenTheTargetIsGone, "Dojo.M2.Dart.FliesOnWhenTheTargetIsGone", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys the chased actor and checks the dart forgets it, keeps its nose, and keeps flying. */
bool FDojo_M2_Dart_FliesOnWhenTheTargetIsGone::RunTest(const FString& Parameters)
{
	using namespace DojoM2DartTest;

	FDojoTestWorld TestWorld;

	ADojoM2Dart* Dart = SpawnDart(TestWorld, 0.0);
	ADojoTestActor* Target = SpawnFarTarget(TestWorld, FVector(0.0, 1.0, 0.0));
	if (!TestNotNull(TEXT("Dart spawned"), Dart) || !TestNotNull(TEXT("Target spawned"), Target)) return false;

	Dart->Launch(Target);
	TestWorld.Tick(30);
	const double YawWhenLost = Dart->GetActorRotation().Yaw;
	const FVector PlaceWhenLost = Dart->GetActorLocation();

	Target->Destroy();
	TestNull(TEXT("A destroyed target is forgotten"), Dart->GetTarget());

	TestWorld.Tick(30);
	TestTrue(TEXT("Without a target the nose stays where it was"), FMath::Abs(Dart->GetActorRotation().Yaw - YawWhenLost) < 0.01);
	TestTrue(TEXT("and the dart keeps flying, 300 units in half a second"), FMath::IsNearlyEqual(FVector::Dist(PlaceWhenLost, Dart->GetActorLocation()), 300.0, 0.5));

	Dart->Launch(nullptr);
	TestNull(TEXT("Launching at nothing leaves no target"), Dart->GetTarget());

	return true;
}

#endif
```

# Hints

- Tick does two jobs in order: turn the nose a limited amount toward the target, then fly forward along the nose by the speed times the frame's duration.
- A helper in `FMath` moves a rotator toward a target by at most a fixed number of degrees per second and takes the short way round. The direction to the target is an offset vector turned into a rotator.
- `FMath::RInterpConstantTo` and `FVector::Rotation`; keep the target as a `TWeakObjectPtr<AActor>`, which reads as null once the actor is destroyed; `AddActorWorldOffset` and `GetActorForwardVector` are on `AActor`.

# Rubric

- The nose turns toward the target by at most `TurnRate` times `DeltaSeconds` degrees each frame, the short way round.
- The dart flies forward along its nose by `Speed` times `DeltaSeconds` every frame, with or without a target.
- The target is held weakly, so a destroyed target means the dart flies straight and nothing crashes.
- `Launch(nullptr)` clears the target; `GetTarget` returns nullptr once the target is gone.
- The dart depends on its target and the target knows nothing about the dart.
- `Speed` and `TurnRate` are properties a designer can tune, and the dart ticks every frame because it moves every frame.

# Alternative

A `UProjectileMovementComponent` can home too: set `bIsHomingProjectile`, give it a target component and a homing acceleration, and it steers for you. It accelerates toward the target rather than turning at a fixed rate, so there is no number that says "turns at most 90 degrees a second", a fast dart can orbit its target, and the dodge window is harder to promise. The component is the right choice for a standard missile; the hand-written dart is the right choice when the turn limit is the thing a designer needs to tune and a player needs to learn.
