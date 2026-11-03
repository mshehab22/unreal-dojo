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

Write `ADojoM1Charger` from nothing: a pawn with a scene root that owns its own Charge action and context. The tests use this public interface, so keep these names:

- `enum class EDojoM1ShotTier : uint8` (a `UENUM`) with the values `EST_None`, `EST_Light`, `EST_Medium`, and `EST_Heavy`.
- `UPROPERTY(EditAnywhere) float FullChargeSeconds = 1.f;` is how long Space must be held for a full charge, set by a designer before the pawn appears.
- `UPROPERTY(EditAnywhere) TObjectPtr<UInputAction> ChargeAction;` and `UPROPERTY(EditAnywhere) TObjectPtr<UInputMappingContext> ChargeContext;` are filled in with defaults when a designer has not assigned them: a yes or no action, and a context that maps Space to it through a Hold trigger whose threshold is `FullChargeSeconds`.
- `float GetMeter() const` is how full the charge is, from 0 to 1.
- `bool IsCharging() const` is true from the moment Space goes down until it is let go.
- `EDojoM1ShotTier GetLastShot() const` is the tier of the last shot, or `EST_None` before the first.
- `int32 GetShotsFired() const` counts the shots.
- `static EDojoM1ShotTier TierForMeter(float MeterValue)` is the tier a meter value earns: below one half is Light, below full is Medium, full is Heavy.

Everything else is yours to design: how the context reaches the player's subsystem as a controller arrives and leaves, and which functions the five trigger events run.

Dependency direction: the charger holds its own action and context and reaches the local player's subsystem only as a controller arrives or leaves; no code in the controller or the engine names this class.

Compiles against earlier quests: m1-turntable (`Quests/m1-turntable/DojoM1InputRig.h`, the test rig).

This charger is the fourth piece of the drone handoff boss.

## See it in the editor

Make a Blueprint subclass of `DojoM1Charger`, place it in the sandbox map, set Auto Possess Player to Player 0, and press Play. Hold Space and open the console with the tilde key: `ShowDebug EnhancedInput` shows the Charge action moving from Ongoing to Triggered after one second. In the Blueprint's Event Graph add a Print String of Get Meter and Get Last Shot on a one second Set Timer by Event from Event Begin Play to watch the numbers while you hold, then let go at different times to see each tier.

# Files

## DojoM1Charger.h

```cpp
// Declare ADojoM1Charger and EDojoM1ShotTier here.
```

## DojoM1Charger.cpp

```cpp
// Define ADojoM1Charger here.
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

- Think of the key's life as five moments, each with its own small function: it goes down, it is still going, the time is up, it is let go early, it is let go after the time is up.
- The Hold trigger is made with `NewObject` using the context as its outer and added to the mapping that `MapKey` returns, and the function that reads time takes the action instance; `NotifyControllerChanged` is built like the turntable's.
- Each of the five moments is its own trigger event on the Charge action, and the meter comes from the instance's elapsed time, kept between 0 and 1.

# Rubric

- The Hold trigger is on the Space mapping, with its threshold taken from `FullChargeSeconds`, and the action is a yes or no action.
- Started, Ongoing, Triggered, Canceled, and Completed are each bound to their own function, in `SetupPlayerInputComponent`.
- The meter is read from the action instance's elapsed time divided by `FullChargeSeconds` and clamped between 0 and 1, and it is full once the trigger fires.
- An early release fires the tier the meter had reached; a release after the threshold fires Heavy; each shot empties the meter.
- The context follows the controller: added to the new player's subsystem and removed from the old one.
- The charger holds its action and context; no other class names its input code, and the tier rule is a function that can be tested on its own.

# Alternative

The charger could skip the Hold trigger and count time itself: start a counter on `Started`, add the frame time in `Tick`, and fire on `Completed`. That works for a plain key, but it moves a rule the input system already knows into a second place that has to stay in step with it, and it needs ticking while nothing is held. Letting the trigger own the timing means the same Hold settings can be changed on the mapping asset without touching code. This shape, a thing that is idle, charging, or has just fired and reacts to events by moving between those, is close to the State pattern from Pack 2's State world, only with two flags and five handlers in place of separate state objects.

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
  prompt: "Put the five bindings in the order the moments of a charge happen: down, still going, time up, let go early, let go after the time. These are the reference's function names."
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
