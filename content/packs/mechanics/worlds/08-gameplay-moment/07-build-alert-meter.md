---
id: m8-alert-meter
title: An alert meter on a pulse
order: 7
kind: build
scaffold: stub
difficulty: 4
patterns: [observer]
skills: [timers, delegates]
terms: [timer-manager, timer-handle, dynamic-multicast-delegate, adddynamic, beginplay]
prerequisites: [m8-slice-and-order, m8-searchlight, m3-checkpoint]
xp: 100
estimatedMinutes: 28
concepts:
  - A meter driven by a repeating timer and by the events of a sensor, never by a check every frame
  - Remembering the last thing a sensor said, and acting on it at the meter's own pace
---

# Brief

When you place a still searchlight, a runner in its beam, and an alert meter watching the light, the meter holds about a second of alert after a second of being seen, is full and announces a catch once after two seconds, drains at half the pace when the runner steps out of the beam, and starts over after a reset.

`ADojoM8AlertMeter` has its header written for you. Fill in the bodies:

1. `BeginPlay`: start a repeating timer that calls `Pulse` every `PulseSeconds`.
2. `Watch`: listen to the light's sight changes with `HandleSightChanged`, binding only once however many times it is called; `HandleSightChanged` remembers whether the light can see its target right now.
3. `Pulse`: fill the meter by `PulseSeconds` while the target is seen, or take away `CalmDownPerSecond` times `PulseSeconds` while it is not (never below zero), and the first time the level reaches `CaughtAfterSeconds`, mark the catch and announce it once. Once caught, a pulse does nothing.
4. `Reset`, `GetAlertLevel`, and `IsCaught`.

Dependency direction: the meter listens to the light and tells whoever listens to it; the light does not know the meter exists, and nothing polls the meter. `DojoM8AlertLog` is a listener provided for the tests.

Compiles against earlier quests: m8-searchlight (`Quests/m8-searchlight/DojoM8Searchlight.h`) and m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This meter is the fourth piece of the Blackout Escape boss.

## See it in the editor

Place a `DojoM8Searchlight` with Sweep Degrees Per Second set to 0, a `DojoM8AlertMeter`, a `DojoM8AlertLog`, and a runner in front of the light. In the level Blueprint, on BeginPlay call Watch on the light with the runner, Watch on the meter with the light, and Listen on the log with the meter, and print the meter's Get Alert Level on a one second timer. Press Play: the level climbs by about 1 each second, and the log's Get Caught Count becomes 1 after two seconds and stays there. Drag the runner out of the beam and the level falls.

# Files

## DojoM8AlertMeter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM8AlertMeter.generated.h"

class ADojoM8Searchlight;

/** Broadcast once, when the meter fills. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM8OnCaught);

/** Fills while a searchlight sees its target and drains while it does not; when it fills the target is caught. It listens to the light and counts on a timer, not every frame. */
UCLASS()
class ADojoM8AlertMeter : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8AlertMeter();

	/** How often the meter updates, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter", meta = (ClampMin = "0.05"))
	float PulseSeconds = 0.25f;

	/** How much time in sight fills the meter. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter")
	float CaughtAfterSeconds = 2.f;

	/** How much of a second's sight the meter loses each second out of sight. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Alert Meter")
	float CalmDownPerSecond = 0.5f;

	/** Fires once, when the level first reaches CaughtAfterSeconds. */
	UPROPERTY(BlueprintAssignable, Category = "Alert Meter")
	FDojoM8OnCaught OnCaught;

	/** Starts listening to the light's sight changes, binding only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Alert Meter")
	void Watch(ADojoM8Searchlight* Light);

	/** Empties the meter and clears the caught state, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Alert Meter")
	void Reset();

	/** Seconds of sight the meter is holding. */
	UFUNCTION(BlueprintPure, Category = "Alert Meter")
	float GetAlertLevel() const;

	/** True once the meter has filled. */
	UFUNCTION(BlueprintPure, Category = "Alert Meter")
	bool IsCaught() const;

protected:
	/** Starts the repeating pulse. */
	virtual void BeginPlay() override;

private:
	/** Remembers whether the light can see its target right now. */
	UFUNCTION()
	void HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen);

	/** Runs every pulse: fills or drains the meter, and announces the catch once. */
	void Pulse();

	FTimerHandle PulseHandle;

	float AlertLevel = 0.f;

	bool bSeenNow = false;

	bool bCaught = false;
};
```

## DojoM8AlertMeter.cpp

```cpp
#include "DojoM8AlertMeter.h"

#include "Components/SceneComponent.h"
#include "DojoM8Searchlight.h"
#include "Engine/World.h"

ADojoM8AlertMeter::ADojoM8AlertMeter()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8AlertMeter::BeginPlay()
{
	Super::BeginPlay();

	// Your code: start a repeating timer that calls Pulse every PulseSeconds.
}

void ADojoM8AlertMeter::Watch(ADojoM8Searchlight* Light)
{
	// Your code: ignore an invalid light; otherwise listen to its sight changes with HandleSightChanged, binding only once.
}

void ADojoM8AlertMeter::Reset()
{
	// Your code: empty the meter and clear the caught state.
}

float ADojoM8AlertMeter::GetAlertLevel() const
{
	return 0.f;
}

bool ADojoM8AlertMeter::IsCaught() const
{
	return false;
}

void ADojoM8AlertMeter::HandleSightChanged(ADojoM8Searchlight* Light, bool bSeen)
{
	// Your code: remember whether the light can see its target right now.
}

void ADojoM8AlertMeter::Pulse()
{
	// Your code: do nothing once caught.
	// Your code: add PulseSeconds to the level while the target is seen; otherwise take away CalmDownPerSecond times PulseSeconds, never going below zero.
	// Your code: the first time the level reaches CaughtAfterSeconds, mark the catch and announce it once.
}
```

## DojoM8AlertLog.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8AlertLog.generated.h"

class ADojoM8AlertMeter;

/** A listener for tests and Blueprints: counts how often an alert meter announced a catch. */
UCLASS()
class ADojoM8AlertLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8AlertLog();

	/** Starts counting the meter's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Alert Log")
	void Listen(ADojoM8AlertMeter* Meter);

	/** How many times the meter announced a catch. */
	UFUNCTION(BlueprintPure, Category = "Alert Log")
	int32 GetCaughtCount() const;

private:
	/** Adds one to the count. */
	UFUNCTION()
	void HandleCaught();

	int32 CaughtCount = 0;
};
```

## DojoM8AlertLog.cpp

```cpp
#include "DojoM8AlertLog.h"

#include "DojoM8AlertMeter.h"

ADojoM8AlertLog::ADojoM8AlertLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8AlertLog::Listen(ADojoM8AlertMeter* Meter)
{
	if (!IsValid(Meter)) return;

	Meter->OnCaught.AddUniqueDynamic(this, &ADojoM8AlertLog::HandleCaught);
}

int32 ADojoM8AlertLog::GetCaughtCount() const
{
	return CaughtCount;
}

void ADojoM8AlertLog::HandleCaught()
{
	CaughtCount++;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m8-alert-meter/DojoM8AlertLog.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-searchlight/DojoM8Searchlight.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM8AlertMeterTest
{
	/** Where the runner stands in the beam, and where it stands out of it. */
	const FVector LitSpot(500.0, 0.0, 0.0);
	const FVector DarkSpot(-500.0, 0.0, 0.0);

	/** A still light, a runner in its beam, a meter watching the light, and a log listening to the meter. */
	struct FMeterScene
	{
		ADojoM8Searchlight* Light = nullptr;
		ADojoM3Runner* Runner = nullptr;
		ADojoM8AlertMeter* Meter = nullptr;
		ADojoM8AlertLog* Log = nullptr;
	};

	/** Builds the scene with the runner lit from the first frame. */
	FMeterScene MakeScene(FDojoTestWorld& TestWorld)
	{
		FMeterScene Scene;
		Scene.Light = TestWorld.SpawnActor<ADojoM8Searchlight>();
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(LitSpot, FRotator::ZeroRotator);
		Scene.Meter = TestWorld.SpawnActor<ADojoM8AlertMeter>();
		Scene.Log = TestWorld.SpawnActor<ADojoM8AlertLog>();
		if (!Scene.Light || !Scene.Runner || !Scene.Meter || !Scene.Log) return Scene;

		Scene.Light->SweepDegreesPerSecond = 0.f;
		Scene.Light->Watch(Scene.Runner);
		Scene.Meter->Watch(Scene.Light);
		Scene.Meter->Watch(Scene.Light);
		Scene.Log->Listen(Scene.Meter);
		return Scene;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_AlertMeter_FillsWhileSeen, "Dojo.M8.AlertMeter.FillsWhileSeen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Keeps a runner in the beam for one second and checks the meter holds about a second of sight. */
bool FDojo_M8_AlertMeter_FillsWhileSeen::RunTest(const FString& Parameters)
{
	using namespace DojoM8AlertMeterTest;

	FDojoTestWorld TestWorld;
	FMeterScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Light, runner, meter, and log made"), Scene.Log) || !Scene.Light || !Scene.Runner || !Scene.Meter) return false;

	TestEqual(TEXT("A new meter is empty"), Scene.Meter->GetAlertLevel(), 0.f);

	TestWorld.Tick(61);
	TestNearlyEqual(TEXT("A second in the beam fills about a second"), Scene.Meter->GetAlertLevel(), 1.f, 0.3f);
	TestFalse(TEXT("which is not yet enough to be caught"), Scene.Meter->IsCaught());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_AlertMeter_DrainsOutOfSight, "Dojo.M8.AlertMeter.DrainsOutOfSight", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fills the meter, hides the runner, and checks the meter calms down at its own pace and never goes below empty. */
bool FDojo_M8_AlertMeter_DrainsOutOfSight::RunTest(const FString& Parameters)
{
	using namespace DojoM8AlertMeterTest;

	FDojoTestWorld TestWorld;
	FMeterScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Light, runner, meter, and log made"), Scene.Log) || !Scene.Light || !Scene.Runner || !Scene.Meter) return false;

	TestWorld.Tick(61);
	const float Full = Scene.Meter->GetAlertLevel();

	Scene.Runner->SetActorLocation(DarkSpot);
	TestWorld.Tick(61);
	const float Calmer = Scene.Meter->GetAlertLevel();
	TestTrue(TEXT("Out of the beam for a second the meter has dropped"), Calmer < Full - 0.2f);
	TestTrue(TEXT("but a drop is slower than the rise, so it is not empty yet"), Calmer > 0.05f);

	TestWorld.Tick(600);
	TestEqual(TEXT("After a long time in the dark the meter is empty, never below"), Scene.Meter->GetAlertLevel(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_AlertMeter_CatchesOnceAtTheLimit, "Dojo.M8.AlertMeter.CatchesOnceAtTheLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Keeps the runner lit well past the limit and counts the announcements; then resets and catches again. */
bool FDojo_M8_AlertMeter_CatchesOnceAtTheLimit::RunTest(const FString& Parameters)
{
	using namespace DojoM8AlertMeterTest;

	FDojoTestWorld TestWorld;
	FMeterScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Light, runner, meter, and log made"), Scene.Log) || !Scene.Light || !Scene.Runner || !Scene.Meter) return false;

	TestWorld.Tick(60);
	TestEqual(TEXT("One second lit is not a catch"), Scene.Log->GetCaughtCount(), 0);

	TestWorld.Tick(120);
	TestTrue(TEXT("Three seconds lit is a catch"), Scene.Meter->IsCaught());
	TestEqual(TEXT("announced once"), Scene.Log->GetCaughtCount(), 1);

	TestWorld.Tick(600);
	TestEqual(TEXT("Staying lit does not announce again"), Scene.Log->GetCaughtCount(), 1);

	Scene.Meter->Reset();
	TestFalse(TEXT("A reset clears the catch"), Scene.Meter->IsCaught());
	TestEqual(TEXT("and empties the meter"), Scene.Meter->GetAlertLevel(), 0.f);

	TestWorld.Tick(180);
	TestEqual(TEXT("A second round of being lit is a second catch"), Scene.Log->GetCaughtCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_AlertMeter_NothingPollsEveryFrame, "Dojo.M8.AlertMeter.NothingPollsEveryFrame", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the meter does not tick, and that its tunables and its event are visible to designers. */
bool FDojo_M8_AlertMeter_NothingPollsEveryFrame::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoM8AlertMeter* Meter = TestWorld.SpawnActor<ADojoM8AlertMeter>();
	if (!TestNotNull(TEXT("Meter spawned"), Meter)) return false;

	TestFalse(TEXT("The meter never ticks; it counts on a timer"), Meter->PrimaryActorTick.bCanEverTick);

	const UClass* MeterClass = ADojoM8AlertMeter::StaticClass();
	for (const TCHAR* Name : { TEXT("PulseSeconds"), TEXT("CaughtAfterSeconds"), TEXT("CalmDownPerSecond") })
	{
		const FProperty* Property = MeterClass->FindPropertyByName(Name);

		if (!TestNotNull(FString::Printf(TEXT("%s is a UPROPERTY"), Name), Property)) continue;
		TestTrue(FString::Printf(TEXT("%s is editable in Details"), Name), Property->HasAnyPropertyFlags(CPF_Edit));
	}

	const FProperty* OnCaught = MeterClass->FindPropertyByName(TEXT("OnCaught"));
	if (!TestNotNull(TEXT("OnCaught is a UPROPERTY"), OnCaught)) return false;
	TestTrue(TEXT("Blueprints can bind to it"), OnCaught->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

#endif
```

# Hints

- The meter has three moving parts: the timer started in BeginPlay, the remembered sight state, and the pulse that reads both. Write them in that order.
- `GetWorldTimerManager().SetTimer` takes a handle, an object, a member function, a time, and whether to loop. The pulse needs two branches and a guard: seen adds, not seen subtracts but never below zero, and a catch announces once.
- Keep a bool for "seen right now" that only `HandleSightChanged` writes and only `Pulse` reads. For the catch, set the caught flag in the same place you broadcast, and return at the top of `Pulse` when it is already set.

# Rubric

- A repeating timer started in BeginPlay drives the meter; the meter never ticks.
- The meter listens to the light with AddUniqueDynamic and stores only whether the target is seen.
- Each pulse adds `PulseSeconds` while seen, or takes away `CalmDownPerSecond` times `PulseSeconds` while not, and the level never goes below zero.
- The first time the level reaches `CaughtAfterSeconds` the catch is announced exactly once.
- Reset empties the meter and clears the caught state so a new round can be caught again.
- The pulse, the thresholds, and the calm-down rate are properties a designer can set in Details.

# Alternative

The meter could tick every frame and add the frame's time while it asks the light whether it sees the target. That is simple and smooth, but the meter then polls a sensor that already knows when its answer changes, and every frame pays for work that matters only a few times a second. A meter on a pulse reacts to events and does a few cheap sums per second; it is slightly coarser, and for a gauge that fills over two seconds nobody can tell. This shape, a sender that announces and listeners that subscribe, is the Observer pattern, as in Pack 2's first world.

# Parsons

```yaml
- id: alert-pulse
  prompt: Put Pulse in order.
  lines:
    - "void ADojoM8AlertMeter::Pulse()"
    - "{"
    - "	if (bCaught) return;"
    - "	if (bSeenNow) AlertLevel += PulseSeconds;"
    - "	else AlertLevel = FMath::Max(0.f, AlertLevel - CalmDownPerSecond * PulseSeconds);"
    - "	if (AlertLevel < CaughtAfterSeconds) return;"
    - "	bCaught = true;"
    - "	OnCaught.Broadcast();"
    - "}"
  distractors:
    - line: "	else AlertLevel -= CalmDownPerSecond * PulseSeconds;"
      mistake: A level that is allowed to go below zero would take extra seconds in the beam to climb back to empty.
- id: alert-begin-play
  prompt: Put BeginPlay in order.
  lines:
    - "void ADojoM8AlertMeter::BeginPlay()"
    - "{"
    - "	Super::BeginPlay();"
    - "	GetWorldTimerManager().SetTimer(PulseHandle, this, &ADojoM8AlertMeter::Pulse, PulseSeconds, true);"
    - "}"
  distractors:
    - line: "	GetWorldTimerManager().SetTimer(PulseHandle, this, &ADojoM8AlertMeter::Pulse, PulseSeconds, false);"
      mistake: A timer that does not loop fires once, so the meter would pulse a single time.
```
