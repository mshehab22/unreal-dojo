---
id: p8-trap-family
title: A family of traps that share one toolbox
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [subclass-sandbox]
skills: [subclass-sandbox, object-model]
terms: [uclass, abstract-specifier, tactoriterator, timer-manager, ufunction]
prerequisites: [p8-many-kinds-one-toolbox]
xp: 50
estimatedMinutes: 15
concepts:
  - A base class owns the shared rules (springing, cooldown) and offers protected tools; each kind of trap writes one override
  - Subclasses build their behavior only from the base's tools, so they never include or touch the systems behind them
  - An abstract base cannot be placed on its own; only the concrete kinds can
---

# Brief

When you press Play and run `ke * Spring`, the spike trap jabs the fighter standing next to it and the flame jet singes the fighters around it and drives them back. The labels show SpikesUp and FlameRoar, and springing again within two seconds does nothing.

Every arena trap does the same few things in a different order: hurt fighters nearby, push them, play a cue, and wait out a cooldown. `ADojoP8TrapBase` holds all of that. `Spring` is the only public way to set a trap off; it refuses during the cooldown, calls the trap's own `Trigger`, and starts the cooldown. Each kind of trap overrides `Trigger`, and inside it uses only the protected tools the base provides: `DamageFightersInRadius`, `PushFightersAway`, and `PlayCue`. A trap author never searches the world for fighters, never sets a timer, and never includes the fighter's header.

Most of the code is written, including the spike trap as an example. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: the flame jet's `Trigger`. It plays the FlameRoar cue, singes every fighter within `FlameRadius` for `FlameDamage`, and pushes them back `PushDistance`. When nobody was singed, it plays FlameSputter instead of pushing.

Naive first: push without looking at how many were singed. Run the tests, and see what the cue log of a flame jet with nobody in reach says.

## See it in the editor

Place a `DojoP8SpikeTrap` and a `DojoP8FlameJet` a few meters apart, with a `DojoP8Fighter` right next to each, and a third fighter far from both. Press Play, open the console, and run `ke * Spring`. The fighter by the spikes drops to 70, the one by the flame drops to 90 and slides away, and the far one keeps 100. Run `ke * Spring` again at once: nothing changes. Wait two seconds and run it again. Then try dragging a plain `DojoP8TrapBase` into the level from the Content Browser: the editor will not place it, because the base is abstract.

# Files

## DojoP8Fighter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8Fighter.generated.h"

class UTextRenderComponent;

/** A training fighter that traps can hurt; it goes down at zero health. */
UCLASS()
class ADojoP8Fighter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8Fighter();

	/** Floating text that shows the fighter's health. */
	UPROPERTY(VisibleAnywhere, Category = "Fighter")
	TObjectPtr<UTextRenderComponent> Label;

	/** Health at the start of play. */
	UPROPERTY(EditAnywhere, Category = "Fighter", meta = (ClampMin = "1"))
	float Health = 100.f;

	/** Loses Amount of health, never below zero. */
	UFUNCTION(BlueprintCallable, Category = "Fighter")
	void TakeHit(float Amount);

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Fighter")
	float GetHealth() const;

	/** True at zero health. */
	UFUNCTION(BlueprintPure, Category = "Fighter")
	bool IsDown() const;

protected:
	/** Shows the starting health. */
	virtual void BeginPlay() override;

private:
	/** Writes the health into the label. */
	void RefreshLabel();
};
```

## DojoP8Fighter.cpp

```cpp
#include "DojoP8Fighter.h"

#include "Components/TextRenderComponent.h"

ADojoP8Fighter::ADojoP8Fighter()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8Fighter::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP8Fighter::TakeHit(float Amount)
{
	Health = FMath::Max(0.f, Health - Amount);
	RefreshLabel();
}

float ADojoP8Fighter::GetHealth() const
{
	return Health;
}

bool ADojoP8Fighter::IsDown() const
{
	return Health <= 0.f;
}

void ADojoP8Fighter::RefreshLabel()
{
	Label->SetText(FText::AsNumber(FMath::RoundToInt(Health)));
}
```

## DojoP8TrapBase.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP8TrapBase.generated.h"

class UTextRenderComponent;

/** The base every arena trap derives from: it owns springing and the cooldown, and gives subclasses a small set of protected tools so a new trap is one override that never touches fighters, cues, or timers directly. */
UCLASS(Abstract) // @explain: Abstract stops anyone placing or spawning a bare trap base; only real kinds of trap can exist in a level.
class ADojoP8TrapBase : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP8TrapBase();

	/** Floating text that shows the last cue the trap played. */
	UPROPERTY(VisibleAnywhere, Category = "Trap")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds after springing before the trap can spring again. */
	UPROPERTY(EditAnywhere, Category = "Trap", meta = (ClampMin = "0.1"))
	float CooldownSeconds = 2.f;

	/** Springs the trap unless it is cooling down: runs the trap's own Trigger, then starts the cooldown. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void Spring();

	/** Ends the cooldown early; the cooldown timer calls this too. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void FinishCooldown();

	/** True while the trap cannot spring. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	bool IsCoolingDown() const;

	/** Every cue the trap has played, oldest first. */
	const TArray<FName>& GetCueLog() const;

protected:
	/** What this kind of trap does when it springs; every trap overrides it, using only the tools below. */
	virtual void Trigger() PURE_VIRTUAL(ADojoP8TrapBase::Trigger, ); // @explain: The one function each trap must write; it is protected, so only Spring, never outside code, can run it.

	/** Hurts every standing fighter within Radius of the trap by Amount, and returns how many were hit. */
	int32 DamageFightersInRadius(float Radius, float Amount); // @explain: A protected, non-virtual tool: traps can use it but not change how it finds or hurts fighters.

	/** Moves every standing fighter within Radius of the trap Distance further away from it. */
	void PushFightersAway(float Radius, float Distance);

	/** Plays a named cue: logs it and shows it on the label. */
	void PlayCue(FName Cue);

private:
	TArray<FName> CueLog;
	bool bCoolingDown = false;
	FTimerHandle CooldownTimer;
};
```

## DojoP8TrapBase.cpp

```cpp
#include "DojoP8TrapBase.h"

#include "Components/TextRenderComponent.h"
#include "DojoP8Fighter.h"
#include "EngineUtils.h"
#include "TimerManager.h"

ADojoP8TrapBase::ADojoP8TrapBase()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP8TrapBase::Spring()
{
	if (bCoolingDown) return; // @explain: The cooldown rule lives in the base, so no trap can forget it or get it wrong.

	Trigger();

	bCoolingDown = true;
	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8TrapBase::FinishCooldown, CooldownSeconds, false);
}

void ADojoP8TrapBase::FinishCooldown()
{
	bCoolingDown = false;
	GetWorldTimerManager().ClearTimer(CooldownTimer);
}

bool ADojoP8TrapBase::IsCoolingDown() const
{
	return bCoolingDown;
}

const TArray<FName>& ADojoP8TrapBase::GetCueLog() const
{
	return CueLog;
}

int32 ADojoP8TrapBase::DamageFightersInRadius(float Radius, float Amount)
{
	int32 Hit = 0;

	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;
		if (FVector::Dist(Fighter->GetActorLocation(), GetActorLocation()) > Radius) continue;

		Fighter->TakeHit(Amount);
		Hit++;
	}

	return Hit;
}

void ADojoP8TrapBase::PushFightersAway(float Radius, float Distance)
{
	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It)
	{
		ADojoP8Fighter* Fighter = *It;
		if (!IsValid(Fighter) || Fighter->IsDown()) continue;

		const FVector Offset = Fighter->GetActorLocation() - GetActorLocation();
		if (Offset.Size() > Radius) continue;

		const FVector Direction = Offset.GetSafeNormal2D();
		Fighter->SetActorLocation(Fighter->GetActorLocation() + Direction * Distance);
	}
}

void ADojoP8TrapBase::PlayCue(FName Cue)
{
	CueLog.Add(Cue);
	Label->SetText(FText::FromName(Cue));
}
```

## DojoP8SpikeTrap.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8TrapBase.h"
#include "DojoP8SpikeTrap.generated.h"

/** Spikes that jab every fighter standing close to the trap. */
UCLASS()
class ADojoP8SpikeTrap : public ADojoP8TrapBase
{
	GENERATED_BODY()

public:
	/** How close a fighter must stand to be jabbed. */
	UPROPERTY(EditAnywhere, Category = "Spikes", meta = (ClampMin = "0"))
	float SpikeRadius = 150.f;

	/** Damage each jab does. */
	UPROPERTY(EditAnywhere, Category = "Spikes", meta = (ClampMin = "0"))
	float SpikeDamage = 30.f;

protected:
	/** Raises the spikes: plays the cue and jabs everyone close. */
	virtual void Trigger() override;
};
```

## DojoP8SpikeTrap.cpp

```cpp
#include "DojoP8SpikeTrap.h"

void ADojoP8SpikeTrap::Trigger()
{
	PlayCue(TEXT("SpikesUp"));
	DamageFightersInRadius(SpikeRadius, SpikeDamage); // @explain: The spike trap never searches for fighters itself; it asks the base, so it needs no fighter header at all.
}
```

## DojoP8FlameJet.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP8TrapBase.h"
#include "DojoP8FlameJet.generated.h"

/** A jet of flame that singes fighters in a wide circle and drives them back; with nobody in reach it only sputters. */
UCLASS()
class ADojoP8FlameJet : public ADojoP8TrapBase
{
	GENERATED_BODY()

public:
	/** How far the flame reaches. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float FlameRadius = 300.f;

	/** Damage the flame does to each fighter in reach. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float FlameDamage = 10.f;

	/** How far the blast drives fighters back. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float PushDistance = 200.f;

protected:
	/** Roars, singes everyone in reach, and pushes them back; sputters when nobody was in reach. */
	virtual void Trigger() override;
};
```

## DojoP8FlameJet.cpp

```cpp
#include "DojoP8FlameJet.h"

void ADojoP8FlameJet::Trigger()
{
	// Your code: play the FlameRoar cue, singe every fighter within FlameRadius for FlameDamage, then push them back PushDistance; if nobody was singed, play the FlameSputter cue instead of pushing.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p8-trap-family/DojoP8FlameJet.h"
#include "Quests/p8-trap-family/DojoP8Fighter.h"
#include "Quests/p8-trap-family/DojoP8SpikeTrap.h"
#include "Quests/p8-trap-family/DojoP8TrapBase.h"
#include "Support/DojoTestWorld.h"

namespace DojoP8TrapFamilyTest
{
	/** Spawns a fighter at a spot on the X axis. */
	ADojoP8Fighter* SpawnFighterAt(FDojoTestWorld& TestWorld, float X)
	{
		ADojoP8Fighter* Fighter = TestWorld.SpawnActor<ADojoP8Fighter>();
		if (Fighter) Fighter->SetActorLocation(FVector(X, 0.f, 0.f));
		return Fighter;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_TrapFamily_SpikesJabOnlyNearby, "Dojo.P8.TrapFamily.SpikesJabOnlyNearby", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The spike trap jabs a close fighter, misses a far one, and the base's cooldown stops a second spring until it ends. */
bool FDojo_P8_TrapFamily_SpikesJabOnlyNearby::RunTest(const FString& Parameters)
{
	using namespace DojoP8TrapFamilyTest;

	FDojoTestWorld TestWorld;

	ADojoP8SpikeTrap* Spikes = TestWorld.SpawnActor<ADojoP8SpikeTrap>();
	ADojoP8Fighter* Close = SpawnFighterAt(TestWorld, 100.f);
	ADojoP8Fighter* Far = SpawnFighterAt(TestWorld, 400.f);
	if (!TestNotNull(TEXT("Spikes spawned"), Spikes) || !TestNotNull(TEXT("Fighters spawned"), Close) || !TestNotNull(TEXT("Fighters spawned"), Far)) return false;

	Spikes->Spring();
	TestEqual(TEXT("The close fighter is jabbed"), Close->GetHealth(), 70.f);
	TestEqual(TEXT("The far fighter is untouched"), Far->GetHealth(), 100.f);
	TestTrue(TEXT("The spikes cool down"), Spikes->IsCoolingDown());

	Spikes->Spring();
	TestEqual(TEXT("A spring during the cooldown does nothing"), Close->GetHealth(), 70.f);

	Spikes->FinishCooldown();
	Spikes->Spring();
	TestEqual(TEXT("After the cooldown the spikes jab again"), Close->GetHealth(), 40.f);
	TestEqual(TEXT("Two springs played two cues"), Spikes->GetCueLog().Num(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_TrapFamily_FlameSingesAndPushes, "Dojo.P8.TrapFamily.FlameSingesAndPushes", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The flame jet singes a fighter in reach and drives it back; a flame jet with nobody in reach only sputters. */
bool FDojo_P8_TrapFamily_FlameSingesAndPushes::RunTest(const FString& Parameters)
{
	using namespace DojoP8TrapFamilyTest;

	FDojoTestWorld TestWorld;

	ADojoP8FlameJet* Flame = TestWorld.SpawnActor<ADojoP8FlameJet>();
	ADojoP8Fighter* Fighter = SpawnFighterAt(TestWorld, 200.f);
	if (!TestNotNull(TEXT("Flame spawned"), Flame) || !TestNotNull(TEXT("Fighter spawned"), Fighter)) return false;

	Flame->Spring();
	TestEqual(TEXT("The fighter in reach is singed"), Fighter->GetHealth(), 90.f);
	TestEqual(TEXT("And driven back to 400"), static_cast<float>(Fighter->GetActorLocation().X), 400.f, 0.01f);
	if (!TestEqual(TEXT("One cue for a flame that hit"), Flame->GetCueLog().Num(), 1)) return false;
	TestEqual(TEXT("The cue is the roar"), Flame->GetCueLog()[0], FName(TEXT("FlameRoar")));

	ADojoP8FlameJet* Lonely = TestWorld.SpawnActor<ADojoP8FlameJet>();
	if (!TestNotNull(TEXT("Second flame spawned"), Lonely)) return false;
	Lonely->SetActorLocation(FVector(0.f, 5000.f, 0.f));

	Lonely->Spring();
	if (!TestEqual(TEXT("A flame with nobody in reach roars and sputters"), Lonely->GetCueLog().Num(), 2)) return false;
	TestEqual(TEXT("The second cue is the sputter"), Lonely->GetCueLog()[1], FName(TEXT("FlameSputter")));
	TestEqual(TEXT("The pushed fighter was not touched by the far flame"), Fighter->GetHealth(), 90.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P8_TrapFamily_BaseIsOnlyAToolbox, "Dojo.P8.TrapFamily.BaseIsOnlyAToolbox", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Reflection check: the trap base is abstract and Spring is the one callable entry point. */
bool FDojo_P8_TrapFamily_BaseIsOnlyAToolbox::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("The trap base is abstract"), ADojoP8TrapBase::StaticClass()->HasAnyClassFlags(CLASS_Abstract));
	TestFalse(TEXT("The spike trap is not abstract"), ADojoP8SpikeTrap::StaticClass()->HasAnyClassFlags(CLASS_Abstract));

	const UFunction* SpringFunction = ADojoP8TrapBase::StaticClass()->FindFunctionByName(TEXT("Spring"));
	if (!TestNotNull(TEXT("Spring is a UFUNCTION"), SpringFunction)) return false;
	TestTrue(TEXT("Spring is BlueprintCallable"), SpringFunction->HasAnyFunctionFlags(FUNC_BlueprintCallable));

	return true;
}

#endif
```

# Hints

- Look at the spike trap's Trigger: the flame jet's is the same kind of short list of tool calls, with one decision in the middle.
- DamageFightersInRadius returns how many fighters it hit; keep that number and let it choose between pushing and sputtering.
- Every tool you need is declared protected in `DojoP8TrapBase.h`; the flame jet's source file needs no other include.

# Rubric

- The flame jet's Trigger uses only the base's protected tools; it searches for no actors and sets no timers itself.
- It plays FlameRoar, singes fighters in reach, and pushes them back, or plays FlameSputter when nobody was in reach.
- Radius, damage, and push distance come from the flame jet's editable properties.
- The cooldown and the single entry point stay in the base; no trap overrides Spring.
- The base stays abstract, and its tools stay protected and non-virtual.

# Alternative

Each trap could be a component with the same tools in a shared helper component, attached to any actor. That suits traps that are also other things (a pillar that is also a spike trap). The base-class form keeps one kind of trap per class and puts the cooldown rule where no trap can bypass it, and a designer can still make a Blueprint child of the spike trap and tune its numbers. When the base starts collecting tools only one trap uses, that is the sign to move a group of tools into a helper object the base hands out.

# Parsons

```yaml
- id: flame-trigger
  prompt: Put the flame jet's Trigger in order.
  lines:
    - "void ADojoP8FlameJet::Trigger()"
    - "{"
    - "	PlayCue(TEXT(\"FlameRoar\"));"
    - "	const int32 Singed = DamageFightersInRadius(FlameRadius, FlameDamage);"
    - "	if (Singed > 0) PushFightersAway(FlameRadius, PushDistance);"
    - "	else PlayCue(TEXT(\"FlameSputter\"));"
    - "}"
  distractors:
    - line: "	for (TActorIterator<ADojoP8Fighter> It(GetWorld()); It; ++It) It->TakeHit(FlameDamage);"
      mistake: Searching the world and hurting fighters directly bypasses the base's tool, so the flame jet now depends on the fighter class and skips the range and downed checks.
- id: base-spring
  prompt: Put the base's Spring in order.
  lines:
    - "void ADojoP8TrapBase::Spring()"
    - "{"
    - "	if (bCoolingDown) return;"
    - "	Trigger();"
    - "	bCoolingDown = true;"
    - "	GetWorldTimerManager().SetTimer(CooldownTimer, this, &ADojoP8TrapBase::FinishCooldown, CooldownSeconds, false);"
    - "}"
  distractors:
    - line: "	virtual void Spring() override;"
      mistake: Spring is the base's own rule, not something a trap should replace; making it overridable lets a trap skip the cooldown.
```
