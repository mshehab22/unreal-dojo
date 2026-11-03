---
id: p18-thread-refactor
title: Threads between drifting lanterns
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [spatial-partition]
skills: [spatial-partition, refactoring]
terms: [uniform-grid, fintpoint, tmap, tick, profiling]
prerequisites: [p18-moth-swarm]
xp: 110
estimatedMinutes: 30
concepts:
  - A rule between every pair of nearby objects needs each pair measured once, not once from each side
  - Filing the lanterns in cells as wide as the reach means a pair in reach always sits in the same cell or in touching cells
  - Each cell measures its own pairs and its pairs with four of its eight neighbors
  - The threads, the reach, and the per-frame weaving stay exactly as they were
  - The work grows with the lanterns near each other, not with the square of all of them
---

# Brief

After the refactor, a pond of 1,500 drifting lanterns is woven every frame by measuring only the pairs that stand close, each pair once, and the threads are exactly the threads it had before.

`ADojoP18ThreadWeaver` joins two floating lanterns with a glowing thread when they drift within `LinkRange` of each other. `Floats` holds where each lantern is on the pond, and the weaver weaves again every frame because the lanterns drift. Today `Weave` measures every pair: lantern 0 against all the others, lantern 1 against all after it, and so on. With 50 lanterns that is 1,225 measurements a frame; the festival now floats 1,500, and the weaver measures over a million pairs every frame to find a few thousand threads.

Refactor `Weave`:

- File the lanterns' indices by cell, for square cells `LinkRange` wide, starting at zero (the cell of a spot is its coordinates divided by `LinkRange`, rounded down). Two lanterns in reach always stand in the same cell or in touching cells.
- Measure each pair inside a cell, and each pair between a cell and four of its eight neighbor cells, chosen so that every two touching cells are measured from one side only. Each nearby pair is measured once.
- The threads stay the same: every pair within `LinkRange`, each once, the lower index first. The order of the list was never promised and may change.
- `GetLastMeasured` still counts the pairs the last weave measured. `LinkRange` may change between weaves.

You may add private members. Two of the four tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place a `DojoP18ThreadWeaver`. In Details, add five Floats: (0, 0), (100, 0), (200, 0), (900, 0), and (960, 40). In the Level Blueprint, on Begin Play, print the length of Get Threads and then Get Last Measured after a short delay: 3 threads, and 10 measured before the refactor, every pair of five. After the refactor the print still shows 3 threads, and fewer pairs measured, because the lantern at 900 is never measured against the one at 0.

# Files

## DojoP18ThreadWeaver.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP18ThreadWeaver.generated.h"

/** Two floating lanterns joined by a glowing thread, the lower index first. */
USTRUCT(BlueprintType)
struct FDojoP18Thread
{
	GENERATED_BODY()

	/** The lower index of the two lanterns. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Thread")
	int32 First = 0;

	/** The higher index of the two lanterns. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Thread")
	int32 Second = 0;
};

/** Joins every two floating lanterns on the pond that drift within reach of each other with a thread, once per pair. */
UCLASS()
class ADojoP18ThreadWeaver : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking on. */
	ADojoP18ThreadWeaver();

	/** Where each floating lantern is on the pond. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weaver")
	TArray<FVector2D> Floats;

	/** Two lanterns this close or closer are joined. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Weaver", meta = (ClampMin = "1.0"))
	float LinkRange = 150.f;

	/** Works out the threads again from where the lanterns are now. */
	UFUNCTION(BlueprintCallable, Category = "Weaver")
	void Weave();

	/** The threads the last Weave found, each pair once, in no particular order. */
	UFUNCTION(BlueprintPure, Category = "Weaver")
	TArray<FDojoP18Thread> GetThreads() const;

	/** How many pairs of lanterns the last Weave measured. */
	UFUNCTION(BlueprintPure, Category = "Weaver")
	int32 GetLastMeasured() const;

	/** Weaves again every frame, because the lanterns drift. */
	virtual void Tick(float DeltaSeconds) override;

private:
	/** The threads the last Weave found. */
	TArray<FDojoP18Thread> Threads;

	/** Pairs the last Weave measured. */
	int32 LastMeasured = 0;
};
```

## DojoP18ThreadWeaver.cpp

```cpp
#include "DojoP18ThreadWeaver.h"

#include "Components/SceneComponent.h"

ADojoP18ThreadWeaver::ADojoP18ThreadWeaver()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP18ThreadWeaver::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Weave();
}

void ADojoP18ThreadWeaver::Weave()
{
	Threads.Reset();
	LastMeasured = 0;

	for (int32 Lower = 0; Lower < Floats.Num(); ++Lower)
	{
		for (int32 Upper = Lower + 1; Upper < Floats.Num(); ++Upper)
		{
			++LastMeasured;
			if (FVector2D::Distance(Floats[Lower], Floats[Upper]) > LinkRange) continue;

			FDojoP18Thread Thread;
			Thread.First = Lower;
			Thread.Second = Upper;
			Threads.Add(Thread);
		}
	}
}

TArray<FDojoP18Thread> ADojoP18ThreadWeaver::GetThreads() const
{
	return Threads;
}

int32 ADojoP18ThreadWeaver::GetLastMeasured() const
{
	return LastMeasured;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p18-thread-refactor/DojoP18ThreadWeaver.h"
#include "Support/DojoTestWorld.h"

namespace DojoP18ThreadWeaverTest
{
	/** Count seeded spots in a square HalfSize from the origin each way. */
	TArray<FVector2D> SeededFloats(int32 Count, int32 Seed, double HalfSize)
	{
		const FRandomStream Stream(Seed);
		TArray<FVector2D> Floats;
		for (int32 Index = 0; Index < Count; ++Index) Floats.Add(FVector2D(Stream.FRandRange(-HalfSize, HalfSize), Stream.FRandRange(-HalfSize, HalfSize)));
		return Floats;
	}

	/** Every pair within Range, lower index first, in index order, by measuring every pair. */
	TArray<TPair<int32, int32>> MeasureAll(const TArray<FVector2D>& Floats, double Range)
	{
		TArray<TPair<int32, int32>> Pairs;
		for (int32 Lower = 0; Lower < Floats.Num(); ++Lower)
		{
			for (int32 Upper = Lower + 1; Upper < Floats.Num(); ++Upper)
			{
				if (FVector2D::Distance(Floats[Lower], Floats[Upper]) <= Range) Pairs.Add(TPair<int32, int32>(Lower, Upper));
			}
		}
		return Pairs;
	}

	/** The weaver's threads as pairs, sorted by the first index and then the second. */
	TArray<TPair<int32, int32>> SortedThreads(const ADojoP18ThreadWeaver* Weaver)
	{
		TArray<TPair<int32, int32>> Pairs;
		for (const FDojoP18Thread& Thread : Weaver->GetThreads()) Pairs.Add(TPair<int32, int32>(Thread.First, Thread.Second));
		Pairs.Sort([](const TPair<int32, int32>& A, const TPair<int32, int32>& B) { return A.Key != B.Key ? A.Key < B.Key : A.Value < B.Value; });
		return Pairs;
	}

	/** How many pairs stand in the same cell or in touching cells, for square cells Range wide starting at zero: the most a grid that measures each such pair once may measure. */
	int32 NearbyCellPairs(const TArray<FVector2D>& Floats, double Range)
	{
		int32 Count = 0;
		for (int32 Lower = 0; Lower < Floats.Num(); ++Lower)
		{
			const int32 LowerX = FMath::FloorToInt32(Floats[Lower].X / Range);
			const int32 LowerY = FMath::FloorToInt32(Floats[Lower].Y / Range);
			for (int32 Upper = Lower + 1; Upper < Floats.Num(); ++Upper)
			{
				const int32 UpperX = FMath::FloorToInt32(Floats[Upper].X / Range);
				const int32 UpperY = FMath::FloorToInt32(Floats[Upper].Y / Range);
				if (FMath::Abs(LowerX - UpperX) <= 1 && FMath::Abs(LowerY - UpperY) <= 1) ++Count;
			}
		}
		return Count;
	}

	/** A weaver with these lanterns and this range, woven once. */
	ADojoP18ThreadWeaver* MakeWeaver(FDojoTestWorld& TestWorld, const TArray<FVector2D>& Floats, float Range)
	{
		ADojoP18ThreadWeaver* Weaver = TestWorld.SpawnActor<ADojoP18ThreadWeaver>();
		Weaver->Floats = Floats;
		Weaver->LinkRange = Range;
		Weaver->Weave();
		return Weaver;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_ThreadRefactor_SameThreadsAsBefore, "Dojo.P18.ThreadRefactor.SameThreadsAsBefore", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three hundred seeded lanterns get exactly the threads that measuring every pair gives, and lanterns exactly at reach are joined. */
bool FDojo_P18_ThreadRefactor_SameThreadsAsBefore::RunTest(const FString& Parameters)
{
	using namespace DojoP18ThreadWeaverTest;

	FDojoTestWorld TestWorld;
	const TArray<FVector2D> Floats = SeededFloats(300, 6, 1500.0);
	ADojoP18ThreadWeaver* Weaver = MakeWeaver(TestWorld, Floats, 150.f);

	const TArray<TPair<int32, int32>> Expected = MeasureAll(Floats, 150.0);
	TestTrue(TEXT("Some lanterns are within reach of each other"), Expected.Num() > 0);
	TestTrue(FString::Printf(TEXT("The weaver joins exactly the %d pairs within 150"), Expected.Num()), SortedThreads(Weaver) == Expected);

	ADojoP18ThreadWeaver* Exact = MakeWeaver(TestWorld, { FVector2D(0.0, 0.0), FVector2D(150.0, 0.0), FVector2D(300.0, 0.0), FVector2D(450.5, 0.0) }, 150.f);
	const TArray<TPair<int32, int32>> Chain = { TPair<int32, int32>(0, 1), TPair<int32, int32>(1, 2) };
	TestTrue(TEXT("Lanterns exactly 150 apart are joined; 150.5 apart are not"), SortedThreads(Exact) == Chain);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_ThreadRefactor_EachPairOnce, "Dojo.P18.ThreadRefactor.EachPairOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** No pair is joined twice, the lower index always comes first, and pairs across a cell line or across zero are joined like any other. */
bool FDojo_P18_ThreadRefactor_EachPairOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP18ThreadWeaverTest;

	FDojoTestWorld TestWorld;
	ADojoP18ThreadWeaver* Weaver = MakeWeaver(TestWorld, SeededFloats(400, 8, 1200.0), 150.f);

	TSet<TPair<int32, int32>> Seen;
	bool bOnce = true;
	bool bOrdered = true;
	for (const FDojoP18Thread& Thread : Weaver->GetThreads())
	{
		const TPair<int32, int32> Pair(Thread.First, Thread.Second);
		if (Seen.Contains(Pair)) bOnce = false;
		Seen.Add(Pair);
		if (Thread.First >= Thread.Second) bOrdered = false;
	}

	TestTrue(TEXT("No pair of lanterns is joined twice"), bOnce);
	TestTrue(TEXT("Every thread names the lower index first"), bOrdered);

	ADojoP18ThreadWeaver* Lines = MakeWeaver(TestWorld, { FVector2D(149.0, 10.0), FVector2D(151.0, 10.0), FVector2D(-20.0, -20.0), FVector2D(20.0, 20.0), FVector2D(-140.0, 140.0), FVector2D(-160.0, 160.0) }, 150.f);
	const TArray<TPair<int32, int32>> Expected = MeasureAll(Lines->Floats, 150.0);
	TestTrue(FString::Printf(TEXT("Pairs across a cell line, across zero, and across a corner are joined: %d threads"), Expected.Num()), SortedThreads(Lines) == Expected);

	ADojoP18ThreadWeaver* Empty = MakeWeaver(TestWorld, {}, 150.f);
	TestEqual(TEXT("An empty pond has no threads"), Empty->GetThreads().Num(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_ThreadRefactor_MeasuresEachNearbyPairOnce, "Dojo.P18.ThreadRefactor.MeasuresEachNearbyPairOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With 1,500 lanterns on a wide pond, the weaver measures only pairs in the same or touching cells, each once, and still joins exactly the right pairs. */
bool FDojo_P18_ThreadRefactor_MeasuresEachNearbyPairOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP18ThreadWeaverTest;

	FDojoTestWorld TestWorld;
	const TArray<FVector2D> Floats = SeededFloats(1500, 12, 3000.0);
	ADojoP18ThreadWeaver* Weaver = MakeWeaver(TestWorld, Floats, 150.f);

	const int32 AllPairs = 1500 * 1499 / 2;
	const int32 Nearby = NearbyCellPairs(Floats, 150.0);
	TestTrue(TEXT("Joins exactly the pairs within 150"), SortedThreads(Weaver) == MeasureAll(Floats, 150.0));
	TestTrue(FString::Printf(TEXT("Measured %d pairs; at most the %d pairs in the same or touching cells, each once, of %d pairs in all"), Weaver->GetLastMeasured(), Nearby, AllPairs), Weaver->GetLastMeasured() <= Nearby);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P18_ThreadRefactor_FollowsTheRangeAndTheDrift, "Dojo.P18.ThreadRefactor.FollowsTheRangeAndTheDrift", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A longer reach and lanterns that drifted are woven right, and still only nearby pairs are measured. */
bool FDojo_P18_ThreadRefactor_FollowsTheRangeAndTheDrift::RunTest(const FString& Parameters)
{
	using namespace DojoP18ThreadWeaverTest;

	FDojoTestWorld TestWorld;
	TArray<FVector2D> Floats = SeededFloats(1000, 14, 3000.0);
	ADojoP18ThreadWeaver* Weaver = MakeWeaver(TestWorld, Floats, 400.f);

	TestTrue(TEXT("With a reach of 400, the weaver joins exactly the pairs within 400"), SortedThreads(Weaver) == MeasureAll(Floats, 400.0));
	TestTrue(FString::Printf(TEXT("and measured %d pairs, at most the %d in the same or touching 400 wide cells"), Weaver->GetLastMeasured(), NearbyCellPairs(Floats, 400.0)), Weaver->GetLastMeasured() <= NearbyCellPairs(Floats, 400.0));

	const FRandomStream Drift(15);
	for (FVector2D& Spot : Floats) Spot += FVector2D(Drift.FRandRange(-250.0, 250.0), Drift.FRandRange(-250.0, 250.0));
	Weaver->Floats = Floats;
	Weaver->LinkRange = 150.f;
	TestWorld.Tick(1);

	TestTrue(TEXT("After the lanterns drift and the reach drops to 150, the next frame joins exactly the pairs within 150"), SortedThreads(Weaver) == MeasureAll(Floats, 150.0));
	TestTrue(FString::Printf(TEXT("and measured %d pairs, at most the %d nearby ones"), Weaver->GetLastMeasured(), NearbyCellPairs(Floats, 150.0)), Weaver->GetLastMeasured() <= NearbyCellPairs(Floats, 150.0));

	return true;
}

#endif
```

# Hints

- A thread is at most `LinkRange` long. If the cells are exactly that wide, how far apart, in cells, can two lanterns in reach be?
- If every cell measures against all eight of its neighbors, how many times is a pair in two touching cells measured? Which four directions cover every touching pair exactly once?
- Cells left of zero and below it are as real as the others. What does rounding toward zero do to the lanterns between minus one cell and plus one cell?

# Rubric

- Weave joins exactly the pairs within LinkRange, each once, the lower index first, as before.
- Lanterns are filed in cells LinkRange wide, rounded down, so cells left of and below zero are as wide as the rest.
- Each cell measures its own pairs and its pairs with four of its eight neighbors, so every nearby pair is measured once.
- GetLastMeasured counts the pairs measured, which stays near the number of nearby pairs rather than every pair.
- A changed LinkRange or drifted lanterns are woven right on the next weave.
- The threads' contents, the reach, and the weaving every frame are unchanged.

# Alternative

Filing the lanterns once and refiling each one as it drifts, as the swarm does, would save the filing pass each frame; here every lantern is measured every frame anyway, so filing 1,500 indices again is a small part of the work and cannot fall out of date. Measuring all eight neighbors and keeping only the pairs where the first index is lower also produces the right threads, but it measures every pair across touching cells twice. A sort and sweep is another way to find close pairs: sort the lanterns by X once and, for each, only look ahead while the X gap is under the reach; it needs no cells, and it slows down when many lanterns share nearly the same X, which a grid does not mind.

# Parsons

```yaml
- id: weave-cells
  prompt: Put the neighbor part of the new Weave in order. It runs inside the loop over Cells, where Here is the current cell's indices and the cell's own pairs are already measured.
  lines:
    - "		for (const FIntPoint& Offset : Ahead)"
    - "		{"
    - "			const TArray<int32>* There = Cells.Find(Pair.Key + Offset);"
    - "			if (!There) continue;"
    - "			for (const int32 Mine : Here)"
    - "			{"
    - "				for (const int32 Theirs : *There)"
    - "				{"
    - "					Measure(Mine, Theirs);"
    - "				}"
    - "			}"
    - "		}"
  distractors:
    - line: "		GetWorld()->OverlapMultiByChannel(Overlaps, FVector(Pair.Key, 0.0), FQuat::Identity, ECC_WorldDynamic, FCollisionShape::MakeSphere(LinkRange));"
      mistake: The floats are plain positions in an array, not collision shapes, so the physics scene cannot find them; the cells are the only place the lanterns are filed.
```
