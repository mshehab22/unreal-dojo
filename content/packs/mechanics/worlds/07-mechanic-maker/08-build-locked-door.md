---
id: m7-locked-door
title: A door that opens for the right key
order: 8
kind: build
scaffold: blank
difficulty: 4
patterns: [observer]
skills: [collision, delegates]
terms: [findcomponentbyclass, dynamic-multicast-delegate, broadcast, collision-enabled, box-component, blueprintassignable]
prerequisites: [m7-key-ring, m3-checkpoint]
xp: 120
estimatedMinutes: 28
concepts:
  - A door with one try entry and two answers, open and announce, or Locked and count
  - The door reads the visitor's ring and leaves the key on it
---

# Brief

When a runner without the key tries a locked door, the label reads Locked, the try is counted, and the runner still cannot walk through; when a runner whose ring holds `ShrineKey` tries it, the label reads Open, the slab stops blocking, and a chime listening to the door rings once.

Write `ADojoM7LockedDoor` from nothing. It has a box panel as its root that blocks everything and never ticks, and a label in front of it. Trying the door is one function with two answers:

- An open door stays open: trying it again returns true and announces nothing.
- A visitor whose key ring holds `RequiredKey` opens the door: the panel stops colliding, the label reads `Open`, the door announces it was unlocked with itself and the visitor, and the try returns true. The key stays on the ring.
- Anyone else, with the wrong key, no key, no ring, or no visitor at all (a null pointer), finds it locked: the label reads `Locked`, the door counts a locked try, and the try returns false.
- `Relock` closes the door again: the panel blocks, the label reads `Locked`, and the count of locked tries is kept.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<UBoxComponent> Panel;` the root, with an extent of 20 by 150 by 150 and the `BlockAllDynamic` profile.
- `UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> Label;` reading `Locked` from the start.
- `UPROPERTY(EditAnywhere, BlueprintReadOnly) FName RequiredKey = TEXT("ShrineKey");`
- `DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM7OnUnlocked, ADojoM7LockedDoor*, Door, AActor*, Visitor);` and `UPROPERTY(BlueprintAssignable) FDojoM7OnUnlocked OnUnlocked;`
- `UFUNCTION(BlueprintCallable) bool TryOpen(AActor* Visitor);`
- `UFUNCTION(BlueprintPure) bool IsOpen() const;` and `UFUNCTION(BlueprintPure) int32 GetLockedTries() const;`
- `UFUNCTION(BlueprintCallable) void Relock();`

The chime, `ADojoM7DoorChime`, is given in full: a listener that rings once for each unlock it hears and remembers the last door and visitor. The tests use it to hear your door.

Dependency direction: the door holds no pointer to any visitor, ring, or chime; it asks the visitor in front of it for a ring, and it broadcasts. The chime subscribes to the door. The ring and the runner know nothing about doors.

This is the fourth piece of the shrine boss.

Compiles against earlier quests: m7-key-ring (`Quests/m7-key-ring/DojoM7KeyRing.h`) and m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`).

## See it in the editor

Place a `DojoM7LockedDoor` at X 500 facing the origin, a `DojoM7KeyPickup` at Y 500, and a `DojoM3Runner` at the origin with a Dojo M7 Key Ring added in Details. Type `show Collision` and press Play. In the level Blueprint, on the 1 key, call Try Open on the door with the runner and print the result: false, and the label reads Locked. On the 2 key, set the runner's location to Y 500 to take the key, and press 1 again: true, and the label reads Open. Bind On Unlocked to a Print String to watch the announcement arrive once. Then the A/B: set the door's Required Key to CellarKey and press Play again.

# Files

## DojoM7LockedDoor.h

```cpp
// Declare FDojoM7OnUnlocked and ADojoM7LockedDoor here.
```

## DojoM7LockedDoor.cpp

```cpp
// Define ADojoM7LockedDoor here.
```

## DojoM7DoorChime.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7DoorChime.generated.h"

class ADojoM7LockedDoor;

/** Rings once for every unlock it hears and remembers the last door and visitor; the doors it listens to never know it is there. */
UCLASS()
class ADojoM7DoorChime : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM7DoorChime();

	/** Starts listening to a door's unlocks; listening twice to one door still rings once per unlock. */
	UFUNCTION(BlueprintCallable, Category = "Chime")
	void Listen(ADojoM7LockedDoor* Door);

	/** How many unlocks the chime has heard. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	int32 GetRings() const;

	/** The door named by the last unlock, or null. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	ADojoM7LockedDoor* GetLastDoor() const;

	/** The visitor named by the last unlock, or null. */
	UFUNCTION(BlueprintPure, Category = "Chime")
	AActor* GetLastVisitor() const;

private:
	/** Rings and remembers who opened which door. */
	UFUNCTION()
	void HandleUnlocked(ADojoM7LockedDoor* Door, AActor* Visitor);

	UPROPERTY()
	TObjectPtr<ADojoM7LockedDoor> LastDoor;

	UPROPERTY()
	TObjectPtr<AActor> LastVisitor;

	int32 Rings = 0;
};
```

## DojoM7DoorChime.cpp

```cpp
#include "DojoM7DoorChime.h"

#include "DojoM7LockedDoor.h"

ADojoM7DoorChime::ADojoM7DoorChime()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM7DoorChime::Listen(ADojoM7LockedDoor* Door)
{
	if (!IsValid(Door)) return;

	Door->OnUnlocked.AddUniqueDynamic(this, &ADojoM7DoorChime::HandleUnlocked);
}

int32 ADojoM7DoorChime::GetRings() const
{
	return Rings;
}

ADojoM7LockedDoor* ADojoM7DoorChime::GetLastDoor() const
{
	return LastDoor;
}

AActor* ADojoM7DoorChime::GetLastVisitor() const
{
	return LastVisitor;
}

void ADojoM7DoorChime::HandleUnlocked(ADojoM7LockedDoor* Door, AActor* Visitor)
{
	Rings++;
	LastDoor = Door;
	LastVisitor = Visitor;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m7-key-ring/DojoM7KeyRing.h"
#include "Quests/m7-locked-door/DojoM7DoorChime.h"
#include "Quests/m7-locked-door/DojoM7LockedDoor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM7LockedDoorTest
{
	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Gives an actor a key ring holding one key, while the game runs. */
	UDojoM7KeyRing* GiveRing(AActor* Carrier, FName KeyId)
	{
		UDojoM7KeyRing* Ring = NewObject<UDojoM7KeyRing>(Carrier);
		Ring->RegisterComponent();
		Ring->AddKey(KeyId);
		return Ring;
	}

	/** The door's label text. */
	FString LabelOf(const ADojoM7LockedDoor* Door)
	{
		return Door->Label->Text.ToString();
	}

	/** True while the door's panel stops pawns. */
	bool BlocksPawns(const ADojoM7LockedDoor* Door)
	{
		return Door->Panel->GetCollisionEnabled() != ECollisionEnabled::NoCollision && Door->Panel->GetCollisionResponseToChannel(ECC_Pawn) == ECR_Block;
	}

	/** Puts a runner at the origin, sweeps it 1000 along X toward the door, sends it back, and returns where it stopped. */
	double WalkAtTheDoor(ADojoM3Runner* Runner)
	{
		const FVector Start = Runner->GetActorLocation();
		Runner->SetActorLocation(FVector::ZeroVector);
		Runner->AddActorWorldOffset(FVector(1000.0, 0.0, 0.0), true);
		const double StoppedAt = Runner->GetActorLocation().X;
		Runner->SetActorLocation(Start);
		return StoppedAt;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_LockedDoor_StaysShutWithoutTheKey, "Dojo.M7.LockedDoor.StaysShutWithoutTheKey", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Tries a door with no ring and with the wrong key, and checks it stays shut, reads Locked, counts both tries, and announces nothing. */
bool FDojo_M7_LockedDoor_StaysShutWithoutTheKey::RunTest(const FString& Parameters)
{
	using namespace DojoM7LockedDoorTest;

	FDojoTestWorld TestWorld;

	ADojoM7LockedDoor* Door = SpawnAt<ADojoM7LockedDoor>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM7DoorChime* Chime = SpawnAt<ADojoM7DoorChime>(TestWorld, FVector(0.0, 2000.0, 0.0));
	ADojoM3Runner* Bare = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2000.0, 0.0));
	ADojoM3Runner* Wrong = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2500.0, 0.0));
	if (!TestNotNull(TEXT("Door, chime, and runners spawned"), Wrong) || !Bare || !Chime || !Door) return false;
	Chime->Listen(Door);
	GiveRing(Wrong, TEXT("CellarKey"));

	TestTrue(TEXT("The panel is the root"), Door->GetRootComponent() == Door->Panel);
	TestEqual(TEXT("A new door reads Locked"), LabelOf(Door), FString(TEXT("Locked")));
	TestFalse(TEXT("and is not open"), Door->IsOpen());
	TestTrue(TEXT("and blocks pawns"), BlocksPawns(Door));
	TestTrue(TEXT("so a runner walking at it stops at its face"), WalkAtTheDoor(Bare) < 450.0);

	TestFalse(TEXT("A runner with no ring cannot open it"), Door->TryOpen(Bare));
	TestEqual(TEXT("and that try is counted"), Door->GetLockedTries(), 1);
	TestFalse(TEXT("A runner with the wrong key cannot open it either"), Door->TryOpen(Wrong));
	TestEqual(TEXT("and that try is counted too"), Door->GetLockedTries(), 2);
	TestFalse(TEXT("Nothing at all cannot open it"), Door->TryOpen(nullptr));
	TestEqual(TEXT("and a try with no visitor is counted as locked too"), Door->GetLockedTries(), 3);

	TestFalse(TEXT("The door is still shut"), Door->IsOpen());
	TestEqual(TEXT("and reads Locked"), LabelOf(Door), FString(TEXT("Locked")));
	TestTrue(TEXT("and still blocks"), WalkAtTheDoor(Wrong) < 450.0);
	TestEqual(TEXT("A locked door announces nothing"), Chime->GetRings(), 0);

	const FProperty* OnUnlocked = ADojoM7LockedDoor::StaticClass()->FindPropertyByName(TEXT("OnUnlocked"));
	if (!TestNotNull(TEXT("OnUnlocked is a UPROPERTY"), OnUnlocked)) return false;
	TestTrue(TEXT("Blueprints can bind to OnUnlocked"), OnUnlocked->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_LockedDoor_OpensForTheKey, "Dojo.M7.LockedDoor.OpensForTheKey", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens a door with the right key and checks the panel, the label, one announcement naming the door and the runner, and a free second try. */
bool FDojo_M7_LockedDoor_OpensForTheKey::RunTest(const FString& Parameters)
{
	using namespace DojoM7LockedDoorTest;

	FDojoTestWorld TestWorld;

	ADojoM7LockedDoor* Door = SpawnAt<ADojoM7LockedDoor>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM7LockedDoor* Cellar = SpawnAt<ADojoM7LockedDoor>(TestWorld, FVector(500.0, 3000.0, 0.0));
	ADojoM7DoorChime* Chime = SpawnAt<ADojoM7DoorChime>(TestWorld, FVector(0.0, 2000.0, 0.0));
	ADojoM3Runner* Keeper = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2000.0, 0.0));
	ADojoM3Runner* Stranger = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2500.0, 0.0));
	if (!TestNotNull(TEXT("Doors, chime, and runners spawned"), Stranger) || !Keeper || !Chime || !Cellar || !Door) return false;
	Chime->Listen(Door);
	Chime->Listen(Door);
	Chime->Listen(Cellar);
	UDojoM7KeyRing* Ring = GiveRing(Keeper, TEXT("ShrineKey"));

	TestTrue(TEXT("A runner holding the key opens the door"), Door->TryOpen(Keeper));
	TestTrue(TEXT("The door is open"), Door->IsOpen());
	TestEqual(TEXT("and reads Open"), LabelOf(Door), FString(TEXT("Open")));
	TestFalse(TEXT("and its panel no longer blocks"), BlocksPawns(Door));
	TestTrue(TEXT("so a runner walks straight through"), WalkAtTheDoor(Stranger) > 990.0);
	TestEqual(TEXT("No try was locked"), Door->GetLockedTries(), 0);

	TestEqual(TEXT("The unlock was announced once"), Chime->GetRings(), 1);
	TestTrue(TEXT("naming the door"), Chime->GetLastDoor() == Door);
	TestTrue(TEXT("and the runner who opened it"), Chime->GetLastVisitor() == Keeper);
	TestTrue(TEXT("The door leaves the key on the ring"), Ring->HasKey(TEXT("ShrineKey")));

	TestTrue(TEXT("Trying an open door again succeeds"), Door->TryOpen(Keeper));
	TestTrue(TEXT("even for a runner with no key"), Door->TryOpen(Stranger));
	TestEqual(TEXT("and announces nothing more"), Chime->GetRings(), 1);
	TestEqual(TEXT("nor counts a locked try"), Door->GetLockedTries(), 0);

	TestTrue(TEXT("The same key opens a second door that needs it"), Cellar->TryOpen(Keeper));
	TestEqual(TEXT("which announces its own unlock"), Chime->GetRings(), 2);
	TestTrue(TEXT("naming that door"), Chime->GetLastDoor() == Cellar);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_LockedDoor_RelockKeepsTheCount, "Dojo.M7.LockedDoor.RelockKeepsTheCount", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens a door, relocks it, and checks it blocks and reads Locked again, keeps its count, and announces the next unlock. */
bool FDojo_M7_LockedDoor_RelockKeepsTheCount::RunTest(const FString& Parameters)
{
	using namespace DojoM7LockedDoorTest;

	FDojoTestWorld TestWorld;

	ADojoM7LockedDoor* Door = SpawnAt<ADojoM7LockedDoor>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM7DoorChime* Chime = SpawnAt<ADojoM7DoorChime>(TestWorld, FVector(0.0, 2000.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2000.0, 0.0));
	if (!TestNotNull(TEXT("Door, chime, and runner spawned"), Runner) || !Chime || !Door) return false;
	Chime->Listen(Door);

	TestFalse(TEXT("Without a ring the door is locked"), Door->TryOpen(Runner));
	UDojoM7KeyRing* Ring = GiveRing(Runner, TEXT("ShrineKey"));
	TestTrue(TEXT("With the key it opens"), Door->TryOpen(Runner));

	Runner->SetActorLocation(FVector(0.0, -2000.0, 0.0));
	Door->Relock();
	TestFalse(TEXT("A relocked door is shut"), Door->IsOpen());
	TestEqual(TEXT("reads Locked"), LabelOf(Door), FString(TEXT("Locked")));
	TestTrue(TEXT("and blocks pawns again"), BlocksPawns(Door));
	TestTrue(TEXT("so a runner walking at it stops at its face"), WalkAtTheDoor(Runner) < 450.0);
	TestEqual(TEXT("The locked try from before is kept"), Door->GetLockedTries(), 1);

	Ring->RemoveKey(TEXT("ShrineKey"));
	TestFalse(TEXT("Without the key it stays locked"), Door->TryOpen(Runner));
	TestEqual(TEXT("and counts a second locked try"), Door->GetLockedTries(), 2);

	Ring->AddKey(TEXT("ShrineKey"));
	TestTrue(TEXT("With the key back it opens again"), Door->TryOpen(Runner));
	TestEqual(TEXT("and the second unlock is announced too"), Chime->GetRings(), 2);

	return true;
}

#endif
```

# Hints

- The try has three outcomes in a fixed order: an open door answers at once, a visitor holding the key opens it, and everything else is a locked try. Write them as guard clauses from the top, and make the announcement the last thing the opening does.
- The visitor carries its keys in a ring, so ask the visitor for its ring the same way the pickup did, and be ready for no visitor and for a visitor with no ring. Opening and relocking change the same two things in opposite directions: whether the panel collides, and what the label says.
- `UBoxComponent` is in `Components/BoxComponent.h` and `UTextRenderComponent` in `Components/TextRenderComponent.h`; declare the delegate above the class with a forward declaration of the door; `SetCollisionEnabled` takes `ECollisionEnabled::NoCollision` to open and `ECollisionEnabled::QueryAndPhysics` to block again.

# Rubric

- `TryOpen` has one entry and two answers: open and announce, or read Locked and count the try; an open door answers true and announces nothing.
- The door finds the ring on the visitor with `FindComponentByClass`, handles no visitor and no ring, and leaves the key on the ring.
- `OnUnlocked` is a `BlueprintAssignable` dynamic multicast delegate broadcast once per opening with the door and the visitor.
- An open door does not block, a locked or relocked one blocks pawns, and the label always says which.
- `Relock` closes the door and keeps the count of locked tries.
- The door holds no pointer to any visitor, ring, or listener, and follows the earlier pieces' conventions: forward declarations, `TObjectPtr`, a comment above every function.

# Alternative

The door could take the key off the ring when it opens, the way many games spend a small key on one lock. That makes keys a resource the player has to count, and it is the better rule for a dungeon with many identical small keys; here one named key belongs to one shrine, and the door that leaves it on the ring lets one key open the front and back doors of the same shrine. The door could also try itself when the runner bumps the panel, with a hit event as the try, which needs no interaction key; but then any crate pushed into it counts as a locked try, and the count stops meaning "a visitor tried". With a broadcast that names the door and the visitor, a sound, a quest, and a director can all react to the same unlock without the door knowing any of them, which is the Observer pattern from the delegates world.
