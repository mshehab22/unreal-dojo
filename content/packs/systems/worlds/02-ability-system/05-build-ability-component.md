---
id: s2-ability-component
title: A component that decides which abilities may start
order: 5
kind: build
scaffold: stub
difficulty: 4
patterns: [component, observer]
skills: [components, timers, delegates, tags]
terms: [actor-component, gameplay-tags, timer-manager, timer-delegate, timer-handle, tmap, dynamic-multicast-delegate]
prerequisites: [s2-energy, s2-ability-data]
xp: 100
estimatedMinutes: 35
concepts:
  - Every reason to refuse a start is checked before anything changes
  - A timer per cooldown and per run, each remembering which ability it is for
  - Tags that stay on the user exactly as long as an ability runs
---

# Brief

When a hero granted a Dash that costs 20 and waits 1.5 seconds presses it, the pool drops by 20 and Dash reports 1.5 seconds left, a second press does nothing and costs nothing, and 1.5 seconds later a listener hears that Dash is ready; while a Shockwave runs and roots the hero, a Dash blocked by the rooted tag is refused.

Compiles against earlier quests: s2-energy (`Quests/s2-energy/DojoS2EnergyComponent.h`) and s2-ability-data (`Quests/s2-ability-data/DojoS2AbilityData.h`, `Quests/s2-ability-data/DojoS2AbilityTags.h`).

The class declaration is given, and so is a ready-made listener, `UDojoS2AbilitySpy`. Every function body in `DojoS2AbilityComponent.cpp` is yours:

- `UseEnergy` chooses the pool that costs are paid from, and `Grant` gives the user an ability (false for null or one it already has).
- `CanActivate` is true when the ability is granted, not cooling down, not running, not blocked by the tags the user carries now, and affordable. An ability that costs energy needs a pool that can pay; a free one needs no pool at all.
- `TryActivate` starts the ability when `CanActivate` allows it: it pays the cost, starts the cooldown if the ability has one, and puts the ability's `GrantedTags` on the user for its `Duration` if it has one. Then it announces `OnCooldownChanged` (when a cooldown started) and `OnAbilityActivated`, after everything is in place. It returns whether the ability started.
- When a cooldown ends, `OnCooldownChanged` fires again, and a listener asking `IsOnCooldown` at that moment hears false. When a run ends, that ability's tags leave the user.
- `IsOnCooldown`, `GetCooldownRemaining`, `IsRunning`, and `GetActiveTags` answer about the present.
- `ResetAll` ends every cooldown and every run at once, for a new round, announcing each cooldown that ended; none of the timers it ended may fire later. `EndPlay` stops every timer.

A timer can call a function with an argument: `FTimerDelegate::CreateUObject(this, &UDojoS2AbilityComponent::EndCooldown, Ability)` builds a delegate that remembers which ability it is for, and `SetTimer` takes it with a handle, a time, and false for no loop. The maps in the header keep one handle per ability.

Dependency direction: the ability component holds the pointer to the energy pool and reads the ability assets. The pool and the assets know nothing about it, and listeners subscribe to its two events.

Write it the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

This is the third piece of the Sparring Ring boss.

## See it in the editor

Give `BP_Sparrer` a `DojoS2AbilityComponent` next to its energy component, and make `DA_Shockwave` (Energy Cost 40, Cooldown 3, Duration 1, Granted Tags `DojoS2.State.Rooted`). In the level Blueprint, get both components with Get Component by Class; on BeginPlay call Use Energy, then Grant with `DA_Dash` and `DA_Shockwave`, and bind a custom event to On Cooldown Changed that prints the ability's Display Name and Is On Cooldown. On the 1 key call Try Activate with `DA_Dash` and print the result; on the 2 key the same with `DA_Shockwave`. Press Play: 1 prints true and then the cooldown line, a quick second 1 prints false, and the ready line follows a second later; press 2 and then 1 at once, and the dash prints false until the shockwave's second is over.

# Files

## DojoS2AbilityComponent.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/TimerHandle.h"
#include "GameplayTagContainer.h"
#include "DojoS2AbilityComponent.generated.h"

class UDojoS2AbilityComponent;
class UDojoS2AbilityData;
class UDojoS2EnergyComponent;

/** Broadcast after an ability started, with the component and the ability that started. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS2OnAbilityActivated, UDojoS2AbilityComponent*, Abilities, UDojoS2AbilityData*, Ability);

/** Broadcast after an ability's cooldown started or ended, with the component and the ability. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS2OnCooldownChanged, UDojoS2AbilityComponent*, Abilities, UDojoS2AbilityData*, Ability);

/** The abilities an actor has been granted (the Component pattern): it decides whether one may start, pays its energy, runs its cooldown and its tags on timers, and announces each start and each cooldown change like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS2AbilityComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; cooldowns and runs end on timers. */
	UDojoS2AbilityComponent();

	/** Fires once for every ability that starts, after its energy, cooldown, and tags are in place. */
	UPROPERTY(BlueprintAssignable, Category = "Abilities")
	FDojoS2OnAbilityActivated OnAbilityActivated;

	/** Fires when an ability's cooldown starts and again when it ends. */
	UPROPERTY(BlueprintAssignable, Category = "Abilities")
	FDojoS2OnCooldownChanged OnCooldownChanged;

	/** Chooses the energy pool that ability costs are paid from. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	void UseEnergy(UDojoS2EnergyComponent* NewEnergy);

	/** Gives the user an ability; false for null or one it already has. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	bool Grant(UDojoS2AbilityData* Ability);

	/** True when the ability has been granted. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool HasAbility(UDojoS2AbilityData* Ability) const;

	/** True when the ability is granted, not cooling down, not running, not blocked by the user's tags, and affordable. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool CanActivate(UDojoS2AbilityData* Ability) const;

	/** Starts the ability if it can start: pays its energy, starts its cooldown, puts its tags on the user for its run, and announces it. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	bool TryActivate(UDojoS2AbilityData* Ability);

	/** True while the ability is cooling down. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool IsOnCooldown(UDojoS2AbilityData* Ability) const;

	/** Seconds until the ability may start again, or 0 when it is not cooling down. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	float GetCooldownRemaining(UDojoS2AbilityData* Ability) const;

	/** True while the ability's run has not ended. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool IsRunning(UDojoS2AbilityData* Ability) const;

	/** The tags the user carries now, from every ability that is running. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	FGameplayTagContainer GetActiveTags() const;

	/** Ends every cooldown and every run at once, for a new round, announcing each cooldown that ended. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	void ResetAll();

protected:
	/** Stops every timer the component started. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The cooldown of one ability is over. */
	void EndCooldown(UDojoS2AbilityData* Ability);

	/** The run of one ability is over, so its tags leave the user. */
	void EndRun(UDojoS2AbilityData* Ability);

	UPROPERTY()
	TObjectPtr<UDojoS2EnergyComponent> Energy = nullptr;

	UPROPERTY()
	TArray<TObjectPtr<UDojoS2AbilityData>> Granted;

	UPROPERTY()
	TMap<TObjectPtr<UDojoS2AbilityData>, FTimerHandle> CooldownTimers;

	UPROPERTY()
	TMap<TObjectPtr<UDojoS2AbilityData>, FTimerHandle> RunTimers;

	UPROPERTY()
	FGameplayTagContainer ActiveTags;
};
```

## DojoS2AbilityComponent.cpp

```cpp
#include "DojoS2AbilityComponent.h"

#include "Engine/World.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"
#include "TimerManager.h"

/** Turns ticking off; cooldowns and runs end on timers. */
UDojoS2AbilityComponent::UDojoS2AbilityComponent()
{
}

/** Chooses the energy pool that ability costs are paid from. */
void UDojoS2AbilityComponent::UseEnergy(UDojoS2EnergyComponent* NewEnergy)
{
}

/** Gives the user an ability; false for null or one it already has. */
bool UDojoS2AbilityComponent::Grant(UDojoS2AbilityData* Ability)
{
	return false;
}

/** True when the ability has been granted. */
bool UDojoS2AbilityComponent::HasAbility(UDojoS2AbilityData* Ability) const
{
	return false;
}

/** True when the ability is granted, not cooling down, not running, not blocked by the user's tags, and affordable. */
bool UDojoS2AbilityComponent::CanActivate(UDojoS2AbilityData* Ability) const
{
	return false;
}

/** Starts the ability if it can start: pays, starts its cooldown and its run, and announces it. */
bool UDojoS2AbilityComponent::TryActivate(UDojoS2AbilityData* Ability)
{
	return false;
}

/** True while the ability is cooling down. */
bool UDojoS2AbilityComponent::IsOnCooldown(UDojoS2AbilityData* Ability) const
{
	return false;
}

/** Seconds until the ability may start again, or 0. */
float UDojoS2AbilityComponent::GetCooldownRemaining(UDojoS2AbilityData* Ability) const
{
	return 0.f;
}

/** True while the ability's run has not ended. */
bool UDojoS2AbilityComponent::IsRunning(UDojoS2AbilityData* Ability) const
{
	return false;
}

/** The tags the user carries now. */
FGameplayTagContainer UDojoS2AbilityComponent::GetActiveTags() const
{
	return FGameplayTagContainer();
}

/** Ends every cooldown and every run at once, announcing each cooldown that ended. */
void UDojoS2AbilityComponent::ResetAll()
{
}

/** Stops every timer the component started. */
void UDojoS2AbilityComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);
}

/** The cooldown of one ability is over. */
void UDojoS2AbilityComponent::EndCooldown(UDojoS2AbilityData* Ability)
{
}

/** The run of one ability is over, so its tags leave the user. */
void UDojoS2AbilityComponent::EndRun(UDojoS2AbilityData* Ability)
{
}
```

## DojoS2AbilitySpy.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "UObject/Object.h"
#include "DojoS2AbilitySpy.generated.h"

class UDojoS2AbilityComponent;
class UDojoS2AbilityData;

/** A listener that counts an ability component's notices and records what the component reported when the last start arrived; it only subscribes. */
UCLASS()
class UDojoS2AbilitySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the component's starts and cooldown changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Ability Spy")
	void Watch(UDojoS2AbilityComponent* Abilities);

	/** How many start notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	int32 GetStartCount() const;

	/** How many cooldown notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	int32 GetCooldownNoticeCount() const;

	/** The ability named by the last start notice. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	UDojoS2AbilityData* GetLastStarted() const;

	/** Whether that ability was already cooling down when its start notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	bool WasCoolingAtLastStart() const;

	/** The user's tags when the last start notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	FGameplayTagContainer GetTagsAtLastStart() const;

private:
	/** Counts the start and reads the component's state for that ability. */
	UFUNCTION()
	void HandleStarted(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	/** Counts the cooldown notice. */
	UFUNCTION()
	void HandleCooldown(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	UPROPERTY()
	TObjectPtr<UDojoS2AbilityData> LastStarted = nullptr;

	FGameplayTagContainer TagsAtLastStart;
	int32 StartCount = 0;
	int32 CooldownNoticeCount = 0;
	bool bWasCoolingAtLastStart = false;
};
```

## DojoS2AbilitySpy.cpp

```cpp
#include "DojoS2AbilitySpy.h"

#include "DojoS2AbilityComponent.h"

void UDojoS2AbilitySpy::Watch(UDojoS2AbilityComponent* Abilities)
{
	if (Abilities == nullptr)
	{
		return;
	}

	Abilities->OnAbilityActivated.AddUniqueDynamic(this, &UDojoS2AbilitySpy::HandleStarted);
	Abilities->OnCooldownChanged.AddUniqueDynamic(this, &UDojoS2AbilitySpy::HandleCooldown);
}

int32 UDojoS2AbilitySpy::GetStartCount() const
{
	return StartCount;
}

int32 UDojoS2AbilitySpy::GetCooldownNoticeCount() const
{
	return CooldownNoticeCount;
}

UDojoS2AbilityData* UDojoS2AbilitySpy::GetLastStarted() const
{
	return LastStarted;
}

bool UDojoS2AbilitySpy::WasCoolingAtLastStart() const
{
	return bWasCoolingAtLastStart;
}

FGameplayTagContainer UDojoS2AbilitySpy::GetTagsAtLastStart() const
{
	return TagsAtLastStart;
}

void UDojoS2AbilitySpy::HandleStarted(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	++StartCount;
	LastStarted = Ability;
	bWasCoolingAtLastStart = Abilities->IsOnCooldown(Ability);
	TagsAtLastStart = Abilities->GetActiveTags();
}

void UDojoS2AbilitySpy::HandleCooldown(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability)
{
	++CooldownNoticeCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/s2-ability-component/DojoS2AbilityComponent.h"
#include "Quests/s2-ability-component/DojoS2AbilitySpy.h"
#include "Quests/s2-ability-data/DojoS2AbilityData.h"
#include "Quests/s2-ability-data/DojoS2AbilityTags.h"
#include "Quests/s2-energy/DojoS2EnergyComponent.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/StrongObjectPtr.h"

namespace DojoS2AbilityComponentTest
{
	/** One ability asset with its numbers. */
	UDojoS2AbilityData* MakeAbility(const TCHAR* Name, int32 Cost, float Cooldown, float Duration)
	{
		UDojoS2AbilityData* Ability = NewObject<UDojoS2AbilityData>();
		Ability->DisplayName = FText::FromString(Name);
		Ability->EnergyCost = Cost;
		Ability->Cooldown = Cooldown;
		Ability->Duration = Duration;
		return Ability;
	}

	/** A user with a full pool of 100 that does not refill, and an ability component paying from it. */
	struct FUser
	{
		UDojoS2EnergyComponent* Energy = nullptr;
		UDojoS2AbilityComponent* Abilities = nullptr;
	};

	/** Puts a pool and an ability component on a fresh actor and connects them. */
	FUser MakeUser(FDojoTestWorld& TestWorld)
	{
		FUser User;
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		User.Energy = TestWorld.AddComponent<UDojoS2EnergyComponent>(Owner);
		User.Energy->RegenAmount = 0;
		User.Abilities = TestWorld.AddComponent<UDojoS2AbilityComponent>(Owner);
		User.Abilities->UseEnergy(User.Energy);
		return User;
	}

	/** Lets this many seconds pass at 60 frames per second. */
	void Wait(FDojoTestWorld& TestWorld, float Seconds)
	{
		TestWorld.Tick(FMath::RoundToInt(Seconds * 60.f));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityComponent_GrantsAndStarts, "Dojo.S2.AbilityComponent.GrantsAndStarts", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Grants an ability, starts it, and checks the cost, the cooldown, the refusal while cooling, and the notices. */
bool FDojo_S2_AbilityComponent_GrantsAndStarts::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityComponentTest;

	FDojoTestWorld TestWorld;
	FUser User = MakeUser(TestWorld);
	if (!TestNotNull(TEXT("User created"), User.Abilities)) return false;

	TStrongObjectPtr<UDojoS2AbilitySpy> Spy(NewObject<UDojoS2AbilitySpy>());
	Spy->Watch(User.Abilities);
	Spy->Watch(User.Abilities);

	UDojoS2AbilityData* Dash = MakeAbility(TEXT("Dash"), 20, 1.5f, 0.f);
	UDojoS2AbilityData* Unknown = MakeAbility(TEXT("Unknown"), 0, 0.f, 0.f);

	TestFalse(TEXT("The component does not tick"), User.Abilities->PrimaryComponentTick.bCanEverTick);
	TestFalse(TEXT("Nothing is granted yet"), User.Abilities->HasAbility(Dash));
	TestFalse(TEXT("An ability that is not granted cannot start"), User.Abilities->TryActivate(Dash));
	TestTrue(TEXT("Dash is granted"), User.Abilities->Grant(Dash));
	TestFalse(TEXT("Granting twice is refused"), User.Abilities->Grant(Dash));
	TestFalse(TEXT("Granting nothing is refused"), User.Abilities->Grant(nullptr));
	TestTrue(TEXT("Dash is held"), User.Abilities->HasAbility(Dash));
	TestFalse(TEXT("Another ability is not"), User.Abilities->HasAbility(Unknown));

	TestTrue(TEXT("Dash can start"), User.Abilities->CanActivate(Dash));
	TestTrue(TEXT("Dash starts"), User.Abilities->TryActivate(Dash));
	TestEqual(TEXT("Dash paid 20"), User.Energy->GetEnergy(), 80);
	TestTrue(TEXT("Dash is cooling down"), User.Abilities->IsOnCooldown(Dash));
	TestEqual(TEXT("1.5 seconds are left"), User.Abilities->GetCooldownRemaining(Dash), 1.5f, 0.02f);
	TestEqual(TEXT("One start notice"), Spy->GetStartCount(), 1);
	TestTrue(TEXT("The notice names Dash"), Spy->GetLastStarted() == Dash);
	TestTrue(TEXT("The cooldown was running when the start was announced"), Spy->WasCoolingAtLastStart());
	TestEqual(TEXT("One cooldown notice for the start of the wait"), Spy->GetCooldownNoticeCount(), 1);

	TestFalse(TEXT("A cooling ability cannot start"), User.Abilities->CanActivate(Dash));
	TestFalse(TEXT("A cooling ability does not start"), User.Abilities->TryActivate(Dash));
	TestEqual(TEXT("A refused start costs nothing"), User.Energy->GetEnergy(), 80);
	TestEqual(TEXT("A refused start announces nothing"), Spy->GetStartCount(), 1);

	Wait(TestWorld, 1.f);
	TestTrue(TEXT("Still cooling after 1 second"), User.Abilities->IsOnCooldown(Dash));
	TestEqual(TEXT("About half a second left"), User.Abilities->GetCooldownRemaining(Dash), 0.5f, 0.05f);

	Wait(TestWorld, 0.6f);
	TestFalse(TEXT("Ready after 1.6 seconds"), User.Abilities->IsOnCooldown(Dash));
	TestEqual(TEXT("No time left"), User.Abilities->GetCooldownRemaining(Dash), 0.f);
	TestEqual(TEXT("A second cooldown notice for the end of the wait"), Spy->GetCooldownNoticeCount(), 2);
	TestTrue(TEXT("Dash starts again"), User.Abilities->TryActivate(Dash));
	TestEqual(TEXT("And pays again"), User.Energy->GetEnergy(), 60);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityComponent_CostsAndBlocks, "Dojo.S2.AbilityComponent.CostsAndBlocks", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Refuses abilities the pool cannot pay or the user's tags block, without paying, and frees them when the tags leave. */
bool FDojo_S2_AbilityComponent_CostsAndBlocks::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityComponentTest;

	FDojoTestWorld TestWorld;
	FUser User = MakeUser(TestWorld);
	if (!TestNotNull(TEXT("User created"), User.Abilities)) return false;

	TStrongObjectPtr<UDojoS2AbilitySpy> Spy(NewObject<UDojoS2AbilitySpy>());
	Spy->Watch(User.Abilities);

	UDojoS2AbilityData* Shockwave = MakeAbility(TEXT("Shockwave"), 40, 3.f, 1.f);
	Shockwave->GrantedTags.AddTag(DojoS2Tags::State_Rooted.GetTag());

	UDojoS2AbilityData* Dash = MakeAbility(TEXT("Dash"), 20, 0.f, 0.f);
	Dash->BlockedByTags.AddTag(DojoS2Tags::State_Rooted.GetTag());

	UDojoS2AbilityData* Slam = MakeAbility(TEXT("Slam"), 10, 0.f, 0.f);
	Slam->BlockedByTags.AddTag(DojoS2Tags::State.GetTag());

	UDojoS2AbilityData* Nova = MakeAbility(TEXT("Nova"), 50, 0.f, 0.f);

	User.Abilities->Grant(Shockwave);
	User.Abilities->Grant(Dash);
	User.Abilities->Grant(Slam);
	User.Abilities->Grant(Nova);

	TestTrue(TEXT("Shockwave starts"), User.Abilities->TryActivate(Shockwave));
	TestTrue(TEXT("Shockwave is running"), User.Abilities->IsRunning(Shockwave));
	TestTrue(TEXT("The user is rooted"), User.Abilities->GetActiveTags().HasTagExact(DojoS2Tags::State_Rooted.GetTag()));
	TestTrue(TEXT("The tags were on the user when the start was announced"), Spy->GetTagsAtLastStart().HasTagExact(DojoS2Tags::State_Rooted.GetTag()));
	TestFalse(TEXT("A running ability cannot start again"), User.Abilities->CanActivate(Shockwave));

	TestFalse(TEXT("A rooted user cannot dash"), User.Abilities->TryActivate(Dash));
	TestFalse(TEXT("A rooted user cannot slam, which is blocked by the whole State branch"), User.Abilities->TryActivate(Slam));
	TestEqual(TEXT("Blocked starts cost nothing"), User.Energy->GetEnergy(), 60);
	TestEqual(TEXT("Blocked starts announce nothing"), Spy->GetStartCount(), 1);

	TestTrue(TEXT("Nova, not blocked and costing 50 of the 60 left, can start"), User.Abilities->CanActivate(Nova));
	TestTrue(TEXT("Nova starts"), User.Abilities->TryActivate(Nova));
	TestEqual(TEXT("10 is left"), User.Energy->GetEnergy(), 10);
	TestFalse(TEXT("Nova cannot be paid again"), User.Abilities->TryActivate(Nova));
	TestEqual(TEXT("The refused Nova costs nothing"), User.Energy->GetEnergy(), 10);

	Wait(TestWorld, 1.1f);
	TestFalse(TEXT("The shockwave's run is over"), User.Abilities->IsRunning(Shockwave));
	TestTrue(TEXT("The user is no longer rooted"), User.Abilities->GetActiveTags().IsEmpty());
	TestFalse(TEXT("Dash still needs 20 of the 10 left"), User.Abilities->TryActivate(Dash));
	TestTrue(TEXT("Slam starts now that nothing blocks it"), User.Abilities->TryActivate(Slam));
	TestEqual(TEXT("Slam paid its 10"), User.Energy->GetEnergy(), 0);

	ADojoTestActor* Poor = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoS2AbilityComponent* WithoutPool = TestWorld.AddComponent<UDojoS2AbilityComponent>(Poor);
	WithoutPool->Grant(Dash);
	TestFalse(TEXT("An ability that costs energy cannot start with no pool"), WithoutPool->TryActivate(Dash));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityComponent_FocusAfterShockwave, "Dojo.S2.AbilityComponent.FocusAfterShockwave", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A shockwave, then a focus half a second later, then a dash at several moments, checking which tags the user carries. */
bool FDojo_S2_AbilityComponent_FocusAfterShockwave::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityComponentTest;

	FDojoTestWorld TestWorld;
	FUser User = MakeUser(TestWorld);
	if (!TestNotNull(TEXT("User created"), User.Abilities)) return false;

	const FGameplayTag Rooted = DojoS2Tags::State_Rooted.GetTag();
	const FGameplayTag Channeling = DojoS2Tags::State_Channeling.GetTag();

	UDojoS2AbilityData* Shockwave = MakeAbility(TEXT("Shockwave"), 40, 3.f, 1.f);
	Shockwave->GrantedTags.AddTag(Rooted);
	Shockwave->BlockedByTags.AddTag(Channeling);

	UDojoS2AbilityData* Focus = MakeAbility(TEXT("Focus"), 0, 12.f, 2.f);
	Focus->GrantedTags.AddTag(Rooted);
	Focus->GrantedTags.AddTag(Channeling);

	UDojoS2AbilityData* Dash = MakeAbility(TEXT("Dash"), 20, 0.f, 0.f);
	Dash->BlockedByTags.AddTag(Rooted);

	User.Abilities->Grant(Shockwave);
	User.Abilities->Grant(Focus);
	User.Abilities->Grant(Dash);

	TestTrue(TEXT("Shockwave starts at 0 s"), User.Abilities->TryActivate(Shockwave));
	Wait(TestWorld, 0.5f);
	TestTrue(TEXT("Focus starts at 0.5 s"), User.Abilities->TryActivate(Focus));
	TestFalse(TEXT("A channeling user cannot start a shockwave"), User.Abilities->CanActivate(Shockwave));

	Wait(TestWorld, 0.7f);
	TestFalse(TEXT("At 1.2 s the shockwave's run is over"), User.Abilities->IsRunning(Shockwave));
	TestTrue(TEXT("At 1.2 s Focus still runs"), User.Abilities->IsRunning(Focus));
	TestTrue(TEXT("At 1.2 s the user is still rooted"), User.Abilities->GetActiveTags().HasTagExact(Rooted));
	TestTrue(TEXT("At 1.2 s the user is still channeling"), User.Abilities->GetActiveTags().HasTagExact(Channeling));
	TestFalse(TEXT("At 1.2 s the dash is still refused"), User.Abilities->TryActivate(Dash));
	TestEqual(TEXT("The refused dash costs nothing"), User.Energy->GetEnergy(), 60);

	Wait(TestWorld, 1.4f);
	TestFalse(TEXT("At 2.6 s Focus is over"), User.Abilities->IsRunning(Focus));
	TestTrue(TEXT("At 2.6 s the user carries no tags"), User.Abilities->GetActiveTags().IsEmpty());
	TestTrue(TEXT("At 2.6 s the dash starts"), User.Abilities->TryActivate(Dash));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityComponent_ResetAll, "Dojo.S2.AbilityComponent.ResetAll", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** ResetAll ends every cooldown and run at once, announces each ended cooldown, and leaves no timer behind. */
bool FDojo_S2_AbilityComponent_ResetAll::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityComponentTest;

	FDojoTestWorld TestWorld;
	FUser User = MakeUser(TestWorld);
	if (!TestNotNull(TEXT("User created"), User.Abilities)) return false;

	TStrongObjectPtr<UDojoS2AbilitySpy> Spy(NewObject<UDojoS2AbilitySpy>());
	Spy->Watch(User.Abilities);

	UDojoS2AbilityData* Shockwave = MakeAbility(TEXT("Shockwave"), 40, 3.f, 1.f);
	Shockwave->GrantedTags.AddTag(DojoS2Tags::State_Rooted.GetTag());
	UDojoS2AbilityData* Dash = MakeAbility(TEXT("Dash"), 20, 1.f, 0.f);

	User.Abilities->Grant(Shockwave);
	User.Abilities->Grant(Dash);
	User.Abilities->TryActivate(Shockwave);
	User.Abilities->TryActivate(Dash);
	TestEqual(TEXT("Two cooldowns started"), Spy->GetCooldownNoticeCount(), 2);

	User.Abilities->ResetAll();
	TestFalse(TEXT("Shockwave is ready"), User.Abilities->IsOnCooldown(Shockwave));
	TestFalse(TEXT("Dash is ready"), User.Abilities->IsOnCooldown(Dash));
	TestFalse(TEXT("Shockwave no longer runs"), User.Abilities->IsRunning(Shockwave));
	TestTrue(TEXT("The user carries no tags"), User.Abilities->GetActiveTags().IsEmpty());
	TestEqual(TEXT("Each ended cooldown was announced"), Spy->GetCooldownNoticeCount(), 4);

	User.Abilities->ResetAll();
	TestEqual(TEXT("A reset with nothing cooling announces nothing"), Spy->GetCooldownNoticeCount(), 4);

	Wait(TestWorld, 4.f);
	TestEqual(TEXT("No ended timer fires later"), Spy->GetCooldownNoticeCount(), 4);

	TestTrue(TEXT("Shockwave starts right away"), User.Abilities->TryActivate(Shockwave));
	Wait(TestWorld, 1.1f);
	TestTrue(TEXT("Its new run ends on time"), User.Abilities->GetActiveTags().IsEmpty());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_S2_AbilityComponent_FreeAndInstant, "Dojo.S2.AbilityComponent.FreeAndInstant", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A free ability with no cooldown and no run starts again and again, with no pool, no cooldown notices, and no tags. */
bool FDojo_S2_AbilityComponent_FreeAndInstant::RunTest(const FString& Parameters)
{
	using namespace DojoS2AbilityComponentTest;

	FDojoTestWorld TestWorld;
	ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
	UDojoS2AbilityComponent* Abilities = TestWorld.AddComponent<UDojoS2AbilityComponent>(Owner);
	if (!TestNotNull(TEXT("Component created"), Abilities)) return false;

	TStrongObjectPtr<UDojoS2AbilitySpy> Spy(NewObject<UDojoS2AbilitySpy>());
	Spy->Watch(Abilities);

	UDojoS2AbilityData* Wave = MakeAbility(TEXT("Wave"), 0, 0.f, 0.f);
	Wave->GrantedTags.AddTag(DojoS2Tags::State_Rooted.GetTag());
	Abilities->Grant(Wave);

	TestTrue(TEXT("A free ability starts with no pool"), Abilities->TryActivate(Wave));
	TestTrue(TEXT("And starts again at once"), Abilities->TryActivate(Wave));
	TestEqual(TEXT("Two start notices"), Spy->GetStartCount(), 2);
	TestEqual(TEXT("No cooldown, no cooldown notices"), Spy->GetCooldownNoticeCount(), 0);
	TestTrue(TEXT("No run, no tags"), Abilities->GetActiveTags().IsEmpty());

	return true;
}

#endif
```

# Hints

- Run the failing test and read its message: it names a moment when the user carries fewer tags than it should, and a run that is still going at that moment.
- Two abilities can grant the same tag. Ask what happens to the tags of a run that is still going when another run that shares a tag ends, and what the container needs to know to get that right.
- `RunTimers` already knows which runs are still going. Rebuilding `ActiveTags` from them when one run ends is one fix; counting how many runs added each tag in a `TMap<FGameplayTag, int32>` is the other, and it is what Epic's Gameplay Ability System does.

# Rubric

- `TryActivate` checks every reason to refuse before it pays, starts a timer, or changes a tag, so a refused start changes nothing and announces nothing.
- An ability's cooldown and run end on timers, each remembering which ability it belongs to, and nothing counts time in Tick.
- `OnCooldownChanged` fires when a cooldown starts and when it ends, and `OnAbilityActivated` fires once per start, after the cost, the cooldown, and the tags are in place.
- The user carries an ability's granted tags exactly while that ability runs.
- `ResetAll` and `EndPlay` leave no timer behind.
- The component holds the pointer to the pool; the pool and the assets know nothing about the component.

# Alternative

Cooldowns could be stored as the world time each ability is next allowed, compared with `GetWorld()->GetTimeSeconds()` whenever someone asks; that needs no timers at all and is how many games keep hundreds of cooldowns. The cost is that nothing happens when a cooldown ends, so a board that wants to light up a ready ability has to ask on a timer or every frame. One timer per ability gives you the moment of readiness as an event. Tags that several runs grant are the classic trap in any ability system: removing a run's tags one by one frees the user while another run still holds them, so Epic's Gameplay Ability System keeps a count per tag and removes a tag only when its count reaches zero; rebuilding the set from the runs still going gives the same answer and is simpler with a few abilities. The component is the Component pattern from Pack 2's "Actors built from parts" world, and its two events make it the sender in Observer.

# Parsons

```yaml
- id: ability-can-activate
  prompt: Put CanActivate in order, every check before the energy.
  lines:
    - "bool UDojoS2AbilityComponent::CanActivate(UDojoS2AbilityData* Ability) const"
    - "{"
    - "	if (!HasAbility(Ability) || IsOnCooldown(Ability) || IsRunning(Ability))"
    - "	{"
    - "		return false;"
    - "	}"
    - "	if (Ability->IsBlockedBy(ActiveTags))"
    - "	{"
    - "		return false;"
    - "	}"
    - "	return Ability->EnergyCost <= 0 || (Energy != nullptr && Energy->CanSpend(Ability->EnergyCost));"
    - "}"
  distractors:
    - line: "	return Energy->Spend(Ability->EnergyCost);"
      mistake: A question must not change anything; Spend takes the energy, so merely asking would pay for a start that may never happen.
    - line: "	if (ActiveTags.IsBlockedBy(Ability->BlockedByTags))"
      mistake: The container has no IsBlockedBy; the asset answers that question about the user's tags.
- id: ability-start-cooldown
  prompt: Put the start of a cooldown in order.
  lines:
    - "if (CooldownSeconds > 0.f)"
    - "{"
    - "	FTimerHandle& CooldownTimer = CooldownTimers.FindOrAdd(Ability);"
    - "	Timers.SetTimer(CooldownTimer, FTimerDelegate::CreateUObject(this, &UDojoS2AbilityComponent::EndCooldown, Ability), CooldownSeconds, false);"
    - "	OnCooldownChanged.Broadcast(this, Ability);"
    - "}"
  distractors:
    - line: "	FTimerHandle CooldownTimer = CooldownTimers.FindOrAdd(Ability);"
      mistake: A copy of the handle receives the new timer and is thrown away, so the map never learns which timer to check or clear.
    - line: "	Timers.SetTimer(CooldownTimer, this, &UDojoS2AbilityComponent::EndCooldown, CooldownSeconds, false);"
      mistake: That form of SetTimer only takes a function with no arguments, and EndCooldown needs to know which ability ended.
```
