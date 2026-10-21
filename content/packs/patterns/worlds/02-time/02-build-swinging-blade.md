---
id: p2-swinging-blade
title: A blade that swings the same on every machine
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [game-loop]
skills: [time, game-loop]
terms: [tick, deltatime, primary-actor-tick, createdefaultsubobject, beginplay]
prerequisites: [p2-frame-time]
xp: 50
estimatedMinutes: 15
concepts:
  - Real time is banked each frame and spent in whole fixed steps
  - Anything applied once per step only stays consistent when every machine runs the same steps
  - The drawing blends between the last two steps by the leftover fraction
---

# Brief

When you press Play, the blade swings down from 60 degrees and slowly settles, and it swings exactly the same at 30 frames per second as at 120: the same angle after the same number of seconds, to the last digit.

The blade's swing has a damping rule: after every update it keeps 99 percent of its speed. Run that rule once per frame and a 120 frames per second machine damps the swing four times as often as a 30 frames per second one, so the blade settles faster on the better hardware. Scaling by `DeltaSeconds` does not save it, because a percentage applied per update is not a distance per second. The fix is to stop letting the frame decide how often the rule runs.

`ADojoP2SwingingBlade` banks the real time each frame hands it in `Lag`, and spends it in whole steps of `StepSeconds` (1/32 of a second). A frame that brings half a step runs nothing and saves the time; a frame that brings three steps runs three. Most of the class is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap in `Advance`: while at least a whole step of time is waiting, run `SimulateStep` and take one step's time out of `Lag`.

Naive first: try `SimulateStep` once per `Advance` call and run the tests. The test that compares three frame rates fails, and its message shows how far apart the three swings end up after one second.

## See it in the editor

Place a `DojoP2SwingingBlade` in the sandbox map and press Play: the BLADE label swings around the pivot and settles. Open the console and run `t.MaxFPS 20`, then restart play: the motion is choppier but the swing takes the same time to settle. Run `t.MaxFPS 0` to remove the cap. Then, as an experiment, change Step Seconds in the blade's Details to 0.25 and play: the simulation now steps four times a second, yet the label still moves smoothly, because the drawing blends between steps by the alpha.

# Files

## DojoP2SwingingBlade.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2SwingingBlade.generated.h"

class USceneComponent;
class UTextRenderComponent;

/** A swinging blade trap whose swing is simulated in fixed steps, so it moves the same at any frame rate. */
UCLASS()
class ADojoP2SwingingBlade : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the pivot and the blade label, and turns ticking on. */
	ADojoP2SwingingBlade();

	/** The point the blade swings around. */
	UPROPERTY(VisibleAnywhere, Category = "Blade")
	TObjectPtr<USceneComponent> Pivot;

	/** Floating text hanging below the pivot; it is what you see swing. */
	UPROPERTY(VisibleAnywhere, Category = "Blade")
	TObjectPtr<UTextRenderComponent> Label;

	/** Angle the blade is released from, in degrees. */
	UPROPERTY(EditAnywhere, Category = "Blade")
	float StartAngle = 60.f;

	/** How hard the blade is pulled back toward hanging straight down. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0"))
	float Stiffness = 20.f;

	/** Share of the swing speed kept after each step; below 1 the swing dies down. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0", ClampMax = "1"))
	float Damping = 0.99f;

	/** Length of one simulation step, in seconds. */
	UPROPERTY(EditAnywhere, Category = "Blade", meta = (ClampMin = "0.001"))
	float StepSeconds = 1.f / 32.f;

	/** Moves the simulation forward by the real time that passed, in whole fixed steps. */
	UFUNCTION(BlueprintCallable, Category = "Blade")
	void Advance(float DeltaSeconds);

	/** The simulated angle after the last step, in degrees. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetAngle() const;

	/** How many fixed steps have run since play started. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	int32 GetStepsRun() const;

	/** How far the leftover time is toward the next step, from 0 up to but not including 1. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetAlpha() const;

	/** The angle to draw this frame: between the last two steps, by the alpha, so the swing looks smooth. */
	UFUNCTION(BlueprintPure, Category = "Blade")
	float GetDisplayAngle() const;

	/** Advances the simulation and turns the blade to the display angle. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Releases the blade from its start angle. */
	virtual void BeginPlay() override;

private:
	/** One fixed step of the swing. */
	void SimulateStep();

	float Angle = 0.f;
	float PreviousAngle = 0.f;
	float AngularSpeed = 0.f;
	float Lag = 0.f; // @explain: Real time that has passed but not yet been simulated; it carries over from one frame to the next.
	int32 StepsRun = 0;
};
```

## DojoP2SwingingBlade.cpp

```cpp
#include "DojoP2SwingingBlade.h"

#include "Components/SceneComponent.h"
#include "Components/TextRenderComponent.h"

ADojoP2SwingingBlade::ADojoP2SwingingBlade()
{
	PrimaryActorTick.bCanEverTick = true; // @explain: The engine calls Tick every frame with that frame's real duration, which is what feeds the simulation.

	Pivot = CreateDefaultSubobject<USceneComponent>(TEXT("Pivot"));
	RootComponent = Pivot;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Pivot);
	Label->SetRelativeLocation(FVector(0.f, 0.f, -150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("BLADE")));
}

void ADojoP2SwingingBlade::BeginPlay()
{
	Super::BeginPlay();

	Angle = StartAngle;
	PreviousAngle = StartAngle;
}

void ADojoP2SwingingBlade::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Advance(DeltaSeconds);
	SetActorRotation(FRotator(0.f, 0.f, GetDisplayAngle()));
}

void ADojoP2SwingingBlade::Advance(float DeltaSeconds)
{
	Lag += DeltaSeconds;

	// Your code: while at least one whole step of time is waiting, run one step and take that step's time out of Lag.
}

void ADojoP2SwingingBlade::SimulateStep()
{
	PreviousAngle = Angle; // @explain: Keeping the angle from before the step lets the display blend between the last two steps.

	AngularSpeed -= Stiffness * Angle * StepSeconds;
	AngularSpeed *= Damping; // @explain: Damping is applied once per step, so the swing only dies down at the same rate everywhere if every machine runs the same steps.
	Angle += AngularSpeed * StepSeconds;

	StepsRun++;
}

float ADojoP2SwingingBlade::GetAngle() const
{
	return Angle;
}

int32 ADojoP2SwingingBlade::GetStepsRun() const
{
	return StepsRun;
}

float ADojoP2SwingingBlade::GetAlpha() const
{
	return Lag / StepSeconds; // @explain: The leftover time as a fraction of a step says how far the drawing should be toward the next step.
}

float ADojoP2SwingingBlade::GetDisplayAngle() const
{
	return FMath::Lerp(PreviousAngle, Angle, GetAlpha());
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p2-swinging-blade/DojoP2SwingingBlade.h"
#include "Support/DojoTestWorld.h"

namespace DojoP2SwingingBladeTest
{
	/** Feeds a blade FrameCount frames of FrameSeconds each, the way Tick would. */
	void Feed(ADojoP2SwingingBlade* Blade, int32 FrameCount, float FrameSeconds)
	{
		for (int32 Frame = 0; Frame < FrameCount; ++Frame) Blade->Advance(FrameSeconds);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_SwingingBlade_SameSwingAtAnyFrameRate, "Dojo.P2.SwingingBlade.SameSwingAtAnyFrameRate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One second fed at 64, 8, and 4 frames per second gives the same steps and exactly the same angle. */
bool FDojo_P2_SwingingBlade_SameSwingAtAnyFrameRate::RunTest(const FString& Parameters)
{
	using namespace DojoP2SwingingBladeTest;

	FDojoTestWorld TestWorld;

	ADojoP2SwingingBlade* Fast = TestWorld.SpawnActor<ADojoP2SwingingBlade>();
	ADojoP2SwingingBlade* Slow = TestWorld.SpawnActor<ADojoP2SwingingBlade>();
	ADojoP2SwingingBlade* Choppy = TestWorld.SpawnActor<ADojoP2SwingingBlade>();
	if (!TestNotNull(TEXT("Blades spawned"), Fast) || !TestNotNull(TEXT("Blades spawned"), Slow) || !TestNotNull(TEXT("Blades spawned"), Choppy)) return false;

	TestTrue(TEXT("The blade ticks every frame"), Fast->PrimaryActorTick.bCanEverTick);
	TestEqual(TEXT("The blade starts at its release angle"), Fast->GetAngle(), 60.f);

	Feed(Fast, 64, 1.f / 64.f);
	Feed(Slow, 8, 1.f / 8.f);
	Feed(Choppy, 4, 1.f / 4.f);

	TestEqual(TEXT("One second is 32 steps at 64 frames per second"), Fast->GetStepsRun(), 32);
	TestEqual(TEXT("One second is 32 steps at 8 frames per second"), Slow->GetStepsRun(), 32);
	TestEqual(TEXT("One second is 32 steps at 4 frames per second"), Choppy->GetStepsRun(), 32);
	TestTrue(TEXT("The blade has moved"), FMath::Abs(Fast->GetAngle() - 60.f) > 1.f);
	TestTrue(FString::Printf(TEXT("Same angle at 64 and 8 frames per second (%f and %f)"), Fast->GetAngle(), Slow->GetAngle()), Fast->GetAngle() == Slow->GetAngle());
	TestTrue(FString::Printf(TEXT("Same angle at 64 and 4 frames per second (%f and %f)"), Fast->GetAngle(), Choppy->GetAngle()), Fast->GetAngle() == Choppy->GetAngle());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_SwingingBlade_DrawsBetweenSteps, "Dojo.P2.SwingingBlade.DrawsBetweenSteps", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Half a step runs nothing and saves the time; the display angle blends between the last two steps by the alpha. */
bool FDojo_P2_SwingingBlade_DrawsBetweenSteps::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP2SwingingBlade* Blade = TestWorld.SpawnActor<ADojoP2SwingingBlade>();
	if (!TestNotNull(TEXT("Blade spawned"), Blade)) return false;

	Blade->Advance(1.f / 64.f);
	TestEqual(TEXT("Half a step runs no step"), Blade->GetStepsRun(), 0);
	TestEqual(TEXT("Half a step is saved as an alpha of one half"), Blade->GetAlpha(), 0.5f);

	Blade->Advance(1.f / 64.f);
	TestEqual(TEXT("The saved half and a new half make one step"), Blade->GetStepsRun(), 1);
	TestEqual(TEXT("Nothing is left over"), Blade->GetAlpha(), 0.f);
	const float FirstStepAngle = Blade->GetAngle();
	TestTrue(TEXT("The first step moved the blade"), FirstStepAngle < 60.f);

	Blade->Advance(1.f / 64.f);
	TestEqual(TEXT("Halfway to the next step, the display is halfway between the last two angles"), Blade->GetDisplayAngle(), (60.f + FirstStepAngle) * 0.5f, 0.0001f);

	return true;
}

#endif
```

# Hints

- The gap is a loop, not a single call: a long frame may owe several steps, and a short one may owe none.
- Compare Lag with StepSeconds to decide whether a step is owed; each step you run spends exactly StepSeconds of the bank.
- Nothing new from the engine is needed here; the loop uses only members the class already has.

# Rubric

- Advance banks DeltaSeconds and runs SimulateStep once per whole StepSeconds waiting, keeping the remainder in Lag.
- The damping and stiffness rules live only in SimulateStep, so they run once per fixed step and never per frame.
- The display angle blends PreviousAngle and Angle by the alpha; the simulation itself never uses the alpha.
- Tick only calls Advance and draws; it does no simulation of its own.
- Tuning values (stiffness, damping, step length, start angle) are editable properties, not numbers in the code.

# Alternative

Turning on physics with a hinge constraint would give a blade that swings with no code at all, and Chaos substepping (Project Settings, Physics, Substepping) keeps it steady across frame rates. That is the better choice for a blade that only needs to look right and collide. The hand-written step wins when the result must be repeatable to the last digit, for a replay, a lockstep match, or a test, because the physics engine makes no such promise across machines and frame rates.

# Parsons

```yaml
- id: blade-advance
  prompt: Put Advance in order.
  lines:
    - "void ADojoP2SwingingBlade::Advance(float DeltaSeconds)"
    - "{"
    - "	Lag += DeltaSeconds;"
    - "	while (Lag >= StepSeconds)"
    - "	{"
    - "		SimulateStep();"
    - "		Lag -= StepSeconds;"
    - "	}"
    - "}"
  distractors:
    - line: "		Lag = 0.f;"
      mistake: Throwing the whole bank away after one step loses the extra time a long frame brought, so slow machines fall behind.
- id: blade-simulate-step
  prompt: Put SimulateStep in order.
  lines:
    - "void ADojoP2SwingingBlade::SimulateStep()"
    - "{"
    - "	PreviousAngle = Angle;"
    - "	AngularSpeed -= Stiffness * Angle * StepSeconds;"
    - "	AngularSpeed *= Damping;"
    - "	Angle += AngularSpeed * StepSeconds;"
    - "	StepsRun++;"
    - "}"
  distractors:
    - line: "	Angle += AngularSpeed * GetWorld()->GetDeltaSeconds();"
      mistake: A fixed step always moves by StepSeconds; reading the frame's delta inside the step brings the frame rate back into the result.
```
