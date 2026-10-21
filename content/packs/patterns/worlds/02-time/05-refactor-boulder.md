---
id: p2-boulder-refactor
title: Take the boulder's drag off the frame rate
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [game-loop]
skills: [time, game-loop, refactoring]
terms: [tick, deltatime, primary-actor-tick]
prerequisites: [p2-replay-ghost]
xp: 90
estimatedMinutes: 20
concepts:
  - A per-frame rule tuned at one frame rate is a hidden fixed step of that length
  - Making the step explicit keeps the tuned feel and removes the frame rate from the result
  - The catch-up cap belongs in every fixed-step loop
---

# Brief

When you press Play and push the boulder, it rolls to a stop at the same spot whether the game runs at 30, 60, or 120 frames per second, and at 60 it rolls exactly as it does today.

The starter works, and a designer tuned it: at 60 frames per second the boulder stops at a spot they like. But `Tick` applies `Drag` once per frame, so on a 120 frames per second machine the boulder loses speed twice as often and stops short, and on a 30 frames per second machine it overshoots. Multiplying by `DeltaSeconds` already happens for the distance; the drag is the part that cannot be fixed that way.

Refactor it into the fixed-step shape you built for the blade and the ghost:

- Keep every public name and default (`Drag`, `MinSpeed`, `PushSpeed`, `Push`, `GetDistance`, `IsRolling`), so the designer's tuning still means what it meant.
- Add `StepSeconds` (1/60 of a second, the rate the drag was tuned at) and `MaxStepsPerTick` (8), both editable.
- Move one frame's worth of rules (drag, the stop check, the roll) into a step function that always uses `StepSeconds`. `Tick` banks real time and runs whole steps, at most `MaxStepsPerTick` of them, and drops time the cap refuses.
- A boulder at rest banks no time, so a push after a long wait does not start with a burst.

At exactly 60 frames per second every frame runs exactly one step, so the tuned roll does not change by a single centimeter.

## See it in the editor

Place a `DojoP2RollingBoulder` and, in the Level Blueprint, call Push on it from Begin Play. Press Play: the label counts up the centimeters and stops. Note the number. Run `t.MaxFPS 30` in the console and play again, then `t.MaxFPS 120`: before the refactor the stopping distance changes with the cap; after it, it is the same every time. Run `t.MaxFPS 0` when done.

# Files

## DojoP2RollingBoulder.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2RollingBoulder.generated.h"

class UTextRenderComponent;

/** A boulder trap that is pushed down a corridor and rolls to a stop under drag. */
UCLASS()
class ADojoP2RollingBoulder : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP2RollingBoulder();

	/** Floating text that shows the distance rolled. */
	UPROPERTY(VisibleAnywhere, Category = "Boulder")
	TObjectPtr<UTextRenderComponent> Label;

	/** Share of its speed the boulder keeps each frame; tuned while playing at 60 frames per second. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0", ClampMax = "1"))
	float Drag = 0.98f;

	/** Below this speed, in centimeters per second, the boulder stops. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float MinSpeed = 5.f;

	/** Speed a push gives the boulder, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float PushSpeed = 600.f;

	/** Sets the boulder rolling at PushSpeed. */
	UFUNCTION(BlueprintCallable, Category = "Boulder")
	void Push();

	/** Distance rolled since play started, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	float GetDistance() const;

	/** True while the boulder still moves. */
	UFUNCTION(BlueprintPure, Category = "Boulder")
	bool IsRolling() const;

	/** Applies drag, rolls the boulder, and moves it along the corridor. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers the start location. */
	virtual void BeginPlay() override;

private:
	/** Writes the distance rolled into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float Speed = 0.f;
	float Distance = 0.f;
};
```

## DojoP2RollingBoulder.cpp

```cpp
#include "DojoP2RollingBoulder.h"

#include "Components/TextRenderComponent.h"

ADojoP2RollingBoulder::ADojoP2RollingBoulder()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP2RollingBoulder::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP2RollingBoulder::Push()
{
	Speed = PushSpeed;
}

void ADojoP2RollingBoulder::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!IsRolling()) return;

	Speed *= Drag;
	if (Speed < MinSpeed) Speed = 0.f;

	Distance += Speed * DeltaSeconds;

	SetActorLocation(StartLocation + FVector(Distance, 0.f, 0.f));
	RefreshLabel();
}

float ADojoP2RollingBoulder::GetDistance() const
{
	return Distance;
}

bool ADojoP2RollingBoulder::IsRolling() const
{
	return Speed > 0.f;
}

void ADojoP2RollingBoulder::RefreshLabel()
{
	Label->SetText(FText::AsNumber(FMath::RoundToInt(Distance)));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p2-boulder-refactor/DojoP2RollingBoulder.h"
#include "Support/DojoTestWorld.h"

namespace DojoP2BoulderRefactorTest
{
	/** Ticks a boulder FrameCount frames of FrameSeconds each. */
	void Feed(ADojoP2RollingBoulder* Boulder, int32 FrameCount, float FrameSeconds)
	{
		for (int32 Frame = 0; Frame < FrameCount; ++Frame) Boulder->Tick(FrameSeconds);
	}

	/** The distance the tuned rules give after StepCount updates of 1/60 of a second: the behavior the designer approved. */
	float TunedDistance(const ADojoP2RollingBoulder* Boulder, int32 StepCount)
	{
		const float StepSeconds = 1.f / 60.f;
		float Speed = Boulder->PushSpeed;
		float Distance = 0.f;

		for (int32 Step = 0; Step < StepCount && Speed > 0.f; ++Step)
		{
			Speed *= Boulder->Drag;
			if (Speed < Boulder->MinSpeed) Speed = 0.f;
			Distance += Speed * StepSeconds;
		}

		return Distance;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_BoulderRefactor_SameRollAtSixty, "Dojo.P2.BoulderRefactor.SameRollAtSixty", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** At 60 frames per second the boulder rolls exactly as tuned, frame by frame and to its stop. */
bool FDojo_P2_BoulderRefactor_SameRollAtSixty::RunTest(const FString& Parameters)
{
	using namespace DojoP2BoulderRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP2RollingBoulder* Boulder = TestWorld.SpawnActor<ADojoP2RollingBoulder>();
	if (!TestNotNull(TEXT("Boulder spawned"), Boulder)) return false;

	TestFalse(TEXT("At rest before the push"), Boulder->IsRolling());

	Boulder->Push();
	Feed(Boulder, 30, 1.f / 60.f);
	TestEqual(TEXT("After half a second the roll matches the tuned roll"), Boulder->GetDistance(), TunedDistance(Boulder, 30), 0.001f);

	Feed(Boulder, 570, 1.f / 60.f);
	TestFalse(TEXT("Stopped within ten seconds"), Boulder->IsRolling());
	TestEqual(TEXT("Stops at the tuned spot"), Boulder->GetDistance(), TunedDistance(Boulder, 600), 0.001f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_BoulderRefactor_SameStopAtAnyFrameRate, "Dojo.P2.BoulderRefactor.SameStopAtAnyFrameRate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two seconds at 30, 60, and 120 frames per second leave three boulders at the same distance. */
bool FDojo_P2_BoulderRefactor_SameStopAtAnyFrameRate::RunTest(const FString& Parameters)
{
	using namespace DojoP2BoulderRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP2RollingBoulder* Thirty = TestWorld.SpawnActor<ADojoP2RollingBoulder>();
	ADojoP2RollingBoulder* Sixty = TestWorld.SpawnActor<ADojoP2RollingBoulder>();
	ADojoP2RollingBoulder* OneTwenty = TestWorld.SpawnActor<ADojoP2RollingBoulder>();
	if (!TestNotNull(TEXT("Boulders spawned"), Thirty) || !TestNotNull(TEXT("Boulders spawned"), Sixty) || !TestNotNull(TEXT("Boulders spawned"), OneTwenty)) return false;

	Thirty->Push();
	Sixty->Push();
	OneTwenty->Push();

	Feed(Thirty, 60, 1.f / 30.f);
	Feed(Sixty, 120, 1.f / 60.f);
	Feed(OneTwenty, 240, 1.f / 120.f);

	TestEqual(TEXT("30 frames per second rolls as far as 60"), Thirty->GetDistance(), Sixty->GetDistance(), 0.01f);
	TestEqual(TEXT("120 frames per second rolls as far as 60"), OneTwenty->GetDistance(), Sixty->GetDistance(), 0.01f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_BoulderRefactor_HitchDoesNotTeleport, "Dojo.P2.BoulderRefactor.HitchDoesNotTeleport", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A one-second hitch right after the push runs at most eight steps instead of one giant frame. */
bool FDojo_P2_BoulderRefactor_HitchDoesNotTeleport::RunTest(const FString& Parameters)
{
	using namespace DojoP2BoulderRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP2RollingBoulder* Boulder = TestWorld.SpawnActor<ADojoP2RollingBoulder>();
	if (!TestNotNull(TEXT("Boulder spawned"), Boulder)) return false;

	Feed(Boulder, 120, 1.f / 60.f);
	TestEqual(TEXT("A boulder at rest does not move"), Boulder->GetDistance(), 0.f);

	Boulder->Push();
	Boulder->Tick(1.f);
	TestEqual(TEXT("A one-second hitch rolls only eight steps"), Boulder->GetDistance(), TunedDistance(Boulder, 8), 0.001f);

	Boulder->Tick(1.f / 60.f);
	TestEqual(TEXT("The next normal frame rolls one step"), Boulder->GetDistance(), TunedDistance(Boulder, 9), 0.001f);

	return true;
}

#endif
```

# Hints

- Find the one line in Tick that cannot be fixed by multiplying by DeltaSeconds; everything that should happen once per tuned frame moves with it into the step.
- The blade's Advance and the ghost's cap together are the whole shape: bank, loop while a step is owed and the cap allows, spend StepSeconds per step, drop what is refused.
- No new engine API is needed; the step uses only the class's own fields.

# Rubric

- The rules that were per frame (drag, stop check, roll) now run once per fixed step of StepSeconds and never read the frame's delta.
- Tick banks real time only while rolling, runs whole steps up to MaxStepsPerTick, and drops time the cap refuses.
- Public names, defaults, and the tuned 60 frames per second roll are unchanged.
- StepSeconds and MaxStepsPerTick are editable properties with the given defaults, not numbers in the code.
- The old per-frame drag line is gone, not left beside the new step.

# Alternative

Turning the drag into a rate per second, `Speed *= FMath::Pow(Drag, DeltaSeconds * 60.f)`, also removes the frame rate from the stopping distance with no accumulator. That is a fine fix for a single exponential decay. It stops working once the rules interact (a stop threshold, a slope that adds speed, a collision mid-roll), because each frame's large step then differs from many small ones, and results are no longer repeatable to the digit. The fixed step keeps every rule exactly as tuned, at the cost of a loop and a bank to maintain.
