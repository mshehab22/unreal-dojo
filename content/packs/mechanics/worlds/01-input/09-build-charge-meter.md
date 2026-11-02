---
id: m1-charge-meter
title: A charge that reads how long Space was held
order: 9
kind: build
scaffold: blank
difficulty: 4
patterns: [state]
skills: [input]
terms: [input-trigger, etriggerevent, finputactioninstance, enhanced-input-component, setup-player-input-component]
prerequisites: [m1-triggers-and-events, m1-turntable]
xp: 120
estimatedMinutes: 35
concepts:
  - A Hold trigger on a mapping turns a key into a timed action with five trigger events
  - A handler that takes the action instance reads how long the key has been held
  - Early and late releases arrive as different events
---

# Brief

When you possess the charger and hold Space, the meter climbs from 0 to 1 over one second; let go early and it fires a Light shot below one half and a Medium shot from one half up; hold for the full second, let go, and it fires a Heavy shot. After each shot the meter is empty again.

`ADojoM1Charger` has its header written for you, including the shot tiers and the private functions to fill. Everything in the `.cpp` except the constructor is yours:

1. `PreInitializeComponents`: build the yes or no Charge action and a context that maps Space to it through a Hold trigger whose threshold is `FullChargeSeconds`.
2. `NotifyControllerChanged` and `SetupPlayerInputComponent`: put the context on the player's subsystem as a controller arrives, take it off the one that left, and bind the five trigger events to the five private functions.
3. The five stage functions, `Fire`, `TierForMeter`, and the four getters.

Dependency direction: the charger holds its own action and context and reaches the local player's subsystem only as a controller arrives or leaves; nothing else points at it.

Compiles against earlier quests: m1-turntable (`Quests/m1-turntable/DojoM1InputRig.h`, the test rig).

This charger is the fourth piece of the drone handoff boss.

## See it in the editor

Place a `DojoM1Charger`, set Auto Possess Player to Player 0, and press Play. Hold Space and open the console with the tilde key: `ShowDebug EnhancedInput` shows the Charge action moving from Ongoing to Triggered after one second. Add a Print String of Get Meter and Get Last Shot on a one second Set Timer by Event to watch the numbers while you hold, then let go at different times to see each tier.

# Files

## DojoM1Charger.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "DojoM1Charger.generated.h"

class UInputAction;
class UInputMappingContext;
struct FInputActionInstance;

/** How hard a charged shot was. */
UENUM(BlueprintType)
enum class EDojoM1ShotTier : uint8
{
	EST_None UMETA(DisplayName = "None"),
	EST_Light UMETA(DisplayName = "Light"),
	EST_Medium UMETA(DisplayName = "Medium"),
	EST_Heavy UMETA(DisplayName = "Heavy")
};

/** A pawn that charges while Space is held and fires when it is let go: a short hold is a light shot, half a charge is medium, a full charge is heavy. */
UCLASS()
class ADojoM1Charger : public APawn
{
	GENERATED_BODY()

public:
	/** Creates the scene root a pawn needs to have a place in the world, and turns ticking off. */
	ADojoM1Charger();

	/** How long Space must be held for a full charge, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger", meta = (ClampMin = "0.01"))
	float FullChargeSeconds = 1.f;

	/** The yes or no Charge action; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger|Input")
	TObjectPtr<UInputAction> ChargeAction;

	/** The context that maps Space to the Charge action with a Hold trigger; filled in with a default if a designer has not assigned one. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charger|Input")
	TObjectPtr<UInputMappingContext> ChargeContext;

	/** How full the charge is, from 0 to 1. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	float GetMeter() const;

	/** True from the moment Space goes down until it is let go. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	bool IsCharging() const;

	/** The tier of the last shot, or None before the first. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	EDojoM1ShotTier GetLastShot() const;

	/** How many shots have been fired. */
	UFUNCTION(BlueprintPure, Category = "Charger")
	int32 GetShotsFired() const;

	/** The tier a meter value earns: below one half is Light, below full is Medium, full is Heavy. */
	static EDojoM1ShotTier TierForMeter(float MeterValue);

protected:
	/** Builds the default action and context, with the Hold trigger, when none were assigned, before the pawn can be possessed. */
	virtual void PreInitializeComponents() override;

	/** Takes this pawn's context off the old player and puts it on the new one. */
	virtual void NotifyControllerChanged() override;

	/** Binds the five stages of the charge to their functions. */
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

private:
	/** The key just went down: start from an empty meter. */
	void BeginCharge();

	/** Still holding, below full: set the meter from how long the action has been going. */
	void ContinueCharge(const FInputActionInstance& Instance);

	/** The hold reached its threshold: the meter is full. */
	void ReachFullCharge();

	/** The key was let go early: fire the tier the meter had reached. */
	void ReleaseEarly();

	/** The key was let go after a full charge: fire a heavy shot. */
	void ReleaseFull();

	/** Records a shot of this tier and empties the meter. */
	void Fire(EDojoM1ShotTier Tier);

	float Meter = 0.f;

	bool bCharging = false;

	EDojoM1ShotTier LastShot = EDojoM1ShotTier::EST_None;

	int32 ShotsFired = 0;
};
```

## DojoM1Charger.cpp

```cpp
#include "DojoM1Charger.h"

#include "Components/SceneComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/LocalPlayer.h"
#include "GameFramework/PlayerController.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "InputTriggers.h"

ADojoM1Charger::ADojoM1Charger()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM1Charger::PreInitializeComponents()
{
	// Your code: if no action was assigned, make one as a yes or no action.
	// Your code: if no context was assigned, make one that maps Space to the action through a Hold trigger set to FullChargeSeconds.

	Super::PreInitializeComponents();
}

void ADojoM1Charger::NotifyControllerChanged()
{
	// Your code: take ChargeContext off the player that is leaving, call Super, then add it at priority 0 to the player that arrived.
}

void ADojoM1Charger::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	// Your code: bind Started, Ongoing, Triggered, Canceled, and Completed of the Charge action to the five stage functions.
}

float ADojoM1Charger::GetMeter() const
{
	return 0.f;
}

bool ADojoM1Charger::IsCharging() const
{
	return false;
}

EDojoM1ShotTier ADojoM1Charger::GetLastShot() const
{
	return EDojoM1ShotTier::EST_None;
}

int32 ADojoM1Charger::GetShotsFired() const
{
	return 0;
}

EDojoM1ShotTier ADojoM1Charger::TierForMeter(float MeterValue)
{
	return EDojoM1ShotTier::EST_None;
}

void ADojoM1Charger::BeginCharge()
{
	// Your code.
}

void ADojoM1Charger::ContinueCharge(const FInputActionInstance& Instance)
{
	// Your code.
}

void ADojoM1Charger::ReachFullCharge()
{
	// Your code.
}

void ADojoM1Charger::ReleaseEarly()
{
	// Your code.
}

void ADojoM1Charger::ReleaseFull()
{
	// Your code.
}

void ADojoM1Charger::Fire(EDojoM1ShotTier Tier)
{
	// Your code.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m1-charge-meter/DojoM1Charger.h"
#include "Quests/m1-turntable/DojoM1InputRig.h"
#include "Support/DojoTestWorld.h"

namespace DojoM1ChargeTest
{
	/** Spawns a charger with the given full-charge time already set, the way a designer sets it in Details. */
	ADojoM1Charger* SpawnCharger(FDojoTestWorld& TestWorld, float FullChargeSeconds)
	{
		ADojoM1Charger* Charger = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM1Charger>(ADojoM1Charger::StaticClass(), FTransform::Identity);
		Charger->FullChargeSeconds = FullChargeSeconds;
		Charger->FinishSpawning(FTransform::Identity);
		return Charger;
	}

	/** Holds Space for the given number of 60 frames-per-second frames, lets go, and runs two more frames. */
	void HoldSpace(FDojoTestWorld& TestWorld, FDojoM1InputRig& Rig, int32 Frames)
	{
		Rig.Press(EKeys::SpaceBar);
		Rig.Tick(Frames);
		Rig.Release(EKeys::SpaceBar);
		Rig.Tick(2);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_ChargeMeter_ThreeTiers, "Dojo.M1.ChargeMeter.ThreeTiers", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires a short, a middle, and a long shot and checks the tier, the shot count, and the empty meter after each. */
bool FDojo_M1_ChargeMeter_ThreeTiers::RunTest(const FString& Parameters)
{
	using namespace DojoM1ChargeTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Charger* Charger = SpawnCharger(TestWorld, 1.f);
	if (!TestNotNull(TEXT("Charger spawned"), Charger)) return false;

	Rig.Possess(Charger);
	TestTrue(TEXT("Nothing is fired yet"), Charger->GetLastShot() == EDojoM1ShotTier::EST_None);

	HoldSpace(TestWorld, Rig, 18);
	TestTrue(TEXT("0.3 seconds is a light shot"), Charger->GetLastShot() == EDojoM1ShotTier::EST_Light);
	TestEqual(TEXT("One shot fired"), Charger->GetShotsFired(), 1);
	TestEqual(TEXT("The meter is empty after a shot"), Charger->GetMeter(), 0.f);
	TestFalse(TEXT("It is no longer charging"), Charger->IsCharging());

	HoldSpace(TestWorld, Rig, 42);
	TestTrue(TEXT("0.7 seconds is a medium shot"), Charger->GetLastShot() == EDojoM1ShotTier::EST_Medium);
	TestEqual(TEXT("Two shots fired"), Charger->GetShotsFired(), 2);

	HoldSpace(TestWorld, Rig, 78);
	TestTrue(TEXT("1.3 seconds is a heavy shot"), Charger->GetLastShot() == EDojoM1ShotTier::EST_Heavy);
	TestEqual(TEXT("Three shots fired"), Charger->GetShotsFired(), 3);
	TestEqual(TEXT("The meter is empty again"), Charger->GetMeter(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_ChargeMeter_MeterFollowsTheHold, "Dojo.M1.ChargeMeter.MeterFollowsTheHold", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Holds Space and reads the meter half way, at full, and while still held beyond full. */
bool FDojo_M1_ChargeMeter_MeterFollowsTheHold::RunTest(const FString& Parameters)
{
	using namespace DojoM1ChargeTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Charger* Charger = SpawnCharger(TestWorld, 1.f);
	if (!TestNotNull(TEXT("Charger spawned"), Charger)) return false;

	Rig.Possess(Charger);
	TestFalse(TEXT("Not charging before Space goes down"), Charger->IsCharging());

	Rig.Press(EKeys::SpaceBar);
	Rig.Tick(30);
	TestTrue(TEXT("Charging while held"), Charger->IsCharging());
	TestNearlyEqual(TEXT("Half a second is half a meter"), Charger->GetMeter(), 0.5f, 0.1f);

	Rig.Tick(60);
	TestNearlyEqual(TEXT("Past a second the meter is full and stays full"), Charger->GetMeter(), 1.f, 0.01f);
	TestEqual(TEXT("Nothing has fired while the key is still down"), Charger->GetShotsFired(), 0);

	Rig.Release(EKeys::SpaceBar);
	Rig.Tick(2);
	TestEqual(TEXT("Letting go fires once"), Charger->GetShotsFired(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_ChargeMeter_ThresholdIsADesignerSetting, "Dojo.M1.ChargeMeter.ThresholdIsADesignerSetting", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sets a two second charge and checks 1.3 seconds is only a medium shot and 2.3 seconds is heavy. */
bool FDojo_M1_ChargeMeter_ThresholdIsADesignerSetting::RunTest(const FString& Parameters)
{
	using namespace DojoM1ChargeTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Charger* Charger = SpawnCharger(TestWorld, 2.f);
	if (!TestNotNull(TEXT("Charger spawned"), Charger)) return false;

	Rig.Possess(Charger);

	HoldSpace(TestWorld, Rig, 78);
	TestTrue(TEXT("1.3 seconds of a two second charge is medium"), Charger->GetLastShot() == EDojoM1ShotTier::EST_Medium);

	HoldSpace(TestWorld, Rig, 138);
	TestTrue(TEXT("2.3 seconds of a two second charge is heavy"), Charger->GetLastShot() == EDojoM1ShotTier::EST_Heavy);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_ChargeMeter_TiersFromTheMeter, "Dojo.M1.ChargeMeter.TiersFromTheMeter", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the tier boundaries directly. */
bool FDojo_M1_ChargeMeter_TiersFromTheMeter::RunTest(const FString& Parameters)
{
	TestTrue(TEXT("0 is light"), ADojoM1Charger::TierForMeter(0.f) == EDojoM1ShotTier::EST_Light);
	TestTrue(TEXT("Just under a half is light"), ADojoM1Charger::TierForMeter(0.49f) == EDojoM1ShotTier::EST_Light);
	TestTrue(TEXT("A half is medium"), ADojoM1Charger::TierForMeter(0.5f) == EDojoM1ShotTier::EST_Medium);
	TestTrue(TEXT("Just under full is medium"), ADojoM1Charger::TierForMeter(0.99f) == EDojoM1ShotTier::EST_Medium);
	TestTrue(TEXT("Full is heavy"), ADojoM1Charger::TierForMeter(1.f) == EDojoM1ShotTier::EST_Heavy);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M1_ChargeMeter_ControlsFollowTheController, "Dojo.M1.ChargeMeter.ControlsFollowTheController", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks Space does nothing until the charger is possessed and after it is let go. */
bool FDojo_M1_ChargeMeter_ControlsFollowTheController::RunTest(const FString& Parameters)
{
	using namespace DojoM1ChargeTest;

	FDojoTestWorld TestWorld;
	FDojoM1InputRig Rig(TestWorld);

	ADojoM1Charger* Charger = SpawnCharger(TestWorld, 1.f);
	if (!TestNotNull(TEXT("Charger spawned"), Charger) || !TestNotNull(TEXT("Context built"), Charger->ChargeContext.Get())) return false;

	HoldSpace(TestWorld, Rig, 30);
	TestEqual(TEXT("Nobody controls it, so nothing fires"), Charger->GetShotsFired(), 0);

	Rig.Possess(Charger);
	TestTrue(TEXT("While possessed the context is active"), Rig.GetSubsystem()->HasMappingContext(Charger->ChargeContext));
	HoldSpace(TestWorld, Rig, 30);
	TestEqual(TEXT("Possessed, it fires"), Charger->GetShotsFired(), 1);

	Rig.GetController()->UnPossess();
	Rig.Tick(1);
	TestFalse(TEXT("After it is let go the context is gone"), Rig.GetSubsystem()->HasMappingContext(Charger->ChargeContext));
	HoldSpace(TestWorld, Rig, 30);
	TestEqual(TEXT("Let go, it does not fire again"), Charger->GetShotsFired(), 1);

	return true;
}

#endif
```

# Hints

- Think of the key's life as five moments and give each its own small function: it goes down, it is still going, the time is up, it is let go early, it is let go after the time is up. The Hold trigger is added to the mapping that `MapKey` returns, and the function that reads time takes the action instance.
- The trigger is `UInputTriggerHold` with a `HoldTimeThreshold`, created with `NewObject` and the context as outer, then added to the mapping's `Triggers`. The five moments are `Started`, `Ongoing`, `Triggered`, `Canceled`, and `Completed`. The instance's `GetElapsedTime()` is how long the action has been going. `NotifyControllerChanged` is built like the walker's.
- The Ongoing bind has the same shape as the other four: the action, the event, the object, and the address of the function; only the function that takes the instance differs. The meter is the elapsed time divided by `FullChargeSeconds`, kept between 0 and 1. A heavy shot is the only one that follows `Completed`.

# Rubric

- The Hold trigger is on the Space mapping, with its threshold taken from `FullChargeSeconds`, and the action is a yes or no action.
- Started, Ongoing, Triggered, Canceled, and Completed are each bound to their own function, in `SetupPlayerInputComponent`.
- The meter is read from the action instance's elapsed time divided by `FullChargeSeconds` and clamped between 0 and 1, and it is full once the trigger fires.
- An early release fires the tier the meter had reached; a release after the threshold fires Heavy; each shot empties the meter.
- The context follows the controller: added to the new player's subsystem and removed from the old one.
- The charger holds its action and context; nothing else points at its input code, and the tier rule is a function that can be tested on its own.

# Alternative

The charger could skip the Hold trigger and count time itself: start a counter on `Started`, add the frame time in `Tick`, and fire on `Completed`. That works for a plain key, but it moves a rule the input system already knows into a second place that has to stay in step with it, and it needs ticking while nothing is held. Letting the trigger own the timing means the same Hold settings can be changed on the mapping asset without touching code. This shape, a thing that is idle, charging, or has just fired and reacts to events by moving between those, is the State pattern, as in Pack 2's State world.

# Parsons

```yaml
- id: charger-continue
  prompt: Put ContinueCharge in order.
  lines:
    - "void ADojoM1Charger::ContinueCharge(const FInputActionInstance& Instance)"
    - "{"
    - "	const float Fraction = Instance.GetElapsedTime() / FullChargeSeconds;"
    - "	Meter = FMath::Clamp(Fraction, 0.f, 1.f);"
    - "}"
  distractors:
    - line: "	Meter = Instance.GetValue().Get<float>();"
      mistake: A key's value is only ever 0 or 1; how long it has been held comes from GetElapsedTime on the instance.
- id: charger-bind
  prompt: Put the five bindings in order.
  lines:
    - "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Started, this, &ADojoM1Charger::BeginCharge);"
    - "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Ongoing, this, &ADojoM1Charger::ContinueCharge);"
    - "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Triggered, this, &ADojoM1Charger::ReachFullCharge);"
    - "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Canceled, this, &ADojoM1Charger::ReleaseEarly);"
    - "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Completed, this, &ADojoM1Charger::ReleaseFull);"
  distractors:
    - line: "EnhancedInput->BindAction(ChargeAction, ETriggerEvent::Released, this, &ADojoM1Charger::ReleaseFull);"
      mistake: ETriggerEvent has no Released; letting go after a full charge is announced as Completed.
```
