---
id: p6-keg-refactor
title: Kegs that wait their turn to blow
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [event-queue]
skills: [event-queue, refactoring]
terms: [tick, tarray, ufunction]
prerequisites: [p6-gate-tallies]
xp: 90
estimatedMinutes: 20
concepts:
  - A handler that triggers more of the same work inside itself turns a chain into a call stack as deep as the chain
  - Posting the follow-up work to a queue and handling it on a later tick keeps every step shallow
  - A chain spread over ticks also becomes something the player can see happen
---

# Brief

When you press Play and run `ke * Detonate 5`, the row of kegs blows outward from keg 5 one keg each way per frame, and a row of two hundred kegs blows just as calmly, never with one explosion running inside another.

The starter works for a short row. `Detonate` blows a keg and then calls `Detonate` on both neighbors, which call it on theirs, and so on. Every keg in the chain blows inside the call of the keg before it. Read it and look at `GetDeepestChain`: for a row of 200 kegs it reports 200 explosions running inside one another, 200 stack frames deep, all in one frame. A designer's two-thousand-keg finale would be ten times deeper and could exhaust the stack, and the whole row vanishes in a single frame, so nobody sees the chain at all.

Refactor it so a keg never blows inside another keg's explosion:

- `Detonate` no longer blows anything. It posts the keg to a list of kegs waiting to blow, and ignores kegs off the row and kegs already blown.
- Each tick blows one wave: the kegs that were waiting when the tick began. Kegs they set off are posted for the next tick, not this one.
- Keep `ResetRow`, `Detonate`, `GetBlownCount`, `IsBlown`, and `GetDeepestChain` with the same meaning. Every keg still blows exactly once.

## See it in the editor

Place a `DojoP6KegRow` in a map with no other keg rows, press Play, open the console, and run `ke * Detonate 5`. Before the refactor the label turns from `oooooooooooo` to `************` in one frame. After it, the stars spread out from the middle a keg each way per frame until the row is gone.

# Files

## DojoP6KegRow.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP6KegRow.generated.h"

class UTextRenderComponent;

/** A row of powder kegs along the arena wall: a keg that blows sets off the kegs on either side of it. */
UCLASS()
class ADojoP6KegRow : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills the row, and turns ticking on. */
	ADojoP6KegRow();

	/** Floating text that draws the row: o for a keg, * for one that has blown. */
	UPROPERTY(VisibleAnywhere, Category = "Kegs")
	TObjectPtr<UTextRenderComponent> Label;

	/** Refills the row with Count fresh kegs. */
	UFUNCTION(BlueprintCallable, Category = "Kegs")
	void ResetRow(int32 Count);

	/** Sets off one keg; kegs off the row and kegs already blown are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Kegs")
	void Detonate(int32 Keg);

	/** How many kegs have blown. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	int32 GetBlownCount() const;

	/** True once a keg has blown. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	bool IsBlown(int32 Keg) const;

	/** The most explosions that were ever running inside one another at the same moment. */
	UFUNCTION(BlueprintPure, Category = "Kegs")
	int32 GetDeepestChain() const;

private:
	/** Writes the row into the label. */
	void RefreshLabel();

	/** Which kegs have blown. */
	TArray<bool> Blown;

	int32 BlownCount = 0;
	int32 CurrentDepth = 0;
	int32 DeepestChain = 0;
};
```

## DojoP6KegRow.cpp

```cpp
#include "DojoP6KegRow.h"

#include "Components/TextRenderComponent.h"

ADojoP6KegRow::ADojoP6KegRow()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	ResetRow(12);
}

void ADojoP6KegRow::ResetRow(int32 Count)
{
	Blown.Init(false, FMath::Max(1, Count));
	BlownCount = 0;
	DeepestChain = 0;
	RefreshLabel();
}

void ADojoP6KegRow::Detonate(int32 Keg)
{
	if (!Blown.IsValidIndex(Keg) || Blown[Keg]) return;

	CurrentDepth++;
	DeepestChain = FMath::Max(DeepestChain, CurrentDepth);

	Blown[Keg] = true;
	BlownCount++;

	Detonate(Keg - 1);
	Detonate(Keg + 1);

	CurrentDepth--;
	RefreshLabel();
}

int32 ADojoP6KegRow::GetBlownCount() const
{
	return BlownCount;
}

bool ADojoP6KegRow::IsBlown(int32 Keg) const
{
	return Blown.IsValidIndex(Keg) && Blown[Keg];
}

int32 ADojoP6KegRow::GetDeepestChain() const
{
	return DeepestChain;
}

void ADojoP6KegRow::RefreshLabel()
{
	FString Row;
	for (const bool bBlown : Blown) Row += bBlown ? TEXT("*") : TEXT("o");
	Label->SetText(FText::FromString(Row));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p6-keg-refactor/DojoP6KegRow.h"
#include "Support/DojoTestWorld.h"

namespace DojoP6KegRefactorTest
{
	/** Ticks a row until nothing changes for a few ticks, at most MaxTicks times. */
	void TickUntilQuiet(ADojoP6KegRow* Row, int32 MaxTicks)
	{
		int32 QuietTicks = 0;

		for (int32 Tick = 0; Tick < MaxTicks && QuietTicks < 3; ++Tick)
		{
			const int32 Before = Row->GetBlownCount();
			Row->Tick(1.f / 60.f);
			QuietTicks = Row->GetBlownCount() == Before ? QuietTicks + 1 : 0;
		}
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KegRefactor_EveryKegBlowsOnce, "Dojo.P6.KegRefactor.EveryKegBlowsOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Setting off one keg in a row of twelve ends with all twelve blown, each exactly once, as the starter does. */
bool FDojo_P6_KegRefactor_EveryKegBlowsOnce::RunTest(const FString& Parameters)
{
	using namespace DojoP6KegRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP6KegRow* Row = TestWorld.SpawnActor<ADojoP6KegRow>();
	if (!TestNotNull(TEXT("Row spawned"), Row)) return false;

	Row->ResetRow(12);
	Row->Detonate(5);
	Row->Detonate(5);
	Row->Detonate(40);
	TickUntilQuiet(Row, 40);

	TestEqual(TEXT("Every keg blew exactly once"), Row->GetBlownCount(), 12);
	TestTrue(TEXT("The first keg blew"), Row->IsBlown(0));
	TestTrue(TEXT("The last keg blew"), Row->IsBlown(11));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KegRefactor_NoExplosionInsideAnother, "Dojo.P6.KegRefactor.NoExplosionInsideAnother", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A row of two hundred kegs set off at one end never has one explosion running inside another. */
bool FDojo_P6_KegRefactor_NoExplosionInsideAnother::RunTest(const FString& Parameters)
{
	using namespace DojoP6KegRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP6KegRow* Row = TestWorld.SpawnActor<ADojoP6KegRow>();
	if (!TestNotNull(TEXT("Row spawned"), Row)) return false;

	Row->ResetRow(200);
	Row->Detonate(0);
	TickUntilQuiet(Row, 400);

	TestEqual(TEXT("All two hundred kegs blew"), Row->GetBlownCount(), 200);
	TestEqual(TEXT("No explosion ever ran inside another"), Row->GetDeepestChain(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P6_KegRefactor_OneWavePerTick, "Dojo.P6.KegRefactor.OneWavePerTick", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Setting off keg 5 blows nothing at once; each tick blows the next ring outward. */
bool FDojo_P6_KegRefactor_OneWavePerTick::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP6KegRow* Row = TestWorld.SpawnActor<ADojoP6KegRow>();
	if (!TestNotNull(TEXT("Row spawned"), Row)) return false;

	Row->ResetRow(12);
	Row->Detonate(5);
	TestEqual(TEXT("Detonate only posts the keg"), Row->GetBlownCount(), 0);

	Row->Tick(1.f / 60.f);
	TestEqual(TEXT("The first tick blows keg 5"), Row->GetBlownCount(), 1);

	Row->Tick(1.f / 60.f);
	TestEqual(TEXT("The second tick blows its two neighbors"), Row->GetBlownCount(), 3);
	TestTrue(TEXT("Keg 4 is blown"), Row->IsBlown(4));
	TestFalse(TEXT("Keg 3 waits for the next tick"), Row->IsBlown(3));

	return true;
}

#endif
```

# Hints

- Find the two calls that make the starter's chain deep. Each of them should become "this keg should blow later" instead of "blow this keg now".
- Keep a list of kegs waiting to blow. On each tick, move that list into a local wave first, so kegs posted while the wave blows land in the fresh list for the next tick.
- `TArray::AddUnique` keeps a keg from being posted twice in one wave, and `MoveTemp` with `TArray::Reset` hands over the waiting list the way the herald handed over its mailbox.

# Rubric

- Detonate only posts a keg; no keg blows inside Detonate or inside another keg's explosion.
- Each tick blows exactly the kegs waiting when it began, and kegs they set off wait for the next tick.
- Every keg blows exactly once, and kegs off the row or already blown are ignored.
- The deepest chain is 1 for any row length.
- Public names and meanings are unchanged; the label shows the row after each wave.
- The old recursive calls are gone, not left beside the queue.

# Alternative

An explicit stack or worklist processed in a loop inside Detonate (push neighbors, pop until empty) would also remove the recursion while still blowing the whole row in one frame. That is the right fix when the chain must resolve instantly, for example a puzzle rule that has to finish before the next move is checked. The queue drained one wave per tick does more: it spreads the work across frames, gives the player a chain they can watch, and lets anything else in the frame see the row in a consistent state between waves.
