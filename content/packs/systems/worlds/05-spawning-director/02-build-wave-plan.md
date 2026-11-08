---
id: s5-wave-plan
title: Waves as data and hatches out of sight
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [type-object]
skills: [data, curves, vectors]
terms: [data-asset, curve-float, tobjectptr, fvector, root-component, editanywhere]
prerequisites: [s5-director-plan, p10-type-object-when-not, p7-state-when-not, p1-observer-when-not]
xp: 60
estimatedMinutes: 15
concepts:
  - One asset holds the shape of a night, with a curve that grows each wave
  - A spawn point that is fair is far enough away and outside the player's view
---

# Brief

When you make a wave plan with a first wave of 3 and a curve that climbs from 1 at wave 1 to 2 at wave 5, the five waves hold 3, 4, 5, 5, and 6 beetles; and a hatch 8 meters behind the player says it is out of sight, while one in front of the player, or one only 3 meters behind, says it is not.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `UDojoS5WavePlan::GetBeetleCount`: the base count times the curve's value at this wave number, rounded to the nearest whole beetle and never below 1. A plan with no curve keeps every wave at the base count, and a wave number below 1 has no beetles.
2. `ADojoS5Hatch::IsOutOfSight`: true when nobody is watching (the viewer is null), or when the hatch is at least `MinDistance` from the viewer and outside the viewer's view, which is everything more than `ViewHalfAngle` degrees away from the way the viewer faces.

Dependency direction: the plan knows nothing about hatches or directors, and a hatch knows nothing about beetles. Both only answer questions.

This is the first piece of the Beetle Pit boss.

## See it in the editor

In the Content Browser choose Add, Miscellaneous, Curve, pick Curve Float, and make `C_WaveScale` with two keys: time 1 value 1, and time 5 value 2. Then choose Add, Miscellaneous, Data Asset, pick `DojoS5WavePlan`, and make `DA_Night` with Base Count 3 and Count Scale `C_WaveScale`. Place four `DojoS5Hatch` actors 8 meters from the Player Start, one on each side. In the level Blueprint, on the 1 key loop from 1 to 5 and print Get Beetle Count from `DA_Night`: it prints 3, 4, 5, 5, 6. On the 2 key, for each hatch, print Is Out Of Sight with the player pawn: only the hatch you face, and any hatch you stand close to, print false. Turn around and press 2 again.

# Files

## DojoS5WavePlan.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoS5WavePlan.generated.h"

class UCurveFloat;

/** The shape of one night in the pit, kept in an asset so designers make a harder night without code; the director reads every number from it. */
UCLASS(BlueprintType)
class UDojoS5WavePlan : public UDataAsset // @explain: A data asset is saved as its own file in the Content Browser, so a harder night is a new file that a designer fills in, with no code and no recompile.
{
	GENERATED_BODY()

public:
	/** How many beetles the first wave holds. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 BaseCount = 3;

	/** Multiplies the base count by wave number; 1 at wave 1 and 2 at wave 5 doubles the last wave. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves")
	TObjectPtr<UCurveFloat> CountScale = nullptr; // @explain: The curve is a separate asset drawn in the curve editor; the plan points at it, so several plans can share one difficulty shape, and a plan may have none.

	/** Seconds between two spawn attempts while a wave runs. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "0.1"))
	float SpawnInterval = 1.f;

	/** The most beetles that may be loose at once. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 MaxAlive = 3; // @explain: The plan only stores the limit; counting who is loose right now is a job for whoever spawns them, because an asset is shared and holds no state of one night.

	/** Seconds of rest between a cleared wave and the next one. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "0.0"))
	float RestSeconds = 3.f;

	/** The last wave of the night. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 FinalWave = 5;

	/** How many beetles this wave holds: the base count scaled by the curve and rounded, at least 1; 0 before wave 1. */
	UFUNCTION(BlueprintPure, Category = "Waves")
	int32 GetBeetleCount(int32 Wave) const;

	/** True when this wave is the last of the night. */
	UFUNCTION(BlueprintPure, Category = "Waves")
	bool IsFinalWave(int32 Wave) const;
};
```

## DojoS5WavePlan.cpp

```cpp
#include "DojoS5WavePlan.h"

#include "Curves/CurveFloat.h"

int32 UDojoS5WavePlan::GetBeetleCount(int32 Wave) const
{
	// Your code: no beetles before wave 1.
	// Your code: scale the base count by the curve's value at this wave (or by 1 when there is no curve), round to the nearest whole beetle, and never return less than 1.
	return 0;
}

bool UDojoS5WavePlan::IsFinalWave(int32 Wave) const
{
	return Wave >= FinalWave;
}
```

## DojoS5Hatch.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5Hatch.generated.h"

class USceneComponent;

/** A hatch in the pit wall that beetles crawl out of; it only answers whether a viewer could see it open. */
UCLASS()
class ADojoS5Hatch : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the root and turns ticking off. */
	ADojoS5Hatch();

	/** Where the hatch sits; beetles appear here. */
	UPROPERTY(VisibleAnywhere, Category = "Hatch")
	TObjectPtr<USceneComponent> Root;

	/** A viewer closer than this would see a beetle appear next to them. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hatch", meta = (ClampMin = "0.0"))
	float MinDistance = 600.f;

	/** Half the width of the viewer's view, in degrees, measured from where they face. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Hatch", meta = (ClampMin = "0.0", ClampMax = "180.0"))
	float ViewHalfAngle = 45.f;

	/** True when a beetle may come out here: nobody is watching, or the viewer is far enough away and facing elsewhere. */
	UFUNCTION(BlueprintPure, Category = "Hatch")
	bool IsOutOfSight(const AActor* Viewer) const;
};
```

## DojoS5Hatch.cpp

```cpp
#include "DojoS5Hatch.h"

#include "Components/SceneComponent.h"

ADojoS5Hatch::ADojoS5Hatch()
{
	PrimaryActorTick.bCanEverTick = false; // @explain: A hatch never acts on its own; it answers a question when the director asks, so it costs nothing between questions.

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root; // @explain: An actor's location is its root component's location, so without a root the hatch would have no place in the level to measure from.
}

bool ADojoS5Hatch::IsOutOfSight(const AActor* Viewer) const
{
	// Your code: with no viewer, nobody can see the hatch.
	// Your code: a hatch closer to the viewer than MinDistance is never out of sight.
	// Your code: otherwise it is out of sight when the angle between the way the viewer faces and the direction to the hatch is more than ViewHalfAngle degrees.
	return false;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Curves/CurveFloat.h"
#include "Quests/s5-wave-plan/DojoS5Hatch.h"
#include "Quests/s5-wave-plan/DojoS5WavePlan.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS5WavePlanTest
{
	/** A curve that is 1 at wave 1 and 2 at wave 5, straight in between, the way a designer would draw it. */
	UCurveFloat* MakeDoublingCurve()
	{
		UCurveFloat* Curve = NewObject<UCurveFloat>();
		Curve->FloatCurve.AddKey(1.f, 1.f);
		Curve->FloatCurve.AddKey(5.f, 2.f);
		return Curve;
	}

	/** Places a hatch at a spot in the test world. */
	ADojoS5Hatch* PlaceHatch(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		ADojoS5Hatch* Hatch = TestWorld.SpawnActor<ADojoS5Hatch>();
		if (Hatch != nullptr)
		{
			Hatch->SetActorLocation(Where);
		}
		return Hatch;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WavePlan_BeetleCount, "Dojo.S5.WavePlan.BeetleCount", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the wave sizes along the curve, past its end, without a curve, and before wave 1. */
bool FDojo_S5_WavePlan_BeetleCount::RunTest(const FString& Parameters)
{
	using namespace DojoS5WavePlanTest;

	UDojoS5WavePlan* Night = NewObject<UDojoS5WavePlan>();
	Night->BaseCount = 3;
	Night->CountScale = MakeDoublingCurve();

	TestEqual(TEXT("Wave 1 holds the base count"), Night->GetBeetleCount(1), 3);
	TestEqual(TEXT("Wave 2: 3 times 1.25 rounds to 4"), Night->GetBeetleCount(2), 4);
	TestEqual(TEXT("Wave 3: 3 times 1.5 rounds to 5"), Night->GetBeetleCount(3), 5);
	TestEqual(TEXT("Wave 4: 3 times 1.75 rounds to 5"), Night->GetBeetleCount(4), 5);
	TestEqual(TEXT("Wave 5 holds twice the base count"), Night->GetBeetleCount(5), 6);
	TestEqual(TEXT("Past the last key the curve stays at 2"), Night->GetBeetleCount(9), 6);
	TestEqual(TEXT("Wave 0 holds nothing"), Night->GetBeetleCount(0), 0);
	TestEqual(TEXT("A negative wave holds nothing"), Night->GetBeetleCount(-3), 0);

	TestTrue(TEXT("Wave 5 is the last of a five wave night"), Night->IsFinalWave(5));
	TestFalse(TEXT("Wave 4 is not the last"), Night->IsFinalWave(4));

	UDojoS5WavePlan* Flat = NewObject<UDojoS5WavePlan>();
	Flat->BaseCount = 4;
	TestEqual(TEXT("Without a curve wave 1 holds the base count"), Flat->GetBeetleCount(1), 4);
	TestEqual(TEXT("Without a curve every wave holds the base count"), Flat->GetBeetleCount(7), 4);

	UCurveFloat* Fading = NewObject<UCurveFloat>();
	Fading->FloatCurve.AddKey(1.f, 0.f);
	Flat->CountScale = Fading;
	TestEqual(TEXT("A curve at 0 still sends one beetle"), Flat->GetBeetleCount(1), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WavePlan_OutOfSight, "Dojo.S5.WavePlan.OutOfSight", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a viewer at the origin facing along X and asks hatches on every side, near and far, whether they are out of sight. */
bool FDojo_S5_WavePlan_OutOfSight::RunTest(const FString& Parameters)
{
	using namespace DojoS5WavePlanTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Viewer = TestWorld.SpawnActor<ADojoTestActor>();
	ADojoS5Hatch* Ahead = PlaceHatch(TestWorld, FVector(800.f, 0.f, 0.f));
	ADojoS5Hatch* AheadAndAside = PlaceHatch(TestWorld, FVector(800.f, 400.f, 0.f));
	ADojoS5Hatch* Beside = PlaceHatch(TestWorld, FVector(0.f, 800.f, 0.f));
	ADojoS5Hatch* Behind = PlaceHatch(TestWorld, FVector(-800.f, 0.f, 0.f));
	ADojoS5Hatch* CloseBehind = PlaceHatch(TestWorld, FVector(-300.f, 0.f, 0.f));
	ADojoS5Hatch* EdgeBehind = PlaceHatch(TestWorld, FVector(-600.f, 0.f, 0.f));
	if (!TestNotNull(TEXT("Viewer spawned"), Viewer) || !TestNotNull(TEXT("Hatches spawned"), EdgeBehind)) return false;

	TestFalse(TEXT("A hatch straight ahead is in sight"), Ahead->IsOutOfSight(Viewer));
	TestFalse(TEXT("A hatch 27 degrees to the side is inside a 45 degree half view"), AheadAndAside->IsOutOfSight(Viewer));
	TestTrue(TEXT("A hatch 90 degrees to the side is out of sight"), Beside->IsOutOfSight(Viewer));
	TestTrue(TEXT("A far hatch behind is out of sight"), Behind->IsOutOfSight(Viewer));
	TestFalse(TEXT("A hatch 3 meters behind is too close"), CloseBehind->IsOutOfSight(Viewer));
	TestTrue(TEXT("A hatch exactly at the minimum distance behind may open"), EdgeBehind->IsOutOfSight(Viewer));
	TestTrue(TEXT("With nobody watching every hatch may open"), Ahead->IsOutOfSight(nullptr));

	Viewer->SetActorRotation(FRotator(0.f, 180.f, 0.f));
	TestTrue(TEXT("After turning around the hatch that was ahead is behind"), Ahead->IsOutOfSight(Viewer));
	TestFalse(TEXT("After turning around the far hatch behind is ahead"), Behind->IsOutOfSight(Viewer));
	TestFalse(TEXT("Turning does not make a close hatch fair"), CloseBehind->IsOutOfSight(Viewer));

	Viewer->SetActorRotation(FRotator::ZeroRotator);
	Beside->ViewHalfAngle = 100.f;
	TestFalse(TEXT("A wider view sees the hatch at 90 degrees"), Beside->IsOutOfSight(Viewer));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_WavePlan_DesignersCanEdit, "Dojo.S5.WavePlan.DesignersCanEdit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the plan is a data asset whose numbers and curve designers can edit. */
bool FDojo_S5_WavePlan_DesignersCanEdit::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("The plan is a data asset"), UDojoS5WavePlan::StaticClass()->IsChildOf(UDataAsset::StaticClass()));

	for (const TCHAR* Name : { TEXT("BaseCount"), TEXT("CountScale"), TEXT("SpawnInterval"), TEXT("MaxAlive"), TEXT("RestSeconds"), TEXT("FinalWave") })
	{
		const FProperty* Property = UDojoS5WavePlan::StaticClass()->FindPropertyByName(Name);
		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;

		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	return true;
}

#endif
```

# Hints

- The curve answers one question: how many times bigger than the first wave is this one? The base count times that answer is the size, but it comes out as a fraction, and beetles are whole.
- `GetFloatValue` reads a curve at a time, and here the time is the wave number. `FMath::RoundToInt` gives the nearest whole number and `FMath::Max` keeps it at 1 or more. A plan whose curve is missing behaves as if the curve were 1 everywhere.
- For sight, answer the distance question first. The dot product of two vectors of length 1 is the cosine of the angle between them, so compare it with the cosine of the half angle; normalize the direction to the hatch first, and remember that `FMath::Cos` takes radians, which `FMath::DegreesToRadians` gives you.

# Rubric

- The plan is a data asset, so a designer makes a harder night as a new file, and every number of a night is read from it.
- `GetBeetleCount` follows the curve, rounds to the nearest whole beetle, never returns less than 1 from wave 1 on, and returns 0 before wave 1.
- A plan without a curve keeps every wave at the base count.
- `IsOutOfSight` refuses hatches closer than the minimum distance, whichever way the viewer faces.
- `IsOutOfSight` compares the angle to the hatch with the half view angle using the viewer's facing, and treats a missing viewer as nobody watching.
- The plan and the hatch only answer questions; neither points at the director or the beetles.

# Alternative

The wave sizes could be written out by hand, an array of five counts in the plan, or one row per wave in a data table. That is clearer for a short night and lets a designer make wave 3 smaller than wave 2 for a breather, but every new wave is a new row, and an endless mode needs a formula anyway. A curve gives the shape of the whole night in two keys and keeps going past the last one. Either way the night is a type object from Pack 2's "Kinds as data" world: the director is one class, and each asset is one kind of night. For sight, a real game would also trace a line from the camera to the hatch so a wall hides it; the view cone here is the cheap first check that runs before any trace.

# Parsons

```yaml
- id: hatch-out-of-sight
  prompt: Put IsOutOfSight in order.
  lines:
    - "bool ADojoS5Hatch::IsOutOfSight(const AActor* Viewer) const"
    - "{"
    - "	if (Viewer == nullptr)"
    - "	{"
    - "		return true;"
    - "	}"
    - "	const FVector ToHatch = GetActorLocation() - Viewer->GetActorLocation();"
    - "	if (ToHatch.Size() < MinDistance)"
    - "	{"
    - "		return false;"
    - "	}"
    - "	const float Facing = FVector::DotProduct(Viewer->GetActorForwardVector(), ToHatch.GetSafeNormal());"
    - "	return Facing < FMath::Cos(FMath::DegreesToRadians(ViewHalfAngle));"
    - "}"
  distractors:
    - line: "	const float Facing = FVector::DotProduct(Viewer->GetActorForwardVector(), ToHatch);"
      mistake: Without normalizing, the dot product is the distance times the cosine, so a far hatch looks like a huge cosine and is never out of sight.
    - line: "	return Facing < FMath::Cos(ViewHalfAngle);"
      mistake: FMath::Cos takes radians, so 45 is read as about 7 turns of a circle and the cone has nothing to do with 45 degrees.
```
