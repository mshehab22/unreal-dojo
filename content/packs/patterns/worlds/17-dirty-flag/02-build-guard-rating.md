---
id: p17-guard-rating
title: A guard rating that works itself out only when it must
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [dirty-flag]
skills: [dirty-flag, components]
terms: [actor-component, mutable-member, tmap, tarray]
prerequisites: [p17-recompute-every-frame]
xp: 60
estimatedMinutes: 20
concepts:
  - The guard rating is derived from the base guard, the worn items, and the buffs
  - Every function that changes a part flips one note, and none of them works the rating out
  - The reading function works the rating out only when the note is set, then stores it and clears the note
  - A change that changes nothing leaves the note alone
---

# Brief

When you press Play with the setup below, a fighter with base guard 30, a helm worth 5, a plate worth 15, and a buff worth 10 reads 60 for its guard, and reading it ten more times does not work the sum out again.

`UDojoP17GuardStats` is a component a fighter carries. Its guard rating is the base guard plus the bonus of every worn item plus every buff, and never below 0. The screen, the damage code, and the enemy all read it, and its parts change rarely. The component keeps the last answer in `CachedGuard` and a note, `bGuardDirty`, that says a part has changed since that answer was worked out. Both are `mutable`, so that the reading function can stay `const`. `GetRecomputeCount` says how many times the rating has been worked out from its parts.

Most of the code is written. Every function that changes a part is given, and each one sets the note when, and only when, it really changed something. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `GetGuard`. When the note is set, it works the rating out from the base guard, the worn items, and the buffs, never below 0, stores it, counts the work, and clears the note. Whatever the note says, it returns the stored rating.

## See it in the editor

Make an actor Blueprint, BP_Fighter, with the parent class Actor, add the component Dojo P17 Guard Stats in its Components panel, and drag BP_Fighter into the level. On Begin Play, call Equip with Item Helm and Bonus 5, Equip with Item Plate and Bonus 15, and Add Buff with Amount 10. Then, in a loop of ten, print Get Guard: 60 each time. After the loop, print Get Recompute Count: 1. Call Unequip with Item Helm, print Get Guard (55), and print Get Recompute Count again: 2.

# Files

## DojoP17GuardBuff.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP17GuardBuff.generated.h"

/** One temporary bonus to a fighter's guard, named by an id so it can be removed later. */
USTRUCT(BlueprintType)
struct FDojoP17GuardBuff
{
	GENERATED_BODY()

	/** The id the buff was given when it was added; never reused. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Buff")
	int32 BuffId = 0;

	/** How much guard the buff adds. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Buff")
	int32 Amount = 0;
};
```

## DojoP17GuardStats.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoP17GuardBuff.h"
#include "DojoP17GuardStats.generated.h"

/** A fighter's guard rating: base guard plus worn gear plus temporary buffs, worked out only when it is asked for after a change. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoP17GuardStats : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	UDojoP17GuardStats();

	/** Sets the base guard; nothing else changes when the value is the same. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void SetBaseGuard(int32 NewBase);

	/** Wears Item for Bonus guard, replacing the bonus it had; returns false when nothing changed. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool Equip(FName Item, int32 Bonus);

	/** Takes Item off; returns false when it was not worn. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool Unequip(FName Item);

	/** Adds a temporary bonus and returns the id that removes it again; ids start at 1. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	int32 AddBuff(int32 Amount);

	/** Removes the buff with BuffId; returns false when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	bool RemoveBuff(int32 BuffId);

	/** Removes every buff. */
	UFUNCTION(BlueprintCallable, Category = "Guard")
	void ClearBuffs();

	/** The guard rating now: base plus gear plus buffs, never below 0. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetGuard() const;

	/** The base guard. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetBaseGuard() const;

	/** How many times the rating has been worked out from its parts. */
	UFUNCTION(BlueprintPure, Category = "Guard")
	int32 GetRecomputeCount() const;

private:
	/** The guard before gear and buffs. */
	UPROPERTY()
	int32 BaseGuard = 30;

	/** The bonus of each worn item. */
	UPROPERTY()
	TMap<FName, int32> Equipment;

	/** The temporary bonuses. */
	UPROPERTY()
	TArray<FDojoP17GuardBuff> Buffs;

	/** The id the next buff gets. */
	int32 NextBuffId = 1;

	/** The last rating worked out; only trusted while the guard is not marked dirty. */
	mutable int32 CachedGuard = 0; // @explain: These three are mutable so the const reading function can refresh the cache and count the work; the stored guard is not part of what a caller can see change.

	/** True when a part has changed since CachedGuard was worked out. */
	mutable bool bGuardDirty = true; // @explain: It starts true because nothing has been worked out yet, so the first read always computes.

	/** Times the rating has been worked out. */
	mutable int32 RecomputeCount = 0;
};
```

## DojoP17GuardStats.cpp

```cpp
#include "DojoP17GuardStats.h"

UDojoP17GuardStats::UDojoP17GuardStats()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UDojoP17GuardStats::SetBaseGuard(int32 NewBase)
{
	if (NewBase == BaseGuard) return;

	BaseGuard = NewBase;
	bGuardDirty = true; // @explain: Every function that changes a part of the rating sets this flag; none works the rating out itself.
}

bool UDojoP17GuardStats::Equip(FName Item, int32 Bonus)
{
	const int32* Worn = Equipment.Find(Item);
	if (Worn != nullptr && *Worn == Bonus) return false;

	Equipment.Add(Item, Bonus);
	bGuardDirty = true;
	return true;
}

bool UDojoP17GuardStats::Unequip(FName Item)
{
	if (Equipment.Remove(Item) == 0) return false;

	bGuardDirty = true;
	return true;
}

int32 UDojoP17GuardStats::AddBuff(int32 Amount)
{
	FDojoP17GuardBuff Buff;
	Buff.BuffId = NextBuffId++;
	Buff.Amount = Amount;
	Buffs.Add(Buff);

	bGuardDirty = true;
	return Buff.BuffId;
}

bool UDojoP17GuardStats::RemoveBuff(int32 BuffId)
{
	const int32 Index = Buffs.IndexOfByPredicate([BuffId](const FDojoP17GuardBuff& Candidate) { return Candidate.BuffId == BuffId; });
	if (Index == INDEX_NONE) return false;

	Buffs.RemoveAt(Index);
	bGuardDirty = true;
	return true;
}

void UDojoP17GuardStats::ClearBuffs()
{
	if (Buffs.IsEmpty()) return;

	Buffs.Reset();
	bGuardDirty = true;
}

int32 UDojoP17GuardStats::GetGuard() const
{
	return 0;
}

int32 UDojoP17GuardStats::GetBaseGuard() const
{
	return BaseGuard;
}

int32 UDojoP17GuardStats::GetRecomputeCount() const
{
	return RecomputeCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p17-guard-rating/DojoP17GuardStats.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoP17GuardTest
{
	/** Puts a guard stats component on a bare actor in the test world and returns it. */
	UDojoP17GuardStats* MakeGuard(FDojoTestWorld& TestWorld)
	{
		ADojoTestActor* Host = TestWorld.SpawnActor<ADojoTestActor>();
		return Host ? TestWorld.AddComponent<UDojoP17GuardStats>(Host) : nullptr;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_GuardRating_PartsAddUp, "Dojo.P17.GuardRating.PartsAddUp", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The rating is the base plus the worn items plus the buffs, and never below zero. */
bool FDojo_P17_GuardRating_PartsAddUp::RunTest(const FString& Parameters)
{
	using namespace DojoP17GuardTest;

	FDojoTestWorld TestWorld;

	UDojoP17GuardStats* Guard = MakeGuard(TestWorld);
	if (!TestNotNull(TEXT("Guard stats made"), Guard)) return false;

	TestEqual(TEXT("A new fighter has the base guard of 30"), Guard->GetGuard(), 30);

	Guard->Equip(TEXT("Helm"), 5);
	Guard->Equip(TEXT("Plate"), 15);
	const int32 OilId = Guard->AddBuff(10);
	TestEqual(TEXT("30 plus 5 plus 15 plus 10"), Guard->GetGuard(), 60);

	TestTrue(TEXT("The helm comes off"), Guard->Unequip(TEXT("Helm")));
	TestEqual(TEXT("Without the helm"), Guard->GetGuard(), 55);

	TestTrue(TEXT("The buff is removed by its id"), Guard->RemoveBuff(OilId));
	TestEqual(TEXT("Without the buff"), Guard->GetGuard(), 45);

	Guard->Equip(TEXT("Plate"), 20);
	TestEqual(TEXT("Wearing the same item again replaces its bonus"), Guard->GetGuard(), 50);

	Guard->AddBuff(7);
	Guard->AddBuff(7);
	Guard->ClearBuffs();
	Guard->SetBaseGuard(10);
	TestEqual(TEXT("A new base, the plate, and no buffs"), Guard->GetGuard(), 30);

	Guard->SetBaseGuard(-100);
	TestEqual(TEXT("The rating never goes below zero"), Guard->GetGuard(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_GuardRating_ManyChangesOneSum, "Dojo.P17.GuardRating.ManyChangesOneSum", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ten changes before a read cost one sum, and reads with no change cost none. */
bool FDojo_P17_GuardRating_ManyChangesOneSum::RunTest(const FString& Parameters)
{
	using namespace DojoP17GuardTest;

	FDojoTestWorld TestWorld;

	UDojoP17GuardStats* Guard = MakeGuard(TestWorld);
	if (!TestNotNull(TEXT("Guard stats made"), Guard)) return false;

	TestEqual(TEXT("Nothing has been worked out yet"), Guard->GetRecomputeCount(), 0);

	for (int32 Step = 1; Step <= 5; Step++)
	{
		Guard->SetBaseGuard(30 + Step);
		Guard->AddBuff(1);
	}

	TestEqual(TEXT("Ten changes have not worked anything out"), Guard->GetRecomputeCount(), 0);
	TestEqual(TEXT("The rating is 35 plus five buffs of 1"), Guard->GetGuard(), 40);
	TestEqual(TEXT("The first read worked it out once"), Guard->GetRecomputeCount(), 1);

	for (int32 Read = 0; Read < 10; Read++) Guard->GetGuard();
	TestEqual(TEXT("Ten more reads with no change worked nothing out"), Guard->GetRecomputeCount(), 1);

	Guard->Equip(TEXT("Helm"), 5);
	TestEqual(TEXT("A change shows up in the next read"), Guard->GetGuard(), 45);
	TestEqual(TEXT("And costs exactly one more sum"), Guard->GetRecomputeCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_GuardRating_ChangesThatChangeNothing, "Dojo.P17.GuardRating.ChangesThatChangeNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A change that changes nothing leaves the rating alone: no sum is worked out again. */
bool FDojo_P17_GuardRating_ChangesThatChangeNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP17GuardTest;

	FDojoTestWorld TestWorld;

	UDojoP17GuardStats* Guard = MakeGuard(TestWorld);
	if (!TestNotNull(TEXT("Guard stats made"), Guard)) return false;

	Guard->Equip(TEXT("Helm"), 5);
	TestEqual(TEXT("The helm raises the guard to 35"), Guard->GetGuard(), 35);
	TestEqual(TEXT("One sum so far"), Guard->GetRecomputeCount(), 1);

	Guard->SetBaseGuard(30);
	TestFalse(TEXT("Wearing the helm again at the same bonus changes nothing"), Guard->Equip(TEXT("Helm"), 5));
	TestFalse(TEXT("Taking off an item that is not worn changes nothing"), Guard->Unequip(TEXT("Cloak")));
	TestFalse(TEXT("Removing a buff that does not exist changes nothing"), Guard->RemoveBuff(99));
	Guard->ClearBuffs();

	TestEqual(TEXT("The rating is still 35"), Guard->GetGuard(), 35);
	TestEqual(TEXT("And it was not worked out again"), Guard->GetRecomputeCount(), 1);

	TestEqual(TEXT("Buff ids start at 1"), Guard->AddBuff(3), 1);
	TestEqual(TEXT("And count up"), Guard->AddBuff(3), 2);

	return true;
}

#endif
```

# Hints

- Everything `GetGuard` does besides returning the stored rating belongs inside a check of the note.
- Walk both collections of parts, add what each entry is worth, and keep the total from going below zero.
- Clear the note only after the stored answer is in place.

# Rubric

- GetGuard sums the base guard, every worn item's bonus, and every buff's amount, and never returns below 0.
- It works the sum out only when the note says a part has changed, and it clears the note afterwards.
- Each time it works the sum out it counts it once, so ten changes then one read count one.
- It returns the stored rating on every read, including reads that find the note already clear.
- It changes no part of the fighter, only the mutable cache, the note, and the count.

# Alternative

A running total would avoid the note altogether: add an item's bonus when it is worn and subtract it when it comes off. That is simpler and cheaper here, and it is the better choice whenever each change can be applied to the total directly. The note earns its place when a change cannot be applied that way, for example a rating that is the best three of a list, or one that depends on several parts at once, so the only safe answer after a change is to work it out again from scratch.

# Parsons

```yaml
- id: unequip
  prompt: Put Unequip in order.
  lines:
    - "bool UDojoP17GuardStats::Unequip(FName Item)"
    - "{"
    - "	if (Equipment.Remove(Item) == 0) return false;"
    - "	bGuardDirty = true;"
    - "	return true;"
    - "}"
  distractors:
    - line: "	CachedGuard = 0;"
      mistake: Zeroing the stored answer does not tell GetGuard it is out of date; the note does, and a stored 0 would also be read back as a real rating.
```
