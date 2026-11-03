---
id: p18-moth-swarm
title: Two thousand moths that are not actors
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [spatial-partition]
skills: [spatial-partition, performance]
terms: [uniform-grid, fintpoint, tmap, tick, overlap-query, navigation-octree]
prerequisites: [p18-spatial-partition-card, p18-lantern-grid]
xp: 90
estimatedMinutes: 30
concepts:
  - Thousands of cheap agents are kept as plain structs in one array, which the physics scene knows nothing about
  - The swarm files each moth's index in the cell under it, keyed by an FIntPoint
  - FindNear answers for where the moths are at the moment it is asked, after any number of steps
  - A question with a radius of one cell measures a few dozen moths, not thousands
  - The swarm owns its moths and its grid; nothing outside it touches either
---

# Brief

When you press Play, 2,000 moths fly across the meadow and bounce off its edges, and at any moment the swarm can say which moths are within a given distance of a spot by measuring only the moths in the cells near that spot.

The moths are not actors. Each is an `FDojoP18Moth`, a position and a velocity on the ground plane, and all 2,000 live in one array on `ADojoP18MothSwarm`. Two thousand actors with sphere components would let an overlap query find them, but each would cost an actor, a component, and a physics body to answer a question that a grid answers with an index. The physics scene never hears of these moths, so the swarm keeps its own grid: `Cells` maps each `FIntPoint` cell to the indices of the moths filed there, and `MothCells` remembers, for each moth, the cell it is filed in.

Written for you: the scatter, which places `Count` moths from `Seed` in a square field `HalfSize` each way around where the swarm stands and gives each a random heading at `Speed`; `Step`, which flies every moth and turns it back at the field's edge; `CountNear`; and `Tick`, which calls `Step` every frame. Write the rest:

- `CellOf`: the cell under a position, for square cells `CellSize` wide. The field reaches left of zero and below it.
- `FileAll`: files every moth in the cell under it, starting from an empty grid. The scatter calls it.
- `FindNear`: fills `OutMoths` with the index of every moth whose distance from `Center` is at most `Radius`, in any order, and returns how many moths it measured to decide. It looks only in the cells the circle can reach, for any radius.

You may add private members. Run the tests often.

## See it in the editor

Place a `DojoP18MothSwarm` at the origin. In the Level Blueprint, on Begin Play, start a looping timer of 0.5 seconds that prints Count Near on the swarm with the center (0, 0) and a radius of 300. Press Play: the number changes as the moths cross the middle, usually between 20 and 50. Then set the radius to 4000, which covers the whole field, and the print reads 2000 every time.

# Files

## DojoP18MothSwarm.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18MothSwarm.generated.h"

/** One moth: where it is on the ground plane and how far it flies each second. */
USTRUCT(BlueprintType)
struct FDojoP18Moth
{
	GENERATED_BODY()

	/** Where the moth is, on the ground plane. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moth")
	FVector2D Position = FVector2D::ZeroVector;

	/** How far it flies each second, and which way. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Moth")
	FVector2D Velocity = FVector2D::ZeroVector;
};

/** Thousands of moths kept as plain data, not actors, filed in a grid of cells so a question about one spot looks only at the moths near it. */
UCLASS()
class ADojoP18MothSwarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP18MothSwarm();

	/** How many moths the swarm scatters when play begins. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "0", ExposeOnSpawn = "true"))
	int32 Count = 2000;

	/** The seed of the scatter: the same seed gives the same moths. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ExposeOnSpawn = "true"))
	int32 Seed = 18;

	/** Half the side of the square field the moths fly in, centered where the swarm stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "100.0", ExposeOnSpawn = "true"))
	float HalfSize = 2000.f;

	/** The side of one grid cell. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "1.0"))
	float CellSize = 100.f;

	/** How far each moth flies in a second. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Swarm", meta = (ClampMin = "0.0"))
	float Speed = 120.f;

	/** Flies every moth for DeltaSeconds, turning it back where it meets the field's edge. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Step(float DeltaSeconds);

	/** Fills OutMoths with the index of every moth within Radius of Center, and returns how many moths it measured to decide. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	int32 FindNear(const FVector2D& Center, float Radius, TArray<int32>& OutMoths) const;

	/** How many moths are within Radius of Center. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 CountNear(FVector2D Center, float Radius) const;

	/** Every moth, in scatter order. */
	const TArray<FDojoP18Moth>& GetMoths() const;

	/** Flies the swarm one frame. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Scatters the moths. */
	virtual void BeginPlay() override;

private:
	/** Places Count moths from Seed, each flying a random way at Speed, and files them. */
	void Scatter();

	/** Files every moth in the cell under it, from an empty grid. */
	void FileAll();

	/** The cell under Position. */
	FIntPoint CellOf(const FVector2D& Position) const;

	/** Every moth, in scatter order. */
	TArray<FDojoP18Moth> Moths;

	/** The moth indices filed in each cell that holds any. */
	TMap<FIntPoint, TArray<int32>> Cells;

	/** The cell each moth is filed in, by moth index. */
	TArray<FIntPoint> MothCells;

	/** The middle of the field, where the swarm stood when it scattered. */
	FVector2D FieldCenter = FVector2D::ZeroVector;
};
```

## DojoP18MothSwarm.cpp

```cpp
#include "DojoP18MothSwarm.h"

#include "Components/SceneComponent.h"

ADojoP18MothSwarm::ADojoP18MothSwarm()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18MothSwarm::BeginPlay()
{
	Super::BeginPlay();

	Scatter();
}

void ADojoP18MothSwarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);
}

void ADojoP18MothSwarm::Scatter()
{
	const FRandomStream Stream(Seed);
	const FVector Where = GetActorLocation();
	FieldCenter = FVector2D(Where.X, Where.Y);

	Moths.Reset(Count);
	for (int32 Index = 0; Index < Count; ++Index)
	{
		FDojoP18Moth Moth;
		Moth.Position = FieldCenter + FVector2D(Stream.FRandRange(-HalfSize, HalfSize), Stream.FRandRange(-HalfSize, HalfSize));

		const float Heading = Stream.FRandRange(0.f, 2.f * UE_PI);
		Moth.Velocity = FVector2D(FMath::Cos(Heading), FMath::Sin(Heading)) * Speed;

		Moths.Add(Moth);
	}

	FileAll();
}

void ADojoP18MothSwarm::Step(float DeltaSeconds)
{
	const FVector2D Low = FieldCenter - FVector2D(HalfSize, HalfSize);
	const FVector2D High = FieldCenter + FVector2D(HalfSize, HalfSize);

	for (int32 Index = 0; Index < Moths.Num(); ++Index)
	{
		FDojoP18Moth& Moth = Moths[Index];
		Moth.Position += Moth.Velocity * DeltaSeconds;

		if (Moth.Position.X < Low.X || Moth.Position.X > High.X)
		{
			Moth.Velocity.X = -Moth.Velocity.X;
			Moth.Position.X = FMath::Clamp(Moth.Position.X, Low.X, High.X);
		}

		if (Moth.Position.Y < Low.Y || Moth.Position.Y > High.Y)
		{
			Moth.Velocity.Y = -Moth.Velocity.Y;
			Moth.Position.Y = FMath::Clamp(Moth.Position.Y, Low.Y, High.Y);
		}
	}
}

void ADojoP18MothSwarm::FileAll()
{
}

FIntPoint ADojoP18MothSwarm::CellOf(const FVector2D& Position) const
{
	return FIntPoint::ZeroValue;
}

int32 ADojoP18MothSwarm::FindNear(const FVector2D& Center, float Radius, TArray<int32>& OutMoths) const
{
	OutMoths.Reset();
	return 0;
}

int32 ADojoP18MothSwarm::CountNear(FVector2D Center, float Radius) const
{
	TArray<int32> Near;
	FindNear(Center, Radius, Near);
	return Near.Num();
}

const TArray<FDojoP18Moth>& ADojoP18MothSwarm::GetMoths() const
{
	return Moths;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p18-moth-swarm/DojoP18MothSwarm.h"
#include "Support/DojoTestWorld.h"

namespace DojoP18MothSwarmTest
{
	/** Spawns a swarm at the origin with these settings; its moths scatter as it begins play. */
	ADojoP18MothSwarm* MakeSwarm(FDojoTestWorld& TestWorld, int32 Count, int32 Seed, float HalfSize, float CellSize)
	{
		ADojoP18MothSwarm* Swarm = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP18MothSwarm>(ADojoP18MothSwarm::StaticClass(), FTransform::Identity);
		Swarm->Count = Count;
		Swarm->Seed = Seed;
		Swarm->HalfSize = HalfSize;
		Swarm->CellSize = CellSize;
		Swarm->FinishSpawning(FTransform::Identity);
		return Swarm;
	}

	/** The moths within Radius of Center, by measuring every one. */
	TArray<int32> MeasureAll(const ADojoP18MothSwarm* Swarm, const FVector2D& Center, double Radius)
	{
		TArray<int32> Near;
		const TArray<FDojoP18Moth>& Moths = Swarm->GetMoths();
		for (int32 Index = 0; Index < Moths.Num(); ++Index)
		{
			if (FVector2D::Distance(Moths[Index].Position, Center) <= Radius) Near.Add(Index);
		}
		return Near;
	}

	/** Checks, at seeded spots, that FindNear hands back exactly the moths a loop over all of them finds; false at the first spot that differs. */
	bool MatchesALoop(FAutomationTestBase& Test, const ADojoP18MothSwarm* Swarm, int32 SpotSeed, float HalfSize, float Radius, const FString& When, int32& OutFound)
	{
		const FRandomStream Spots(SpotSeed);
		for (int32 Query = 0; Query < 25; ++Query)
		{
			const FVector2D Center(Spots.FRandRange(-HalfSize, HalfSize), Spots.FRandRange(-HalfSize, HalfSize));
			TArray<int32> Found;
			Swarm->FindNear(Center, Radius, Found);
			Found.Sort();
			const TArray<int32> Expected = MeasureAll(Swarm, Center, Radius);
			OutFound += Found.Num();
			if (!Test.TestTrue(FString::Printf(TEXT("%s, spot %d, radius %.0f: FindNear hands back exactly the %d moths a loop finds (it found %d)"), *When, Query, Radius, Expected.Num(), Found.Num()), Found == Expected)) return false;
		}
		return true;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothSwarm_FindsWhatALoopFinds, "Dojo.P18.MothSwarm.FindsWhatALoopFinds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Right after the swarm scatters, FindNear finds exactly the moths a loop over all of them finds, and CountNear agrees. */
bool FDojo_P18_MothSwarm_FindsWhatALoopFinds::RunTest(const FString& Parameters)
{
	using namespace DojoP18MothSwarmTest;

	FDojoTestWorld TestWorld;
	ADojoP18MothSwarm* Swarm = MakeSwarm(TestWorld, 600, 7, 1500.f, 100.f);
	if (!TestEqual(TEXT("600 moths scattered"), Swarm->GetMoths().Num(), 600)) return false;

	int32 Found = 0;
	if (!MatchesALoop(*this, Swarm, 21, 1500.f, 150.f, TEXT("At the start"), Found)) return false;
	TestTrue(TEXT("Some spots have moths near them"), Found > 0);

	const FVector2D Spot(Swarm->GetMoths()[0].Position);
	TestEqual(TEXT("CountNear agrees with a loop"), Swarm->CountNear(Spot, 150.f), MeasureAll(Swarm, Spot, 150.0).Num());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothSwarm_StaysRightAsMothsFly, "Dojo.P18.MothSwarm.StaysRightAsMothsFly", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After two seconds of flight, and after five more, FindNear still finds exactly the moths a loop finds where they are now. */
bool FDojo_P18_MothSwarm_StaysRightAsMothsFly::RunTest(const FString& Parameters)
{
	using namespace DojoP18MothSwarmTest;

	FDojoTestWorld TestWorld;
	ADojoP18MothSwarm* Swarm = MakeSwarm(TestWorld, 600, 7, 1500.f, 100.f);
	const TArray<FDojoP18Moth> Start = Swarm->GetMoths();

	TestWorld.Tick(120);

	int32 Moved = 0;
	for (int32 Index = 0; Index < Start.Num(); ++Index)
	{
		if (FVector2D::Distance(Start[Index].Position, Swarm->GetMoths()[Index].Position) > 200.0) ++Moved;
	}
	TestTrue(TEXT("The moths flew: more than half are over 200 from where they started"), Moved > 300);

	int32 Found = 0;
	if (!MatchesALoop(*this, Swarm, 22, 1500.f, 150.f, TEXT("After two seconds of flight"), Found)) return false;

	TestWorld.Tick(300);
	if (!MatchesALoop(*this, Swarm, 23, 1500.f, 150.f, TEXT("After seven seconds of flight"), Found)) return false;
	TestTrue(TEXT("Some spots have moths near them"), Found > 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothSwarm_MeasuresOnlyNearbyCells, "Dojo.P18.MothSwarm.MeasuresOnlyNearbyCells", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With 2,000 moths spread over the field, a question with a radius of one cell measures fewer than a hundred of them. */
bool FDojo_P18_MothSwarm_MeasuresOnlyNearbyCells::RunTest(const FString& Parameters)
{
	using namespace DojoP18MothSwarmTest;

	FDojoTestWorld TestWorld;
	ADojoP18MothSwarm* Swarm = MakeSwarm(TestWorld, 2000, 18, 2000.f, 100.f);

	const FRandomStream Spots(5);
	for (int32 Query = 0; Query < 20; ++Query)
	{
		const FVector2D Center(Spots.FRandRange(-1900.0, 1900.0), Spots.FRandRange(-1900.0, 1900.0));
		TArray<int32> Found;
		const int32 Measured = Swarm->FindNear(Center, 100.f, Found);
		Found.Sort();

		if (!TestTrue(FString::Printf(TEXT("Spot %d: FindNear finds exactly what a loop finds"), Query), Found == MeasureAll(Swarm, Center, 100.0))) return false;
		TestTrue(FString::Printf(TEXT("Spot %d: it measured %d moths, at least the %d it found"), Query, Measured, Found.Num()), Measured >= Found.Num());
		TestTrue(FString::Printf(TEXT("Spot %d: it measured %d of 2000 moths, fewer than 100"), Query, Measured), Measured < 100);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_MothSwarm_AnyRangeAnyCell, "Dojo.P18.MothSwarm.AnyRangeAnyCell", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A radius several cells wide, a swarm standing away from the origin, and an empty swarm all give the answers a loop gives. */
bool FDojo_P18_MothSwarm_AnyRangeAnyCell::RunTest(const FString& Parameters)
{
	using namespace DojoP18MothSwarmTest;

	FDojoTestWorld TestWorld;
	ADojoP18MothSwarm* Swarm = MakeSwarm(TestWorld, 500, 3, 1200.f, 80.f);

	int32 Found = 0;
	if (!MatchesALoop(*this, Swarm, 24, 1200.f, 330.f, TEXT("Cells of 80, radius 330"), Found)) return false;
	TestTrue(TEXT("A wide radius finds moths"), Found > 0);

	ADojoP18MothSwarm* Away = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP18MothSwarm>(ADojoP18MothSwarm::StaticClass(), FTransform(FVector(-5000.0, 3000.0, 0.0)));
	Away->Count = 300;
	Away->Seed = 9;
	Away->HalfSize = 800.f;
	Away->FinishSpawning(FTransform(FVector(-5000.0, 3000.0, 0.0)));

	bool bInField = true;
	for (const FDojoP18Moth& Moth : Away->GetMoths())
	{
		if (FMath::Abs(Moth.Position.X + 5000.0) > 800.0 || FMath::Abs(Moth.Position.Y - 3000.0) > 800.0) bInField = false;
	}
	TestTrue(TEXT("A swarm standing at (-5000, 3000) scatters its moths around itself"), bInField);

	const FVector2D Near(Away->GetMoths()[0].Position);
	TArray<int32> AwayFound;
	Away->FindNear(Near, 200.f, AwayFound);
	AwayFound.Sort();
	TestTrue(TEXT("and FindNear finds them there, left of zero, exactly as a loop does"), AwayFound == MeasureAll(Away, Near, 200.0));

	ADojoP18MothSwarm* Empty = MakeSwarm(TestWorld, 0, 1, 500.f, 100.f);
	TArray<int32> None;
	TestEqual(TEXT("An empty swarm measures nothing"), Empty->FindNear(FVector2D::ZeroVector, 300.f, None), 0);
	TestEqual(TEXT("and finds nothing"), None.Num(), 0);

	return true;
}

#endif
```

# Hints

- One test passes right after the moths scatter and another fails after they have flown. What happened to the moths between those two moments, and which code did it?
- `Step` changes where each moth is. What does the grid know about that change, and what would a question about a moth's new place find?
- `Step` already visits every moth right after moving it. What could it do there that costs almost nothing for the moths that stayed inside their cell?

# Rubric

- CellOf gives the same cell to every position inside one square of CellSize, on both sides of zero.
- FindNear hands back exactly the moths within Radius of Center, each once, for any radius, smaller or larger than a cell.
- FindNear answers for where the moths are at the moment it is asked, after any number of steps.
- A question with a radius of one cell measures a few dozen of 2,000 moths, not all of them.
- The swarm owns its moths and its grid; nothing outside it writes to either.

# Alternative

Flying every moth and then emptying and rebuilding the whole grid once per step is simpler and also correct: one pass files 2,000 indices, and no moth can be missed. It does that work for every moth every frame, even the many that stayed in their cell, and it is easy to forget when a second piece of code starts moving moths. Moving a moth's index only when its cell changes costs almost nothing for the rest. A heavier alternative is a moth actor per moth with a sphere component and `OverlapMultiByChannel`: no grid to write, but 2,000 actors, components, and physics bodies to create, tick, and keep in the broadphase, for agents whose whole state is two vectors. The engine's own FNavigationOctree is no home for them either: it files the geometry that shapes the nav mesh, for the navigation system's rebuilds, not gameplay agents. One more limit: with the cell set to 100 and a question radius of 1,000, a question visits about 400 cells, most of them with a moth or two; keep the cell size near the radius you usually ask about.

# Parsons

```yaml
- id: file-all
  prompt: Put FileAll in order. It starts from an empty grid.
  lines:
    - "void ADojoP18MothSwarm::FileAll()"
    - "{"
    - "	Cells.Reset();"
    - "	MothCells.SetNum(Moths.Num());"
    - "	for (int32 Index = 0; Index < Moths.Num(); ++Index)"
    - "	{"
    - "		const FIntPoint Cell = CellOf(Moths[Index].Position);"
    - "		Cells.FindOrAdd(Cell).Add(Index);"
    - "		MothCells[Index] = Cell;"
    - "	}"
    - "}"
  distractors:
    - line: "		GetWorld()->SpawnActor<AActor>(FVector(Moths[Index].Position, 0.0), FRotator::ZeroRotator);"
      mistake: The moths are plain structs on purpose; spawning an actor per moth brings back the cost the swarm exists to avoid, and the grid files indices, not actors.
```
