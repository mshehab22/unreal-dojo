---
id: m7-key-ring
title: A key ring and the key that goes on it
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: [component]
skills: [collision, data]
terms: [actor-component, findcomponentbyclass, tset, fname, overlap-event, collision-enabled]
prerequisites: [m7-key-door-plan, m3-checkpoint]
xp: 90
estimatedMinutes: 22
concepts:
  - Keys belong to whoever carries them, so they live in a component any actor can be given
  - A pickup asks the visitor in front of it for its ring and only disappears when the ring took the key
---

# Brief

When you give a runner a key ring and step it onto a key pickup, the pickup vanishes and the ring holds `ShrineKey`; a runner with no ring walks over the pickup and leaves it where it is.

Two classes are in this quest, and both headers are written for you. Write the function bodies in `DojoM7KeyRing.cpp` and `DojoM7KeyPickup.cpp`; the constructors are written. Rules:

- The ring holds key ids, each at most once. `AddKey` refuses `None` and an id the ring already holds, returning false; otherwise it adds the id, announces it on `OnKeyAdded`, and returns true.
- `HasKey`, `RemoveKey`, `ClearKeys`, and `GetKeyCount` do what their names say. `RemoveKey` returns false for an id the ring does not hold.
- The pickup shows its `KeyId` on its label and listens for overlap events from its zone, the shapes arriving in it.
- When an actor arrives, the pickup looks for a key ring on it. If there is a ring and it accepts the key, the pickup is taken: it hides itself and turns its zone's collision off, so it touches nothing.
- An actor with no ring is ignored. A ring that already holds the id refuses it, and then the pickup stays where it is for the next visitor.
- `ResetPickup` shows the pickup again and turns its zone's collision back on, so it can be taken again.

The tally, `ADojoM7KeyTally`, is given in full: a listener that counts every key a ring announces and remembers the last one. The tests use it to hear your ring.

Dependency direction: the pickup holds no pointer to any ring or visitor; it asks the actor in front of it. The ring knows nothing about pickups, doors, or the tally, which subscribes to it; the runner knows nothing about any of them: it only carries the ring.

This is the third piece of the shrine boss. Its tests reuse the runner from the collision world, given a ring while the game runs.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`).

## See it in the editor

Place a `DojoM7KeyPickup` at the origin and two `DojoM3Runner` actors at X -500 and X -800. Select the first runner, click Add in Details, and add a Dojo M7 Key Ring to it. Type `show Collision` and press Play. In the level Blueprint, create a reference to each runner (select it in the level, right-click the graph, and choose Create a Reference to it). On the 1 key, set the location of the runner without a ring to the origin: the pickup stays and still reads ShrineKey. On the 2 key, set the location of the runner with the ring to the origin: the pickup vanishes. On the 3 key, call Get Component by Class on the runner with the ring, choosing Dojo M7 Key Ring, and print its Get Key Count. Then the A/B: set the pickup's Key Id to None in Details and press Play again: the ring turns it away and the pickup stays.

# Files

## DojoM7KeyRing.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoM7KeyRing.generated.h"

/** Broadcast when a ring gains a key id it did not hold. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM7OnKeyAdded, FName, KeyId);

/** The keys a visitor carries, each key id once; pickups add to it and doors read it, and the ring knows neither. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoM7KeyRing : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; a ring only answers questions. */
	UDojoM7KeyRing();

	/** Fires once for each key id the ring gains. */
	UPROPERTY(BlueprintAssignable, Category = "Keys")
	FDojoM7OnKeyAdded OnKeyAdded;

	/** Adds a key id and announces it; false for None or an id the ring already holds. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	bool AddKey(FName KeyId);

	/** True while the ring holds this key id. */
	UFUNCTION(BlueprintPure, Category = "Keys")
	bool HasKey(FName KeyId) const;

	/** Takes a key id off the ring; false if it was not there. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	bool RemoveKey(FName KeyId);

	/** Empties the ring. */
	UFUNCTION(BlueprintCallable, Category = "Keys")
	void ClearKeys();

	/** How many different key ids the ring holds. */
	UFUNCTION(BlueprintPure, Category = "Keys")
	int32 GetKeyCount() const;

private:
	/** The key ids held now, each once. */
	TSet<FName> Keys;
};
```

## DojoM7KeyRing.cpp

```cpp
#include "DojoM7KeyRing.h"

UDojoM7KeyRing::UDojoM7KeyRing()
{
	PrimaryComponentTick.bCanEverTick = false;
}

bool UDojoM7KeyRing::AddKey(FName KeyId)
{
	// Your code: refuse None and a key already held; otherwise add it, announce it, and say it worked.
	return false;
}

bool UDojoM7KeyRing::HasKey(FName KeyId) const
{
	// Your code
	return false;
}

bool UDojoM7KeyRing::RemoveKey(FName KeyId)
{
	// Your code: say whether a key was taken off.
	return false;
}

void UDojoM7KeyRing::ClearKeys()
{
	// Your code
}

int32 UDojoM7KeyRing::GetKeyCount() const
{
	// Your code
	return 0;
}
```

## DojoM7KeyPickup.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7KeyPickup.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A key waiting in the level: the first visitor whose key ring accepts its key id takes it, and it disappears until reset. */
UCLASS()
class ADojoM7KeyPickup : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the touch zone as the root and the label above it. */
	ADojoM7KeyPickup();

	/** The touch zone, 60 cm in radius; it overlaps everything and blocks nothing. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Key")
	TObjectPtr<USphereComponent> Zone;

	/** Floating text showing the key id. */
	UPROPERTY(VisibleAnywhere, Category = "Key")
	TObjectPtr<UTextRenderComponent> Label;

	/** The key id this pickup gives. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Key")
	FName KeyId = TEXT("ShrineKey");

	/** True from the moment a visitor takes the key until ResetPickup. */
	UFUNCTION(BlueprintPure, Category = "Key")
	bool IsTaken() const;

	/** Shows the pickup again and turns its zone back on, so the next visitor can take it. */
	UFUNCTION(BlueprintCallable, Category = "Key")
	void ResetPickup();

protected:
	/** Starts listening to the zone and shows the key id. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bTaken = false;
};
```

## DojoM7KeyPickup.cpp

```cpp
#include "DojoM7KeyPickup.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoM7KeyRing.h"

ADojoM7KeyPickup::ADojoM7KeyPickup()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(60.f);
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 90.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM7KeyPickup::BeginPlay()
{
	Super::BeginPlay();

	// Your code: listen for shapes arriving in the zone, then show the key id on the label.
}

bool ADojoM7KeyPickup::IsTaken() const
{
	return bTaken;
}

void ADojoM7KeyPickup::ResetPickup()
{
	// Your code: not taken, visible, and touchable again.
}

void ADojoM7KeyPickup::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	// Your code: find the visitor's ring; when it takes the key, mark the pickup taken, hide it, and turn its zone's collision off.
}
```

## DojoM7KeyTally.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7KeyTally.generated.h"

class UDojoM7KeyRing;

/** Counts every key a ring announces and remembers the last one; the rings it listens to never know it is there. */
UCLASS()
class ADojoM7KeyTally : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM7KeyTally();

	/** Starts listening to a ring's new keys; listening twice to one ring still counts each key once. */
	UFUNCTION(BlueprintCallable, Category = "Tally")
	void Listen(UDojoM7KeyRing* Ring);

	/** How many key announcements the tally has heard. */
	UFUNCTION(BlueprintPure, Category = "Tally")
	int32 GetHeard() const;

	/** The key id named by the last announcement, or None. */
	UFUNCTION(BlueprintPure, Category = "Tally")
	FName GetLastKey() const;

private:
	/** Counts one announcement and remembers its key id. */
	UFUNCTION()
	void HandleKeyAdded(FName KeyId);

	int32 Heard = 0;

	FName LastKey;
};
```

## DojoM7KeyTally.cpp

```cpp
#include "DojoM7KeyTally.h"

#include "DojoM7KeyRing.h"

ADojoM7KeyTally::ADojoM7KeyTally()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM7KeyTally::Listen(UDojoM7KeyRing* Ring)
{
	if (!IsValid(Ring)) return;

	Ring->OnKeyAdded.AddUniqueDynamic(this, &ADojoM7KeyTally::HandleKeyAdded);
}

int32 ADojoM7KeyTally::GetHeard() const
{
	return Heard;
}

FName ADojoM7KeyTally::GetLastKey() const
{
	return LastKey;
}

void ADojoM7KeyTally::HandleKeyAdded(FName KeyId)
{
	Heard++;
	LastKey = KeyId;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m7-key-ring/DojoM7KeyPickup.h"
#include "Quests/m7-key-ring/DojoM7KeyRing.h"
#include "Quests/m7-key-ring/DojoM7KeyTally.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM7KeyRingTest
{
	/** Spawns a runner at a spot. */
	ADojoM3Runner* SpawnRunner(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(Where, FRotator::ZeroRotator);
	}

	/** Gives an actor a key ring while the game runs, the way a power-up or a level script would. */
	UDojoM7KeyRing* GiveRing(AActor* Carrier)
	{
		UDojoM7KeyRing* Ring = NewObject<UDojoM7KeyRing>(Carrier);
		Ring->RegisterComponent();
		return Ring;
	}

	/** Spawns a pickup at a spot with the key id a designer would type in Details. */
	ADojoM7KeyPickup* PlacePickup(FDojoTestWorld& TestWorld, const FVector& Where, FName KeyId)
	{
		const FTransform Spot(Where);
		ADojoM7KeyPickup* Pickup = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM7KeyPickup>(ADojoM7KeyPickup::StaticClass(), Spot);
		Pickup->KeyId = KeyId;
		Pickup->FinishSpawning(Spot);
		return Pickup;
	}

	/** True while the pickup's zone can touch anything. */
	bool IsTouchable(const ADojoM7KeyPickup* Pickup)
	{
		return Pickup->Zone->GetCollisionEnabled() != ECollisionEnabled::NoCollision;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_KeyRing_HoldsEachKeyOnce, "Dojo.M7.KeyRing.HoldsEachKeyOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds, repeats, removes, and clears keys on a ring, and checks a listener hears exactly one announcement per key really added. */
bool FDojo_M7_KeyRing_HoldsEachKeyOnce::RunTest(const FString& Parameters)
{
	using namespace DojoM7KeyRingTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Carrier = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Carrier spawned"), Carrier)) return false;
	UDojoM7KeyRing* Ring = GiveRing(Carrier);
	ADojoM7KeyTally* Tally = TestWorld.SpawnActor<ADojoM7KeyTally>();
	if (!TestNotNull(TEXT("Ring made"), Ring) || !TestNotNull(TEXT("Tally spawned"), Tally)) return false;
	Tally->Listen(Ring);

	TestEqual(TEXT("A new ring is empty"), Ring->GetKeyCount(), 0);
	TestFalse(TEXT("None is not a key"), Ring->AddKey(NAME_None));
	TestEqual(TEXT("so nothing was added"), Ring->GetKeyCount(), 0);
	TestEqual(TEXT("and nothing was announced"), Tally->GetHeard(), 0);

	TestTrue(TEXT("A new key goes on the ring"), Ring->AddKey(TEXT("ShrineKey")));
	TestTrue(TEXT("and the ring holds it"), Ring->HasKey(TEXT("ShrineKey")));
	TestEqual(TEXT("The new key is announced once"), Tally->GetHeard(), 1);
	TestTrue(TEXT("naming the key"), Tally->GetLastKey() == FName(TEXT("ShrineKey")));
	TestFalse(TEXT("The same key twice is refused"), Ring->AddKey(TEXT("ShrineKey")));
	TestEqual(TEXT("so the ring holds one key"), Ring->GetKeyCount(), 1);
	TestEqual(TEXT("and the refused key is not announced"), Tally->GetHeard(), 1);

	TestTrue(TEXT("A second key goes on too"), Ring->AddKey(TEXT("CellarKey")));
	TestEqual(TEXT("making two"), Ring->GetKeyCount(), 2);
	TestEqual(TEXT("and a second announcement"), Tally->GetHeard(), 2);
	TestTrue(TEXT("naming the second key"), Tally->GetLastKey() == FName(TEXT("CellarKey")));
	TestFalse(TEXT("A key never added is not held"), Ring->HasKey(TEXT("TowerKey")));

	TestTrue(TEXT("Removing a held key works"), Ring->RemoveKey(TEXT("ShrineKey")));
	TestFalse(TEXT("and it is gone"), Ring->HasKey(TEXT("ShrineKey")));
	TestFalse(TEXT("Removing it again reports nothing to remove"), Ring->RemoveKey(TEXT("ShrineKey")));
	TestEqual(TEXT("One key is left"), Ring->GetKeyCount(), 1);

	Ring->ClearKeys();
	TestEqual(TEXT("A cleared ring is empty"), Ring->GetKeyCount(), 0);
	TestFalse(TEXT("and holds none of its old keys"), Ring->HasKey(TEXT("CellarKey")));
	TestEqual(TEXT("Removing and clearing announce nothing"), Tally->GetHeard(), 2);

	const FProperty* OnKeyAdded = UDojoM7KeyRing::StaticClass()->FindPropertyByName(TEXT("OnKeyAdded"));
	if (!TestNotNull(TEXT("OnKeyAdded is a UPROPERTY"), OnKeyAdded)) return false;
	TestTrue(TEXT("OnKeyAdded is a multicast delegate"), OnKeyAdded->IsA<FMulticastDelegateProperty>());
	TestTrue(TEXT("Blueprints can bind to it"), OnKeyAdded->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_KeyRing_PickupGoesOnTheRing, "Dojo.M7.KeyRing.PickupGoesOnTheRing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Steps a runner without a ring and then a runner with one onto a pickup, and checks only the second takes it. */
bool FDojo_M7_KeyRing_PickupGoesOnTheRing::RunTest(const FString& Parameters)
{
	using namespace DojoM7KeyRingTest;

	FDojoTestWorld TestWorld;

	ADojoM7KeyPickup* Pickup = PlacePickup(TestWorld, FVector::ZeroVector, TEXT("ShrineKey"));
	ADojoM3Runner* Bare = SpawnRunner(TestWorld, FVector(-1000.0, 0.0, 0.0));
	ADojoM3Runner* Keeper = SpawnRunner(TestWorld, FVector(-1000.0, 500.0, 0.0));
	if (!TestNotNull(TEXT("Pickup and runners spawned"), Keeper) || !Bare || !Pickup) return false;

	UDojoM7KeyRing* Ring = GiveRing(Keeper);
	TestTrue(TEXT("The ring is found on the runner that carries it"), Keeper->FindComponentByClass<UDojoM7KeyRing>() == Ring);
	TestEqual(TEXT("The pickup shows its key id"), Pickup->Label->Text.ToString(), FString(TEXT("ShrineKey")));
	TestFalse(TEXT("A new pickup is not taken"), Pickup->IsTaken());

	Bare->SetActorLocation(FVector::ZeroVector);
	TestFalse(TEXT("A runner with no ring does not take the key"), Pickup->IsTaken());
	TestFalse(TEXT("and the pickup stays visible"), Pickup->IsHidden());
	TestTrue(TEXT("and touchable"), IsTouchable(Pickup));
	Bare->SetActorLocation(FVector(-1000.0, 0.0, 0.0));

	Keeper->SetActorLocation(FVector(20.0, 0.0, 0.0));
	TestTrue(TEXT("A runner with a ring takes the key"), Ring->HasKey(TEXT("ShrineKey")));
	TestTrue(TEXT("The pickup is taken"), Pickup->IsTaken());
	TestTrue(TEXT("and hidden"), Pickup->IsHidden());
	TestFalse(TEXT("and touches nothing any more"), IsTouchable(Pickup));

	Keeper->SetActorLocation(FVector(-1000.0, 500.0, 0.0));
	Keeper->SetActorLocation(FVector::ZeroVector);
	TestEqual(TEXT("Coming back to a taken pickup adds nothing"), Ring->GetKeyCount(), 1);

	ADojoM7KeyPickup* Cellar = PlacePickup(TestWorld, FVector(0.0, 2000.0, 0.0), TEXT("CellarKey"));
	if (!TestNotNull(TEXT("Second pickup spawned"), Cellar)) return false;
	TestEqual(TEXT("A pickup shows the key id it was given"), Cellar->Label->Text.ToString(), FString(TEXT("CellarKey")));
	Keeper->SetActorLocation(FVector(0.0, 2000.0, 0.0));
	TestTrue(TEXT("and gives that key"), Ring->HasKey(TEXT("CellarKey")));
	TestEqual(TEXT("so the ring holds two keys"), Ring->GetKeyCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_KeyRing_DuplicatesStayAndResetReturns, "Dojo.M7.KeyRing.DuplicatesStayAndResetReturns", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a runner that already holds a key onto a second copy of it, then resets the first pickup and takes it again. */
bool FDojo_M7_KeyRing_DuplicatesStayAndResetReturns::RunTest(const FString& Parameters)
{
	using namespace DojoM7KeyRingTest;

	FDojoTestWorld TestWorld;

	ADojoM7KeyPickup* First = PlacePickup(TestWorld, FVector::ZeroVector, TEXT("ShrineKey"));
	ADojoM7KeyPickup* Copy = PlacePickup(TestWorld, FVector(0.0, 1000.0, 0.0), TEXT("ShrineKey"));
	ADojoM3Runner* Runner = SpawnRunner(TestWorld, FVector(-1000.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Pickups and runner spawned"), Runner) || !First || !Copy) return false;

	UDojoM7KeyRing* Ring = GiveRing(Runner);
	ADojoM7KeyTally* Tally = TestWorld.SpawnActor<ADojoM7KeyTally>();
	if (!TestNotNull(TEXT("Tally spawned"), Tally)) return false;
	Tally->Listen(Ring);
	Runner->SetActorLocation(FVector::ZeroVector);
	TestTrue(TEXT("The first pickup is taken"), First->IsTaken());
	TestEqual(TEXT("and the ring announces the key once"), Tally->GetHeard(), 1);

	Runner->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	TestEqual(TEXT("A second copy of a held key adds nothing new"), Ring->GetKeyCount(), 1);
	TestEqual(TEXT("and announces nothing"), Tally->GetHeard(), 1);
	TestFalse(TEXT("so the copy is not taken"), Copy->IsTaken());
	TestFalse(TEXT("and stays visible for the next visitor"), Copy->IsHidden());
	Runner->SetActorLocation(FVector(-1000.0, 0.0, 0.0));

	First->ResetPickup();
	TestFalse(TEXT("A reset pickup is no longer taken"), First->IsTaken());
	TestFalse(TEXT("is visible again"), First->IsHidden());
	TestTrue(TEXT("and touchable again"), IsTouchable(First));

	TestTrue(TEXT("The key comes off the ring"), Ring->RemoveKey(TEXT("ShrineKey")));
	Runner->SetActorLocation(FVector::ZeroVector);
	TestTrue(TEXT("and the reset pickup can be taken again"), First->IsTaken());
	TestTrue(TEXT("putting the key back on the ring"), Ring->HasKey(TEXT("ShrineKey")));

	return true;
}

#endif
```

# Hints

- Write the ring first, because the pickup only works through it.
- The arriving actor is the one to ask for its ring, and the pickup disappears only if that ring took the key.
- Hiding the pickup and turning its zone's collision off are two separate calls, and resetting undoes both.

# Rubric

- The ring holds each key id once, refuses `None`, and broadcasts `OnKeyAdded` only when a key is really added.
- The pickup finds the ring on the arriving actor with `FindComponentByClass` and keeps no pointer to it.
- An actor without a ring is ignored, and a ring that already holds the key leaves the pickup in place.
- A taken pickup is hidden and touches nothing; `ResetPickup` makes it visible and takeable again.
- The handler is a `UFUNCTION` with the exact overlap signature, bound in `BeginPlay`, and the label shows the key id.
- The ring knows nothing about pickups or doors, and the runner gains keys only by carrying a ring.

# Alternative

The keys could live on the runner class itself, as a set and three functions. That works for this runner and no one else: a second kind of visitor, such as a companion who carries keys too, would need the same code copied, and the pickup would have to cast to each class. As a component, the ring goes on any actor, in Details or while the game runs, and the pickup and the door only ask whether the actor in front of them carries one. That is the Component pattern from the patterns pack, used here for data the visitor carries. The pickup could also hand the key to the first actor that touches it whether its ring accepted the key or not, which is one check shorter, but then a visitor who already holds the key wastes the second copy, and a second player in the same room would find it gone.
