---
id: s3-save-system
title: A world subsystem that saves and loads every saveable
order: 6
kind: build
scaffold: stub
difficulty: 4
patterns: [observer]
skills: [saving, subsystems, delegates]
terms: [world-subsystem, savegame, tactoriterator, findcomponentbyclass, dynamic-multicast-delegate, broadcast]
prerequisites: [s3-saveable, s3-save-record]
xp: 100
estimatedMinutes: 35
concepts:
  - One place that finds every saveable in its world and gathers or applies them by id
  - Remembering what the world has lost, so a fresh level loses it too
  - One announcement per save and per load, sent when the work is done
---

# Brief

When three lanterns are saved, one is destroyed before the save, and the checkpoint is loaded into a fresh world with all three lanterns placed again, the destroyed one leaves that world too and the other two light up as they were saved; a listener hears one notice for the save and one for the load.

Compiles against earlier quests: s3-save-record (`Quests/s3-save-record/DojoS3SaveRecord.h`) and s3-saveable (`Quests/s3-saveable/DojoS3SaveableComponent.h`, `Quests/s3-saveable/DojoS3Lantern.h`).

The class declaration is given, and so is a ready-made listener, `UDojoS3SaveSpy`. Every function body in `DojoS3SaveSystem.cpp` is yours:

- `FindSaveables` returns every saveable component in the world whose `SaveId` is set, on actors that are not being destroyed.
- `SaveToSlot` makes a `UDojoS3SaveRecord`, stores the captured state of every saveable under its id, marks the lost ids gone, writes the record to the slot with user index 0, broadcasts `OnSaved` once with the slot and the result, and returns the result. An empty slot name fails.
- `LoadFromSlot` reads the slot. A missing slot or an empty name broadcasts `OnLoaded` with false and returns false. Otherwise it destroys the owner of every saveable whose id the record marks gone, restores every other saveable the record holds state for, broadcasts `OnLoaded` with true once, after all of that, and returns true.
- Lost ids: the system remembers the save id of every saveable actor destroyed in its world while it runs, and the gone ids of every record it loads. A lost id is marked gone when saving only if no saveable with that id is in the world at that moment, so a coin laid out again is not lost.
- `Initialize` starts listening for destroyed actors with the world's `AddOnActorDestroyedHandler`, and `Deinitialize` removes that handler.

A world subsystem exists once per world and is created with it, so no actor has to be placed for saving to work; get it with `GetWorld()->GetSubsystem<UDojoS3SaveSystem>()`.

Dependency direction: the system finds saveable components and calls them; the saveables, the record, and the listeners know nothing about it beyond its two events.

This is the third piece of the Vault Checkpoint boss.

## See it in the editor

Place three `DojoS3Lantern` actors with Save Ids `Lantern1` to `Lantern3`, light the first in Details. In the level Blueprint, get the subsystem with Get Dojo S3 Save System, bind a custom event to On Loaded that prints the slot and the result, and on the 1 key call Save To Slot with `Vault`; on the 2 key destroy `Lantern2`; on the 3 key call Load From Slot with `Vault`. Press Play, press 1, change the first lantern's oil in the Details panel while playing, press 3: its oil comes back and the print shows `Vault true`. Stop, play again, and press 3 first: the checkpoint from the last session loads.

# Files

## DojoS3SaveSystem.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoS3SaveSystem.generated.h"

class AActor;
class UDojoS3SaveableComponent;

/** Broadcast after a save to a slot was written or failed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS3OnSaved, const FString&, SlotName, bool, bSucceeded);

/** Broadcast after a load from a slot finished or failed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS3OnLoaded, const FString&, SlotName, bool, bSucceeded);

/** Saves and loads every saveable actor in its world through slots: it gathers each actor's state by its save id, remembers which saveables the world has lost, and announces each save and load like the sender in the Observer pattern. */
UCLASS()
class UDojoS3SaveSystem : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Starts listening for actors leaving the world. */
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	/** Stops listening. */
	virtual void Deinitialize() override;

	/** Fires once per SaveToSlot, after the slot was written or the write failed. */
	UPROPERTY(BlueprintAssignable, Category = "Save")
	FDojoS3OnSaved OnSaved;

	/** Fires once per LoadFromSlot, after every saveable was restored or the load failed. */
	UPROPERTY(BlueprintAssignable, Category = "Save")
	FDojoS3OnLoaded OnLoaded;

	/** Writes the state of every saveable in the world, and the ids the world has lost, to the slot. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool SaveToSlot(const FString& SlotName);

	/** Reads the slot and applies it: lost saveables are removed, the others get their saved state back. */
	UFUNCTION(BlueprintCallable, Category = "Save")
	bool LoadFromSlot(const FString& SlotName);

	/** Every saveable component in the world whose save id is set. */
	UFUNCTION(BlueprintPure, Category = "Save")
	TArray<UDojoS3SaveableComponent*> FindSaveables() const;

private:
	/** Remembers the save id of a saveable actor that is leaving the world. */
	void HandleActorDestroyed(AActor* Actor);

	/** Ids of saveables this world has lost, or that a loaded save said were lost. */
	TSet<FName> LostIds;

	FDelegateHandle DestroyedHandle;
};
```

## DojoS3SaveSystem.cpp

```cpp
#include "DojoS3SaveSystem.h"

#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"
#include "Quests/s3-save-record/DojoS3SaveRecord.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"

/** Starts listening for actors leaving the world. */
void UDojoS3SaveSystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
}

/** Stops listening. */
void UDojoS3SaveSystem::Deinitialize()
{
	Super::Deinitialize();
}

/** Writes the state of every saveable in the world, and the ids the world has lost, to the slot. */
bool UDojoS3SaveSystem::SaveToSlot(const FString& SlotName)
{
	return false;
}

/** Reads the slot and applies it: lost saveables are removed, the others get their saved state back. */
bool UDojoS3SaveSystem::LoadFromSlot(const FString& SlotName)
{
	return false;
}

/** Every saveable component in the world whose save id is set. */
TArray<UDojoS3SaveableComponent*> UDojoS3SaveSystem::FindSaveables() const
{
	return TArray<UDojoS3SaveableComponent*>();
}

/** Remembers the save id of a saveable actor that is leaving the world. */
void UDojoS3SaveSystem::HandleActorDestroyed(AActor* Actor)
{
}
```

## DojoS3SaveSpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS3SaveSpy.generated.h"

class ADojoS3Lantern;
class UDojoS3SaveSystem;

/** A listener that counts a save system's notices, remembers the last slot and result of each kind, and reads one lantern when a load is announced; it only subscribes. */
UCLASS()
class UDojoS3SaveSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the system's saves and loads, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Save Spy")
	void Watch(UDojoS3SaveSystem* System);

	/** The lantern whose oil is read when a load is announced. */
	UPROPERTY()
	TObjectPtr<ADojoS3Lantern> Lantern;

	/** How many save notices arrived. */
	int32 Saves = 0;

	/** How many load notices arrived. */
	int32 Loads = 0;

	/** The slot and result of the last save notice. */
	FString LastSaveSlot;
	bool bLastSaveSucceeded = false;

	/** The slot and result of the last load notice. */
	FString LastLoadSlot;
	bool bLastLoadSucceeded = false;

	/** The watched lantern's oil when the last load notice arrived, or -1. */
	int32 OilAtLastLoad = -1;

private:
	/** Counts the save and keeps its slot and result. */
	UFUNCTION()
	void HandleSaved(const FString& SlotName, bool bSucceeded);

	/** Counts the load, keeps its slot and result, and reads the lantern. */
	UFUNCTION()
	void HandleLoaded(const FString& SlotName, bool bSucceeded);
};
```

## DojoS3SaveSpy.cpp

```cpp
#include "DojoS3SaveSpy.h"

#include "DojoS3SaveSystem.h"
#include "Quests/s3-saveable/DojoS3Lantern.h"

void UDojoS3SaveSpy::Watch(UDojoS3SaveSystem* System)
{
	if (System == nullptr)
	{
		return;
	}

	System->OnSaved.AddUniqueDynamic(this, &UDojoS3SaveSpy::HandleSaved);
	System->OnLoaded.AddUniqueDynamic(this, &UDojoS3SaveSpy::HandleLoaded);
}

void UDojoS3SaveSpy::HandleSaved(const FString& SlotName, bool bSucceeded)
{
	++Saves;
	LastSaveSlot = SlotName;
	bLastSaveSucceeded = bSucceeded;
}

void UDojoS3SaveSpy::HandleLoaded(const FString& SlotName, bool bSucceeded)
{
	++Loads;
	LastLoadSlot = SlotName;
	bLastLoadSucceeded = bSucceeded;
	OilAtLastLoad = IsValid(Lantern) ? Lantern->Oil : -1;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Kismet/GameplayStatics.h"
#include "Quests/s3-save-system/DojoS3SaveSpy.h"
#include "Quests/s3-save-system/DojoS3SaveSystem.h"
#include "Quests/s3-saveable/DojoS3Lantern.h"
#include "Quests/s3-saveable/DojoS3SaveableComponent.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS3SaveSystemTest
{
	/** Places a lantern with a save id, lit or not, with this much oil. */
	ADojoS3Lantern* Place(FDojoTestWorld& TestWorld, const TCHAR* Id, bool bLit, int32 Oil)
	{
		ADojoS3Lantern* Lantern = TestWorld.SpawnActor<ADojoS3Lantern>();
		Lantern->Saveable->SaveId = Id;
		Lantern->bLit = bLit;
		Lantern->Oil = Oil;
		return Lantern;
	}

	/** The three lanterns of the test level, as a designer placed them: none lit, 10 oil each. */
	struct FRow
	{
		ADojoS3Lantern* First = nullptr;
		ADojoS3Lantern* Second = nullptr;
		ADojoS3Lantern* Third = nullptr;
	};

	/** Places the row of three lanterns. */
	FRow PlaceRow(FDojoTestWorld& TestWorld)
	{
		FRow Row;
		Row.First = Place(TestWorld, TEXT("Lantern1"), false, 10);
		Row.Second = Place(TestWorld, TEXT("Lantern2"), false, 10);
		Row.Third = Place(TestWorld, TEXT("Lantern3"), false, 10);
		return Row;
	}

	/** The world's save system. */
	UDojoS3SaveSystem* SystemOf(FDojoTestWorld& TestWorld)
	{
		return TestWorld.GetWorld()->GetSubsystem<UDojoS3SaveSystem>();
	}

	/** True when the lantern was removed from its world. */
	bool IsGone(const ADojoS3Lantern* Lantern)
	{
		return !IsValid(Lantern) || Lantern->IsActorBeingDestroyed();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveSystem_SavesAndLoadsInOneWorld, "Dojo.S3.SaveSystem.SavesAndLoadsInOneWorld", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Saves two lanterns, changes them, loads, and checks the state, the restore hook, and one notice each, sent after the work. */
bool FDojo_S3_SaveSystem_SavesAndLoadsInOneWorld::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveSystemTest;

	const FString Slot = TEXT("DojoS3SystemOne");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld TestWorld;
		UDojoS3SaveSystem* System = SystemOf(TestWorld);
		if (!TestNotNull(TEXT("The world has a save system"), System)) return false;

		ADojoS3Lantern* First = Place(TestWorld, TEXT("Lantern1"), true, 3);
		ADojoS3Lantern* Second = Place(TestWorld, TEXT("Lantern2"), false, 8);
		ADojoS3Lantern* Nameless = Place(TestWorld, TEXT(""), true, 5);

		TStrongObjectPtr<UDojoS3SaveSpy> Spy(NewObject<UDojoS3SaveSpy>());
		Spy->Watch(System);
		Spy->Watch(System);
		Spy->Lantern = First;

		TestEqual(TEXT("Only lanterns with an id are saveable"), System->FindSaveables().Num(), 2);

		TestTrue(TEXT("The save works"), System->SaveToSlot(Slot));
		TestTrue(TEXT("The slot exists"), UGameplayStatics::DoesSaveGameExist(Slot, 0));
		TestEqual(TEXT("One save notice"), Spy->Saves, 1);
		TestTrue(TEXT("The save notice names the slot and success"), Spy->LastSaveSlot == Slot && Spy->bLastSaveSucceeded);

		First->bLit = false;
		First->Oil = 0;
		Second->Oil = 1;
		Nameless->Oil = 2;

		TestTrue(TEXT("The load works"), System->LoadFromSlot(Slot));
		TestTrue(TEXT("The first lantern is lit again"), First->bLit);
		TestEqual(TEXT("The first lantern's oil is back"), First->Oil, 3);
		TestEqual(TEXT("The second lantern's oil is back"), Second->Oil, 8);
		TestEqual(TEXT("A lantern with no id is left alone"), Nameless->Oil, 2);
		TestEqual(TEXT("Each saved lantern heard it was restored, once"), First->RestoreCount + Second->RestoreCount, 2);
		TestEqual(TEXT("The lantern with no id heard nothing"), Nameless->RestoreCount, 0);
		TestEqual(TEXT("One load notice"), Spy->Loads, 1);
		TestTrue(TEXT("The load notice names the slot and success"), Spy->LastLoadSlot == Slot && Spy->bLastLoadSucceeded);
		TestEqual(TEXT("The load was announced after the lanterns were back"), Spy->OilAtLastLoad, 3);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveSystem_FailuresAreAnnounced, "Dojo.S3.SaveSystem.FailuresAreAnnounced", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A missing slot and an empty name fail, change nothing, and are announced as failures. */
bool FDojo_S3_SaveSystem_FailuresAreAnnounced::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveSystemTest;

	const FString Missing = TEXT("DojoS3NoSuchSlot");
	UGameplayStatics::DeleteGameInSlot(Missing, 0);

	FDojoTestWorld TestWorld;
	UDojoS3SaveSystem* System = SystemOf(TestWorld);
	if (!TestNotNull(TEXT("The world has a save system"), System)) return false;

	ADojoS3Lantern* Lantern = Place(TestWorld, TEXT("Lantern1"), true, 6);

	TStrongObjectPtr<UDojoS3SaveSpy> Spy(NewObject<UDojoS3SaveSpy>());
	Spy->Watch(System);

	TestFalse(TEXT("Loading a missing slot fails"), System->LoadFromSlot(Missing));
	TestEqual(TEXT("The failed load was announced"), Spy->Loads, 1);
	TestTrue(TEXT("As a failure for that slot"), Spy->LastLoadSlot == Missing && !Spy->bLastLoadSucceeded);
	TestEqual(TEXT("Nothing was restored"), Lantern->RestoreCount, 0);
	TestFalse(TEXT("Nothing was removed"), IsGone(Lantern));

	TestFalse(TEXT("Saving with no slot name fails"), System->SaveToSlot(TEXT("")));
	TestEqual(TEXT("The failed save was announced"), Spy->Saves, 1);
	TestFalse(TEXT("As a failure"), Spy->bLastSaveSucceeded);
	TestFalse(TEXT("Loading with no slot name fails"), System->LoadFromSlot(TEXT("")));
	TestEqual(TEXT("And that is announced too"), Spy->Loads, 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveSystem_FreshWorlds, "Dojo.S3.SaveSystem.FreshWorlds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Saves in one world after destroying a lantern, loads into a second world, saves again there, and loads into a third. */
bool FDojo_S3_SaveSystem_FreshWorlds::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveSystemTest;

	const FString Slot = TEXT("DojoS3SystemFresh");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld FirstWorld;
		FRow Row = PlaceRow(FirstWorld);
		Row.First->bLit = true;
		Row.Third->Oil = 4;
		Row.Second->Destroy();

		TestTrue(TEXT("First world: the save works"), SystemOf(FirstWorld)->SaveToSlot(Slot));
	}

	{
		FDojoTestWorld SecondWorld;
		FRow Row = PlaceRow(SecondWorld);

		TestTrue(TEXT("Second world: the load works"), SystemOf(SecondWorld)->LoadFromSlot(Slot));
		TestTrue(TEXT("Second world: the lantern destroyed before the save is gone here too"), IsGone(Row.Second));
		TestTrue(TEXT("Second world: the first lantern is lit"), Row.First->bLit);
		TestEqual(TEXT("Second world: the third lantern has 4 oil"), Row.Third->Oil, 4);
		TestEqual(TEXT("Second world: two saveables are left"), SystemOf(SecondWorld)->FindSaveables().Num(), 2);

		Row.Third->Oil = 2;
		TestTrue(TEXT("Second world: saving again works"), SystemOf(SecondWorld)->SaveToSlot(Slot));
	}

	{
		FDojoTestWorld ThirdWorld;
		FRow Row = PlaceRow(ThirdWorld);

		TestTrue(TEXT("Third world: the load works"), SystemOf(ThirdWorld)->LoadFromSlot(Slot));
		TestTrue(TEXT("Third world: the lantern lost in the first world is still gone"), IsGone(Row.Second));
		TestTrue(TEXT("Third world: the first lantern is still lit"), Row.First->bLit);
		TestEqual(TEXT("Third world: the third lantern has the oil of the second save"), Row.Third->Oil, 2);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S3_SaveSystem_LaidOutAgain, "Dojo.S3.SaveSystem.LaidOutAgain", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A lantern destroyed and then placed again under the same id before the save is not lost. */
bool FDojo_S3_SaveSystem_LaidOutAgain::RunTest(const FString& Parameters)
{
	using namespace DojoS3SaveSystemTest;

	const FString Slot = TEXT("DojoS3SystemAgain");
	UGameplayStatics::DeleteGameInSlot(Slot, 0);

	{
		FDojoTestWorld FirstWorld;
		FRow Row = PlaceRow(FirstWorld);
		Row.Second->Destroy();
		Place(FirstWorld, TEXT("Lantern2"), true, 9);

		TestTrue(TEXT("First world: the save works"), SystemOf(FirstWorld)->SaveToSlot(Slot));
	}

	{
		FDojoTestWorld SecondWorld;
		FRow Row = PlaceRow(SecondWorld);

		TestTrue(TEXT("Second world: the load works"), SystemOf(SecondWorld)->LoadFromSlot(Slot));
		TestFalse(TEXT("Second world: the lantern placed again is not lost"), IsGone(Row.Second));
		TestTrue(TEXT("Second world: it has the state of the one placed again"), Row.Second->bLit && Row.Second->Oil == 9);
	}

	UGameplayStatics::DeleteGameInSlot(Slot, 0);
	return true;
}

#endif
```

# Hints

- Write `FindSaveables` first and use it in both directions: it is the only place that walks the world.
- `TActorIterator<AActor>` walks the actors of a world and `FindComponentByClass` finds the saveable part; `UGameplayStatics` has `CreateSaveGameObject`, `SaveGameToSlot`, `DoesSaveGameExist`, and `LoadGameFromSlot`.
- `AddOnActorDestroyedHandler` takes an `FOnActorDestroyed::FDelegate`, which `CreateUObject` builds from this object and a member function taking an `AActor*`; it returns a handle that `RemoveOnActorDestroyedHandler` takes. The headers are `Engine/World.h` and `Kismet/GameplayStatics.h`.

# Rubric

- `SaveToSlot` stores every saveable with an id and the ids the world has lost, writes the slot, and announces once with the result.
- `LoadFromSlot` removes what the checkpoint says is gone, restores every other saveable it holds state for, and announces once, after everything is back.
- A missing slot or an empty name fails, changes nothing, and is announced as a failure.
- A saveable destroyed before a save stays gone in every later load, and a saveable laid out again under a lost id is not removed.
- The destroyed-actor handler is added in `Initialize` and removed in `Deinitialize`.
- The system knows no kind of saveable actor by name; it works only through the component, the record, and its two events.

# Alternative

Saveables could register themselves with the system in their BeginPlay and unregister in EndPlay, so the system keeps a list instead of walking the world. That is cheaper in a level with thousands of actors and lets the system see a saveable leave through its own EndPlay; the cost is that the component must know the system, a dependency in the other direction, and that a forgotten unregister leaves a stale entry. Walking the world on each save keeps the component free of the system and costs a moment once per save, which is rare. The two events make the system the sender in Observer from Pack 2's first world: the board, a sound, and an autosave icon all listen without the system knowing them.

# Parsons

```yaml
- id: system-find-saveables
  prompt: Put FindSaveables in order.
  lines:
    - "TArray<UDojoS3SaveableComponent*> Found;"
    - "for (TActorIterator<AActor> It(GetWorld()); It; ++It)"
    - "{"
    - "	UDojoS3SaveableComponent* Saveable = It->FindComponentByClass<UDojoS3SaveableComponent>();"
    - "	if (Saveable != nullptr && !Saveable->SaveId.IsNone())"
    - "	{"
    - "		Found.Add(Saveable);"
    - "	}"
    - "}"
    - "return Found;"
  distractors:
    - line: "for (AActor* Actor : GetWorld()->GetActors())"
      mistake: UWorld has no GetActors list to loop over; TActorIterator (or TActorRange) is how code walks a world's actors.
    - line: "	UDojoS3SaveableComponent* Saveable = Cast<UDojoS3SaveableComponent>(*It);"
      mistake: The iterator yields actors, and an actor is never a component; the component has to be found on the actor.
```
