---
id: example-refactor-lantern-tick
title: Take the lantern off Tick
order: 6
kind: refactor
scaffold: faded
difficulty: 2
patterns: [update-method]
skills: [timers, performance]
terms: [tick, timer-manager, deltatime]
prerequisites: [example-build-faded-flicker]
xp: 70
estimatedMinutes: 15
concepts:
  - Tick is for work that truly changes every frame
  - A timer does periodic work without per-frame cost
---

# Brief

When you press Play, the lantern still flickers every 1.5 seconds exactly as before, but it no longer ticks.

The starter works: it flickers on the right rhythm. It counts time in Tick with an accumulator that adds `DeltaSeconds` every frame. Your job is to keep the flicker rhythm identical while moving the rhythm onto a looping timer and turning Tick off.

## See it in the editor

Place twenty of these lanterns, press Play, and run `stat game` before and after the refactor; the tick count for the world drops by twenty. The flicker itself must look the same.

# Files

## DojoExTickLantern.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExTickLantern.generated.h"

class UPointLightComponent;

UCLASS()
class ADojoExTickLantern : public AActor
{
	GENERATED_BODY()

public:
	ADojoExTickLantern();

	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

	int32 GetFlickerCount() const { return FlickerCount; }

private:
	void Flicker();

	float SecondsSinceFlicker = 0.f;
	int32 FlickerCount = 0;
};
```

## DojoExTickLantern.cpp

```cpp
#include "DojoExTickLantern.h"

#include "Components/PointLightComponent.h"

ADojoExTickLantern::ADojoExTickLantern()
{
	PrimaryActorTick.bCanEverTick = true; // @explain: This is what makes the engine call Tick every frame for every lantern.

	Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("Light"));
	RootComponent = Light;
}

void ADojoExTickLantern::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	SecondsSinceFlicker += DeltaSeconds; // @explain: The accumulator is frame-rate independent because it adds real elapsed time.

	if (SecondsSinceFlicker >= FlickerInterval)
	{
		SecondsSinceFlicker -= FlickerInterval;
		Flicker();
	}
}

void ADojoExTickLantern::Flicker()
{
	FlickerCount++;
	Light->SetIntensity(FlickerCount % 2 == 0 ? Brightness : Brightness * 0.25f);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/example-refactor-lantern-tick/DojoExTickLantern.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Examples_TickLantern_SameRhythmNoTick, "Dojo.Examples.TickLantern.SameRhythmNoTick", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ticks three seconds and checks two flickers happened, and that the lantern itself no longer ticks. */
bool FDojo_Examples_TickLantern_SameRhythmNoTick::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoExTickLantern* Lantern = TestWorld.SpawnActor<ADojoExTickLantern>();
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern)) return false;

	TestWorld.Tick(182);

	TestEqual(TEXT("Two flickers in a little over three seconds"), Lantern->GetFlickerCount(), 2);
	TestFalse(TEXT("The lantern no longer ticks"), Lantern->IsActorTickEnabled());

	return true;
}

#endif
```

# Hints

- Find the two lines that decide when a flicker happens; those are what the timer replaces.
- A looping timer set in BeginPlay calls a member function every interval, and the actor's tick can be switched off in the constructor.
- Remember to clear the timer in EndPlay; the handle type is declared in `Engine/TimerHandle.h`.

# Rubric

- Tick is gone and the actor cannot tick.
- A looping timer started in BeginPlay calls Flicker every FlickerInterval.
- The timer is cleared in EndPlay.
- Flicker and its count are unchanged, so the tests read the same results.
- The accumulator field is removed, not left unused.

# Alternative

Leaving Tick on but setting `PrimaryActorTick.TickInterval` to the flicker interval also cuts the cost. It keeps one function instead of two, but tick intervals drift with frame timing and still register the actor with the tick manager; a timer is the clearer statement of intent.
