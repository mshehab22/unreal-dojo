---
id: s5-pool
title: A pool that wakes beetles instead of spawning them
order: 3
kind: build
scaffold: faded
difficulty: 3
patterns: [object-pool]
skills: [spawning, components, containers]
terms: [actor-component, spawnactor, tsubclassof, tarray, isvalid, endplay]
prerequisites: [s5-wave-plan]
xp: 80
estimatedMinutes: 25
concepts:
  - A sleeping beetle is woken before a new one is spawned, so the pool stops growing
  - Giving a beetle back puts it to sleep instead of destroying it, and only the pool's own beetles count
---

# Brief

When a pool of at most 3 beetles wakes three, refuses a fourth, takes one back, and is asked again, it hands out the beetle it took back, at the new spot, and it has still spawned only three actors.

The beetle, the spawning helper, and the counting functions are written for you. Fill the two bodies that are left:

1. `Acquire`: wake the first sleeping beetle, in the order the pool made them, at `Location`. Only when none is asleep, spawn a new one with `SpawnSleeping` (which returns null once the pool holds `MaxSize`) and wake that. Return the woken beetle, or null when every beetle is busy.
2. `Release`: put a beetle back to sleep and return true, but only for a beetle this pool made that is awake right now. A null pointer, a beetle from somewhere else, and a beetle that is already asleep all give false and change nothing.

Dependency direction: the pool points at its beetles; a beetle only broadcasts and knows nothing about the pool. A beetle never destroys itself. `Defeat` only announces the swat through `OnDefeated`, and whoever woke the beetle gives it back. The pool holds its beetles in a `UPROPERTY` array, so the garbage collector keeps them while they sleep.

This is the second piece of the Beetle Pit boss.

## See it in the editor

Make a Blueprint actor `BP_Burrow` with a `DojoS5PoolComponent`, set Max Size 3 in Details, and place one in the level. In the level Blueprint, get the pool with Get Component by Class. On the 1 key call Acquire at a random spot near the burrow and store the result in an array; on the 2 key call Release with the first entry of the array and remove it. Print Get Created Count and Get Awake Count after each key. Press 1 four times: three beetles appear, the fourth press gives nothing, and the created count stops at 3. Press 2 and then 1: a beetle vanishes and appears somewhere else, and the created count is still 3.

# Files

## DojoS5Beetle.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoS5Beetle.generated.h"

class ADojoS5Beetle;
class UTextRenderComponent;

/** Broadcast when an awake beetle is swatted, with the beetle itself so one handler can serve every beetle. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS5OnBeetleDefeated, ADojoS5Beetle*, Beetle);

/** A clockwork beetle that sleeps out of sight until it is woken at a spot, and announces when it is swatted; it never destroys itself. */
UCLASS()
class ADojoS5Beetle : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body and turns ticking off. */
	ADojoS5Beetle();

	/** What the player sees of the beetle. */
	UPROPERTY(VisibleAnywhere, Category = "Beetle")
	TObjectPtr<UTextRenderComponent> Body;

	/** Fires when an awake beetle is swatted; whoever woke it decides what happens next. */
	UPROPERTY(BlueprintAssignable, Category = "Beetle")
	FDojoS5OnBeetleDefeated OnDefeated;

	/** Moves the beetle to a spot and shows it, with collision on. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Wake(const FVector& Location);

	/** Hides the beetle and turns its collision off, so it costs nothing while it waits. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Sleep();

	/** Swats the beetle: an awake beetle announces it, a sleeping one ignores it. */
	UFUNCTION(BlueprintCallable, Category = "Beetle")
	void Defeat();

	/** True between Wake and Sleep. */
	UFUNCTION(BlueprintPure, Category = "Beetle")
	bool IsAwake() const;

private:
	bool bAwake = false;
};
```

## DojoS5Beetle.cpp

```cpp
#include "DojoS5Beetle.h"

#include "Components/TextRenderComponent.h"

ADojoS5Beetle::ADojoS5Beetle()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Body"));
	RootComponent = Body;
	Body->SetHorizontalAlignment(EHTA_Center);
	Body->SetText(FText::FromString(TEXT("beetle")));
}

void ADojoS5Beetle::Wake(const FVector& Location)
{
	SetActorLocation(Location);
	SetActorHiddenInGame(false);
	SetActorEnableCollision(true);
	bAwake = true;
}

void ADojoS5Beetle::Sleep()
{
	SetActorHiddenInGame(true);
	SetActorEnableCollision(false);
	bAwake = false;
}

void ADojoS5Beetle::Defeat()
{
	if (bAwake)
	{
		OnDefeated.Broadcast(this);
	}
}

bool ADojoS5Beetle::IsAwake() const
{
	return bAwake;
}
```

## DojoS5PoolComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DojoS5PoolComponent.generated.h"

class ADojoS5Beetle;

/** Keeps every beetle it ever made and wakes a sleeping one before it spawns another, up to a fixed size; any actor can carry one. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS5PoolComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off and spawns plain beetles until a designer picks a Blueprint child. */
	UDojoS5PoolComponent();

	/** What kind of beetle the pool spawns when it needs a new one. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pool")
	TSubclassOf<ADojoS5Beetle> BeetleClass;

	/** The most beetles the pool will ever make. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Pool", meta = (ClampMin = "1"))
	int32 MaxSize = 4;

	/** Spawns sleeping beetles ahead of time, up to Count in all and never past MaxSize. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	void Prewarm(int32 Count);

	/** Wakes a beetle at Location: the first sleeping one, or a new one while the pool is not full; null when every beetle is busy. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	ADojoS5Beetle* Acquire(const FVector& Location);

	/** Puts one of this pool's awake beetles back to sleep; false for anything else. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	bool Release(ADojoS5Beetle* Beetle);

	/** Puts every awake beetle back to sleep. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	void ReleaseAll();

	/** How many beetles the pool has spawned so far, awake or asleep. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetCreatedCount() const;

	/** How many of the pool's beetles are awake. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetAwakeCount() const;

	/** The awake beetles, in the order the pool made them. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	TArray<ADojoS5Beetle*> GetAwakeBeetles() const;

protected:
	/** Destroys the pool's beetles when the pool itself is removed; on a level change the level takes them along. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Spawns one beetle, puts it to sleep, and remembers it; null when the pool is full or cannot spawn. */
	ADojoS5Beetle* SpawnSleeping();

	UPROPERTY()
	TArray<TObjectPtr<ADojoS5Beetle>> Beetles;
};
```

## DojoS5PoolComponent.cpp

```cpp
#include "DojoS5PoolComponent.h"

#include "DojoS5Beetle.h"
#include "Engine/World.h"

UDojoS5PoolComponent::UDojoS5PoolComponent()
{
	PrimaryComponentTick.bCanEverTick = false;

	BeetleClass = ADojoS5Beetle::StaticClass();
}

void UDojoS5PoolComponent::Prewarm(int32 Count)
{
	while (Beetles.Num() < FMath::Min(Count, MaxSize))
	{
		if (SpawnSleeping() == nullptr)
		{
			return;
		}
	}
}

ADojoS5Beetle* UDojoS5PoolComponent::Acquire(const FVector& Location)
{
	ADojoS5Beetle* Chosen = nullptr;

	// Your code: choose the first beetle in Beetles that is still valid and asleep.
	// Your code: when none is asleep, spawn a new one with SpawnSleeping; it returns null when the pool is full.
	// Your code: wake the chosen beetle at Location and return it, or return null when there is none.
	return nullptr;
}

bool UDojoS5PoolComponent::Release(ADojoS5Beetle* Beetle)
{
	// Your code: refuse null, beetles this pool did not make, and beetles that are already asleep.
	// Your code: put the beetle to sleep and report that it went back.
	return false;
}

void UDojoS5PoolComponent::ReleaseAll()
{
	for (ADojoS5Beetle* Beetle : Beetles)
	{
		if (IsValid(Beetle) && Beetle->IsAwake())
		{
			Beetle->Sleep();
		}
	}
}

int32 UDojoS5PoolComponent::GetCreatedCount() const
{
	return Beetles.Num();
}

int32 UDojoS5PoolComponent::GetAwakeCount() const
{
	return GetAwakeBeetles().Num();
}

TArray<ADojoS5Beetle*> UDojoS5PoolComponent::GetAwakeBeetles() const
{
	TArray<ADojoS5Beetle*> Awake;

	for (ADojoS5Beetle* Beetle : Beetles)
	{
		if (IsValid(Beetle) && Beetle->IsAwake())
		{
			Awake.Add(Beetle);
		}
	}

	return Awake;
}

void UDojoS5PoolComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (EndPlayReason == EEndPlayReason::Destroyed || EndPlayReason == EEndPlayReason::RemovedFromWorld)
	{
		for (ADojoS5Beetle* Beetle : Beetles)
		{
			if (IsValid(Beetle))
			{
				Beetle->Destroy();
			}
		}

		Beetles.Empty();
	}

	Super::EndPlay(EndPlayReason);
}

ADojoS5Beetle* UDojoS5PoolComponent::SpawnSleeping()
{
	UWorld* World = GetWorld();

	if (World == nullptr || BeetleClass == nullptr || Beetles.Num() >= MaxSize)
	{
		return nullptr;
	}

	FActorSpawnParameters Parameters;
	Parameters.Owner = GetOwner();
	Parameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	const FVector Where = GetOwner() != nullptr ? GetOwner()->GetActorLocation() : FVector::ZeroVector;
	ADojoS5Beetle* Beetle = World->SpawnActor<ADojoS5Beetle>(BeetleClass, Where, FRotator::ZeroRotator, Parameters);

	if (Beetle == nullptr)
	{
		return nullptr;
	}

	Beetle->Sleep();
	Beetles.Add(Beetle);
	return Beetle;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s5-pool/DojoS5Beetle.h"
#include "Quests/s5-pool/DojoS5PoolComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoS5PoolTest
{
	/** A burrow actor carrying a pool of the given size. */
	UDojoS5PoolComponent* MakePool(FDojoTestWorld& TestWorld, int32 MaxSize)
	{
		ADojoTestActor* Burrow = TestWorld.SpawnActor<ADojoTestActor>();
		UDojoS5PoolComponent* Pool = TestWorld.AddComponent<UDojoS5PoolComponent>(Burrow);
		if (Pool != nullptr)
		{
			Pool->MaxSize = MaxSize;
		}
		return Pool;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_Pool_WakeBeforeSpawning, "Dojo.S5.Pool.WakeBeforeSpawning", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Wakes three beetles from a pool of three, is refused a fourth, gives one back, and gets the same beetle again at a new spot. */
bool FDojo_S5_Pool_WakeBeforeSpawning::RunTest(const FString& Parameters)
{
	using namespace DojoS5PoolTest;

	FDojoTestWorld TestWorld;
	UDojoS5PoolComponent* Pool = MakePool(TestWorld, 3);
	if (!TestNotNull(TEXT("Pool added"), Pool)) return false;

	const FVector First(100.f, 0.f, 0.f);
	const FVector Later(0.f, 500.f, 0.f);

	ADojoS5Beetle* Ant = Pool->Acquire(First);
	if (!TestNotNull(TEXT("An empty pool spawns a beetle"), Ant)) return false;
	TestTrue(TEXT("The beetle is awake"), Ant->IsAwake());
	TestFalse(TEXT("The beetle is shown"), Ant->IsHidden());
	TestTrue(TEXT("The beetle can be hit"), Ant->GetActorEnableCollision());
	TestEqual(TEXT("The beetle is at the spot"), Ant->GetActorLocation(), First);
	TestEqual(TEXT("One beetle made"), Pool->GetCreatedCount(), 1);

	ADojoS5Beetle* Bee = Pool->Acquire(First);
	ADojoS5Beetle* Cricket = Pool->Acquire(First);
	TestTrue(TEXT("Three different beetles"), Bee != nullptr && Cricket != nullptr && Bee != Ant && Cricket != Bee && Cricket != Ant);
	TestEqual(TEXT("Three beetles made"), Pool->GetCreatedCount(), 3);
	TestEqual(TEXT("Three beetles awake"), Pool->GetAwakeCount(), 3);

	TestNull(TEXT("A full pool with every beetle busy gives nothing"), Pool->Acquire(First));
	TestEqual(TEXT("A refused request spawns nothing"), Pool->GetCreatedCount(), 3);

	TestTrue(TEXT("An awake beetle of the pool goes back"), Pool->Release(Bee));
	TestFalse(TEXT("It is asleep"), Bee->IsAwake());
	TestTrue(TEXT("It is hidden"), Bee->IsHidden());
	TestFalse(TEXT("It cannot be hit"), Bee->GetActorEnableCollision());
	TestFalse(TEXT("It is not destroyed"), Bee->IsActorBeingDestroyed());
	TestEqual(TEXT("Two beetles awake"), Pool->GetAwakeCount(), 2);
	TestFalse(TEXT("A sleeping beetle cannot go back twice"), Pool->Release(Bee));

	ADojoS5Beetle* Again = Pool->Acquire(Later);
	TestTrue(TEXT("The pool wakes the beetle it took back"), Again == Bee);
	TestEqual(TEXT("At the new spot"), Bee->GetActorLocation(), Later);
	TestTrue(TEXT("Awake again"), Bee->IsAwake());
	TestEqual(TEXT("Still only three beetles made"), Pool->GetCreatedCount(), 3);

	TestFalse(TEXT("Nothing to give back"), Pool->Release(nullptr));

	ADojoS5Beetle* Stranger = TestWorld.SpawnActor<ADojoS5Beetle>();
	if (!TestNotNull(TEXT("A beetle from elsewhere spawned"), Stranger)) return false;
	Stranger->Wake(First);
	TestFalse(TEXT("A beetle the pool did not make is refused"), Pool->Release(Stranger));
	TestTrue(TEXT("And left awake"), Stranger->IsAwake());
	TestEqual(TEXT("The pool's awake count is unchanged"), Pool->GetAwakeCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_Pool_FirstSleeperFirst, "Dojo.S5.Pool.FirstSleeperFirst", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts the first and third beetles to sleep and checks they wake again in the order the pool made them. */
bool FDojo_S5_Pool_FirstSleeperFirst::RunTest(const FString& Parameters)
{
	using namespace DojoS5PoolTest;

	FDojoTestWorld TestWorld;
	UDojoS5PoolComponent* Pool = MakePool(TestWorld, 3);
	if (!TestNotNull(TEXT("Pool added"), Pool)) return false;

	ADojoS5Beetle* One = Pool->Acquire(FVector::ZeroVector);
	ADojoS5Beetle* Two = Pool->Acquire(FVector::ZeroVector);
	ADojoS5Beetle* Three = Pool->Acquire(FVector::ZeroVector);
	if (!TestNotNull(TEXT("Three beetles"), Three)) return false;

	Pool->Release(Three);
	Pool->Release(One);

	TestTrue(TEXT("The first beetle made wakes first"), Pool->Acquire(FVector::ZeroVector) == One);
	TestTrue(TEXT("Then the third"), Pool->Acquire(FVector::ZeroVector) == Three);
	TestTrue(TEXT("The second never slept"), Two->IsAwake());
	TestEqual(TEXT("Three beetles made"), Pool->GetCreatedCount(), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S5_Pool_PrewarmAndLeave, "Dojo.S5.Pool.PrewarmAndLeave", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Prewarms a pool, wakes from it without spawning, sends everything back, and checks the beetles leave with the pool's owner. */
bool FDojo_S5_Pool_PrewarmAndLeave::RunTest(const FString& Parameters)
{
	using namespace DojoS5PoolTest;

	FDojoTestWorld TestWorld;
	UDojoS5PoolComponent* Pool = MakePool(TestWorld, 3);
	if (!TestNotNull(TEXT("Pool added"), Pool)) return false;

	Pool->Prewarm(2);
	TestEqual(TEXT("Two beetles made ahead of time"), Pool->GetCreatedCount(), 2);
	TestEqual(TEXT("Both are asleep"), Pool->GetAwakeCount(), 0);

	ADojoS5Beetle* Woken = Pool->Acquire(FVector(0.f, 0.f, 50.f));
	if (!TestNotNull(TEXT("A prewarmed beetle wakes"), Woken)) return false;
	TestEqual(TEXT("Waking a prewarmed beetle spawns nothing"), Pool->GetCreatedCount(), 2);

	Pool->Prewarm(10);
	TestEqual(TEXT("Prewarming stops at the pool's size"), Pool->GetCreatedCount(), 3);
	TestEqual(TEXT("Prewarming wakes nothing"), Pool->GetAwakeCount(), 1);

	Pool->Acquire(FVector::ZeroVector);
	Pool->ReleaseAll();
	TestEqual(TEXT("Every beetle went back"), Pool->GetAwakeCount(), 0);
	TestFalse(TEXT("Going back destroys nothing"), Woken->IsActorBeingDestroyed());

	Pool->GetOwner()->Destroy();
	TestTrue(TEXT("The pool's beetles leave with it"), Woken->IsActorBeingDestroyed());

	return true;
}

#endif
```

# Hints

- Acquire has one decision and one action: decide which beetle (an old one if any sleeps, otherwise a new one if the pool is not full), then wake it. Keep the spawning inside the helper; the pool's size limit already lives there.
- `IsAwake` tells a sleeping beetle from a busy one, and `IsValid` skips a beetle something else destroyed. `TArray::Contains` answers whether a beetle is one of the pool's own.
- Release must leave the beetle in the pool's array. A beetle removed from it, or destroyed, is a beetle the pool will spawn again next time, which is the cost a pool exists to avoid.

# Rubric

- Acquire wakes the first sleeping beetle in the order they were made, and spawns a new one only when none sleeps.
- The pool never makes more than `MaxSize` beetles, and a request it cannot serve returns null and spawns nothing.
- A woken beetle is at the requested spot, shown, and can be hit.
- Release only takes back the pool's own awake beetles, puts them to sleep without destroying them, and refuses everything else.
- The pool keeps every beetle it made in a `UPROPERTY` array and only destroys them when the pool itself is removed.
- The pool points at its beetles and a beetle knows nothing about the pool; it only announces a swat.

# Alternative

The plain way is `SpawnActor` for every beetle and `Destroy` when it is swatted. It is shorter and fine for a few actors a minute, but each spawn runs constructors, registers components, and leaves garbage for the collector, and a busy wave pays that at the worst moment. The pool pays once, up front with `Prewarm` or on first use, and later waves cost only a move and two flags. The price is that a woken beetle must be reset by hand: anything the last fight changed, such as health or a timer, has to be put back in `Wake`, or the old fight leaks into the new one. This is the Object Pool pattern, and Unreal has no general actor pool built in, so games write one like this, often as a world subsystem shared by every spawner.

# Parsons

```yaml
- id: pool-release
  prompt: Put Release in order.
  lines:
    - "bool UDojoS5PoolComponent::Release(ADojoS5Beetle* Beetle)"
    - "{"
    - "	if (!IsValid(Beetle) || !Beetle->IsAwake() || !Beetles.Contains(Beetle))"
    - "	{"
    - "		return false;"
    - "	}"
    - "	Beetle->Sleep();"
    - "	return true;"
    - "}"
  distractors:
    - line: "	Beetle->Destroy();"
      mistake: Destroy removes the actor from the world, so the next Acquire has to spawn a new one; a pool puts the beetle to sleep instead.
    - line: "	Beetles.Remove(Beetle);"
      mistake: Removing the beetle from the array makes the pool forget it; it stays hidden in the level forever and the pool spawns a replacement.
```
