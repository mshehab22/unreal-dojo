---
id: example-build-faded-flicker
title: A lantern that flickers on a timer
order: 3
kind: build
scaffold: faded
difficulty: 2
patterns: [component]
skills: [timers]
terms: [timer-manager, timer-handle, beginplay, endplay]
prerequisites: [example-build-worked-lantern]
xp: 60
estimatedMinutes: 15
concepts:
  - A looping timer replaces per-frame checks
  - Timers are cleared in EndPlay
---

# Brief

When you press Play, the lantern dips to a quarter of its brightness for a moment every 1.5 seconds, like a flame catching a draft.

The header is done. In the source file the timer is started for you; write `Flicker` so each call dims the light and schedules the return to full brightness 0.1 seconds later. Then clear the timers when the lantern leaves play.

First version: dim and restore inside one function with a second timer. That is enough here; the next quest shows why a single timer with a state flag scales better.

## See it in the editor

Place the lantern in the sandbox map and press Play. Type `slomo 0.2` in the console to slow time down; the dip should be easy to see every 1.5 seconds of game time.

# Files

## DojoExFlickerLantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExFlickerLantern.generated.h"

class UPointLightComponent;

/** A lantern that dips its light on a looping timer, like a flame in a draft. */
UCLASS()
class ADojoExFlickerLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the light component and turns ticking off. */
	ADojoExFlickerLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.1"))
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

protected:
	/** Lights the lantern and starts the flicker timer. */
	virtual void BeginPlay() override;
	/** Clears both timers before the actor leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Dims the light and schedules the return to full brightness. */
	void Flicker();
	/** Puts the light back to full brightness. */
	void Restore();

	FTimerHandle FlickerHandle;
	FTimerHandle RestoreHandle;
};
```

## DojoExFlickerLantern.cpp

```cpp
#include "DojoExFlickerLantern.h"

#include "Components/PointLightComponent.h"
#include "TimerManager.h"

/** Creates the light as the root component. */
ADojoExFlickerLantern::ADojoExFlickerLantern()
{
	PrimaryActorTick.bCanEverTick = false;

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

/** Lights the lantern and starts the looping flicker timer. */
void ADojoExFlickerLantern::BeginPlay()
{
	Super::BeginPlay(); // @explain: Parent setup runs first so the light is registered before we touch it.

	Light->SetIntensity(Brightness);
	GetWorldTimerManager().SetTimer(FlickerHandle, this, &ADojoExFlickerLantern::Flicker, FlickerInterval, true); // @explain: The last argument makes the timer loop, so Flicker runs every interval without Tick.
}

/** Dims the light to a quarter and schedules Restore 0.1 seconds later. */
void ADojoExFlickerLantern::Flicker()
{
	// Your code: dim the light, then schedule Restore 0.1 seconds from now.
}

/** Puts the light back to full brightness. */
void ADojoExFlickerLantern::Restore()
{
	Light->SetIntensity(Brightness);
}

/** Clears both timers before the actor leaves play. */
void ADojoExFlickerLantern::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	// Your code: clear both timers.

	Super::EndPlay(EndPlayReason); // @explain: EndPlay calls the parent last, after this actor has cleaned up its own state.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/PointLightComponent.h"
#include "Quests/example-build-faded-flicker/DojoExFlickerLantern.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Examples_Flicker_DipsAndRestores, "Dojo.Examples.Flicker.DipsAndRestores", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ticks past the first flicker and checks the dip to a quarter, then ticks past the restore and checks full brightness. */
bool FDojo_Examples_Flicker_DipsAndRestores::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoExFlickerLantern* Lantern = TestWorld.SpawnActor<ADojoExFlickerLantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;

	// 1.5 seconds at 60 frames per second is 90 frames; two more frames land just after the first flicker.
	TestWorld.Tick(92);
	TestEqual(TEXT("Dimmed to a quarter right after the flicker"), Lantern->Light->Intensity, Lantern->Brightness * 0.25f);

	// 0.1 seconds is 6 frames; one more makes sure the restore timer has fired.
	TestWorld.Tick(7);
	TestEqual(TEXT("Back to full brightness 0.1 seconds later"), Lantern->Light->Intensity, Lantern->Brightness);

	return true;
}

#endif
```

# Hints

- Look at how BeginPlay starts the looping timer; Flicker needs a one-shot version of the same call.
- The timer manager can start a timer that runs once and can clear a timer by its handle.
- Both calls live on the object returned by GetWorldTimerManager, declared in `TimerManager.h`.

# Rubric

- Flicker dims the light and schedules Restore with a one-shot timer.
- No Tick is used.
- Both timers are cleared in EndPlay before Super::EndPlay.
- Interval and brightness come from editable properties.
- The lantern owns its timers and nothing else holds them.

# Alternative

A timeline or a curve asset could animate the brightness smoothly instead of a hard dip. That looks better but adds an asset and more moving parts; the two-timer version is easier to test and is what most gameplay code uses for simple on and off rhythms.
