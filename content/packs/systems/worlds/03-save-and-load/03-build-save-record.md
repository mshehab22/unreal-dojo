---
id: s3-save-record
title: A save record written to a slot
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [saving, data, containers]
terms: [savegame, tmap, fname, ustruct, uproperty]
prerequisites: [s3-save-games, p1-observer-when-not]
xp: 60
estimatedMinutes: 15
concepts:
  - One save object that holds each saveable actor's state by its id
  - Ids of actors that are gone, kept once each and holding no state
  - A record that survives the round trip through memory and through a slot
---

# Brief

When you store the bytes `1 2 3` for `Coin1`, mark `Coin2` gone twice, and write the record to a slot, a record loaded back from that slot finds `1 2 3` under `Coin1`, nothing under `Coin2`, and lists `Coin2` as gone exactly once.

Most of the code is written for you. Explain the marked lines, then fill the two gaps:

1. `UDojoS3SaveRecord::FindActor`: the record stored under an id, or null when there is none. An id of `None` never finds anything.
2. `UDojoS3SaveRecord::MarkGone`: list the id as gone, once however many times it is called, and drop any state stored for it, since a gone actor has nothing to put back. An id of `None` is ignored.

Dependency direction: the record is plain data. It knows nothing about actors, components, or slots; whoever saves fills it, and whoever loads reads it.

This is the first piece of the Vault Checkpoint boss.

## See it in the editor

In the level Blueprint, on the 1 key, call Create Save Game Object with `DojoS3SaveRecord`, then Save Game to Slot with the slot name `Vault` and user index 0, and print Does Save Game Exist for `Vault`. On the 2 key call Delete Game in Slot with `Vault` and print Does Save Game Exist again. Press Play and press 1: it prints true, and the project's `Saved/SaveGames` folder now holds `Vault.sav`. Press 2: it prints false and the file is gone.

# Files

## DojoS3SaveRecord.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "DojoS3SaveRecord.generated.h"

/** The saved state of one actor: its SaveGame properties, written out as bytes. */
USTRUCT(BlueprintType)
struct FDojoS3ActorRecord
{
	GENERATED_BODY()

	/** The actor's SaveGame properties, as the saveable component wrote them. */
	UPROPERTY()
	TArray<uint8> Bytes; // @explain: The record does not need to know what an actor saves; bytes let a door, a coin, and a runner share one record format.
};

/** One checkpoint: the state of every saveable actor by its id, and the ids of the ones the world has lost. It is plain data and makes no decisions. */
UCLASS()
class UDojoS3SaveRecord : public USaveGame // @explain: Deriving from USaveGame is what lets SaveGameToSlot write this object to a file and LoadGameFromSlot build it again, with every UPROPERTY on it.
{
	GENERATED_BODY()

public:
	/** Each saveable actor's state, by its save id. */
	UPROPERTY()
	TMap<FName, FDojoS3ActorRecord> Actors; // @explain: States are keyed by a name the level designer sets, because a saved pointer is looked up by the actor's path, which may name nothing or the wrong copy in a later session, while the same name finds the same actor in the level being played.

	/** Save ids of actors that were removed, such as coins that were picked up. */
	UPROPERTY()
	TArray<FName> GoneIds;

	/** Stores an actor's bytes under its id, replacing what was there; an id of None is ignored. */
	void StoreActor(FName SaveId, const TArray<uint8>& Bytes);

	/** The record stored under this id, or null when there is none. */
	const FDojoS3ActorRecord* FindActor(FName SaveId) const;

	/** Notes that the actor with this id is gone: it is listed once, and any state stored for it is dropped. */
	void MarkGone(FName SaveId);

	/** True when this id was marked gone. */
	bool IsGone(FName SaveId) const;
};
```

## DojoS3SaveRecord.cpp

```cpp
#include "DojoS3SaveRecord.h"

void UDojoS3SaveRecord::StoreActor(FName SaveId, const TArray<uint8>& Bytes)
{
	if (SaveId.IsNone())
	{
		return;
	}

	Actors.FindOrAdd(SaveId).Bytes = Bytes; // @explain: FindOrAdd returns the existing entry or makes an empty one, so storing twice under one id replaces the old bytes instead of adding a second entry.
}

const FDojoS3ActorRecord* UDojoS3SaveRecord::FindActor(FName SaveId) const
{
	// Your code: return the record stored under SaveId, or null when there is none. An id of None never finds anything.
	return nullptr;
}

void UDojoS3SaveRecord::MarkGone(FName SaveId)
{
	// Your code: ignore an id of None. Otherwise list the id as gone once, however many times this is called, and drop any state stored for it.
}

bool UDojoS3SaveRecord::IsGone(FName SaveId) const
{
	return GoneIds.Contains(SaveId);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Kismet/GameplayStatics.h"
#include "Quests/s3-save-record/DojoS3SaveRecord.h"

namespace DojoS3SaveRecordTest
{
	/** A record with Coin1 stored as 1 2 3, Door1 stored as 9, and Coin2 marked gone. */
	UDojoS3SaveRecord* MakeFilledRecord()
	{
		UDojoS3SaveRecord* Record = NewObject<UDojoS3SaveRecord>();
		Record->StoreActor(TEXT("Coin1"), { 1, 2, 3 });
		Record->StoreActor(TEXT("Door1"), { 9 });
		Record->MarkGone(TEXT("Coin2"));
		return Record;
	}

	/** Checks a record holds exactly what MakeFilledRecord put in it. */
	void ExpectFilled(FAutomationTestBase& Test, const UDojoS3SaveRecord* Record, const FString& Where)
	{
		const FDojoS3ActorRecord* Coin = Record->FindActor(TEXT("Coin1"));
		const FDojoS3ActorRecord* Door = Record->FindActor(TEXT("Door1"));

		Test.TestTrue(Where + TEXT(": Coin1 has its bytes"), Coin != nullptr && Coin->Bytes == TArray<uint8>({ 1, 2, 3 }));
		Test.TestTrue(Where + TEXT(": Door1 has its bytes"), Door != nullptr && Door->Bytes == TArray<uint8>({ 9 }));
		Test.TestTrue(Where + TEXT(": Coin2 is gone"), Record->IsGone(TEXT("Coin2")));
		Test.TestEqual(Where + TEXT(": one id is gone"), Record->GoneIds.Num(), 1);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveRecord_StoreFindAndGone, "Dojo.S3.SaveRecord.StoreFindAndGone", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Stores, finds, replaces, and marks ids gone, including None and repeats. */
bool FDojo_S3_SaveRecord_StoreFindAndGone::RunTest(const FString& Parameters)
{
	UDojoS3SaveRecord* Record = NewObject<UDojoS3SaveRecord>();

	Record->StoreActor(TEXT("Coin1"), { 1, 2, 3 });
	Record->StoreActor(NAME_None, { 4 });
	TestEqual(TEXT("An id of None is not stored"), Record->Actors.Num(), 1);

	const FDojoS3ActorRecord* Found = Record->FindActor(TEXT("Coin1"));
	TestTrue(TEXT("Coin1 is found with its bytes"), Found != nullptr && Found->Bytes == TArray<uint8>({ 1, 2, 3 }));
	TestNull(TEXT("An id never stored is not found"), Record->FindActor(TEXT("Coin9")));
	TestNull(TEXT("None is never found"), Record->FindActor(NAME_None));

	Record->StoreActor(TEXT("Coin1"), { 7 });
	Found = Record->FindActor(TEXT("Coin1"));
	TestTrue(TEXT("Storing again replaces the bytes"), Found != nullptr && Found->Bytes == TArray<uint8>({ 7 }));

	TestFalse(TEXT("Coin1 is not gone yet"), Record->IsGone(TEXT("Coin1")));
	Record->MarkGone(TEXT("Coin1"));
	Record->MarkGone(TEXT("Coin1"));
	TestTrue(TEXT("Coin1 is gone"), Record->IsGone(TEXT("Coin1")));
	TestEqual(TEXT("A gone id is listed once"), Record->GoneIds.Num(), 1);
	TestNull(TEXT("A gone actor keeps no state"), Record->FindActor(TEXT("Coin1")));
	TestEqual(TEXT("No state is left at all"), Record->Actors.Num(), 0);

	Record->MarkGone(NAME_None);
	TestEqual(TEXT("None is never listed as gone"), Record->GoneIds.Num(), 1);

	Record->MarkGone(TEXT("Coin3"));
	TestEqual(TEXT("An id that never had state can still be gone"), Record->GoneIds.Num(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveRecord_RoundTripInMemory, "Dojo.S3.SaveRecord.RoundTripInMemory", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Writes a filled record to bytes in memory and reads it back as a new object. */
bool FDojo_S3_SaveRecord_RoundTripInMemory::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveRecordTest;

	UDojoS3SaveRecord* Record = MakeFilledRecord();
	ExpectFilled(*this, Record, TEXT("Before saving"));

	TArray<uint8> Saved;
	TestTrue(TEXT("The record is written to memory"), UGameplayStatics::SaveGameToMemory(Record, Saved));

	UDojoS3SaveRecord* Loaded = Cast<UDojoS3SaveRecord>(UGameplayStatics::LoadGameFromMemory(Saved));
	if (!TestNotNull(TEXT("A record is read back from memory"), Loaded)) return false;

	TestTrue(TEXT("It is a new object"), Loaded != Record);
	ExpectFilled(*this, Loaded, TEXT("After memory"));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveRecord_RoundTripThroughASlot, "Dojo.S3.SaveRecord.RoundTripThroughASlot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Writes a filled record to a slot on disk, reads it back, and deletes the slot. */
bool FDojo_S3_SaveRecord_RoundTripThroughASlot::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveRecordTest;

	const FString Slot = TEXT("DojoS3RecordTest");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	TestTrue(TEXT("The record is written to the slot"), UGameplayStatics::SaveGameToSlot(MakeFilledRecord(), Slot, 0));
	TestTrue(TEXT("The slot exists"), UGameplayStatics::DoesSaveGameExist(Slot, 0));

	UDojoS3SaveRecord* Loaded = Cast<UDojoS3SaveRecord>(UGameplayStatics::LoadGameFromSlot(Slot, 0));
	if (TestNotNull(TEXT("A record is read back from the slot"), Loaded))
	{
		ExpectFilled(*this, Loaded, TEXT("After the slot"));
	}

	TestTrue(TEXT("The slot is deleted"), UGameplayStatics::DeleteGameInSlot(Slot, 0));
	TestFalse(TEXT("The slot is gone"), UGameplayStatics::DoesSaveGameExist(Slot, 0));

	return true;
}

#endif
```

# Hints

- Each gap is a few lines. `FindActor` only has to turn "no id" and "never stored" into null; `MarkGone` has to change two containers, and the order you change them in does not matter.
- `TMap::Find` returns a pointer to the value or null, and `TMap::Remove` drops a key and does nothing when it is not there. `TArray::AddUnique` adds an element only when it is not already in the array.
- `FName::IsNone` tells you an id was never set. The header `Containers/Map.h` documents `Find` and `Remove`.

# Rubric

- The record derives from `USaveGame`, keeps each actor's state by its save id, and holds no pointer to any actor.
- `FindActor` returns the stored state for a known id and null for `None` or an unknown id.
- `MarkGone` lists an id once, however often it is called, ignores `None`, and drops any state stored for that id.
- A filled record comes back the same from memory and from a slot.
- The record makes no decisions about actors or slots; it only holds data.

# Alternative

The record could hold one array per kind of saveable thing, `TArray<FDojoS3DoorState> Doors` and `TArray<FDojoS3CoinState> Coins`, each with named fields. That is easy to read in a debugger and lets you change each format on purpose, but every new kind of saveable thing means editing the record and the code that fills it. Bytes under an id keep the record the same whatever is saved, and the kinds decide their own contents. Large games often do both: a few typed fields for the player and global progress, and a keyed map for everything placed in levels.

# Parsons

```yaml
- id: record-store-actor
  prompt: Put StoreActor in order.
  lines:
    - "void UDojoS3SaveRecord::StoreActor(FName SaveId, const TArray<uint8>& Bytes)"
    - "{"
    - "	if (SaveId.IsNone())"
    - "	{"
    - "		return;"
    - "	}"
    - "	Actors.FindOrAdd(SaveId).Bytes = Bytes;"
    - "}"
  distractors:
    - line: "	Actors.Add(SaveId, Bytes);"
      mistake: The map's values are FDojoS3ActorRecord structs, not byte arrays, so this does not compile; the bytes go into the record's Bytes field.
    - line: "	Actors[SaveId].Bytes = Bytes;"
      mistake: The bracket operator asserts when the key is missing, so the first store under a new id would stop the game; FindOrAdd makes the entry.
- id: record-find-actor
  prompt: Put FindActor in order.
  lines:
    - "const FDojoS3ActorRecord* UDojoS3SaveRecord::FindActor(FName SaveId) const"
    - "{"
    - "	if (SaveId.IsNone())"
    - "	{"
    - "		return nullptr;"
    - "	}"
    - "	return Actors.Find(SaveId);"
    - "}"
  distractors:
    - line: "	return &Actors[SaveId];"
      mistake: The bracket operator asserts when the key is missing, so an unknown id would stop the game instead of returning null.
```
