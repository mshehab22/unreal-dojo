---
id: p11-stand-seats
title: Stands drawn as instances, and seats that break
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [flyweight]
skills: [flyweight, memory]
terms: [instanced-static-mesh, static-mesh-component, tarray, beginplay]
prerequisites: [p11-flyweight-card]
xp: 110
estimatedMinutes: 30
concepts:
  - One instanced static mesh component draws every seat from one shared mesh and a transform per seat
  - The seat's own state, intact or broken, lives in the actor; the component only draws
  - Breaking a seat hides only that seat
---

# Brief

When you press Play with the setup below, four rows of ten seats appear, stepping up and back, drawn by a single component. Running `ke * BreakSeat 3` makes the fourth seat of the front row disappear and leaves every other seat where it was.

`ADojoP11Stands` draws its seats with one `UInstancedStaticMeshComponent`, `Seats`: one shared seat mesh, one instance per drawn seat. Seats are numbered row by row from the front left, and `GetSeatLocation` gives each seat's place relative to the stands. Each seat is intact or broken; `SeatIntact` holds that by seat number, and only intact seats are drawn.

The declarations, the constructor, `BeginPlay`, `IsSeatIntact`, `GetIntactCount`, and `GetSeatLocation` are given. Yours:

- `BuildSeats` sets the component's mesh to `SeatMesh`, makes every seat intact, and draws exactly one instance per seat at its location. Building again must not add a second set.
- `BreakSeat` refuses a seat that does not exist or is already broken; otherwise it marks the seat broken, so the stands stop drawing it, and returns true. Every other seat must stay drawn where it was.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP11Stands` and set Seat Mesh to the engine's Cube (turn on Show Engine Content in the Content Browser settings, then look in Engine > BasicShapes). So that a missing seat is easy to spot between 100-unit cubes, set Seat Spacing, Row Depth, and Row Rise to about 150, 150, and 100 in Details. Press Play: forty cubes in four rising rows. Select the stands while playing: the Details panel shows one Seats component with 40 instances. Run `ke * BreakSeat 3`, then `ke * BreakSeat 10`, then `ke * BreakSeat 39`, and check that exactly those seats are gone: the fourth of the front row, the first of the second row, and the last of the back row.

# Files

## DojoP11Stands.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP11Stands.generated.h"

class UInstancedStaticMeshComponent;
class UStaticMesh;

/** A block of arena seats drawn by one instanced static mesh component: one mesh shared by every seat, one transform per seat. Flyweight pattern. */
UCLASS()
class ADojoP11Stands : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the seat component as the root and turns ticking off. */
	ADojoP11Stands();

	/** Draws every intact seat as one instance of SeatMesh. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Stands")
	TObjectPtr<UInstancedStaticMeshComponent> Seats;

	/** The one mesh every seat shares. */
	UPROPERTY(EditAnywhere, Category = "Stands")
	TObjectPtr<UStaticMesh> SeatMesh;

	/** Rows of seats, front to back. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1"))
	int32 Rows = 4;

	/** Seats in each row. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1"))
	int32 SeatsPerRow = 10;

	/** Distance between neighboring seats in a row. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1.0"))
	float SeatSpacing = 60.f;

	/** How far each row sits behind the one in front. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "1.0"))
	float RowDepth = 80.f;

	/** How much higher each row sits than the one in front. */
	UPROPERTY(EditAnywhere, Category = "Stands", meta = (ClampMin = "0.0"))
	float RowRise = 40.f;

	/** Clears the stands and draws every seat, all intact. */
	UFUNCTION(BlueprintCallable, Category = "Stands")
	void BuildSeats();

	/** Breaks Seat so it is no longer drawn; returns false for a seat that does not exist or is already broken. */
	UFUNCTION(BlueprintCallable, Category = "Stands")
	bool BreakSeat(int32 Seat);

	/** True for a seat that exists and is not broken. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	bool IsSeatIntact(int32 Seat) const;

	/** Seats still drawn. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	int32 GetIntactCount() const;

	/** Where Seat sits, relative to the stands; seats are numbered row by row from the front left. */
	UFUNCTION(BlueprintPure, Category = "Stands")
	FVector GetSeatLocation(int32 Seat) const;

protected:
	/** Builds the seats. */
	virtual void BeginPlay() override;

private:
	/** Whether each seat, by seat number, is intact. */
	TArray<bool> SeatIntact;
};
```

## DojoP11Stands.cpp

```cpp
#include "DojoP11Stands.h"

#include "Components/InstancedStaticMeshComponent.h"

ADojoP11Stands::ADojoP11Stands()
{
	PrimaryActorTick.bCanEverTick = false;

	Seats = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Seats"));
	RootComponent = Seats;
}

void ADojoP11Stands::BeginPlay()
{
	Super::BeginPlay();

	BuildSeats();
}

void ADojoP11Stands::BuildSeats()
{
}

bool ADojoP11Stands::BreakSeat(int32 Seat)
{
	return false;
}

bool ADojoP11Stands::IsSeatIntact(int32 Seat) const
{
	return SeatIntact.IsValidIndex(Seat) && SeatIntact[Seat];
}

int32 ADojoP11Stands::GetIntactCount() const
{
	int32 Count = 0;
	for (const bool bIntact : SeatIntact) Count += bIntact ? 1 : 0;
	return Count;
}

FVector ADojoP11Stands::GetSeatLocation(int32 Seat) const
{
	const int32 Row = Seat / SeatsPerRow;
	const int32 Column = Seat % SeatsPerRow;
	return FVector(Row * RowDepth, Column * SeatSpacing, Row * RowRise);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/InstancedStaticMeshComponent.h"
#include "Quests/p11-stand-seats/DojoP11Stands.h"
#include "Support/DojoTestWorld.h"

namespace DojoP11StandsTest
{
	/** The locations of every drawn instance, rounded to whole units so they compare exactly. */
	TArray<FIntVector> DrawnLocations(const ADojoP11Stands* Stands)
	{
		TArray<FIntVector> Result;
		for (int32 Index = 0; Index < Stands->Seats->GetInstanceCount(); Index++)
		{
			FTransform Transform;
			Stands->Seats->GetInstanceTransform(Index, Transform);
			Result.Add(FIntVector(FMath::RoundToInt(Transform.GetLocation().X), FMath::RoundToInt(Transform.GetLocation().Y), FMath::RoundToInt(Transform.GetLocation().Z)));
		}
		Result.Sort([](const FIntVector& A, const FIntVector& B) { return A.X != B.X ? A.X < B.X : (A.Y != B.Y ? A.Y < B.Y : A.Z < B.Z); });
		return Result;
	}

	/** The locations of every intact seat, rounded and sorted the same way. */
	TArray<FIntVector> IntactLocations(const ADojoP11Stands* Stands)
	{
		TArray<FIntVector> Result;
		for (int32 Seat = 0; Seat < Stands->Rows * Stands->SeatsPerRow; Seat++)
		{
			if (!Stands->IsSeatIntact(Seat)) continue;

			const FVector Location = Stands->GetSeatLocation(Seat);
			Result.Add(FIntVector(FMath::RoundToInt(Location.X), FMath::RoundToInt(Location.Y), FMath::RoundToInt(Location.Z)));
		}
		Result.Sort([](const FIntVector& A, const FIntVector& B) { return A.X != B.X ? A.X < B.X : (A.Y != B.Y ? A.Y < B.Y : A.Z < B.Z); });
		return Result;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_StandSeats_EverySeatOneComponent, "Dojo.P11.StandSeats.EverySeatOneComponent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Four rows of ten seats are forty instances of one component, each at its seat; building again does not double them. */
bool FDojo_P11_StandSeats_EverySeatOneComponent::RunTest(const FString& Parameters)
{
	using namespace DojoP11StandsTest;

	FDojoTestWorld TestWorld;

	ADojoP11Stands* Stands = TestWorld.SpawnActor<ADojoP11Stands>();
	if (!TestNotNull(TEXT("Stands spawned"), Stands)) return false;

	TestEqual(TEXT("Forty seats drawn"), Stands->Seats->GetInstanceCount(), 40);
	TestEqual(TEXT("All forty intact"), Stands->GetIntactCount(), 40);
	TestTrue(TEXT("Every instance stands on a seat"), DrawnLocations(Stands) == IntactLocations(Stands));
	TestTrue(TEXT("Seat 13 is in the second row, fourth from the left"), Stands->GetSeatLocation(13).Equals(FVector(80.f, 180.f, 40.f)));

	Stands->BuildSeats();
	TestEqual(TEXT("Building again does not double the seats"), Stands->Seats->GetInstanceCount(), 40);

	TArray<UStaticMeshComponent*> MeshComponents;
	Stands->GetComponents<UStaticMeshComponent>(MeshComponents);
	TestEqual(TEXT("One component draws every seat"), MeshComponents.Num(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_StandSeats_BrokenSeatsLeaveTheRest, "Dojo.P11.StandSeats.BrokenSeatsLeaveTheRest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Breaking seats 3, 10, and 39 leaves exactly the other thirty-seven seats drawn, each where it belongs. */
bool FDojo_P11_StandSeats_BrokenSeatsLeaveTheRest::RunTest(const FString& Parameters)
{
	using namespace DojoP11StandsTest;

	FDojoTestWorld TestWorld;

	ADojoP11Stands* Stands = TestWorld.SpawnActor<ADojoP11Stands>();
	if (!TestNotNull(TEXT("Stands spawned"), Stands)) return false;

	TestTrue(TEXT("Seat 3 breaks"), Stands->BreakSeat(3));
	TestTrue(TEXT("Seat 10 breaks"), Stands->BreakSeat(10));
	TestTrue(TEXT("Seat 39 breaks"), Stands->BreakSeat(39));

	TestEqual(TEXT("Thirty-seven seats drawn"), Stands->Seats->GetInstanceCount(), 37);
	TestEqual(TEXT("Thirty-seven intact"), Stands->GetIntactCount(), 37);
	TestFalse(TEXT("Seat 10 is broken"), Stands->IsSeatIntact(10));
	TestTrue(TEXT("Seat 11 is not"), Stands->IsSeatIntact(11));
	TestTrue(TEXT("The drawn seats are exactly the intact ones"), DrawnLocations(Stands) == IntactLocations(Stands));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P11_StandSeats_BadBreaksAreRefused, "Dojo.P11.StandSeats.BadBreaksAreRefused", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A seat that is already broken, or that does not exist, cannot be broken, and nothing changes. */
bool FDojo_P11_StandSeats_BadBreaksAreRefused::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP11Stands* Stands = TestWorld.SpawnActor<ADojoP11Stands>();
	if (!TestNotNull(TEXT("Stands spawned"), Stands)) return false;

	Stands->BreakSeat(5);
	TestFalse(TEXT("A broken seat cannot break again"), Stands->BreakSeat(5));
	TestFalse(TEXT("No seat -1"), Stands->BreakSeat(-1));
	TestFalse(TEXT("No seat 40"), Stands->BreakSeat(40));
	TestEqual(TEXT("Only one seat is gone"), Stands->Seats->GetInstanceCount(), 39);

	Stands->BuildSeats();
	TestTrue(TEXT("Building again mends every seat"), Stands->IsSeatIntact(5) && Stands->Seats->GetInstanceCount() == 40);

	return true;
}

#endif
```

# Hints

- The failing test breaks seat 3, then seat 10, then seat 39. After the first break, which instance number does seat 10 have? Which seat does instance 10 draw now?
- An instance is only a place in the component's list. Removing one moves other instances to new places in the list, so a seat number stops being an instance number after the first removal.
- The simplest correct fix keeps the seat state as the source of truth: after a break, clear the instances and add one for every intact seat again. Forty seats redraw in no time; for thousands, keep a seat-to-instance map and fix it up after each removal.

# Rubric

- One instanced static mesh component draws every intact seat, sharing one mesh; there is no component per seat.
- Building clears the old instances first, so it never doubles the seats.
- Which seats are intact lives in the actor, by seat number.
- Breaking any seats, in any order, hides exactly those seats and leaves every other seat drawn where it was.
- Bad seat numbers and repeat breaks are refused and change nothing.

# Alternative

A broken seat could stay as an instance with its transform scaled to zero through `UpdateInstanceTransform`. Instance numbers then never change and a seat number is always its instance number, at the cost of keeping invisible instances in the list. That is a common trick when instances are hidden and shown often. Removing instances keeps the list honest when seats leave for good; it just needs the actor, not the instance number, to know which seat is which.

# Parsons

```yaml
- id: break-seat
  prompt: Put BreakSeat in order.
  lines:
    - "bool ADojoP11Stands::BreakSeat(int32 Seat)"
    - "{"
    - "	if (!IsSeatIntact(Seat)) return false;"
    - "	SeatIntact[Seat] = false;"
    - "	Seats->ClearInstances();"
    - "	for (int32 Other = 0; Other < SeatIntact.Num(); Other++)"
    - "	{"
    - "		if (SeatIntact[Other]) Seats->AddInstance(FTransform(GetSeatLocation(Other)));"
    - "	}"
    - "	return true;"
    - "}"
  distractors:
    - line: "	Seats->RemoveInstance(Seat);"
      mistake: The seat number is only the instance number until the first removal; after that it removes some other seat.
```
