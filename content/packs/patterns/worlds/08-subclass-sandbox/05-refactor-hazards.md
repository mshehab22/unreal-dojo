---
id: p8-hazard-refactor
title: Two hazards, one toolbox
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [subclass-sandbox]
skills: [subclass-sandbox, refactoring]
terms: [abstract-specifier, blueprint-protected, tactoriterator, timer-manager, ufunction]
prerequisites: [p8-interactables, p8-trap-family]
xp: 90
estimatedMinutes: 20
concepts:
  - Subclasses that each copy the same searches, cues, and timers drift apart, and a rule forgotten in one copy is a bug
  - Moving the shared rules into one non-virtual entry and the shared work into protected tools makes each subclass one short override
  - The base becomes the only class that includes the systems the hazards touch
---

# Brief

When you press Play, the boulder and the net launcher hurt the fighters in reach exactly as before, but the net launcher now waits out its cooldown like the boulder does, and neither hazard includes the fighter's header any more.

The starter works, mostly. The arena's two hazards share a parent class that does nothing, and each one carries its own copy of everything: a search for fighters in range, the cue and label, the cooldown flag, the timer, `FinishCooldown`, `IsCoolingDown`, and `GetLastCue`. Read both and compare them. The copies have already drifted: the net launcher starts its cooldown timer, but never checks it, so it can be thrown again and again. A third hazard would be a third copy, and a third chance to forget.

Refactor them into a toolbox:

- `ADojoP8HazardBase` owns the rules. `Unleash` becomes its non-virtual public entry: it refuses during the cooldown, calls the hazard's own protected `OnUnleash`, and starts the cooldown. `CooldownSeconds`, `FinishCooldown`, `IsCoolingDown`, and `GetLastCue` move into it.
- It offers two protected tools, also callable from Blueprint children (`BlueprintProtected`): `DamageFightersInRadius(Radius, Amount)` and `PlayCue(Cue)`.
- Each hazard keeps its own tuning properties, sets its own cooldown length in its constructor (3 seconds for the boulder, 4 for the net), and overrides only `OnUnleash` with two tool calls. The boulder plays Rumble, the net plays Whoosh.
- Only the base's source file includes the fighter header.

Compiles against earlier quests: p8-trap-family (`Quests/p8-trap-family/DojoP8Fighter.h`).

## See it in the editor

Place a `DojoP8BoulderDrop` and a `DojoP8NetLauncher` with a `DojoP8Fighter` beside each. Press Play, open the console, and run `ke * Unleash` twice in a row. Before the refactor, the fighter by the net loses 5 health each time; after it, only the first throw lands until four seconds have passed, the same way the boulder waits three.

# Files

## DojoP8HazardBase.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8HazardBase.generated.h"

class UTextRenderComponent;

/** The parent of the arena's hazards. */
UCLASS(Abstract)
class ADojoP8HazardBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8HazardBase();

	/** Floating text that shows the last cue the hazard played. */
	UPROPERTY(VisibleAnywhere, Category = "Hazard")
	TObjectPtr<UTextRenderComponent> Label;

	/** Sets the hazard off. Each hazard writes its own. */
	UFUNCTION(BlueprintCallable, Category = "Hazard")
	virtual void Unleash();
};
```

## DojoP8HazardBase.cpp

```cpp
#include "DojoP8HazardBase.h"

#include "Components/TextRenderComponent.h"

ADojoP8HazardBase::ADojoP8HazardBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8HazardBase::Unleash()
{
}
```

## DojoP8BoulderDrop.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8HazardBase.h"
#include "DojoP8BoulderDrop.generated.h"

/** A boulder that drops from the arena wall onto fighters standing right below it. */
UCLASS()
class ADojoP8BoulderDrop : public ADojoP8HazardBase
{
	GENERATED_BODY()

public:
	/** How close below the boulder a fighter must stand to be hit. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float DropRadius = 120.f;

	/** Damage the boulder does. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float DropDamage = 40.f;

	/** Seconds before the boulder can drop again. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 3.f;

	/** Drops the boulder unless it is still being winched back up. */
	virtual void Unleash() override;

	/** Ends the cooldown early; the cooldown timer calls this too. */
	UFUNCTION(BlueprintCallable, Category = "Boulder")
	void FinishCooldown();

	/** True while the boulder cannot drop. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	bool IsCoolingDown() const;

	/** The last cue the boulder played. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	FName GetLastCue() const;

private:
	bool bCoolingDown = false;
	FName LastCue;
	FTimerHandle CooldownTimer;
};
```

## DojoP8BoulderDrop.cpp

```cpp
#include "DojoP8BoulderDrop.h"

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "TimerManager.h"

void ADojoP8BoulderDrop::Unleash()
{
	if (bCoolingDown) return;

	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;
		if (FVector::Dist(Fighter->GetActorLocation(), GetActorLocation()) > DropRadius) continue;

		Fighter->TakeHit(DropDamage);
	}

	LastCue = TEXT("Rumble");
	Label->SetText(FText::FromName(LastCue));

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8BoulderDrop::FinishCooldown, CooldownSeconds, false);
}

void ADojoP8BoulderDrop::FinishCooldown()
{
	bCoolingDown = false;
	GetWorldTimerManager().ClearTimer(CooldownTimer);
}

bool ADojoP8BoulderDrop::IsCoolingDown() const
{
	return bCoolingDown;
}

FName ADojoP8BoulderDrop::GetLastCue() const
{
	return LastCue;
}
```

## DojoP8NetLauncher.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8HazardBase.h"
#include "DojoP8NetLauncher.generated.h"

/** A launcher that throws a weighted net over fighters in a wide circle. */
UCLASS()
class ADojoP8NetLauncher : public ADojoP8HazardBase
{
	GENERATED_BODY()

public:
	/** How far the net reaches. */
	UPROPERTY(EditAnywhere, Category = "Net", meta = (ClampMin = "0"))
	float NetRadius = 250.f;

	/** Damage the net's weights do. */
	UPROPERTY(EditAnywhere, Category = "Net", meta = (ClampMin = "0"))
	float NetDamage = 5.f;

	/** Seconds before the launcher can throw again. */
	UPROPERTY(EditAnywhere, Category = "Net", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 4.f;

	/** Throws the net. */
	virtual void Unleash() override;

	/** Ends the cooldown early; the cooldown timer calls this too. */
	UFUNCTION(BlueprintCallable, Category = "Net")
	void FinishCooldown();

	/** True while the launcher cannot throw. */
	UFUNCTION(BlueprintPure, Category = "Net")
	bool IsCoolingDown() const;

	/** The last cue the launcher played. */
	UFUNCTION(BlueprintPure, Category = "Net")
	FName GetLastCue() const;

private:
	bool bCoolingDown = false;
	FName LastCue;
	FTimerHandle CooldownTimer;
};
```

## DojoP8NetLauncher.cpp

```cpp
#include "DojoP8NetLauncher.h"

#include "Components/TextRenderComponent.h"
#include "EngineUtils.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "TimerManager.h"

void ADojoP8NetLauncher::Unleash()
{
	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;
		if (FVector::Dist(Fighter->GetActorLocation(), GetActorLocation()) > NetRadius) continue;

		Fighter->TakeHit(NetDamage);
	}

	LastCue = TEXT("Whoosh");
	Label->SetText(FText::FromName(LastCue));

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8NetLauncher::FinishCooldown, CooldownSeconds, false);
}

void ADojoP8NetLauncher::FinishCooldown()
{
	bCoolingDown = false;
	GetWorldTimerManager().ClearTimer(CooldownTimer);
}

bool ADojoP8NetLauncher::IsCoolingDown() const
{
	return bCoolingDown;
}

FName ADojoP8NetLauncher::GetLastCue() const
{
	return LastCue;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p8-hazard-refactor/DojoP8BoulderDrop.h"
#include "Quests/p8-hazard-refactor/DojoP8HazardBase.h"
#include "Quests/p8-hazard-refactor/DojoP8NetLauncher.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "Support/DojoTestWorld.h"

namespace DojoP8HazardRefactorTest
{
	/** Spawns a fighter at a spot on the X axis. */
	ADojoP8Fighter* SpawnFighterAt(FDojoTestWorld& TestWorld, float X)
	{
		ADojoP8Fighter* Fighter = TestWorld.SpawnActor<ADojoP8Fighter>();
		if (Fighter) Fighter->SetActorLocation(FVector(X, 0.f, 0.f));
		return Fighter;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_HazardRefactor_BoulderAsBefore, "Dojo.P8.HazardRefactor.BoulderAsBefore", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The boulder hits a fighter right below, misses one further off, rumbles, and waits out its cooldown, as the starter does. */
bool FDojo_P8_HazardRefactor_BoulderAsBefore::RunTest(const FString& Parameters)
{
	using namespace DojoP8HazardRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP8BoulderDrop* Boulder = TestWorld.SpawnActor<ADojoP8BoulderDrop>();
	ADojoP8Fighter* Below = SpawnFighterAt(TestWorld, 100.f);
	ADojoP8Fighter* Aside = SpawnFighterAt(TestWorld, 200.f);
	if (!TestNotNull(TEXT("Boulder spawned"), Boulder) || !TestNotNull(TEXT("Fighters spawned"), Below) || !TestNotNull(TEXT("Fighters spawned"), Aside)) return false;

	Boulder->Unleash();
	TestEqual(TEXT("The fighter below is hit"), Below->GetHealth(), 60.f);
	TestEqual(TEXT("The fighter aside is not"), Aside->GetHealth(), 100.f);
	TestEqual(TEXT("The boulder rumbles"), Boulder->GetLastCue(), FName(TEXT("Rumble")));

	Boulder->Unleash();
	TestEqual(TEXT("A second drop during the cooldown does nothing"), Below->GetHealth(), 60.f);

	Boulder->FinishCooldown();
	Boulder->Unleash();
	TestEqual(TEXT("After the cooldown it drops again"), Below->GetHealth(), 20.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_HazardRefactor_NetWaitsItsTurn, "Dojo.P8.HazardRefactor.NetWaitsItsTurn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The net hits a fighter in reach and whooshes, and a second throw during its cooldown does nothing. */
bool FDojo_P8_HazardRefactor_NetWaitsItsTurn::RunTest(const FString& Parameters)
{
	using namespace DojoP8HazardRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP8NetLauncher* Net = TestWorld.SpawnActor<ADojoP8NetLauncher>();
	ADojoP8Fighter* Fighter = SpawnFighterAt(TestWorld, 200.f);
	if (!TestNotNull(TEXT("Net spawned"), Net) || !TestNotNull(TEXT("Fighter spawned"), Fighter)) return false;

	Net->Unleash();
	TestEqual(TEXT("The net hits the fighter in reach"), Fighter->GetHealth(), 95.f);
	TestEqual(TEXT("The net whooshes"), Net->GetLastCue(), FName(TEXT("Whoosh")));
	TestTrue(TEXT("The net cools down"), Net->IsCoolingDown());

	Net->Unleash();
	TestEqual(TEXT("A second throw during the cooldown does nothing"), Fighter->GetHealth(), 95.f);

	Net->FinishCooldown();
	Net->Unleash();
	TestEqual(TEXT("After the cooldown it throws again"), Fighter->GetHealth(), 90.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_HazardRefactor_ToolboxLivesInTheBase, "Dojo.P8.HazardRefactor.ToolboxLivesInTheBase", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reflection check: the base offers the protected tools and the cooldown functions, and neither hazard declares its own copies. */
bool FDojo_P8_HazardRefactor_ToolboxLivesInTheBase::RunTest(const FString& Parameters)
{
	UClass* Base = ADojoP8HazardBase::StaticClass();
	TestTrue(TEXT("The hazard base is abstract"), Base->HasAnyClassFlags(CLASS_Abstract));

	for (const TCHAR* ToolName : { TEXT("DamageFightersInRadius"), TEXT("PlayCue") })
	{
		const UFunction* Tool = Base->FindFunctionByName(ToolName);
		if (!TestNotNull(FString::Printf(TEXT("The base offers %s"), ToolName), Tool)) continue;
		TestTrue(FString::Printf(TEXT("%s is for Blueprint children only"), ToolName), Tool->HasMetaData(TEXT("BlueprintProtected")));
	}

	for (const TCHAR* SharedName : { TEXT("FinishCooldown"), TEXT("IsCoolingDown"), TEXT("GetLastCue") })
	{
		TestNotNull(FString::Printf(TEXT("The base owns %s"), SharedName), Base->FindFunctionByName(SharedName, EIncludeSuperFlag::ExcludeSuper));
		TestNull(FString::Printf(TEXT("The boulder has no copy of %s"), SharedName), ADojoP8BoulderDrop::StaticClass()->FindFunctionByName(SharedName, EIncludeSuperFlag::ExcludeSuper));
		TestNull(FString::Printf(TEXT("The net has no copy of %s"), SharedName), ADojoP8NetLauncher::StaticClass()->FindFunctionByName(SharedName, EIncludeSuperFlag::ExcludeSuper));
	}

	return true;
}

#endif
```

# Hints

- Put the two Unleash functions side by side and mark every line that is the same in both. Those lines belong to the base; what is left is each hazard's OnUnleash.
- The cooldown check, the timer, and the cue bookkeeping go into the base's Unleash and tools; each hazard's OnUnleash becomes one call to DamageFightersInRadius and one to PlayCue with its own numbers.
- Mark the tools `UFUNCTION(BlueprintCallable, meta = (BlueprintProtected))` in the base's protected section, as the interactables did, and give OnUnleash the `PURE_VIRTUAL` macro the trap base used.

# Rubric

- Unleash is the base's non-virtual entry and owns the cooldown rule for every hazard.
- Each hazard overrides only OnUnleash and builds it from the base's protected tools.
- The fighter search, cue bookkeeping, and timer exist once, in the base; neither hazard keeps copies.
- Only the base includes the fighter header; the hazards include only the base.
- The net launcher's missing cooldown check is gone because the rule is no longer the hazard's to write.
- Tuning values and cooldown lengths stay editable; the tools are BlueprintProtected.

# Alternative

A free helper function library (`UDojoHazardLibrary` with static DamageFightersInRadius and PlayCue) would remove the duplicated loops without touching the class hierarchy. It fixes the copy-paste but not the drift: each hazard would still own its cooldown, and the net launcher's missing check could come back in the next hazard. Putting the entry point and the rule in the base is what makes the rule impossible to forget, and the protected tools keep the library-like convenience for subclasses only.
