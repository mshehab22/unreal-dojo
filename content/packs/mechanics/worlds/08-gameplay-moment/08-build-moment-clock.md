---
id: m8-moment-clock
title: A clock that decides the ending
order: 8
kind: build
scaffold: blank
difficulty: 4
patterns: [state]
skills: [timers, delegates, state]
terms: [timer-manager, timer-handle, uenum, adddynamic, ufunction]
prerequisites: [m8-alert-meter, m8-exit-gate, m3-checkpoint]
xp: 130
estimatedMinutes: 35
concepts:
  - One object that owns the time and the ending of a moment, and hears about escapes and catches from others
  - A label built from a state and a time
---

# Brief

When you start a moment on the clock and the exit gate announces an escape at 40 seconds, the clock reads `ESCAPED in 40.0 s`; a catch at 10 seconds reads `CAUGHT after 10.0 s`; with nothing announced it reads `TIME UP` when the limit passes, and before it starts it reads `WAITING`.

`ADojoM8MomentClock` has its header written for you, including the five outcomes. Everything in the `.cpp` except the constructor is yours:

1. `WatchExit` and `WatchAlert`: listen to the gate's escapes and the meter's catches with `HandleEscaped` and `HandleCaught`, binding only once.
2. `Start`: begin the moment now, or begin it over: it is running, its time starts now, and the time limit starts counting down.
3. `HandleEscaped`, `HandleCaught`, `HandleTimeUp`, and `Finish`: end the moment and record how and when.
4. `GetOutcome`, `GetElapsedSeconds` (zero before the start, the time so far while running, the time at the instant it ended afterwards), and `GetLabel`.

Dependency direction: the clock listens to the gate and the meter; neither knows the clock exists, and the clock holds no list of them.

Compiles against earlier quests: m8-alert-meter (`Quests/m8-alert-meter/DojoM8AlertMeter.h`), m8-exit-gate (`Quests/m8-exit-gate/DojoM8ExitGate.h`), and m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This clock is the fifth and last piece of the Blackout Escape boss.

## See it in the editor

Place a `DojoM8MomentClock`, a `DojoM8ExitGate`, and a `DojoM8AlertMeter`. In the level Blueprint, on BeginPlay call Watch Exit and Watch Alert on the clock, then Start, and print the clock's Get Label on a one second timer. Press Play: it reads RUNNING. Call Set Powered on the gate and walk the pawn in to read `ESCAPED in ...`, or set Time Limit Seconds to 5 in Details and wait to read `TIME UP`.

# Files

## DojoM8MomentClock.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TimerManager.h"
#include "DojoM8MomentClock.generated.h"

class ADojoM8AlertMeter;
class ADojoM8ExitGate;

/** How a moment is going: not started, running, or ended one of three ways. */
UENUM(BlueprintType)
enum class EDojoM8Outcome : uint8
{
	EMO_Waiting UMETA(DisplayName = "Waiting"),
	EMO_Running UMETA(DisplayName = "Running"),
	EMO_Escaped UMETA(DisplayName = "Escaped"),
	EMO_Caught UMETA(DisplayName = "Caught"),
	EMO_TimeUp UMETA(DisplayName = "Time Up")
};

/** Keeps the time of a moment and decides how it ends: the first of an escape, a catch, or the time limit wins, and the answer then never changes. */
UCLASS()
class ADojoM8MomentClock : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8MomentClock();

	/** How long the moment may last, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Moment Clock", meta = (ClampMin = "1.0"))
	float TimeLimitSeconds = 120.f;

	/** Ends the moment as an escape when the gate announces one; binds only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void WatchExit(ADojoM8ExitGate* Gate);

	/** Ends the moment as a catch when the meter announces one; binds only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void WatchAlert(ADojoM8AlertMeter* Meter);

	/** Starts the moment now, or starts it over: the time and the limit begin again and no earlier limit is left pending. */
	UFUNCTION(BlueprintCallable, Category = "Moment Clock")
	void Start();

	/** How the moment stands. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	EDojoM8Outcome GetOutcome() const;

	/** Seconds since the moment started; frozen at the instant it ended; zero before it starts. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	float GetElapsedSeconds() const;

	/** WAITING, RUNNING, ESCAPED in 41.2 s, CAUGHT after 12.0 s, or TIME UP. */
	UFUNCTION(BlueprintPure, Category = "Moment Clock")
	FString GetLabel() const;

private:
	/** Ends the moment as an escape. */
	UFUNCTION()
	void HandleEscaped(AActor* Escapee);

	/** Ends the moment as a catch. */
	UFUNCTION()
	void HandleCaught();

	/** Ends the moment when the time limit runs out. */
	void HandleTimeUp();

	/** Records how the moment ended, if it is still running, and stops the limit. */
	void Finish(EDojoM8Outcome Result);

	FTimerHandle LimitHandle;

	EDojoM8Outcome Outcome = EDojoM8Outcome::EMO_Waiting;

	double StartSeconds = 0.0;

	double EndSeconds = 0.0;
};
```

## DojoM8MomentClock.cpp

```cpp
#include "DojoM8MomentClock.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"

ADojoM8MomentClock::ADojoM8MomentClock()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8MomentClock::WatchExit(ADojoM8ExitGate* Gate)
{
	// Your code: ignore an invalid gate; otherwise listen to its escapes with HandleEscaped, binding only once.
}

void ADojoM8MomentClock::WatchAlert(ADojoM8AlertMeter* Meter)
{
	// Your code: ignore an invalid meter; otherwise listen to its catches with HandleCaught, binding only once.
}

void ADojoM8MomentClock::Start()
{
	// Your code: begin the moment: it is running, its time starts now, and the time limit starts counting down once.
}

EDojoM8Outcome ADojoM8MomentClock::GetOutcome() const
{
	return EDojoM8Outcome::EMO_Waiting;
}

float ADojoM8MomentClock::GetElapsedSeconds() const
{
	// Your code: zero before the start, the time so far while running, and the time at the instant it ended afterwards.
	return 0.f;
}

FString ADojoM8MomentClock::GetLabel() const
{
	// Your code: WAITING, RUNNING, ESCAPED in 41.2 s, CAUGHT after 12.0 s, or TIME UP, with the time to one decimal.
	return FString();
}

void ADojoM8MomentClock::HandleEscaped(AActor* Escapee)
{
	// Your code: end the moment as an escape.
}

void ADojoM8MomentClock::HandleCaught()
{
	// Your code: end the moment as a catch.
}

void ADojoM8MomentClock::HandleTimeUp()
{
	// Your code: end the moment because the time ran out.
}

void ADojoM8MomentClock::Finish(EDojoM8Outcome Result)
{
	// Your code: record how the moment ended and when.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m8-alert-meter/DojoM8AlertMeter.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"
#include "Quests/m8-moment-clock/DojoM8MomentClock.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM8MomentClockTest
{
	/** A clock watching a gate and a meter, and a runner to name in an escape. */
	struct FClockScene
	{
		ADojoM8MomentClock* Clock = nullptr;
		ADojoM8ExitGate* Gate = nullptr;
		ADojoM8AlertMeter* Meter = nullptr;
		ADojoM3Runner* Runner = nullptr;
	};

	/** Builds the scene, with the clock watching both and not yet started. */
	FClockScene MakeScene(FDojoTestWorld& TestWorld)
	{
		FClockScene Scene;
		Scene.Clock = TestWorld.SpawnActor<ADojoM8MomentClock>();
		Scene.Gate = TestWorld.GetWorld()->SpawnActor<ADojoM8ExitGate>(FVector(0.0, 5000.0, 0.0), FRotator::ZeroRotator);
		Scene.Meter = TestWorld.SpawnActor<ADojoM8AlertMeter>();
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(FVector(0.0, -5000.0, 0.0), FRotator::ZeroRotator);
		if (!Scene.Clock || !Scene.Gate || !Scene.Meter || !Scene.Runner) return Scene;

		Scene.Clock->WatchExit(Scene.Gate);
		Scene.Clock->WatchExit(Scene.Gate);
		Scene.Clock->WatchAlert(Scene.Meter);
		Scene.Clock->WatchAlert(Scene.Meter);
		return Scene;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_WaitsUntilStarted, "Dojo.M8.MomentClock.WaitsUntilStarted", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks a clock that has not started reads WAITING and ignores an escape. */
bool FDojo_M8_MomentClock_WaitsUntilStarted::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	TestEqual(TEXT("A new clock waits"), Scene.Clock->GetLabel(), FString(TEXT("WAITING")));
	TestEqual(TEXT("with no time on it"), Scene.Clock->GetElapsedSeconds(), 0.f);

	Scene.Gate->OnEscaped.Broadcast(Scene.Runner);
	TestEqual(TEXT("An escape before the start changes nothing"), Scene.Clock->GetLabel(), FString(TEXT("WAITING")));

	Scene.Clock->Start();
	TestEqual(TEXT("A started clock runs"), Scene.Clock->GetLabel(), FString(TEXT("RUNNING")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_AnEscapeFreezesTheTime, "Dojo.M8.MomentClock.AnEscapeFreezesTheTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Escapes after 40 seconds and then lets the clock run far past its limit. */
bool FDojo_M8_MomentClock_AnEscapeFreezesTheTime::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	Scene.Clock->Start();
	TestWorld.Tick(2400);
	TestNearlyEqual(TEXT("A running clock counts the seconds"), Scene.Clock->GetElapsedSeconds(), 40.f, 0.2f);

	Scene.Gate->OnEscaped.Broadcast(Scene.Runner);
	TestTrue(TEXT("The label says ESCAPED with the time"), Scene.Clock->GetLabel().StartsWith(TEXT("ESCAPED in 40.")));
	TestTrue(TEXT("The outcome is Escaped"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_Escaped);

	TestWorld.Tick(6000);
	TestTrue(TEXT("Long after the 120 second limit the outcome is still Escaped"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_Escaped);
	TestNearlyEqual(TEXT("and the time stays where it stopped"), Scene.Clock->GetElapsedSeconds(), 40.f, 0.2f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_TheFirstEndingWins, "Dojo.M8.MomentClock.TheFirstEndingWins", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Gets caught, then escapes, and checks the catch stays. */
bool FDojo_M8_MomentClock_TheFirstEndingWins::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	Scene.Clock->Start();
	TestWorld.Tick(600);
	Scene.Meter->OnCaught.Broadcast();
	TestTrue(TEXT("The label says CAUGHT with the time"), Scene.Clock->GetLabel().StartsWith(TEXT("CAUGHT after 10.")));

	Scene.Gate->OnEscaped.Broadcast(Scene.Runner);
	TestTrue(TEXT("An escape after the catch changes nothing"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_Caught);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_TheLimitEndsTheMoment, "Dojo.M8.MomentClock.TheLimitEndsTheMoment", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Sets a 5 second limit, lets it run out, and checks later events change nothing. */
bool FDojo_M8_MomentClock_TheLimitEndsTheMoment::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	Scene.Clock->TimeLimitSeconds = 5.f;
	Scene.Clock->Start();

	TestWorld.Tick(240);
	TestTrue(TEXT("At four seconds the moment is still running"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_Running);

	TestWorld.Tick(120);
	TestEqual(TEXT("At six seconds the time is up"), Scene.Clock->GetLabel(), FString(TEXT("TIME UP")));
	TestNearlyEqual(TEXT("and the clock stopped at the limit"), Scene.Clock->GetElapsedSeconds(), 5.f, 0.2f);

	Scene.Gate->OnEscaped.Broadcast(Scene.Runner);
	TestTrue(TEXT("An escape after the time is up changes nothing"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_TimeUp);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_AStartOverBeginsAFreshLimit, "Dojo.M8.MomentClock.AStartOverBeginsAFreshLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Starts a 10 second moment, starts it over after six seconds, and runs past the first deadline. */
bool FDojo_M8_MomentClock_AStartOverBeginsAFreshLimit::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	Scene.Clock->TimeLimitSeconds = 10.f;
	Scene.Clock->Start();
	TestWorld.Tick(360);

	Scene.Clock->Start();
	TestNearlyEqual(TEXT("Starting over resets the time"), Scene.Clock->GetElapsedSeconds(), 0.f, 0.1f);

	TestWorld.Tick(360);
	TestTrue(TEXT("Twelve seconds after the first start the second moment is still running"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_Running);
	TestNearlyEqual(TEXT("with six seconds on it"), Scene.Clock->GetElapsedSeconds(), 6.f, 0.2f);

	TestWorld.Tick(300);
	TestTrue(TEXT("Its own limit still ends it"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EMO_TimeUp);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_MomentClock_DesignersCanSetTheLimit, "Dojo.M8.MomentClock.DesignersCanSetTheLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the limit is editable in Details. */
bool FDojo_M8_MomentClock_DesignersCanSetTheLimit::RunTest(const FString& Parameters)
{
	const FProperty* Limit = ADojoM8MomentClock::StaticClass()->FindPropertyByName(TEXT("TimeLimitSeconds"));
	if (!TestNotNull(TEXT("TimeLimitSeconds is a UPROPERTY"), Limit)) return false;

	TestTrue(TEXT("TimeLimitSeconds is editable in Details"), Limit->HasAnyPropertyFlags(CPF_Edit));

	return true;
}

#endif
```

# Hints

- Four things can end a moment: an escape, a catch, the limit, and nothing else. Give them one place to go through, so the recording of the ending is written once.
- The limit is a one-shot timer set when the moment starts. `GetWorld()->GetTimeSeconds()` is the time to record at the start and at the end. A label is a switch over the outcome, and `FString::Printf` with `%.1f` gives one decimal.
- A moment can be started more than once in a game, for example by a restart. Think about what the first start left behind. The handler functions only call `Finish`; `Finish` records the outcome and the end time.

# Rubric

- The clock listens to the gate and the meter with AddUniqueDynamic and holds no pointer to either.
- Start puts the moment in the running state, records the start time, and starts the time limit as a one-shot timer.
- All three endings go through one function that records the outcome and the end time.
- The first ending recorded is the one shown; the label and the time then stay as they were at that instant.
- Starting a moment again begins a fresh time and a fresh limit.
- The limit is a property a designer can set in Details, and the label reads exactly `WAITING`, `RUNNING`, `ESCAPED in 41.2 s`, `CAUGHT after 12.0 s`, or `TIME UP`.

# Alternative

The clock could poll: tick every frame, compare the time with the limit, and look at the gate and the meter for their state. That works with no events at all, but it spends a check on every frame for an answer that changes three times in a whole round, and it has to ask each object every frame what they already know. Events and one timer do the same job with no per-frame cost, and a new ending, such as a bell at the exit, only needs a new handler. This shape, one object whose state changes only by the events it hears, is the State pattern, as in Pack 2's State world.

# Parsons

```yaml
- id: clock-watch-exit
  prompt: Put WatchExit in order.
  lines:
    - "void ADojoM8MomentClock::WatchExit(ADojoM8ExitGate* Gate)"
    - "{"
    - "	if (!IsValid(Gate)) return;"
    - "	Gate->OnEscaped.AddUniqueDynamic(this, &ADojoM8MomentClock::HandleEscaped);"
    - "}"
  distractors:
    - line: "	Gate->OnEscaped.AddDynamic(this, &ADojoM8MomentClock::HandleEscaped);"
      mistake: AddDynamic binds again on every call, so watching a gate twice would end the moment twice; the Unique form ignores a repeat.
- id: clock-label
  prompt: Put the middle of GetLabel in order.
  lines:
    - "	case EDojoM8Outcome::EMO_Waiting:"
    - "		return TEXT(\"WAITING\");"
    - "	case EDojoM8Outcome::EMO_Running:"
    - "		return TEXT(\"RUNNING\");"
    - "	case EDojoM8Outcome::EMO_Escaped:"
    - "		return FString::Printf(TEXT(\"ESCAPED in %.1f s\"), GetElapsedSeconds());"
  distractors:
    - line: "		return FString::Printf(TEXT(\"ESCAPED in %d s\"), GetElapsedSeconds());"
      mistake: "%d prints a whole number and expects an integer; the elapsed time is a float, so it needs %.1f."
```
