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

Write `ADojoM8MomentClock` from nothing: an actor that keeps the time of a moment and reports how it ended. It listens to a gate's escapes and a meter's catches, counts the time limit down with one timer, and never ticks. However many times the watch functions are called, each source is listened to only once.

The tests use this public interface, so keep these names:

- `UENUM(BlueprintType) enum class EDojoM8Outcome : uint8` with the values `EO_Waiting`, `EO_Running`, `EO_Escaped`, `EO_Caught`, and `EO_TimeUp`.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float TimeLimitSeconds`, 120 by default.
- `UFUNCTION(BlueprintCallable) void WatchExit(ADojoM8ExitGate* Gate);` and `void WatchAlert(ADojoM8AlertMeter* Meter);` listen to the gate's escapes and the meter's catches, and ignore an invalid pointer.
- `UFUNCTION(BlueprintCallable) void Start();` begins the moment: it is running, its time starts now, and the time limit starts counting down.
- `UFUNCTION(BlueprintPure) EDojoM8Outcome GetOutcome() const;` says how the moment stands.
- `UFUNCTION(BlueprintPure) float GetElapsedSeconds() const;` gives the seconds since the moment started, up to the moment it ended, and zero before it starts.
- `UFUNCTION(BlueprintPure) FString GetLabel() const;` gives the label described above, with the time to one decimal.

Dependency direction: the clock listens to the gate and the meter; neither knows the clock exists, and the clock holds no list of them.

Compiles against earlier quests: m8-alert-meter (`Quests/m8-alert-meter/DojoM8AlertMeter.h`), m8-exit-gate (`Quests/m8-exit-gate/DojoM8ExitGate.h`), and m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This clock is the fifth and last piece of the Blackout Escape boss.

## See it in the editor

Place a `DojoM8MomentClock`, a `DojoM8ExitGate` near the player start, and a `DojoM8AlertMeter`; the gate's zone is an invisible box, so switch on Show, then Collision in the viewport to see it. Add references to all three in the level Blueprint. On BeginPlay call Watch Exit and Watch Alert on the clock, then Start, and print the clock's Get Label on a looping one second timer; on the 1 key call Set Powered with true on the gate. Press Play: it reads RUNNING. Press 1 and walk the pawn into the zone to read `ESCAPED in ...`, or set Time Limit Seconds to 5 in Details and wait to read `TIME UP`.

# Files

## DojoM8MomentClock.h

```cpp
// Declare ADojoM8MomentClock and EDojoM8Outcome here.
```

## DojoM8MomentClock.cpp

```cpp
// Define ADojoM8MomentClock here.
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

/** Checks a clock that has not started reads WAITING with no time, and RUNNING once started. */
bool FDojo_M8_MomentClock_WaitsUntilStarted::RunTest(const FString& Parameters)
{
	using namespace DojoM8MomentClockTest;

	FDojoTestWorld TestWorld;
	FClockScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Scene made"), Scene.Runner) || !Scene.Clock || !Scene.Gate || !Scene.Meter) return false;

	TestEqual(TEXT("A new clock waits"), Scene.Clock->GetLabel(), FString(TEXT("WAITING")));
	TestEqual(TEXT("with no time on it"), Scene.Clock->GetElapsedSeconds(), 0.f);

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
	TestTrue(TEXT("The outcome is Escaped"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_Escaped);

	TestWorld.Tick(6000);
	TestTrue(TEXT("Long after the 120 second limit the outcome is still Escaped"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_Escaped);
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
	TestTrue(TEXT("An escape after the catch changes nothing"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_Caught);

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
	TestTrue(TEXT("At four seconds the moment is still running"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_Running);

	TestWorld.Tick(120);
	TestEqual(TEXT("At six seconds the time is up"), Scene.Clock->GetLabel(), FString(TEXT("TIME UP")));
	TestNearlyEqual(TEXT("and the clock stopped at the limit"), Scene.Clock->GetElapsedSeconds(), 5.f, 0.2f);

	Scene.Gate->OnEscaped.Broadcast(Scene.Runner);
	TestTrue(TEXT("An escape after the time is up changes nothing"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_TimeUp);

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
	TestTrue(TEXT("Twelve seconds after the first start the second moment is still running"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_Running);
	TestNearlyEqual(TEXT("with six seconds on it"), Scene.Clock->GetElapsedSeconds(), 6.f, 0.2f);

	TestWorld.Tick(300);
	TestTrue(TEXT("Its own limit still ends it"), Scene.Clock->GetOutcome() == EDojoM8Outcome::EO_TimeUp);

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

- Give the escape, the catch, and the time limit one place to go through, so the recording of an ending is written once.
- Take the world's time at the start and again at the end, and let the label be a switch over the outcome.
- A moment can be started again, so decide what a second start must reset, and make sure a later event cannot change an ending that is already recorded.

# Rubric

- The clock listens to the gate and the meter with AddUniqueDynamic and holds no pointer to either, and neither of them knows the clock exists.
- Start puts the moment in the running state, records the start time, and starts the time limit as a one-shot timer.
- All three endings go through one function that records the outcome and the end time.
- Each of the three endings shows its own label and its own time.
- Starting a moment again begins a fresh time and a fresh limit.
- The limit is a property a designer can set in Details, and the label reads exactly `WAITING`, `RUNNING`, `ESCAPED in 41.2 s`, `CAUGHT after 12.0 s`, or `TIME UP`.

# Alternative

The clock could poll: tick every frame, compare the time with the limit, and look at the gate and the meter for their state. That works with no events at all, but it spends a check on every frame for an answer that changes three times in a whole round, and it has to ask each object every frame what they already know. Events and one timer do the same job with no per-frame cost, and a new ending, such as a bell at the exit, only needs a new handler. This shape, one object whose state changes only by the events it hears, is the State pattern, as in Pack 2's "One mode at a time" world.

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
- id: clock-elapsed
  prompt: Put GetElapsedSeconds in order.
  lines:
    - "float ADojoM8MomentClock::GetElapsedSeconds() const"
    - "{"
    - "	const bool bStillRunning = Outcome == EDojoM8Outcome::EO_Running;"
    - "	const double Until = bStillRunning ? GetWorld()->GetTimeSeconds() : EndSeconds;"
    - "	return static_cast<float>(Until - StartSeconds);"
    - "}"
  distractors:
    - line: "	const double Until = bStillRunning ? EndSeconds : GetWorld()->GetTimeSeconds();"
      mistake: The two branches are swapped, so a running moment would show a frozen time and an ended one would keep counting.
- id: clock-label
  prompt: Put the end of GetLabel in order.
  lines:
    - "	const float Seconds = GetElapsedSeconds();"
    - "	const FString Time = FString::Printf(TEXT(\"%.1f s\"), Seconds);"
    - "	return Outcome == EDojoM8Outcome::EO_Escaped ? TEXT(\"ESCAPED in \") + Time : TEXT(\"CAUGHT after \") + Time;"
  distractors:
    - line: "	const FString Time = FString::Printf(TEXT(\"%d s\"), Seconds);"
      mistake: "%d expects an integer, and Printf checks its format against the arguments when the code compiles, so a float given to it does not build; a decimal needs %.1f."
```
