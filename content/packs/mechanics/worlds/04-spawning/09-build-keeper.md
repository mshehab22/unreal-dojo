---
id: m4-keeper
title: A keeper that holds a budget of live bombs
order: 9
kind: build
scaffold: blank
difficulty: 4
patterns: []
skills: [spawning, time, delegates]
terms: [spawn-actor-deferred, on-destroyed, timer-manager, timer-handle, tsubclassof, endplay]
prerequisites: [m4-chain, m4-fuse]
xp: 120
estimatedMinutes: 30
concepts:
  - A looping timer that starts on the next frame refills slots, and the budget is checked at every refill
  - Each slot is freed by its own bomb's OnDestroyed, so the count is always exact
---

# Brief

When you place a keeper with three slots and press Play, a lit bomb appears in the first slot right away and another every half second until all three slots hold one; each bomb blows when its fuse runs out, its slot is free again, and the next refill puts a new bomb there, so there are never more than three in play and they keep coming until the keeper is stopped.

Write `ADojoM4Keeper` from nothing. It has a scene root and never ticks. From `BeginPlay` it refills every `RefillSeconds`, the first time on the next frame. A refill does nothing when there is no class or no free slot; otherwise it spawns one bomb in the lowest free slot, lit with `Fuse` from its first frame, and counts it as made. Slot `i` stands `Spacing` times `i` along the keeper's own right. A bomb leaving play, by any means, frees its slot. `Stop` ends the refills, and so does `EndPlay`, which also stops listening to the bombs.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere, BlueprintReadWrite) TSubclassOf<ADojoM4Bomb> BombClass;`
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MaxLive = 3;` the number of slots, 1 or more.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float RefillSeconds = 0.5f;` seconds between refills, more than 0.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float Fuse = 1.2f;` each new bomb's fuse, more than 0.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float Spacing = 100.f;` units between slots.
- `UFUNCTION(BlueprintCallable) void Stop();`
- `UFUNCTION(BlueprintPure) int32 GetLive() const;` bombs from this keeper still in play.
- `UFUNCTION(BlueprintPure) int32 GetMade() const;` bombs this keeper has spawned.

Dependency direction: the keeper holds its bombs and listens to them; the bombs know nothing about the keeper.

Compiles against earlier quests: m4-fuse (`Quests/m4-fuse/DojoM4Bomb.h`).

## See it in the editor

Place a `DojoM4Keeper`, set Bomb Class to `DojoM4Bomb` in Details, and press Play: the three slots fill, empty, and refill on a steady beat. Print Get Live and Get Made on the 1 key. Set Fuse to 3 and watch the keeper wait for free slots; set Refill Seconds to 0.05 and see the slots refill almost as soon as they empty. Type `t.MaxFPS 3` in the console and check the budget still holds when frames are long.

# Files

## DojoM4Keeper.h

```cpp
// Declare ADojoM4Keeper here.
```

## DojoM4Keeper.cpp

```cpp
// Define ADojoM4Keeper here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "EngineUtils.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Quests/m4-keeper/DojoM4Keeper.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4KeeperTest
{
	/** Spawns a keeper at a spot with the settings a designer would give it in Details; its refills start as it begins play. */
	ADojoM4Keeper* PlaceKeeper(FDojoTestWorld& TestWorld, const FVector& Where, bool bWithClass)
	{
		const FTransform Spot(Where);
		ADojoM4Keeper* Keeper = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4Keeper>(ADojoM4Keeper::StaticClass(), Spot);
		Keeper->BombClass = bWithClass ? ADojoM4Bomb::StaticClass() : nullptr;
		Keeper->MaxLive = 3;
		Keeper->RefillSeconds = 0.5f;
		Keeper->Fuse = 1.2f;
		Keeper->Spacing = 100.f;
		Keeper->FinishSpawning(Spot);
		return Keeper;
	}

	/** Every bomb in the world. */
	TArray<ADojoM4Bomb*> AllBombs(FDojoTestWorld& TestWorld)
	{
		TArray<ADojoM4Bomb*> Bombs;
		for (TActorIterator<ADojoM4Bomb> It(TestWorld.GetWorld()); It; ++It) Bombs.Add(*It);
		return Bombs;
	}

	/** The bomb standing at a spot, or nullptr. */
	ADojoM4Bomb* BombAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		for (ADojoM4Bomb* Bomb : AllBombs(TestWorld))
		{
			if (Bomb->GetActorLocation().Equals(Where, 0.5)) return Bomb;
		}

		return nullptr;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Keeper_KeepsTheBudget, "Dojo.M4.Keeper.KeepsTheBudget", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs a three slot keeper for 3 seconds and checks it starts filling right away, never holds more than three, and refills freed slots lowest first. */
bool FDojo_M4_Keeper_KeepsTheBudget::RunTest(const FString& Parameters)
{
	using namespace DojoM4KeeperTest;

	FDojoTestWorld TestWorld;

	ADojoM4Keeper* Keeper = PlaceKeeper(TestWorld, FVector(0.0, 8000.0, 0.0), true);
	if (!TestNotNull(TEXT("Keeper spawned"), Keeper)) return false;

	TestWorld.Tick(2);
	TestEqual(TEXT("The first bomb appears with the first refill, right after play begins"), Keeper->GetMade(), 1);
	ADojoM4Bomb* First = BombAt(TestWorld, FVector(0.0, 8000.0, 0.0));
	TestTrue(TEXT("in slot 0, lit from its first frame"), First != nullptr && First->WasLitAtStart());

	bool bWithinBudget = true;
	for (int32 Frame = 2; Frame < 63; ++Frame)
	{
		TestWorld.Tick(1);
		if (Keeper->GetLive() > 3 || AllBombs(TestWorld).Num() > 3) bWithinBudget = false;
	}

	TestEqual(TEXT("A little over a second in, three bombs have been made"), Keeper->GetMade(), 3);
	TestEqual(TEXT("and all three are in play"), Keeper->GetLive(), 3);
	TestTrue(TEXT("Slot 2 stands 200 along the keeper's right"), BombAt(TestWorld, FVector(0.0, 8200.0, 0.0)) != nullptr);

	for (int32 Frame = 0; Frame < 30; ++Frame)
	{
		TestWorld.Tick(1);
		if (Keeper->GetLive() > 3 || AllBombs(TestWorld).Num() > 3) bWithinBudget = false;
	}

	ADojoM4Bomb* Refilled = BombAt(TestWorld, FVector(0.0, 8000.0, 0.0));
	TestTrue(TEXT("When slot 0's bomb blew, the next refill put a new bomb there"), Refilled != nullptr && Refilled->GetFuseRemaining() > 1.1f);

	for (int32 Frame = 0; Frame < 90; ++Frame)
	{
		TestWorld.Tick(1);
		if (Keeper->GetLive() > 3 || AllBombs(TestWorld).Num() > 3) bWithinBudget = false;
	}

	TestTrue(TEXT("There were never more than three bombs in play"), bWithinBudget);
	TestEqual(TEXT("A little over 3 seconds in, seven bombs have been made, one per refill once slots free up"), Keeper->GetMade(), 7);
	TestEqual(TEXT("and the live count matches the bombs in play"), Keeper->GetLive(), AllBombs(TestWorld).Num());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Keeper_LongFramesKeepTheBudget, "Dojo.M4.Keeper.LongFramesKeepTheBudget", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Runs a keeper through frames of 0.4 seconds and checks the budget and the slots hold in every frame. */
bool FDojo_M4_Keeper_LongFramesKeepTheBudget::RunTest(const FString& Parameters)
{
	using namespace DojoM4KeeperTest;

	FDojoTestWorld TestWorld;

	ADojoM4Keeper* Keeper = PlaceKeeper(TestWorld, FVector(0.0, 9000.0, 0.0), true);
	if (!TestNotNull(TEXT("Keeper spawned"), Keeper)) return false;

	bool bWithinBudget = true;
	bool bOnePerSlot = true;
	for (int32 Frame = 0; Frame < 12; ++Frame)
	{
		TestWorld.Tick(1, 0.4f);

		const TArray<ADojoM4Bomb*> Bombs = AllBombs(TestWorld);
		if (Keeper->GetLive() > 3 || Bombs.Num() > 3 || Keeper->GetLive() != Bombs.Num()) bWithinBudget = false;

		for (int32 First = 0; First < Bombs.Num(); ++First)
		{
			for (int32 Second = First + 1; Second < Bombs.Num(); ++Second)
			{
				if (Bombs[First]->GetActorLocation().Equals(Bombs[Second]->GetActorLocation(), 1.0)) bOnePerSlot = false;
			}
		}
	}

	TestTrue(TEXT("With 0.4 second frames, never more than three bombs, and the live count is always exact"), bWithinBudget);
	TestTrue(TEXT("No two bombs ever share a slot"), bOnePerSlot);
	TestTrue(TEXT("and the keeper kept refilling"), Keeper->GetMade() > 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_Keeper_StopAndNoClass, "Dojo.M4.Keeper.StopAndNoClass", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Stops a keeper after two refills and checks nothing more is made, and that a keeper without a class makes nothing. */
bool FDojo_M4_Keeper_StopAndNoClass::RunTest(const FString& Parameters)
{
	using namespace DojoM4KeeperTest;

	FDojoTestWorld TestWorld;

	ADojoM4Keeper* Keeper = PlaceKeeper(TestWorld, FVector(0.0, 10000.0, 0.0), true);
	ADojoM4Keeper* Empty = PlaceKeeper(TestWorld, FVector(0.0, 12000.0, 0.0), false);
	if (!TestNotNull(TEXT("Keepers spawned"), Keeper) || !Empty) return false;

	TestWorld.Tick(33);
	TestEqual(TEXT("Two refills in a little over half a second"), Keeper->GetMade(), 2);

	Keeper->Stop();
	TestWorld.Tick(180);
	TestEqual(TEXT("A stopped keeper makes no more"), Keeper->GetMade(), 2);
	TestEqual(TEXT("and once its bombs have blown, none are left"), Keeper->GetLive(), 0);

	TestEqual(TEXT("A keeper without a class makes nothing"), Empty->GetMade(), 0);
	TestEqual(TEXT("and has nothing in play"), Empty->GetLive(), 0);

	return true;
}

#endif
```

# Hints

- Three pieces of state are enough: which bomb, if any, stands in each slot; how many have been made; and the handle of the refill timer. The live count follows from the slots.
- The refill is a looping timer whose first call comes on the next frame. Each refill spawns deferred so the bomb begins play lit, and listens for that bomb leaving so its slot can be emptied.
- `SetTimer` with a first delay of 0, `SpawnActorDeferred` and `FinishSpawning`, `OnDestroyed.AddDynamic`, and `ClearTimer` cover it; `GetActorRightVector` gives the slots' direction.

# Rubric

- A looping timer refills every `RefillSeconds`, the first time on the next frame; the keeper never ticks.
- A refill spawns only when a slot is free and a class is set, into the lowest free slot, deferred so the bomb is lit from its first frame.
- Each bomb's `OnDestroyed` frees exactly its own slot, so the live count is exact at every moment and never above `MaxLive`.
- `Stop` and `EndPlay` clear the refill timer, and `EndPlay` unbinds from the bombs still in play.
- Header and source follow the conventions of the earlier pieces: forward declarations, `TObjectPtr` in a `UPROPERTY` array, `UFUNCTION` on the handler, and a comment above every function.
- The keeper holds and listens to its bombs; the bombs know nothing about the keeper.

# Alternative

The keeper could count live bombs with a number, adding one at each spawn and taking one away in `OnDestroyed`, and spawn every new bomb at the same spot. That is shorter, but a spot can still be occupied by a bomb that has not blown, which needs either a spawn that refuses blocked spots and a count that knows it, or bombs standing inside each other. Slots make the place part of the budget. The step after this is a pool: keep the three bombs, hide and reset them instead of destroying, and light them again, which the patterns pack's Object Pool world covers.
