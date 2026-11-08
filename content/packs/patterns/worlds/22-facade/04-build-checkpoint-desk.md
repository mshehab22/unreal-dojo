---
id: p22-checkpoint-desk
title: Checkpoints without slots or bytes
order: 4
kind: build
scaffold: stub
difficulty: 4
patterns: [facade]
skills: [facade, saving]
terms: [savegame, save-game-to-memory, world-subsystem, game-instance-subsystem]
prerequisites: [p22-facade-card, p22-hit-feedback]
xp: 90
estimatedMinutes: 30
concepts:
  - A checkpoint desk is a facade over USaveGame objects, the bytes they become, and the slots that keep them
  - Callers save and load with a gate, a spot, and a health, and never see a save object or a byte
  - The desk keeps only the three newest checkpoints in memory, overwriting the oldest
  - LoadLatest gives the newest checkpoint kept and LoadBack the ones before it, however many were ever saved
  - Callers depend on the desk; the save object knows nothing about it
---

# Brief

When you press Play, a gate that saves a checkpoint and a pit that loads one never touch a save object: they call `SaveCheckpoint` and `LoadLatest` on the checkpoint desk, and the desk always hands back the newest checkpoint it keeps.

Saving in Unreal takes several steps. `UGameplayStatics::CreateSaveGameObject` makes a `USaveGame` of your class, you fill its UPROPERTY fields, and `UGameplayStatics::SaveGameToMemory` turns it into a `TArray<uint8>` (or `SaveGameToSlot` writes it to disk). Loading reverses it: `LoadGameFromMemory` makes a new object from the bytes, and you cast it to your class. `UDojoP22CheckpointDesk` is a facade over all of that: a world subsystem with five calls, and a `UDojoP22CheckpointSave` behind it that the callers never see.

The desk keeps the three newest checkpoints as bytes, one per slot; a fourth save overwrites the oldest. Written for you: `SaveCheckpoint`, which makes, fills, and writes a save into the next slot, and `ClearCheckpoints`. Write the rest:

- `GetCheckpointCount`: how many checkpoints are kept now, never more than three.
- `LoadBack(StepsBack, ...)`: the checkpoint `StepsBack` saves before the newest kept one, 0 being the newest. It reads the slot's bytes back into a save object and copies out its gate, spot, and health. When that checkpoint is not kept, or `StepsBack` is negative, it returns false and leaves the outputs as they were.
- `LoadLatest(...)`: the newest checkpoint kept, the same way.

Callers depend on the desk; `UDojoP22CheckpointSave` knows nothing about it. You may add private members.

## See it in the editor

In the Level Blueprint, on Begin Play, get the Dojo P22 Checkpoint Desk subsystem and call Save Checkpoint three times, with the gates G1, G2, and G3 and any spots and health. Then call Load Latest and print its gate: G3. Call Load Back with 2 and print its gate: G1. Call Load Back with 3: it returns false, because only three are kept. Print Get Checkpoint Count: 3.

# Files

## DojoP22CheckpointSave.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DojoP22CheckpointSave.generated.h"

/** What one checkpoint remembers: the gate, the spot, and the runner's health. */
UCLASS()
class UDojoP22CheckpointSave : public USaveGame
{
	GENERATED_BODY()

public:
	/** The gate the checkpoint belongs to. */
	UPROPERTY()
	FName Gate;

	/** Where the runner comes back. */
	UPROPERTY()
	FVector Where = FVector::ZeroVector;

	/** The runner's health when it was saved. */
	UPROPERTY()
	int32 Health = 0;
};
```

## DojoP22CheckpointDesk.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoP22CheckpointDesk.generated.h"

/**
 * One front for checkpoints: save one, load the newest, or step back, without knowing about save objects, bytes, or slots.
 * Keeps the three newest in memory, overwriting the oldest.
 * Callers depend on the desk; the save object knows nothing about it.
 */
UCLASS()
class UDojoP22CheckpointDesk : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** How many checkpoints the desk keeps. */
	static constexpr int32 SlotCount = 3;

	/** Saves a checkpoint at Gate with the runner at Where and its Health, overwriting the oldest when all slots are full. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoints")
	void SaveCheckpoint(FName Gate, FVector Where, int32 Health);

	/** The newest checkpoint kept; false, with the outputs untouched, when none is kept. */
	UFUNCTION(BlueprintCallable, BlueprintPure = false, Category = "Checkpoints")
	bool LoadLatest(FName& OutGate, FVector& OutWhere, int32& OutHealth) const;

	/** The checkpoint StepsBack before the newest (0 is the newest); false, with the outputs untouched, when it is not kept. */
	UFUNCTION(BlueprintCallable, BlueprintPure = false, Category = "Checkpoints")
	bool LoadBack(int32 StepsBack, FName& OutGate, FVector& OutWhere, int32& OutHealth) const;

	/** How many checkpoints are kept now, at most SlotCount. */
	UFUNCTION(BlueprintPure, Category = "Checkpoints")
	int32 GetCheckpointCount() const;

	/** Forgets every checkpoint. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoints")
	void ClearCheckpoints();

private:
	/** Each kept checkpoint as the bytes UGameplayStatics::SaveGameToMemory wrote, by slot. */
	TArray<TArray<uint8>> Slots;

	/** The slot the next save writes. */
	int32 NextSlot = 0;

	/** Checkpoints saved since the last clear. */
	int32 SavedCount = 0;
};
```

## DojoP22CheckpointDesk.cpp

```cpp
#include "DojoP22CheckpointDesk.h"

#include "DojoP22CheckpointSave.h"
#include "Kismet/GameplayStatics.h"

void UDojoP22CheckpointDesk::SaveCheckpoint(FName Gate, FVector Where, int32 Health)
{
	UDojoP22CheckpointSave* Save = Cast<UDojoP22CheckpointSave>(UGameplayStatics::CreateSaveGameObject(UDojoP22CheckpointSave::StaticClass()));
	if (!Save) return;

	Save->Gate = Gate;
	Save->Where = Where;
	Save->Health = Health;

	Slots.SetNum(SlotCount);
	Slots[NextSlot].Reset();
	UGameplayStatics::SaveGameToMemory(Save, Slots[NextSlot]);
	NextSlot = (NextSlot + 1) % SlotCount;
	++SavedCount;
}

bool UDojoP22CheckpointDesk::LoadLatest(FName& OutGate, FVector& OutWhere, int32& OutHealth) const
{
	return false;
}

bool UDojoP22CheckpointDesk::LoadBack(int32 StepsBack, FName& OutGate, FVector& OutWhere, int32& OutHealth) const
{
	return false;
}

int32 UDojoP22CheckpointDesk::GetCheckpointCount() const
{
	return 0;
}

void UDojoP22CheckpointDesk::ClearCheckpoints()
{
	Slots.Reset();
	NextSlot = 0;
	SavedCount = 0;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p22-checkpoint-desk/DojoP22CheckpointDesk.h"
#include "Support/DojoTestWorld.h"

namespace DojoP22CheckpointDeskTest
{
	/** Saves the checkpoint numbered Number: gate GNumber, at (Number * 100, 0, 0), with Number * 10 health. */
	void SaveNumbered(UDojoP22CheckpointDesk* Desk, int32 Number)
	{
		Desk->SaveCheckpoint(FName(*FString::Printf(TEXT("G%d"), Number)), FVector(Number * 100.0, 0.0, 0.0), Number * 10);
	}

	/** Checks that StepsBack before the newest is checkpoint Number, or that nothing is there when Number is 0; false when it is not. */
	bool ExpectBack(FAutomationTestBase& Test, const UDojoP22CheckpointDesk* Desk, int32 StepsBack, int32 Number, const FString& When)
	{
		FName Gate = TEXT("Untouched");
		FVector Where(-1.0, -1.0, -1.0);
		int32 Health = -1;
		const bool bFound = StepsBack == 0 ? Desk->LoadLatest(Gate, Where, Health) : Desk->LoadBack(StepsBack, Gate, Where, Health);

		if (Number == 0)
		{
			const bool bUntouched = Gate == FName(TEXT("Untouched")) && Health == -1;
			return Test.TestFalse(When + FString::Printf(TEXT(": nothing is kept %d back"), StepsBack), bFound) && Test.TestTrue(When + TEXT(": and the outputs are untouched"), bUntouched);
		}

		const FName Expected(*FString::Printf(TEXT("G%d"), Number));
		const bool bRight = bFound && Gate == Expected && Where.Equals(FVector(Number * 100.0, 0.0, 0.0), 0.01) && Health == Number * 10;
		return Test.TestTrue(When + FString::Printf(TEXT(": %d back is checkpoint G%d (found %s)"), StepsBack, Number, bFound ? *Gate.ToString() : TEXT("nothing")), bRight);
	}

	/** The world's checkpoint desk. */
	UDojoP22CheckpointDesk* DeskOf(FDojoTestWorld& TestWorld)
	{
		return TestWorld.GetWorld()->GetSubsystem<UDojoP22CheckpointDesk>();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_CheckpointDesk_SavesAndLoads, "Dojo.P22.CheckpointDesk.SavesAndLoads", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** An empty desk has nothing to load, and one saved checkpoint comes back exactly. */
bool FDojo_P22_CheckpointDesk_SavesAndLoads::RunTest(const FString& Parameters)
{
	using namespace DojoP22CheckpointDeskTest;

	FDojoTestWorld TestWorld;
	UDojoP22CheckpointDesk* Desk = DeskOf(TestWorld);
	if (!TestNotNull(TEXT("The world has the checkpoint desk"), Desk)) return false;

	TestEqual(TEXT("An empty desk keeps nothing"), Desk->GetCheckpointCount(), 0);
	ExpectBack(*this, Desk, 0, 0, TEXT("Empty"));

	SaveNumbered(Desk, 1);
	TestEqual(TEXT("One saved, one kept"), Desk->GetCheckpointCount(), 1);
	ExpectBack(*this, Desk, 0, 1, TEXT("After one save"));
	ExpectBack(*this, Desk, 1, 0, TEXT("After one save"));
	ExpectBack(*this, Desk, -1, 0, TEXT("Asking for -1 back"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_CheckpointDesk_NewestFirst, "Dojo.P22.CheckpointDesk.NewestFirst", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With two and three saved, the newest comes first and each step back is the one saved before it. */
bool FDojo_P22_CheckpointDesk_NewestFirst::RunTest(const FString& Parameters)
{
	using namespace DojoP22CheckpointDeskTest;

	FDojoTestWorld TestWorld;
	UDojoP22CheckpointDesk* Desk = DeskOf(TestWorld);
	if (!TestNotNull(TEXT("The world has the checkpoint desk"), Desk)) return false;

	SaveNumbered(Desk, 1);
	SaveNumbered(Desk, 2);
	TestEqual(TEXT("Two saved, two kept"), Desk->GetCheckpointCount(), 2);
	ExpectBack(*this, Desk, 0, 2, TEXT("After two saves"));
	ExpectBack(*this, Desk, 1, 1, TEXT("After two saves"));
	ExpectBack(*this, Desk, 2, 0, TEXT("After two saves"));

	SaveNumbered(Desk, 3);
	TestEqual(TEXT("Three saved, three kept"), Desk->GetCheckpointCount(), 3);
	ExpectBack(*this, Desk, 0, 3, TEXT("After three saves"));
	ExpectBack(*this, Desk, 2, 1, TEXT("After three saves"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_CheckpointDesk_KeepsTheThreeNewest, "Dojo.P22.CheckpointDesk.KeepsTheThreeNewest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After four and five saves the desk keeps the three newest, the newest first, and the oldest are gone. */
bool FDojo_P22_CheckpointDesk_KeepsTheThreeNewest::RunTest(const FString& Parameters)
{
	using namespace DojoP22CheckpointDeskTest;

	FDojoTestWorld TestWorld;
	UDojoP22CheckpointDesk* Desk = DeskOf(TestWorld);
	if (!TestNotNull(TEXT("The world has the checkpoint desk"), Desk)) return false;

	for (int32 Number = 1; Number <= 4; ++Number) SaveNumbered(Desk, Number);
	TestEqual(TEXT("Four saved, three kept"), Desk->GetCheckpointCount(), 3);
	ExpectBack(*this, Desk, 0, 4, TEXT("After four saves"));
	ExpectBack(*this, Desk, 1, 3, TEXT("After four saves"));
	ExpectBack(*this, Desk, 2, 2, TEXT("After four saves"));
	ExpectBack(*this, Desk, 3, 0, TEXT("After four saves"));

	SaveNumbered(Desk, 5);
	ExpectBack(*this, Desk, 0, 5, TEXT("After five saves"));
	ExpectBack(*this, Desk, 1, 4, TEXT("After five saves"));
	ExpectBack(*this, Desk, 2, 3, TEXT("After five saves"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P22_CheckpointDesk_ClearForgetsAll, "Dojo.P22.CheckpointDesk.ClearForgetsAll", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Clearing forgets every checkpoint, and the next save is the only one kept. */
bool FDojo_P22_CheckpointDesk_ClearForgetsAll::RunTest(const FString& Parameters)
{
	using namespace DojoP22CheckpointDeskTest;

	FDojoTestWorld TestWorld;
	UDojoP22CheckpointDesk* Desk = DeskOf(TestWorld);
	if (!TestNotNull(TEXT("The world has the checkpoint desk"), Desk)) return false;

	SaveNumbered(Desk, 1);
	SaveNumbered(Desk, 2);
	Desk->ClearCheckpoints();
	TestEqual(TEXT("A cleared desk keeps nothing"), Desk->GetCheckpointCount(), 0);
	ExpectBack(*this, Desk, 0, 0, TEXT("After clearing"));

	SaveNumbered(Desk, 9);
	TestEqual(TEXT("One saved after clearing, one kept"), Desk->GetCheckpointCount(), 1);
	ExpectBack(*this, Desk, 0, 9, TEXT("After clearing and one save"));
	ExpectBack(*this, Desk, 1, 0, TEXT("After clearing and one save"));

	return true;
}

#endif
```

# Hints

- Three of the four tests pass with a simple answer and one fails. How many checkpoints had been saved in the test that fails, and what did the fourth save do to the slots?
- After four saves, which slot holds the newest checkpoint, and which holds the oldest one still kept? Is the newest still in the last slot?
- `SaveCheckpoint` already knows which slot it will write next. How many slots back from that one is the newest, and how do you step back past slot 0?

# Rubric

- GetCheckpointCount is the number of checkpoints kept, at most three, and 0 after clearing.
- LoadLatest hands back the newest checkpoint kept, however many were ever saved.
- LoadBack hands back the checkpoint StepsBack saves before the newest, and false for one that is not kept or a negative StepsBack, leaving the outputs untouched.
- Every checkpoint comes back exactly: its gate, its spot, and its health, read back from the bytes the desk wrote.
- Callers never see a save object, a slot, or a byte; they call the desk's five functions.
- Callers depend on the desk; the save object knows nothing about it.

# Alternative

Keeping the save objects themselves in a UPROPERTY array would skip the bytes, but then a checkpoint is a live object that any caller holding it could change after it was saved; bytes are a snapshot, and they are what a slot on disk or a message over the network would carry anyway. Keeping the checkpoints in a plain list and removing the first when a fourth arrives is simpler than slots and fine for three. A `UGameInstanceSubsystem` with `SaveGameToSlot` would make checkpoints outlive a level load and the session; this desk is per world on purpose, because a gauntlet's checkpoints belong to its run.

# Parsons

```yaml
- id: save-checkpoint
  prompt: Put SaveCheckpoint in order. It makes the save object first, fills Gate, then Where, then Health, sizes the slots just before writing one, and moves to the next slot before counting the save.
  lines:
    - "void UDojoP22CheckpointDesk::SaveCheckpoint(FName Gate, FVector Where, int32 Health)"
    - "{"
    - "	UDojoP22CheckpointSave* Save = Cast<UDojoP22CheckpointSave>(UGameplayStatics::CreateSaveGameObject(UDojoP22CheckpointSave::StaticClass()));"
    - "	if (!Save) return;"
    - "	Save->Gate = Gate;"
    - "	Save->Where = Where;"
    - "	Save->Health = Health;"
    - "	Slots.SetNum(SlotCount);"
    - "	Slots[NextSlot].Reset();"
    - "	UGameplayStatics::SaveGameToMemory(Save, Slots[NextSlot]);"
    - "	NextSlot = (NextSlot + 1) % SlotCount;"
    - "	++SavedCount;"
    - "}"
  distractors:
    - line: "	UGameplayStatics::SaveGameToSlot(Save, TEXT(\"Checkpoint\"), 0);"
      mistake: That writes one slot on disk that every save overwrites, so the desk would keep one checkpoint instead of three, and the slots in memory that LoadBack reads would stay empty.
```
