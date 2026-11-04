---
id: p18-lantern-grid
title: Lanterns filed by the ground under them
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [spatial-partition]
skills: [spatial-partition, containers]
terms: [uniform-grid, fintpoint, tmap, tweakobjectptr, overlap-query, physics-broadphase, toctree2]
prerequisites: [p18-every-pair]
xp: 60
estimatedMinutes: 20
concepts:
  - A grid keeps each actor in the list of the cell under it, so a question about a spot looks only in the cells that spot's circle touches
  - The cells a question visits run from the cell under the circle's lowest corner to the cell under its highest, whatever the radius
  - An actor that moved must be refiled, and a destroyed one must never be handed back
  - Lanterns with no collision shape are invisible to the physics scene, which is why they need a grid of their own
  - The keeper depends on the lanterns and the grid; neither knows the keeper exists
---

# Brief

When you press Play with the setup below, the keeper reports how many lanterns burn within 300 units of it, and it does so by measuring only the lanterns in the cells near it, never all of them.

`ADojoP18Lantern` is a paper lantern: a spot and a `bLit` flag, and no collision shape at all, so no overlap query can ever find it. `FDojoP18Grid` files actors by the square cell of ground under them: `CellOf` turns a location into an `FIntPoint`, `Add` and `Remove` file and unfile an actor, and `Refile` moves an actor to the cell under it after it moved. Height is ignored everywhere: the grid and its questions work on the ground plane. `ADojoP18LanternKeeper` owns a grid, files every lantern in the world when play begins, and answers `CountLitNear`. The keeper depends on the lanterns and the grid; the lanterns and the grid know nothing about the keeper.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `FindNear`. It fills `OutActors` with every live filed actor whose distance from `Center` on the ground plane is at most `Radius`, each once, and returns how many filed actors it measured to decide. It must look only in the cells the circle can reach, for any radius, smaller or larger than a cell, and it must skip actors that were destroyed.

## See it in the editor

Place a `DojoP18LanternKeeper` at the origin and ten `DojoP18Lantern` actors around it, three of them within 300 units of the keeper with Lit ticked in Details, one lit lantern 500 units away, and the rest unlit. In the Level Blueprint, on Begin Play, add a Delay of 0.2 seconds so the keeper has filed its lanterns, then call Count Lit Near on the keeper with its own location and a radius of 300, and print the result: 3. Then print Get Last Measured: it is the lanterns in the cells around the keeper, fewer than ten once some stand far away. Move the far lit lantern to within 300 of the keeper with Move Lantern, call Count Lit Near again, and the print shows 4.

# Files

## DojoP18Lantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18Lantern.generated.h"

/** A paper lantern standing in the meadow: a spot and a flame, with no collision shape at all. */
UCLASS()
class ADojoP18Lantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP18Lantern();

	/** True while the lantern burns. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lantern")
	bool bLit = false;
};
```

## DojoP18Lantern.cpp

```cpp
#include "DojoP18Lantern.h"

#include "Components/SceneComponent.h"

ADojoP18Lantern::ADojoP18Lantern()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}
```

## DojoP18Grid.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"

/** Files actors by the square cell of ground under them, so a question about one spot looks only in the cells near that spot. */
class FDojoP18Grid
{
public:
	/** Makes an empty grid whose cells are CellSize units on a side. */
	explicit FDojoP18Grid(float InCellSize = 200.f);

	/** The side of one cell. */
	float GetCellSize() const;

	/** The cell under Location on the ground plane; height is ignored. */
	FIntPoint CellOf(const FVector& Location) const;

	/** Files Actor in the cell under it; an actor already filed is refiled instead. */
	void Add(AActor* Actor);

	/** Takes Actor out of the grid. */
	void Remove(AActor* Actor);

	/** Moves Actor to the cell under it now; call it after the actor moved. */
	void Refile(AActor* Actor);

	/** How many actors are filed, destroyed ones included until they are removed. */
	int32 Num() const;

	/** Fills OutActors with every live filed actor within Radius of Center on the ground plane, and returns how many filed actors it measured to decide. */
	int32 FindNear(const FVector& Center, float Radius, TArray<AActor*>& OutActors) const;

private:
	/** The side of one cell. */
	float CellSize;

	/** The actors filed in each cell that holds any; empty cells are not stored. */
	TMap<FIntPoint, TArray<TWeakObjectPtr<AActor>>> Cells; // @explain: The cells hold weak pointers, which do not keep a lantern alive and read as null once it is destroyed, so a destroyed lantern can never be handed back as if it were still there.

	/** The cell each filed actor is in. */
	TMap<TWeakObjectPtr<AActor>, FIntPoint> Filed;
};
```

## DojoP18Grid.cpp

```cpp
#include "DojoP18Grid.h"

FDojoP18Grid::FDojoP18Grid(float InCellSize)
	: CellSize(FMath::Max(InCellSize, 1.f))
{
}

float FDojoP18Grid::GetCellSize() const
{
	return CellSize;
}

FIntPoint FDojoP18Grid::CellOf(const FVector& Location) const
{
	return FIntPoint(FMath::FloorToInt32(Location.X / CellSize), FMath::FloorToInt32(Location.Y / CellSize)); // @explain: Floor, not a cast to int: a cast rounds toward zero, so -50 and 50 would both land in cell 0 and the cells on either side of zero would be twice as wide as the rest.
}

void FDojoP18Grid::Add(AActor* Actor)
{
	if (!IsValid(Actor)) return;

	if (Filed.Contains(Actor))
	{
		Refile(Actor);
		return;
	}

	const FIntPoint Cell = CellOf(Actor->GetActorLocation());
	Cells.FindOrAdd(Cell).Add(Actor);
	Filed.Add(Actor, Cell);
}

void FDojoP18Grid::Remove(AActor* Actor)
{
	FIntPoint Cell;
	if (!Filed.RemoveAndCopyValue(Actor, Cell)) return;

	if (TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(Cell))
	{
		Bucket->RemoveSingleSwap(Actor);
		if (Bucket->IsEmpty()) Cells.Remove(Cell);
	}
}

void FDojoP18Grid::Refile(AActor* Actor)
{
	FIntPoint* Cell = Filed.Find(Actor);
	if (!Cell || !IsValid(Actor)) return;

	const FIntPoint Under = CellOf(Actor->GetActorLocation());
	if (Under == *Cell) return; // @explain: Most moves stay inside one cell, so refiling costs nothing until the lantern crosses a cell line.

	if (TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(*Cell))
	{
		Bucket->RemoveSingleSwap(Actor);
		if (Bucket->IsEmpty()) Cells.Remove(*Cell);
	}

	Cells.FindOrAdd(Under).Add(Actor);
	*Cell = Under;
}

int32 FDojoP18Grid::Num() const
{
	return Filed.Num();
}

int32 FDojoP18Grid::FindNear(const FVector& Center, float Radius, TArray<AActor*>& OutActors) const
{
	OutActors.Reset();
	return 0;
}
```

## DojoP18LanternKeeper.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP18Grid.h"
#include "GameFramework/Actor.h"
#include "DojoP18LanternKeeper.generated.h"

class ADojoP18Lantern;

/** Keeps the meadow's lanterns filed in a grid and answers how many burn near a spot. The keeper depends on the lanterns and the grid; neither knows the keeper exists. */
UCLASS()
class ADojoP18LanternKeeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP18LanternKeeper();

	/** The side of one grid cell. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lanterns", meta = (ClampMin = "1.0", ExposeOnSpawn = "true"))
	float CellSize = 200.f;

	/** Files Lantern in the grid. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void Register(ADojoP18Lantern* Lantern);

	/** Takes Lantern out of the grid. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void Unregister(ADojoP18Lantern* Lantern);

	/** Moves Lantern to NewLocation and refiles it. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	void MoveLantern(ADojoP18Lantern* Lantern, FVector NewLocation);

	/** How many filed lanterns burn within Radius of Center on the ground plane. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	int32 CountLitNear(FVector Center, float Radius);

	/** Every filed lantern within Radius of Center on the ground plane, lit or not. */
	UFUNCTION(BlueprintCallable, Category = "Lanterns")
	TArray<ADojoP18Lantern*> FindLanternsNear(FVector Center, float Radius);

	/** How many lanterns the last CountLitNear or FindLanternsNear measured. */
	UFUNCTION(BlueprintPure, Category = "Lanterns")
	int32 GetLastMeasured() const;

protected:
	/** Makes the grid and files every lantern already in the world. */
	virtual void BeginPlay() override;

private:
	/** The lanterns, filed by cell. */
	FDojoP18Grid Grid;

	/** Lanterns the last count measured. */
	int32 LastMeasured = 0;
};
```

## DojoP18LanternKeeper.cpp

```cpp
#include "DojoP18LanternKeeper.h"

#include "Components/SceneComponent.h"
#include "DojoP18Lantern.h"
#include "EngineUtils.h"

ADojoP18LanternKeeper::ADojoP18LanternKeeper()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18LanternKeeper::BeginPlay()
{
	Super::BeginPlay();

	Grid = FDojoP18Grid(CellSize);
	for (TActorIterator<ADojoP18Lantern> It(GetWorld()); It; ++It)
	{
		Grid.Add(*It);
	}
}

void ADojoP18LanternKeeper::Register(ADojoP18Lantern* Lantern)
{
	Grid.Add(Lantern);
}

void ADojoP18LanternKeeper::Unregister(ADojoP18Lantern* Lantern)
{
	Grid.Remove(Lantern);
}

void ADojoP18LanternKeeper::MoveLantern(ADojoP18Lantern* Lantern, FVector NewLocation)
{
	if (!IsValid(Lantern)) return;

	Lantern->SetActorLocation(NewLocation);
	Grid.Refile(Lantern); // @explain: Moving an actor does not tell the grid; the keeper refiles the lantern right after moving it, or a question about its new place would look in the wrong cell.
}

int32 ADojoP18LanternKeeper::CountLitNear(FVector Center, float Radius)
{
	TArray<AActor*> Near;
	LastMeasured = Grid.FindNear(Center, Radius, Near);

	int32 Lit = 0;
	for (AActor* Candidate : Near)
	{
		const ADojoP18Lantern* Lantern = Cast<ADojoP18Lantern>(Candidate);
		if (Lantern && Lantern->bLit) ++Lit;
	}

	return Lit;
}

TArray<ADojoP18Lantern*> ADojoP18LanternKeeper::FindLanternsNear(FVector Center, float Radius)
{
	TArray<AActor*> Near;
	LastMeasured = Grid.FindNear(Center, Radius, Near);

	TArray<ADojoP18Lantern*> Lanterns;
	for (AActor* Candidate : Near)
	{
		if (ADojoP18Lantern* Lantern = Cast<ADojoP18Lantern>(Candidate)) Lanterns.Add(Lantern);
	}

	return Lanterns;
}

int32 ADojoP18LanternKeeper::GetLastMeasured() const
{
	return LastMeasured;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p18-lantern-grid/DojoP18Grid.h"
#include "Quests/p18-lantern-grid/DojoP18Lantern.h"
#include "Quests/p18-lantern-grid/DojoP18LanternKeeper.h"
#include "Support/DojoTestWorld.h"

namespace DojoP18LanternGridTest
{
	/** Spawns Count lanterns at seeded spots in a square HalfSize from the origin each way. */
	TArray<ADojoP18Lantern*> ScatterLanterns(FDojoTestWorld& TestWorld, int32 Count, int32 Seed, double HalfSize)
	{
		const FRandomStream Stream(Seed);
		TArray<ADojoP18Lantern*> Lanterns;
		for (int32 Index = 0; Index < Count; ++Index)
		{
			const FVector Spot(Stream.FRandRange(-HalfSize, HalfSize), Stream.FRandRange(-HalfSize, HalfSize), Stream.FRandRange(0.0, 300.0));
			Lanterns.Add(TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(Spot, FRotator::ZeroRotator));
		}
		return Lanterns;
	}

	/** The lanterns within Radius of Center on the ground plane, by measuring every one. */
	TSet<AActor*> MeasureAll(const TArray<ADojoP18Lantern*>& Lanterns, const FVector& Center, double Radius)
	{
		TSet<AActor*> Near;
		for (ADojoP18Lantern* Lantern : Lanterns)
		{
			if (IsValid(Lantern) && FVector::Dist2D(Lantern->GetActorLocation(), Center) <= Radius) Near.Add(Lantern);
		}
		return Near;
	}

	/** True when Found holds exactly the actors in Expected, each once. */
	bool SameActors(const TArray<AActor*>& Found, const TSet<AActor*>& Expected)
	{
		TSet<AActor*> Seen;
		for (AActor* Actor : Found)
		{
			if (!Expected.Contains(Actor) || Seen.Contains(Actor)) return false;
			Seen.Add(Actor);
		}
		return Seen.Num() == Expected.Num();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_LanternGrid_FindsWhatALoopFinds, "Dojo.P18.LanternGrid.FindsWhatALoopFinds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** For seeded lanterns and seeded spots, the grid finds exactly the lanterns a loop over all of them finds, for a radius smaller and larger than a cell. */
bool FDojo_P18_LanternGrid_FindsWhatALoopFinds::RunTest(const FString& Parameters)
{
	using namespace DojoP18LanternGridTest;

	FDojoTestWorld TestWorld;
	const TArray<ADojoP18Lantern*> Lanterns = ScatterLanterns(TestWorld, 300, 4, 3000.0);

	FDojoP18Grid Grid(200.f);
	for (ADojoP18Lantern* Lantern : Lanterns) Grid.Add(Lantern);
	TestEqual(TEXT("Every lantern is filed"), Grid.Num(), 300);

	const FRandomStream Spots(11);
	int32 FoundAny = 0;
	for (int32 Query = 0; Query < 30; ++Query)
	{
		const FVector Center(Spots.FRandRange(-3000.0, 3000.0), Spots.FRandRange(-3000.0, 3000.0), 0.0);
		for (const float Radius : { 150.f, 260.f, 700.f })
		{
			TArray<AActor*> Found;
			Grid.FindNear(Center, Radius, Found);
			const TSet<AActor*> Expected = MeasureAll(Lanterns, Center, Radius);
			FoundAny += Found.Num();
			if (!TestTrue(FString::Printf(TEXT("Spot %d, radius %.0f: the grid finds exactly the %d lanterns a loop finds"), Query, Radius, Expected.Num()), SameActors(Found, Expected))) return false;
		}
	}

	TestTrue(TEXT("Some spots have lanterns near them"), FoundAny > 0);

	ADojoP18Lantern* Edge = TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(FVector(400.0, 0.0, 0.0), FRotator::ZeroRotator);
	Grid.Add(Edge);
	TArray<AActor*> OnTheLine;
	Grid.FindNear(FVector(550.0, 0.0, 5000.0), 150.f, OnTheLine);
	TestTrue(TEXT("A lantern exactly 150 away on the ground counts as within 150, whatever the heights"), OnTheLine.Contains(Edge));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_LanternGrid_MeasuresOnlyNearbyCells, "Dojo.P18.LanternGrid.MeasuresOnlyNearbyCells", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With a thousand lanterns spread over the meadow, a question with a radius of one cell measures a few dozen lanterns at most, not all of them. */
bool FDojo_P18_LanternGrid_MeasuresOnlyNearbyCells::RunTest(const FString& Parameters)
{
	using namespace DojoP18LanternGridTest;

	FDojoTestWorld TestWorld;
	const TArray<ADojoP18Lantern*> Lanterns = ScatterLanterns(TestWorld, 1000, 9, 3000.0);

	FDojoP18Grid Grid(200.f);
	for (ADojoP18Lantern* Lantern : Lanterns) Grid.Add(Lantern);

	const FRandomStream Spots(3);
	for (int32 Query = 0; Query < 20; ++Query)
	{
		const FVector Center(Spots.FRandRange(-2500.0, 2500.0), Spots.FRandRange(-2500.0, 2500.0), 0.0);
		TArray<AActor*> Found;
		const int32 Measured = Grid.FindNear(Center, 200.f, Found);
		const TSet<AActor*> Expected = MeasureAll(Lanterns, Center, 200.0);

		if (!TestTrue(FString::Printf(TEXT("Spot %d: the grid finds exactly what a loop finds"), Query), SameActors(Found, Expected))) return false;
		TestTrue(FString::Printf(TEXT("Spot %d: it measured %d lanterns, at least the %d it found"), Query, Measured, Found.Num()), Measured >= Found.Num());
		TestTrue(FString::Printf(TEXT("Spot %d: it measured %d of 1000 lanterns, under 100"), Query, Measured), Measured < 100);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_LanternGrid_MovedLanternFollows, "Dojo.P18.LanternGrid.MovedLanternFollows", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A lantern the keeper moves across a cell line is found at its new place and no longer at its old one. */
bool FDojo_P18_LanternGrid_MovedLanternFollows::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	ADojoP18Lantern* Lantern = TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(FVector(-50.0, 50.0, 0.0), FRotator::ZeroRotator);
	ADojoP18Lantern* Unlit = TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(FVector(-60.0, 40.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("Lanterns spawned"), Lantern) || !TestNotNull(TEXT("Second lantern spawned"), Unlit)) return false;
	Lantern->bLit = true;

	ADojoP18LanternKeeper* Keeper = TestWorld.SpawnActor<ADojoP18LanternKeeper>();
	if (!TestNotNull(TEXT("Keeper spawned"), Keeper)) return false;

	TestEqual(TEXT("The keeper filed the lanterns already in the world; one of them burns near (-50, 50)"), Keeper->CountLitNear(FVector(-50.0, 50.0, 0.0), 30.f), 1);

	Keeper->MoveLantern(Lantern, FVector(730.0, -410.0, 0.0));
	TestEqual(TEXT("After the move, it burns near (730, -410)"), Keeper->CountLitNear(FVector(730.0, -410.0, 0.0), 30.f), 1);
	TestEqual(TEXT("and no longer near (-50, 50)"), Keeper->CountLitNear(FVector(-50.0, 50.0, 0.0), 30.f), 0);
	TestTrue(TEXT("The unlit lantern was measured but not counted"), Keeper->GetLastMeasured() >= 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_LanternGrid_DestroyedLanternDropsOut, "Dojo.P18.LanternGrid.DestroyedLanternDropsOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A destroyed lantern is never handed back, even before it is removed, and a removed lantern is gone from the grid. */
bool FDojo_P18_LanternGrid_DestroyedLanternDropsOut::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;
	ADojoP18Lantern* Gone = TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(FVector(10.0, 10.0, 0.0), FRotator::ZeroRotator);
	ADojoP18Lantern* Kept = TestWorld.GetWorld()->SpawnActor<ADojoP18Lantern>(FVector(20.0, 20.0, 0.0), FRotator::ZeroRotator);
	if (!TestNotNull(TEXT("Lanterns spawned"), Gone) || !TestNotNull(TEXT("Second lantern spawned"), Kept)) return false;

	FDojoP18Grid Grid(200.f);
	Grid.Add(Gone);
	Grid.Add(Kept);

	TArray<AActor*> Found;
	Grid.FindNear(FVector::ZeroVector, 100.f, Found);
	TestEqual(TEXT("Both lanterns are found"), Found.Num(), 2);

	Gone->Destroy();
	Grid.FindNear(FVector::ZeroVector, 100.f, Found);
	TestEqual(TEXT("A destroyed lantern is not handed back"), Found.Num(), 1);
	TestTrue(TEXT("the other still is"), Found.Contains(Kept));

	Grid.Remove(Kept);
	Grid.FindNear(FVector::ZeroVector, 100.f, Found);
	TestEqual(TEXT("A removed lantern is not found"), Found.Num(), 0);

	return true;
}

#endif
```

# Hints

- Which cell holds the lowest corner of the square around the circle, and which holds the highest? Every cell the circle can touch lies between those two.
- Inside each of those cells, which entries might no longer be lanterns at all, and what does a weak pointer give you for those?
- A lantern in a visited cell is not near just because its cell is near. What do you still have to measure, and on which plane?

# Rubric

- FindNear returns every live filed actor within Radius of Center on the ground plane, each once, and nothing else.
- It visits only the cells between the cell under the circle's lowest corner and the cell under its highest, so it works for any radius.
- It skips actors that were destroyed and never dereferences one.
- It returns how many filed actors it measured, which stays a small fraction of the whole grid for a radius of one cell.
- A lantern moved through the keeper is found at its new place and not its old one.
- The keeper depends on the lanterns and the grid; the lanterns and the grid know nothing about the keeper.

# Alternative

Give every lantern a small sphere component that overlaps the Visibility channel and ask `OverlapMultiByChannel` instead: no grid to write and nothing to refile, because the physics scene tracks every shape as it moves. That is the better choice for a few hundred lanterns that are actors anyway; it costs a collision shape on every lantern, and it only works for things physics knows about. A grid is also not the only structure of its own kind: `TOctree2` adapts to clumps, splitting only where many lanterns stand close, at the cost of more code to use. A grid with fixed cells is the simplest structure, and it stays fast as long as the lanterns are spread fairly evenly and the radius is near the cell size.

# Parsons

```yaml
- id: find-near
  prompt: Put FindNear in order. It starts by emptying the list it fills.
  lines:
    - "int32 FDojoP18Grid::FindNear(const FVector& Center, float Radius, TArray<AActor*>& OutActors) const"
    - "{"
    - "	OutActors.Reset();"
    - "	const FIntPoint Low = CellOf(Center - FVector(Radius, Radius, 0.f));"
    - "	const FIntPoint High = CellOf(Center + FVector(Radius, Radius, 0.f));"
    - "	int32 Measured = 0;"
    - "	for (int32 X = Low.X; X <= High.X; ++X)"
    - "	{"
    - "		for (int32 Y = Low.Y; Y <= High.Y; ++Y)"
    - "		{"
    - "			const TArray<TWeakObjectPtr<AActor>>* Bucket = Cells.Find(FIntPoint(X, Y));"
    - "			if (!Bucket) continue;"
    - "			for (const TWeakObjectPtr<AActor>& Entry : *Bucket)"
    - "			{"
    - "				AActor* Candidate = Entry.Get();"
    - "				if (!IsValid(Candidate)) continue;"
    - "				++Measured;"
    - "				if (FVector::Dist2D(Candidate->GetActorLocation(), Center) <= Radius) OutActors.Add(Candidate);"
    - "			}"
    - "		}"
    - "	}"
    - "	return Measured;"
    - "}"
  distractors:
    - line: "	GetWorld()->OverlapMultiByChannel(Overlaps, Center, FQuat::Identity, ECC_Visibility, FCollisionShape::MakeSphere(Radius));"
      mistake: The lanterns have no collision shape, so the physics scene has never heard of them and the overlap query finds nothing; the grid is the only place they are filed. A plain grid class also has no world to ask.
```
