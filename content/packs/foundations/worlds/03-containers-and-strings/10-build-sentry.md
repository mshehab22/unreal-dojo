---
id: f3-sentry
title: A sentry that turns toward the nearest raised target
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: []
skills: [math]
terms: [fvector, frotator, fmath, tarray, isvalid]
prerequisites: [f3-transforms, f1-popup-target]
xp: 120
estimatedMinutes: 30
concepts:
  - Finding the nearest of many with squared distances
  - Turning on the spot with a yaw from Atan2
---

# Brief

When you press Play, raise two of the sentry's targets and run `ke * AimAtNearestRaised`: the sentry turns on the spot to face the nearer one and its label reads AIM and that target's name; with nothing raised in range it reads IDLE and stays facing the way it was.

Write `ADojoF3Sentry` from nothing. It reuses your pop-up target from World 1 as the thing it aims at. Rules:

- Only raised targets within `MaxRange` count, measured in three dimensions from the sentry's location. Empty slots are skipped.
- The sentry turns only around the vertical axis: a target higher or lower than the sentry changes the yaw, never the pitch.
- `GetYawTo` gives the yaw in degrees, from -180 to 180, that faces from the sentry toward an actor, with 0 along +X and 90 along +Y.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;` reading AIM and the target's name, or IDLE.
- `UPROPERTY(EditAnywhere) TArray<TObjectPtr<ADojoF1PopupTarget>> Targets;`
- `UPROPERTY(EditAnywhere) float MaxRange = 2000.f;` clamped at 0 or more.
- `UFUNCTION(BlueprintCallable) ADojoF1PopupTarget* AimAtNearestRaised();` returning the target it now faces, or nullptr.
- `UFUNCTION(BlueprintPure) float GetYawTo(const AActor* Target) const;`

Dependency direction: the sentry refers to its targets; the targets know nothing about the sentry.

Compiles against earlier quests: f1-popup-target (`Quests/f1-popup-target/DojoF1PopupTarget.h`).

## See it in the editor

Place a `DojoF3Sentry` and three pop-up targets around it at different distances, one of them on a crate so it sits higher. Add all three to the sentry's Targets. Press Play, run `ke * Raise` to raise every target, then `ke * AimAtNearestRaised`: the label turns to face the nearest and names it. Hit that target so it drops (`ke * Hit` hits them all, so use the level Blueprint or place targets one at a time to try each case) and aim again: the sentry turns to the next one, never tilting toward the high target.

# Files

## DojoF3Sentry.h

```cpp
// Declare ADojoF3Sentry here.
```

## DojoF3Sentry.cpp

```cpp
// Define ADojoF3Sentry here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-popup-target/DojoF1PopupTarget.h"
#include "Quests/f3-sentry/DojoF3Sentry.h"
#include "Support/DojoTestWorld.h"

namespace DojoF3SentryTest
{
	/** Spawns a pop-up target at a location, raised or not. */
	ADojoF1PopupTarget* PlaceTarget(FDojoTestWorld& TestWorld, const FVector& Location, bool bRaised)
	{
		ADojoF1PopupTarget* Target = TestWorld.SpawnActor<ADojoF1PopupTarget>();
		Target->SetActorLocation(Location);
		if (bRaised) Target->Raise();
		return Target;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Sentry_FacesNearestRaised, "Dojo.F3.Sentry.FacesNearestRaised", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Places raised and lowered targets around the sentry and checks it picks the nearest raised one and faces it by yaw alone. */
bool FDojo_F3_Sentry_FacesNearestRaised::RunTest(const FString& Parameters)
{
	using namespace DojoF3SentryTest;

	FDojoTestWorld TestWorld;

	ADojoF3Sentry* Sentry = TestWorld.SpawnActor<ADojoF3Sentry>();
	if (!TestNotNull(TEXT("Sentry spawned"), Sentry)) return false;

	ADojoF1PopupTarget* LoweredClose = PlaceTarget(TestWorld, FVector(50.f, 0.f, 0.f), false);
	ADojoF1PopupTarget* RaisedLeft = PlaceTarget(TestWorld, FVector(0.f, 300.f, 0.f), true);
	ADojoF1PopupTarget* RaisedBehind = PlaceTarget(TestWorld, FVector(-100.f, -100.f, 150.f), true);
	Sentry->Targets = { LoweredClose, nullptr, RaisedLeft, RaisedBehind };

	TestEqual(TEXT("Yaw toward +Y is 90"), Sentry->GetYawTo(RaisedLeft), 90.f, 0.01f);

	TestTrue(TEXT("The nearest raised target is the one behind, even though it is higher up"), Sentry->AimAtNearestRaised() == RaisedBehind);
	TestEqual(TEXT("Faces it at yaw -135"), Sentry->GetActorRotation().Yaw, -135.0, 0.01);
	TestEqual(TEXT("Never tilts up or down"), Sentry->GetActorRotation().Pitch, 0.0, 0.01);
	TestEqual(TEXT("The label names the target"), Sentry->Label->Text.ToString(), FString::Printf(TEXT("AIM %s"), *RaisedBehind->GetName()));

	RaisedBehind->Hit();
	TestTrue(TEXT("Once it drops, the next nearest raised target is chosen"), Sentry->AimAtNearestRaised() == RaisedLeft);
	TestEqual(TEXT("Faces it at yaw 90"), Sentry->GetActorRotation().Yaw, 90.0, 0.01);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_Sentry_RespectsRange, "Dojo.F3.Sentry.RespectsRange", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts the only raised target out of range and checks the sentry stays idle and keeps facing the same way. */
bool FDojo_F3_Sentry_RespectsRange::RunTest(const FString& Parameters)
{
	using namespace DojoF3SentryTest;

	FDojoTestWorld TestWorld;

	ADojoF3Sentry* Sentry = TestWorld.SpawnActor<ADojoF3Sentry>();
	if (!TestNotNull(TEXT("Sentry spawned"), Sentry)) return false;

	TestEqual(TEXT("MaxRange defaults to 2000"), Sentry->MaxRange, 2000.f);

	ADojoF1PopupTarget* Far = PlaceTarget(TestWorld, FVector(0.f, -2500.f, 0.f), true);
	Sentry->Targets = { Far };
	Sentry->SetActorRotation(FRotator(0.f, 45.f, 0.f));

	TestNull(TEXT("Nothing in range"), Sentry->AimAtNearestRaised());
	TestEqual(TEXT("Keeps facing the same way"), Sentry->GetActorRotation().Yaw, 45.0, 0.01);
	TestEqual(TEXT("The label says IDLE"), Sentry->Label->Text.ToString(), FString(TEXT("IDLE")));

	Sentry->MaxRange = 3000.f;
	TestTrue(TEXT("With a longer range it aims"), Sentry->AimAtNearestRaised() == Far);
	TestEqual(TEXT("Faces it at yaw -90"), Sentry->GetActorRotation().Yaw, -90.0, 0.01);

	return true;
}

#endif
```

# Hints

- Split the job in two: choose a target (a loop with a running best), then turn toward it (one angle); write and test the choosing before the turning.
- Compare squared distances against a squared range; for the turn, take the offset to the target, drop its height, and ask the math library for the angle of a two-dimensional vector, then convert it from radians.
- `FVector::DistSquared` is in `Math/Vector.h`; `FMath::Atan2`, `FMath::Square`, and `FMath::RadiansToDegrees` are in `Math/UnrealMathUtility.h`.

# Rubric

- The nearest raised target in range is found with squared distances, skipping empty slots and lowered or broken targets.
- The sentry sets only its yaw, so pitch and roll stay 0 whatever the target's height.
- GetYawTo uses the flattened offset and Atan2, and returns degrees from -180 to 180.
- With no target in range, the sentry returns nullptr, keeps its rotation, and shows IDLE.
- MaxRange is an editable, clamped property with the given default.
- The sentry refers to its targets; the pop-up target from World 1 is reused unchanged.

# Alternative

`(Target - Origin).Rotation()` returns a full FRotator in one call and is a common first choice. It also returns a pitch toward a higher or lower target, so a ground sentry would tilt unless the pitch is zeroed afterward. `UKismetMathLibrary::FindLookAtRotation` does the same with a Blueprint-friendly name. Computing the yaw with Atan2 on the flattened offset says exactly what the sentry does, turn and never tilt, and is easy to test.
