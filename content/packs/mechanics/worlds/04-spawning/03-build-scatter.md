---
id: m4-scatter
title: A scatterer that only places things where there is room
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [spawning]
terms: [spawnactor, tsubclassof, spawn-collision-handling, frandomstream, box-component]
prerequisites: [m4-spawning-with-care, m3-scale-plate, m2-bumper]
xp: 50
estimatedMinutes: 14
concepts:
  - A spawn told not to collide hands back nothing at a blocked spot, and the scatterer counts it as skipped
  - A seed makes the scatter the same every time
---

# Brief

When you place a scatterer over a floor with a wall across half of it and press Play, crates appear at points across the floor but never inside the wall, the scatterer's skipped count says how many points the wall took, and the same seed puts every crate in exactly the same place on every run.

This quest reuses World 3's `ADojoM3Crate` as the thing to scatter and World 2's `ADojoM2Wall` as the obstacle, both unchanged. Most of the scatterer is written for you. Explain the marked lines, then fill the gap in `ADojoM4Scatter::Scatter`:

1. Spawn `SpawnClass` at the point with the prepared parameters.
2. Keep the new actor when one appears; otherwise count the try as skipped.

Dependency direction: the scatterer knows only the class it was given; the crates and walls know nothing about it.

This scatterer is the first piece of the Fuse Yard boss, where it lays out the bombs.

Compiles against earlier quests: m3-scale-plate (`Quests/m3-scale-plate/DojoM3Crate.h`) and m2-bumper (`Quests/m2-bumper/DojoM2Wall.h`).

## See it in the editor

Place a `DojoM4Scatter` at the origin, set Spawn Class to `DojoM3Crate` and Count to 20 in Details, and place a `DojoM2Wall` at the origin with its Box extent set to X 500, Y 250 and its location at Y 250, so it covers half of the scatter area. Type `show Collision` and press Play: the crates land only on the free half. In the level Blueprint, on the 1 key, print Get Skipped. Change Seed and press Play again for a new layout; change it back and the old layout returns. Then try one A/B change in the code: set the override to `AlwaysSpawn`, play, and see crates inside the wall.

# Files

## DojoM4Scatter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4Scatter.generated.h"

class UBoxComponent;

/** Spawns a number of actors at seeded random points across its area, skipping any point where the new actor would sit inside something it blocks. */
UCLASS()
class ADojoM4Scatter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the area box as the root; the box has no collision, it only marks the floor. */
	ADojoM4Scatter();

	/** The floor to scatter over: points are taken across its X and Y at its own height. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Scatter")
	TObjectPtr<UBoxComponent> Area;

	/** What to spawn; nothing is spawned while it is empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter")
	TSubclassOf<AActor> SpawnClass;

	/** How many points to try. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter", meta = (ClampMin = "0"))
	int32 Count = 10;

	/** The same seed gives the same points. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Scatter")
	int32 Seed = 7;

	/** Tries Count points and spawns at each free one; returns how many actors appeared. */
	UFUNCTION(BlueprintCallable, Category = "Scatter")
	int32 Scatter();

	/** The actors this scatterer has spawned, oldest first. */
	UFUNCTION(BlueprintPure, Category = "Scatter")
	TArray<AActor*> GetSpawned() const;

	/** How many points were refused because they were blocked. */
	UFUNCTION(BlueprintPure, Category = "Scatter")
	int32 GetSkipped() const;

private:
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Spawned;

	int32 Skipped = 0;
};
```

## DojoM4Scatter.cpp

```cpp
#include "DojoM4Scatter.h"

#include "Components/BoxComponent.h"
#include "Engine/World.h"

ADojoM4Scatter::ADojoM4Scatter()
{
	PrimaryActorTick.bCanEverTick = false;

	Area = CreateDefaultSubobject<UBoxComponent>(TEXT("Area"));
	Area->SetBoxExtent(FVector(500.f, 500.f, 50.f));
	Area->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	RootComponent = Area;
}

int32 ADojoM4Scatter::Scatter()
{
	if (!SpawnClass)
	{
		return 0;
	}

	const FRandomStream Stream(Seed); // @explain: A stream built from the seed gives the same sequence of numbers on every run, so the same seed always picks the same points.

	const FVector Center = Area->GetComponentLocation();
	const FVector Extent = Area->GetScaledBoxExtent();
	const FBox Floor(Center - FVector(Extent.X, Extent.Y, 0.f), Center + FVector(Extent.X, Extent.Y, 0.f)); // @explain: The box is flat at the area's own height, so every point lies on the floor the designer placed.

	FActorSpawnParameters Parameters;
	Parameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::DontSpawnIfColliding; // @explain: The world checks the new actor's shapes against what they block before making it, and refuses a blocked point instead of putting the actor inside a wall.

	int32 Appeared = 0;
	for (int32 Try = 0; Try < Count; ++Try)
	{
		const FVector Point = Stream.RandPointInBox(Floor);

		// Your code: spawn SpawnClass at Point, with no rotation and with Parameters.
		// Your code: when an actor appears, keep it in Spawned and count it in Appeared; otherwise count the try in Skipped.
	}

	return Appeared;
}

TArray<AActor*> ADojoM4Scatter::GetSpawned() const
{
	TArray<AActor*> Result;
	for (AActor* Actor : Spawned)
	{
		Result.Add(Actor);
	}

	return Result;
}

int32 ADojoM4Scatter::GetSkipped() const
{
	return Skipped;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m2-bumper/DojoM2Wall.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m4-scatter/DojoM4Scatter.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4ScatterTest
{
	/** Spawns a crate scatterer at a spot, with the settings a designer would give it in Details. */
	ADojoM4Scatter* PlaceScatter(FDojoTestWorld& TestWorld, const FVector& Where, int32 Count, int32 Seed)
	{
		const FTransform Spot(Where);
		ADojoM4Scatter* Scatter = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4Scatter>(ADojoM4Scatter::StaticClass(), Spot);
		Scatter->SpawnClass = ADojoM3Crate::StaticClass();
		Scatter->Count = Count;
		Scatter->Seed = Seed;
		Scatter->FinishSpawning(Spot);
		return Scatter;
	}

	/** True when no two actors in the list stand closer than Gap on the floor. */
	bool KeepTheirDistance(const TArray<AActor*>& Actors, double Gap)
	{
		for (int32 First = 0; First < Actors.Num(); ++First)
		{
			for (int32 Second = First + 1; Second < Actors.Num(); ++Second)
			{
				const FVector Between = Actors[First]->GetActorLocation() - Actors[Second]->GetActorLocation();
				if (FMath::Max(FMath::Abs(Between.X), FMath::Abs(Between.Y)) < Gap) return false;
			}
		}

		return true;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Scatter_FillsTheFloor, "Dojo.M4.Scatter.FillsTheFloor", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Scatters crates over an empty floor and checks every try is accounted for, every crate is on the floor, and no crate sits inside another. */
bool FDojo_M4_Scatter_FillsTheFloor::RunTest(const FString& Parameters)
{
	using namespace DojoM4ScatterTest;

	FDojoTestWorld TestWorld;

	ADojoM4Scatter* Scatter = PlaceScatter(TestWorld, FVector(0.0, 0.0, 0.0), 8, 7);
	if (!TestNotNull(TEXT("Scatter spawned"), Scatter)) return false;

	const int32 Appeared = Scatter->Scatter();
	const TArray<AActor*> Crates = Scatter->GetSpawned();

	TestTrue(TEXT("Most tries on an empty floor give a crate"), Appeared >= 4);
	TestEqual(TEXT("Scatter returns how many it kept"), Crates.Num(), Appeared);
	TestEqual(TEXT("Every try is a crate or a skip"), Appeared + Scatter->GetSkipped(), 8);

	bool bOnTheFloor = true;
	for (AActor* Crate : Crates)
	{
		const FVector Where = Crate->GetActorLocation();
		if (FMath::Abs(Where.X) > 500.01 || FMath::Abs(Where.Y) > 500.01 || FMath::Abs(Where.Z) > 0.01) bOnTheFloor = false;
	}

	TestTrue(TEXT("Every crate stands on the floor inside the area"), bOnTheFloor);
	TestTrue(TEXT("No crate was put inside another, since crates block crates"), KeepTheirDistance(Crates, 75.0));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Scatter_SkipsBlockedPoints, "Dojo.M4.Scatter.SkipsBlockedPoints", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Scatters crates over a floor half covered by a wall and checks none appears in the wall and the skipped count makes up the difference. */
bool FDojo_M4_Scatter_SkipsBlockedPoints::RunTest(const FString& Parameters)
{
	using namespace DojoM4ScatterTest;

	FDojoTestWorld TestWorld;

	ADojoM2Wall* Wall = TestWorld.SpawnActor<ADojoM2Wall>();
	Wall->Box->SetBoxExtent(FVector(600.0, 270.0, 200.0));
	Wall->SetActorLocation(FVector(3000.0, 270.0, 0.0));

	ADojoM4Scatter* Scatter = PlaceScatter(TestWorld, FVector(3000.0, 0.0, 0.0), 20, 11);
	if (!TestNotNull(TEXT("Scatter spawned"), Scatter)) return false;

	const int32 Appeared = Scatter->Scatter();
	const TArray<AActor*> Crates = Scatter->GetSpawned();

	TestTrue(TEXT("Some points fall on the free half and get a crate"), Appeared > 0);
	TestTrue(TEXT("Some points fall in the wall and are skipped"), Scatter->GetSkipped() > 0);
	TestEqual(TEXT("Every try is a crate or a skip"), Appeared + Scatter->GetSkipped(), 20);

	bool bClearOfTheWall = true;
	for (AActor* Crate : Crates)
	{
		if (Crate->GetActorLocation().Y > -30.0) bClearOfTheWall = false;
	}

	TestTrue(TEXT("No crate stands inside the wall: each keeps about half its width clear of the wall's face"), bClearOfTheWall);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Scatter_SameSeedSameLayout, "Dojo.M4.Scatter.SameSeedSameLayout", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Scatters with the same seed in two worlds and with another seed, and checks the first two match and the third does not; an empty class spawns nothing. */
bool FDojo_M4_Scatter_SameSeedSameLayout::RunTest(const FString& Parameters)
{
	using namespace DojoM4ScatterTest;

	TArray<FVector> First;
	TArray<FVector> Again;
	TArray<FVector> Other;

	for (int32 Run = 0; Run < 3; ++Run)
	{
		FDojoTestWorld TestWorld;
		ADojoM4Scatter* Scatter = PlaceScatter(TestWorld, FVector::ZeroVector, 6, Run == 2 ? 99 : 21);
		if (!TestNotNull(TEXT("Scatter spawned"), Scatter)) return false;

		Scatter->Scatter();
		TArray<FVector>& Points = Run == 0 ? First : (Run == 1 ? Again : Other);
		for (AActor* Crate : Scatter->GetSpawned()) Points.Add(Crate->GetActorLocation());
	}

	bool bSame = First.Num() == Again.Num() && First.Num() > 0;
	for (int32 Index = 0; bSame && Index < First.Num(); ++Index) bSame = First[Index].Equals(Again[Index], 0.001);

	TestTrue(TEXT("The same seed puts the crates in exactly the same places"), bSame);
	TestTrue(TEXT("Another seed gives another layout"), Other.Num() > 0 && First.Num() > 0 && !Other[0].Equals(First[0], 1.0));

	FDojoTestWorld TestWorld;
	ADojoM4Scatter* Empty = PlaceScatter(TestWorld, FVector::ZeroVector, 6, 21);
	Empty->SpawnClass = nullptr;
	TestEqual(TEXT("With no class set, nothing is spawned"), Empty->Scatter(), 0);
	TestEqual(TEXT("and nothing is skipped"), Empty->GetSkipped(), 0);

	return true;
}

#endif
```

# Hints

- The loop already has the point and the parameters. One call makes the actor, and its result says whether the world agreed to make it.
- `SpawnActor` on the world takes the class, the location, the rotation, and the parameters, and hands back a pointer that is nullptr when the spot was refused.
- `UWorld::SpawnActor` is in `Engine/World.h`; `FRotator::ZeroRotator` is no rotation.

# Rubric

- Each try spawns `SpawnClass` at its point with `DontSpawnIfColliding`, so no actor ever appears inside something it blocks.
- The result is checked: an actor is kept and counted only when one appeared, and a refused point is counted as skipped.
- Every try is accounted for: the kept and the skipped add up to `Count`.
- The points come from an `FRandomStream` built from `Seed`, so the same seed gives the same layout.
- The scatterer knows only the class it was given; the crate and wall classes are reused unchanged.

# Alternative

The scatterer could test each point itself before spawning, with an overlap query at the point using the class's shape, and only spawn where the query finds nothing. That works for any spawn method and lets it try again at a new point until it has `Count` actors, at the cost of writing the shape query and keeping it in step with the class's real shapes. Letting the spawn refuse is shorter and always uses the actor's own shapes. `AdjustIfPossibleButDontSpawnIfColliding` would instead nudge a blocked crate to a nearby free spot, which fills the floor more evenly but means the seed no longer says exactly where each crate lands.

# Parsons

```yaml
- id: scatter-try
  prompt: Put the body of one try in order.
  lines:
    - "const FVector Point = Stream.RandPointInBox(Floor);"
    - "AActor* Spawn = GetWorld()->SpawnActor<AActor>(SpawnClass, Point, FRotator::ZeroRotator, Parameters);"
    - "if (Spawn) { Spawned.Add(Spawn); Appeared++; }"
    - "else { Skipped++; }"
  distractors:
    - line: "AActor* Spawn = GetWorld()->SpawnActor<AActor>(SpawnClass, Point, FRotator::ZeroRotator);"
      mistake: Without the parameters the spawn uses the class's default, which puts the actor at the point even inside a wall.
    - line: "const FVector Point = FMath::RandPointInBox(Floor);"
      mistake: The shared generator gives a different layout on every run; the seeded stream is what makes the layout repeatable.
```
