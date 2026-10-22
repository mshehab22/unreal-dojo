---
id: p7-ballista
title: A ballista whose modes are objects
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [state]
skills: [state, object-model]
terms: [uobject, uclass, createdefaultsubobject, tobjectptr, tick, finite-state-machine]
prerequisites: [p7-state-card]
xp: 110
estimatedMinutes: 30
concepts:
  - Each mode becomes an object that owns its data and its rule for every input, and the owner hands inputs to the current one
  - Changing mode runs the old mode's exit and the new mode's entry, in one place
  - Mode objects made once and reused must reset their own data on every entry
---

# Brief

When you press Play and run `ke * SpotTarget`, the ballista's label counts Aiming 0% up to Aiming 100% over a second; `ke * Fire` then shoots one bolt and the label reads Reloading, and two seconds later the ballista is aiming again from 0%.

The ballista on the arena wall rests, aims, and reloads. Its modes have data of their own: aiming has how far the swing has come, reloading has how long is left. Instead of one enum and a switch in every input, each mode is an object. `UDojoP7BallistaState` is the abstract base, with an empty default for every input, so a mode that has no rule for an input ignores it. `UDojoP7BallistaIdle`, `UDojoP7BallistaAiming`, and `UDojoP7BallistaReloading` override what they care about. The ballista holds the three mode objects, made once in its constructor, and remembers which one is current. Every input goes straight to that one.

The declarations, the constructor, `BeginPlay`, `Tick`, the labels, and the getters are given. Yours:

- On the ballista: `SpotTarget` and `LoseTarget` record whether a target is in view and pass the news to the current mode. `Fire` passes the order to it. `ChangeState` leaves the current mode (its `Exit`), switches the pointer, and enters the new one (its `Enter`), and ignores an empty mode or the mode it is already in.
- Idle: a spotted target starts aiming.
- Aiming: each frame the aim comes closer, a full aim taking `AimSeconds`. A lost target goes back to idle. A fire order before the aim is complete is ignored; with it complete, the ballista launches a bolt and starts reloading.
- Reloading: starts with `ReloadSeconds` to go, counts down each frame, and then aims again if a target is still in view, or rests if not.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP7Ballista` in a map with no other ballistas, press Play, and open the console. Run `ke * Fire`: the label stays Idle. Run `ke * SpotTarget`: Aiming climbs to 100%. Run `ke * Fire`: Reloading, then Aiming from 0% again. Run `ke * LoseTarget` halfway through an aim: Idle. Spot the target again and watch where the aim starts.

# Files

## DojoP7Ballista.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP7Ballista.generated.h"

class UDojoP7BallistaAiming;
class UDojoP7BallistaIdle;
class UDojoP7BallistaReloading;
class UDojoP7BallistaState;
class UTextRenderComponent;

/** A ballista on the arena wall that rests, aims, and reloads; each mode is an object with its own data, and every input goes to whichever mode is current. */
UCLASS()
class ADojoP7Ballista : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and the three mode objects, and turns ticking on. */
	ADojoP7Ballista();

	/** Floating text that shows the current mode. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UTextRenderComponent> Label;

	/** Seconds a full aim takes. */
	UPROPERTY(EditAnywhere, Category = "Ballista", meta = (ClampMin = "0.1"))
	float AimSeconds = 1.f;

	/** Seconds a reload takes. */
	UPROPERTY(EditAnywhere, Category = "Ballista", meta = (ClampMin = "0.1"))
	float ReloadSeconds = 2.f;

	/** The resting mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaIdle> IdleState;

	/** The aiming mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaAiming> AimingState;

	/** The reloading mode, made once and reused. */
	UPROPERTY(VisibleAnywhere, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaReloading> ReloadingState;

	/** A target comes into view; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void SpotTarget();

	/** The target goes out of view; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void LoseTarget();

	/** The crew orders a shot; the current mode decides what that means. */
	UFUNCTION(BlueprintCallable, Category = "Ballista")
	void Fire();

	/** Leaves the current mode and enters NewState, running the old mode's exit and the new one's entry; does nothing for an empty or unchanged mode. */
	void ChangeState(UDojoP7BallistaState* NewState);

	/** Counts one bolt shot. */
	void LaunchBolt();

	/** The mode the ballista is in now. */
	UDojoP7BallistaState* GetCurrentState() const;

	/** True while a target is in view. */
	UFUNCTION(BlueprintPure, Category = "Ballista")
	bool HasTarget() const;

	/** Bolts shot so far. */
	UFUNCTION(BlueprintPure, Category = "Ballista")
	int32 GetBoltsFired() const;

	/** Gives the current mode one frame. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Enters the resting mode. */
	virtual void BeginPlay() override;

private:
	/** Writes the current mode's text into the label. */
	void RefreshLabel();

	/** The mode every input goes to. */
	UPROPERTY(VisibleInstanceOnly, Category = "Ballista")
	TObjectPtr<UDojoP7BallistaState> CurrentState;

	bool bHasTarget = false;
	int32 BoltsFired = 0;
};
```

## DojoP7Ballista.cpp

```cpp
#include "DojoP7Ballista.h"

#include "Components/TextRenderComponent.h"
#include "DojoP7BallistaAiming.h"
#include "DojoP7BallistaIdle.h"
#include "DojoP7BallistaReloading.h"

ADojoP7Ballista::ADojoP7Ballista()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	IdleState = CreateDefaultSubobject<UDojoP7BallistaIdle>(TEXT("IdleState"));
	AimingState = CreateDefaultSubobject<UDojoP7BallistaAiming>(TEXT("AimingState"));
	ReloadingState = CreateDefaultSubobject<UDojoP7BallistaReloading>(TEXT("ReloadingState"));
}

void ADojoP7Ballista::BeginPlay()
{
	Super::BeginPlay();

	CurrentState = IdleState;
	CurrentState->Enter(this);
	RefreshLabel();
}

void ADojoP7Ballista::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (IsValid(CurrentState)) CurrentState->TickState(this, DeltaSeconds);
	RefreshLabel();
}

void ADojoP7Ballista::SpotTarget()
{
}

void ADojoP7Ballista::LoseTarget()
{
}

void ADojoP7Ballista::Fire()
{
}

void ADojoP7Ballista::ChangeState(UDojoP7BallistaState* NewState)
{
}

void ADojoP7Ballista::LaunchBolt()
{
	BoltsFired++;
}

UDojoP7BallistaState* ADojoP7Ballista::GetCurrentState() const
{
	return CurrentState;
}

bool ADojoP7Ballista::HasTarget() const
{
	return bHasTarget;
}

int32 ADojoP7Ballista::GetBoltsFired() const
{
	return BoltsFired;
}

void ADojoP7Ballista::RefreshLabel()
{
	if (IsValid(CurrentState)) Label->SetText(FText::FromString(CurrentState->GetLabelText()));
}
```

## DojoP7BallistaState.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP7BallistaState.generated.h"

class ADojoP7Ballista;

/** One mode of the ballista, as an object: it owns that mode's data and decides what each input means while the mode is current. Every input does nothing unless a mode overrides it. */
UCLASS(Abstract)
class UDojoP7BallistaState : public UObject
{
	GENERATED_BODY()

public:
	/** Runs each time the ballista enters this mode. */
	virtual void Enter(ADojoP7Ballista* Ballista);

	/** Runs each time the ballista leaves this mode. */
	virtual void Exit(ADojoP7Ballista* Ballista);

	/** One frame of this mode's behavior. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds);

	/** A target has come into view. */
	virtual void OnTargetSpotted(ADojoP7Ballista* Ballista);

	/** The target has gone out of view. */
	virtual void OnTargetLost(ADojoP7Ballista* Ballista);

	/** The crew gives the order to shoot. */
	virtual void OnFireOrder(ADojoP7Ballista* Ballista);

	/** Short text for the ballista's label. */
	virtual FString GetLabelText() const;
};
```

## DojoP7BallistaState.cpp

```cpp
#include "DojoP7BallistaState.h"

void UDojoP7BallistaState::Enter(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaState::Exit(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaState::TickState(ADojoP7Ballista* Ballista, float DeltaSeconds)
{
}

void UDojoP7BallistaState::OnTargetSpotted(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaState::OnTargetLost(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaState::OnFireOrder(ADojoP7Ballista* Ballista)
{
}

FString UDojoP7BallistaState::GetLabelText() const
{
	return TEXT("?");
}
```

## DojoP7BallistaIdle.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaIdle.generated.h"

/** The ballista at rest, waiting for something to aim at. */
UCLASS()
class UDojoP7BallistaIdle : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** A target in view starts the aim. */
	virtual void OnTargetSpotted(ADojoP7Ballista* Ballista) override;

	/** Shows "Idle". */
	virtual FString GetLabelText() const override;
};
```

## DojoP7BallistaIdle.cpp

```cpp
#include "DojoP7BallistaIdle.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaAiming.h"

void UDojoP7BallistaIdle::OnTargetSpotted(ADojoP7Ballista* Ballista)
{
}

FString UDojoP7BallistaIdle::GetLabelText() const
{
	return TEXT("Idle");
}
```

## DojoP7BallistaAiming.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaAiming.generated.h"

/** The ballista swinging onto its target; it owns how far the aim has come and only fires once the aim is complete. */
UCLASS()
class UDojoP7BallistaAiming : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** Called each time the ballista starts aiming. */
	virtual void Enter(ADojoP7Ballista* Ballista) override;

	/** Brings the aim closer, taking the ballista's AimSeconds for a full aim. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds) override;

	/** Losing the target drops back to idle. */
	virtual void OnTargetLost(ADojoP7Ballista* Ballista) override;

	/** With the aim complete, shoots a bolt and starts reloading; before that, the order is ignored. */
	virtual void OnFireOrder(ADojoP7Ballista* Ballista) override;

	/** Shows "Aiming" and the aim as a percentage. */
	virtual FString GetLabelText() const override;

	/** How far the aim has come, from 0 to 1. */
	float GetAimProgress() const;

private:
	float AimProgress = 0.f;
};
```

## DojoP7BallistaAiming.cpp

```cpp
#include "DojoP7BallistaAiming.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaIdle.h"
#include "DojoP7BallistaReloading.h"

void UDojoP7BallistaAiming::Enter(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaAiming::TickState(ADojoP7Ballista* Ballista, float DeltaSeconds)
{
}

void UDojoP7BallistaAiming::OnTargetLost(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaAiming::OnFireOrder(ADojoP7Ballista* Ballista)
{
}

FString UDojoP7BallistaAiming::GetLabelText() const
{
	return FString::Printf(TEXT("Aiming %d%%"), FMath::RoundToInt(AimProgress * 100.f));
}

float UDojoP7BallistaAiming::GetAimProgress() const
{
	return AimProgress;
}
```

## DojoP7BallistaReloading.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaReloading.generated.h"

/** The crew winding the ballista back; it owns the time left and then returns to aiming, or to idle if the target is gone. */
UCLASS()
class UDojoP7BallistaReloading : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** Called each time a reload starts. */
	virtual void Enter(ADojoP7Ballista* Ballista) override;

	/** Counts the reload down, then aims again if a target is in view, or rests if not. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds) override;

	/** Shows "Reloading". */
	virtual FString GetLabelText() const override;

	/** Seconds until the reload is done. */
	float GetSecondsLeft() const;

private:
	float SecondsLeft = 0.f;
};
```

## DojoP7BallistaReloading.cpp

```cpp
#include "DojoP7BallistaReloading.h"

#include "DojoP7Ballista.h"
#include "DojoP7BallistaAiming.h"
#include "DojoP7BallistaIdle.h"

void UDojoP7BallistaReloading::Enter(ADojoP7Ballista* Ballista)
{
}

void UDojoP7BallistaReloading::TickState(ADojoP7Ballista* Ballista, float DeltaSeconds)
{
}

FString UDojoP7BallistaReloading::GetLabelText() const
{
	return TEXT("Reloading");
}

float UDojoP7BallistaReloading::GetSecondsLeft() const
{
	return SecondsLeft;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p7-ballista/DojoP7Ballista.h"
#include "Quests/p7-ballista/DojoP7BallistaAiming.h"
#include "Quests/p7-ballista/DojoP7BallistaIdle.h"
#include "Quests/p7-ballista/DojoP7BallistaReloading.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_Ballista_AimFireReload, "Dojo.P7.Ballista.AimFireReload", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spot, aim for a second, fire, reload for two seconds, and aim again: one bolt, each mode in turn. */
bool FDojo_P7_Ballista_AimFireReload::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7Ballista* Ballista = TestWorld.SpawnActor<ADojoP7Ballista>();
	if (!TestNotNull(TEXT("Ballista spawned"), Ballista)) return false;

	TestTrue(TEXT("The ballista starts idle"), Ballista->GetCurrentState() == Ballista->IdleState);

	Ballista->SpotTarget();
	TestTrue(TEXT("A spotted target starts the aim"), Ballista->GetCurrentState() == Ballista->AimingState);

	Ballista->Fire();
	TestEqual(TEXT("Firing before the aim is complete does nothing"), Ballista->GetBoltsFired(), 0);
	TestTrue(TEXT("And the ballista keeps aiming"), Ballista->GetCurrentState() == Ballista->AimingState);

	Ballista->Tick(0.5f);
	TestEqual(TEXT("Half a second is half an aim"), Ballista->AimingState->GetAimProgress(), 0.5f, 0.001f);

	Ballista->Tick(0.5f);
	Ballista->Fire();
	TestEqual(TEXT("A complete aim fires one bolt"), Ballista->GetBoltsFired(), 1);
	TestTrue(TEXT("Then the ballista reloads"), Ballista->GetCurrentState() == Ballista->ReloadingState);
	TestEqual(TEXT("The reload starts with the full time"), Ballista->ReloadingState->GetSecondsLeft(), Ballista->ReloadSeconds, 0.001f);

	Ballista->Tick(2.f);
	TestTrue(TEXT("With the target still in view, it aims again"), Ballista->GetCurrentState() == Ballista->AimingState);

	Ballista->LoseTarget();
	TestTrue(TEXT("Losing the target while aiming rests the ballista"), Ballista->GetCurrentState() == Ballista->IdleState);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_Ballista_EveryAimStartsFresh, "Dojo.P7.Ballista.EveryAimStartsFresh", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** An aim interrupted at sixty percent does not carry over: the next aim starts from zero and cannot fire half a second later. */
bool FDojo_P7_Ballista_EveryAimStartsFresh::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7Ballista* Ballista = TestWorld.SpawnActor<ADojoP7Ballista>();
	if (!TestNotNull(TEXT("Ballista spawned"), Ballista)) return false;

	Ballista->SpotTarget();
	Ballista->Tick(0.6f);
	Ballista->LoseTarget();
	Ballista->SpotTarget();

	TestEqual(TEXT("The new aim starts from zero, not where the last one stopped"), Ballista->AimingState->GetAimProgress(), 0.f, 0.001f);

	Ballista->Tick(0.5f);
	Ballista->Fire();
	TestEqual(TEXT("Half a fresh aim cannot fire"), Ballista->GetBoltsFired(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P7_Ballista_InputsWithoutARuleAreIgnored, "Dojo.P7.Ballista.InputsWithoutARuleAreIgnored", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fire while idle, and spot or lose while reloading, change nothing; a reload with no target ends at rest. */
bool FDojo_P7_Ballista_InputsWithoutARuleAreIgnored::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP7Ballista* Ballista = TestWorld.SpawnActor<ADojoP7Ballista>();
	if (!TestNotNull(TEXT("Ballista spawned"), Ballista)) return false;

	Ballista->Fire();
	TestTrue(TEXT("Fire while idle is ignored"), Ballista->GetCurrentState() == Ballista->IdleState);

	Ballista->SpotTarget();
	Ballista->Tick(1.f);
	Ballista->Fire();
	TestTrue(TEXT("Reloading after the shot"), Ballista->GetCurrentState() == Ballista->ReloadingState);

	Ballista->LoseTarget();
	Ballista->SpotTarget();
	Ballista->LoseTarget();
	TestTrue(TEXT("Spotting and losing while reloading do not interrupt the reload"), Ballista->GetCurrentState() == Ballista->ReloadingState);

	Ballista->Tick(2.f);
	TestTrue(TEXT("A reload with no target in view ends at rest"), Ballista->GetCurrentState() == Ballista->IdleState);
	TestEqual(TEXT("Exactly one bolt was fired"), Ballista->GetBoltsFired(), 1);

	return true;
}

#endif
```

# Hints

- The failing test interrupts an aim and starts another. The Aiming object is the same object both times; ask what it still holds from the first aim when the second begins.
- Data a mode owns for one visit belongs in that mode's Enter: that is the one function guaranteed to run every time the ballista comes into the mode, by any path.
- `FMath::Min` from `Math/UnrealMathUtility.h` keeps the aim at 1; nothing else new is needed. Change modes only through ChangeState so Exit and Enter always run.

# Rubric

- The ballista forwards every input to its current mode object and holds no per-mode data of its own.
- Mode changes go through ChangeState, which runs the old mode's Exit and the new mode's Enter and ignores no-op changes.
- Each mode resets its own data in Enter, so a reused mode object never carries over a previous visit.
- Inputs a mode has no rule for fall through to the base class's empty default and are ignored.
- The mode objects are made once as default subobjects and held in UPROPERTY pointers, so the garbage collector keeps them.
- Aim and reload times come from the editable properties.

# Alternative

The ballista could create a new mode object on every change (`NewObject<UDojoP7BallistaAiming>(this)`) instead of reusing three. Then every visit starts fresh by construction and the reset in Enter is not needed. The cost is an allocation per change and garbage for the collector, and per-mode settings a designer might tune would have to be copied each time. Reusing three objects made once is cheaper and lets each mode keep editable defaults, at the price of the discipline this quest tests: Enter must reset what a visit owns.

# Parsons

```yaml
- id: ballista-change-state
  prompt: Put ChangeState in order.
  lines:
    - "void ADojoP7Ballista::ChangeState(UDojoP7BallistaState* NewState)"
    - "{"
    - "	if (!IsValid(NewState) || NewState == CurrentState) return;"
    - "	if (IsValid(CurrentState)) CurrentState->Exit(this);"
    - "	CurrentState = NewState;"
    - "	CurrentState->Enter(this);"
    - "}"
  distractors:
    - line: "	NewState->Exit(this);"
      mistake: Exit belongs to the mode being left; calling it on the mode being entered runs the wrong clean-up.
- id: aiming-fire
  prompt: Put the aiming mode's OnFireOrder in order.
  lines:
    - "void UDojoP7BallistaAiming::OnFireOrder(ADojoP7Ballista* Ballista)"
    - "{"
    - "	if (AimProgress < 1.f) return;"
    - "	Ballista->LaunchBolt();"
    - "	Ballista->ChangeState(Ballista->ReloadingState);"
    - "}"
  distractors:
    - line: "	Ballista->CurrentState = Ballista->ReloadingState;"
      mistake: Setting the pointer directly skips the reload's Enter, so the countdown starts from whatever the last reload left.
```
