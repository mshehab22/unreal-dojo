---
id: s2-energy
title: An energy pool that refills on a timer
order: 4
kind: build
scaffold: faded
difficulty: 3
patterns: [component, observer]
skills: [components, timers, delegates]
terms: [actor-component, timer-manager, timer-handle, dynamic-multicast-delegate, broadcast, endplay]
prerequisites: [s2-ability-data]
xp: 80
estimatedMinutes: 25
concepts:
  - Spending through a question and an action that refuses what it cannot pay
  - Energy that comes back on a looping timer that runs only below the top
  - One announcement per change, sent after the pool holds its new value
---

# Brief

When a hero with a pool of 100 that refills 5 every half second spends 30, the pool reads 70 at once, 75 half a second later, and 100 three seconds after the spend, when the refilling stops by itself; spending more than is left is refused and changes nothing, and a listener hears exactly one notice per change.

Compiles against earlier quests: none. The pool stands alone, so a shield, a stamina bar, or a second hero can carry one.

The question, the refill, and the timer cleanup are written for you. Fill the two bodies that are left:

1. `Spend`: refuse what cannot be paid. Otherwise take the amount out, announce the change, and make sure energy is coming back. A spend while energy is already coming back must not push the next refill step later.
2. `RegenStep`: the timer calls this every `RegenInterval` seconds. Add `RegenAmount`, never past `MaxEnergy`, announce the change, and stop the timer once the pool is full.

The pool holds no pointer to any listener: listeners subscribe to `OnEnergyChanged`, and the notice carries the pool itself. `UDojoS2EnergySpy` is a ready-made listener that the tests use to count notices and to read the energy at the moment each one arrives.

A first version could add energy in `TickComponent` with a frame counter. A timer is better here because a full pool, which is most of the time, then costs nothing at all, and the refill step happens on the same half second whatever the frame rate.

This is the second piece of the Sparring Ring boss.

## See it in the editor

Make a Blueprint actor `BP_Sparrer` with a `DojoS2EnergyComponent` and place one in the level. In the level Blueprint, with it selected, get the component with Get Component by Class. On BeginPlay bind a custom event to its On Energy Changed that prints Get Energy, and on the 1 key call Spend with 30. Press Play and press 1: it prints 70, then 75, 80, and so on twice a second until 100, and then nothing more. Press 1 four times quickly: the fourth press prints nothing, because 10 is not enough.

# Files

## DojoS2EnergyComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/TimerHandle.h"
#include "DojoS2EnergyComponent.generated.h"

class UDojoS2EnergyComponent;

/** Broadcast after the energy changed, with the component itself so one handler can serve many users. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoS2OnEnergyChanged, UDojoS2EnergyComponent*, EnergySource);

/** A pool of energy any actor can carry (the Component pattern): it is spent in whole points, comes back on a timer while it is below full, and announces every change like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS2EnergyComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off, since energy comes back on a timer, and asks for InitializeComponent. */
	UDojoS2EnergyComponent();

	/** The most energy the pool holds; it starts full. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "1"))
	int32 MaxEnergy = 100;

	/** Energy that comes back each time the regen timer fires. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "0"))
	int32 RegenAmount = 5;

	/** Seconds between two regen steps. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Energy", meta = (ClampMin = "0.05"))
	float RegenInterval = 0.5f;

	/** Fires once for every change to the energy, after the pool holds its new value. */
	UPROPERTY(BlueprintAssignable, Category = "Energy")
	FDojoS2OnEnergyChanged OnEnergyChanged;

	/** The energy in the pool now. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	int32 GetEnergy() const;

	/** True when Amount is 0 or more and the pool holds at least that much. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	bool CanSpend(int32 Amount) const;

	/** Takes Amount out of the pool if it can be paid, and returns whether it was. */
	UFUNCTION(BlueprintCallable, Category = "Energy")
	bool Spend(int32 Amount);

	/** Fills the pool to the top at once and stops the regen timer. */
	UFUNCTION(BlueprintCallable, Category = "Energy")
	void Refill();

	/** True while the regen timer is running. */
	UFUNCTION(BlueprintPure, Category = "Energy")
	bool IsRegenerating() const;

	/** Fills the pool before any part's BeginPlay can spend from it. */
	virtual void InitializeComponent() override;

protected:
	/** Stops the regen timer. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** One regen step: some energy comes back, and the timer stops once the pool is full. */
	void RegenStep();

	int32 Energy = 0;

	FTimerHandle RegenTimer;
};
```

## DojoS2EnergyComponent.cpp

```cpp
#include "DojoS2EnergyComponent.h"

#include "Engine/World.h"
#include "TimerManager.h"

UDojoS2EnergyComponent::UDojoS2EnergyComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
	bWantsInitializeComponent = true;
}

void UDojoS2EnergyComponent::InitializeComponent()
{
	Super::InitializeComponent();

	Energy = MaxEnergy;
}

void UDojoS2EnergyComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().ClearTimer(RegenTimer);
	}

	Super::EndPlay(EndPlayReason);
}

int32 UDojoS2EnergyComponent::GetEnergy() const
{
	return Energy;
}

bool UDojoS2EnergyComponent::CanSpend(int32 Amount) const
{
	return Amount >= 0 && Amount <= Energy;
}

bool UDojoS2EnergyComponent::Spend(int32 Amount)
{
	// Your code: refuse what cannot be paid. Spending 0 succeeds and changes nothing, so it announces nothing.
	// Your code: take the amount out of the pool and announce the change, once.
	// Your code: make sure the regen timer runs, without restarting a timer that is already running. A pool with RegenAmount 0 never refills.
	return false;
}

void UDojoS2EnergyComponent::Refill()
{
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().ClearTimer(RegenTimer);
	}

	if (Energy == MaxEnergy)
	{
		return;
	}

	Energy = MaxEnergy;
	OnEnergyChanged.Broadcast(this);
}

bool UDojoS2EnergyComponent::IsRegenerating() const
{
	const UWorld* World = GetWorld();
	return World != nullptr && World->GetTimerManager().IsTimerActive(RegenTimer);
}

void UDojoS2EnergyComponent::RegenStep()
{
	// Your code: add RegenAmount, never past MaxEnergy.
	// Your code: once the pool is full, stop the regen timer.
	// Your code: announce the change.
}
```

## DojoS2EnergySpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS2EnergySpy.generated.h"

class UDojoS2EnergyComponent;

/** A listener that counts an energy pool's change notices and remembers the energy it read at the last one; it only subscribes. */
UCLASS()
class UDojoS2EnergySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the pool's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Energy Spy")
	void Watch(UDojoS2EnergyComponent* Pool);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Energy Spy")
	int32 GetNoticeCount() const;

	/** The energy read from the pool at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Energy Spy")
	int32 GetEnergyAtLastNotice() const;

private:
	/** Counts the notice and reads the energy from the pool that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS2EnergyComponent* EnergySource);

	int32 NoticeCount = 0;
	int32 EnergyAtLastNotice = 0;
};
```

## DojoS2EnergySpy.cpp

```cpp
#include "DojoS2EnergySpy.h"

#include "DojoS2EnergyComponent.h"

void UDojoS2EnergySpy::Watch(UDojoS2EnergyComponent* Pool)
{
	if (Pool == nullptr)
	{
		return;
	}

	Pool->OnEnergyChanged.AddUniqueDynamic(this, &UDojoS2EnergySpy::HandleChanged);
}

int32 UDojoS2EnergySpy::GetNoticeCount() const
{
	return NoticeCount;
}

int32 UDojoS2EnergySpy::GetEnergyAtLastNotice() const
{
	return EnergyAtLastNotice;
}

void UDojoS2EnergySpy::HandleChanged(UDojoS2EnergyComponent* EnergySource)
{
	++NoticeCount;
	EnergyAtLastNotice = EnergySource->GetEnergy();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s2-energy/DojoS2EnergyComponent.h"
#include "Quests/s2-energy/DojoS2EnergySpy.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS2EnergyTest
{
	/** A pool of 100 that refills 5 every half second, on a fresh actor. */
	UDojoS2EnergyComponent* MakePool(FDojoTestWorld& TestWorld)
	{
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		UDojoS2EnergyComponent* Pool = NewObject<UDojoS2EnergyComponent>(Owner);
		Pool->MaxEnergy = 100;
		Pool->RegenAmount = 5;
		Pool->RegenInterval = 0.5f;
		Owner->AddInstanceComponent(Pool);
		Pool->RegisterComponent();
		return Pool;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Energy_SpendsAndRefuses, "Dojo.S2.Energy.SpendsAndRefuses", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spends what can be paid, refuses what cannot, and checks one notice per change, sent after the change. */
bool FDojo_S2_Energy_SpendsAndRefuses::RunTest(const FString& Parameters)
{
	using namespace DojoS2EnergyTest;

	FDojoTestWorld TestWorld;
	UDojoS2EnergyComponent* Pool = MakePool(TestWorld);
	if (!TestNotNull(TEXT("Pool created"), Pool)) return false;

	TStrongObjectPtr<UDojoS2EnergySpy> Spy(NewObject<UDojoS2EnergySpy>());
	Spy->Watch(Pool);
	Spy->Watch(Pool);

	TestEqual(TEXT("The pool starts full"), Pool->GetEnergy(), 100);
	TestFalse(TEXT("A full pool is not refilling"), Pool->IsRegenerating());
	TestFalse(TEXT("The pool does not tick"), Pool->PrimaryComponentTick.bCanEverTick);

	TestTrue(TEXT("Spending 30 of 100 works"), Pool->Spend(30));
	TestEqual(TEXT("70 is left"), Pool->GetEnergy(), 70);
	TestEqual(TEXT("One notice"), Spy->GetNoticeCount(), 1);
	TestEqual(TEXT("The notice came after the spend"), Spy->GetEnergyAtLastNotice(), 70);
	TestTrue(TEXT("A spent pool is refilling"), Pool->IsRegenerating());

	TestTrue(TEXT("70 can be spent"), Pool->CanSpend(70));
	TestFalse(TEXT("71 cannot"), Pool->CanSpend(71));
	TestFalse(TEXT("Spending 80 of 70 is refused"), Pool->Spend(80));
	TestFalse(TEXT("A negative spend is refused"), Pool->Spend(-5));
	TestEqual(TEXT("Refusals change nothing"), Pool->GetEnergy(), 70);
	TestEqual(TEXT("Refusals announce nothing"), Spy->GetNoticeCount(), 1);

	TestTrue(TEXT("Spending 0 works"), Pool->Spend(0));
	TestEqual(TEXT("Spending 0 changes nothing"), Pool->GetEnergy(), 70);
	TestEqual(TEXT("Spending 0 announces nothing"), Spy->GetNoticeCount(), 1);

	TestTrue(TEXT("Spending everything works"), Pool->Spend(70));
	TestEqual(TEXT("The pool is empty"), Pool->GetEnergy(), 0);
	TestEqual(TEXT("Two notices"), Spy->GetNoticeCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Energy_ComesBackOnATimer, "Dojo.S2.Energy.ComesBackOnATimer", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spends 30 and watches it come back 5 at a time until the pool is full and the timer stops. */
bool FDojo_S2_Energy_ComesBackOnATimer::RunTest(const FString& Parameters)
{
	using namespace DojoS2EnergyTest;

	FDojoTestWorld TestWorld;
	UDojoS2EnergyComponent* Pool = MakePool(TestWorld);
	if (!TestNotNull(TEXT("Pool created"), Pool)) return false;

	TStrongObjectPtr<UDojoS2EnergySpy> Spy(NewObject<UDojoS2EnergySpy>());
	Spy->Watch(Pool);

	Pool->Spend(30);

	TestWorld.Tick(25);
	TestEqual(TEXT("Nothing comes back before half a second"), Pool->GetEnergy(), 70);

	TestWorld.Tick(7);
	TestEqual(TEXT("5 came back after half a second"), Pool->GetEnergy(), 75);
	TestEqual(TEXT("The step was announced"), Spy->GetEnergyAtLastNotice(), 75);

	TestWorld.Tick(30);
	TestEqual(TEXT("5 more after a second"), Pool->GetEnergy(), 80);

	TestWorld.Tick(124);
	TestEqual(TEXT("Full three seconds after the spend"), Pool->GetEnergy(), 100);
	TestFalse(TEXT("The timer stopped at the top"), Pool->IsRegenerating());
	TestEqual(TEXT("One notice for the spend and one per step"), Spy->GetNoticeCount(), 7);

	TestWorld.Tick(60);
	TestEqual(TEXT("A full pool stays full"), Pool->GetEnergy(), 100);
	TestEqual(TEXT("And announces nothing more"), Spy->GetNoticeCount(), 7);

	Pool->Spend(3);
	TestWorld.Tick(32);
	TestEqual(TEXT("The last step stops at the top"), Pool->GetEnergy(), 100);
	TestFalse(TEXT("And the timer stops with it"), Pool->IsRegenerating());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Energy_SpendAgainMidRefill, "Dojo.S2.Energy.SpendAgainMidRefill", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A second spend while energy is coming back keeps the refill steps on their half seconds. */
bool FDojo_S2_Energy_SpendAgainMidRefill::RunTest(const FString& Parameters)
{
	using namespace DojoS2EnergyTest;

	FDojoTestWorld TestWorld;
	UDojoS2EnergyComponent* Pool = MakePool(TestWorld);
	if (!TestNotNull(TEXT("Pool created"), Pool)) return false;

	Pool->Spend(10);
	TestWorld.Tick(18);
	Pool->Spend(10);
	TestEqual(TEXT("Two spends leave 80"), Pool->GetEnergy(), 80);

	TestWorld.Tick(15);
	TestEqual(TEXT("The first step still came half a second after the first spend"), Pool->GetEnergy(), 85);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_Energy_Refill, "Dojo.S2.Energy.Refill", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Refill fills the pool at once, stops the timer, and announces only a real change; a pool with no regen stays down. */
bool FDojo_S2_Energy_Refill::RunTest(const FString& Parameters)
{
	using namespace DojoS2EnergyTest;

	FDojoTestWorld TestWorld;
	UDojoS2EnergyComponent* Pool = MakePool(TestWorld);
	if (!TestNotNull(TEXT("Pool created"), Pool)) return false;

	TStrongObjectPtr<UDojoS2EnergySpy> Spy(NewObject<UDojoS2EnergySpy>());
	Spy->Watch(Pool);

	Pool->Spend(50);
	Pool->Refill();
	TestEqual(TEXT("Refill fills the pool"), Pool->GetEnergy(), 100);
	TestFalse(TEXT("Refill stops the timer"), Pool->IsRegenerating());
	TestEqual(TEXT("One notice for the spend and one for the refill"), Spy->GetNoticeCount(), 2);

	Pool->Refill();
	TestEqual(TEXT("Refilling a full pool announces nothing"), Spy->GetNoticeCount(), 2);

	TestWorld.Tick(60);
	TestEqual(TEXT("No steps arrive after a refill"), Spy->GetNoticeCount(), 2);

	Pool->RegenAmount = 0;
	Pool->Spend(40);
	TestWorld.Tick(120);
	TestEqual(TEXT("A pool with no regen stays at 60"), Pool->GetEnergy(), 60);
	TestFalse(TEXT("And runs no timer"), Pool->IsRegenerating());

	return true;
}

#endif
```

# Hints

- Spend has three jobs after the check, and the order matters for listeners: a listener that reads the pool when the notice arrives must see the new value.
- `FTimerManager::SetTimer` with looping set to true calls a function again and again until `ClearTimer`; `IsTimerActive` tells you whether a handle's timer is running. Setting a timer on a handle that is already running replaces it and starts its wait from zero.
- `FMath::Min` keeps the refill from passing `MaxEnergy`. `ClearTimer` on the world's timer manager, given the regen handle, stops the loop once the pool is full.

# Rubric

- `Spend` refuses negative amounts and amounts above the energy, and a refusal changes nothing and announces nothing.
- Energy comes back `RegenAmount` at a time every `RegenInterval` seconds, never past `MaxEnergy`, on a timer and never from Tick.
- The timer runs only while the pool is below full, and a second spend does not delay the next step.
- `OnEnergyChanged` is broadcast once per change, after the pool holds its new value.
- The pool holds no pointer to its listeners and knows nothing about abilities.

# Alternative

Energy could be a float that `TickComponent` raises by `RegenPerSecond * DeltaTime` every frame. That gives a smooth bar, which some games want, but the component then runs every frame of the game even when the pool is full, and a board listening for changes would get a notice every frame. Whole points on a timer step in visible chunks, cost nothing at the top, and send one notice per step. A middle road keeps the timer but stores the time the pool was last full and works out the energy when asked, which is how many games refill thousands of pools cheaply. The pool is the Component pattern from Pack 2's "Actors built from parts" world, and its announcements are Observer from Pack 2's first world.

# Parsons

```yaml
- id: energy-regen-step
  prompt: Put RegenStep in order.
  lines:
    - "void UDojoS2EnergyComponent::RegenStep()"
    - "{"
    - "	Energy = FMath::Min(MaxEnergy, Energy + RegenAmount);"
    - "	if (Energy >= MaxEnergy)"
    - "	{"
    - "		GetWorld()->GetTimerManager().ClearTimer(RegenTimer);"
    - "	}"
    - "	OnEnergyChanged.Broadcast(this);"
    - "}"
  distractors:
    - line: "	Energy = FMath::Max(MaxEnergy, Energy + RegenAmount);"
      mistake: Max picks the larger number, which jumps the pool straight to the top or above it; the cap needs Min.
    - line: "		RegenTimer.Invalidate();"
      mistake: Invalidating the handle only forgets which timer it was; the timer keeps firing. ClearTimer on the timer manager stops it.
```
