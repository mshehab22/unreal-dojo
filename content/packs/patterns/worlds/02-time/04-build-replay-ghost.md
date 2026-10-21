---
id: p2-replay-ghost
title: A replay ghost that keeps its own clock
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [game-loop]
skills: [time, game-loop]
terms: [tick, deltatime, tarray, uproperty, ufunction]
prerequisites: [p2-game-loop-card]
xp: 100
estimatedMinutes: 25
concepts:
  - A replay plays recorded fixed steps, so it must spend real time in those same steps
  - Playback speed scales the time banked, never the size of a step
  - A long hitch is capped and the rest of it dropped, so the replay slows down instead of racing to catch up
---

# Brief

When you press Play, the ghost runs its recorded four-second dash and its label counts Step 1 / 64 up to DONE; set its speed to 2 and it covers the same ground in two seconds, set it to 0 and it freezes, and the end point is identical every time.

This is the Game Loop's time policy again, in a different mechanic: a replay. The run was recorded as one speed per fixed step of 1/16 of a second (`RecordedSpeeds`). Playing it back means running those same steps in the same order, so the ghost ends at the same spot no matter how fast the machine draws. The declarations and the wiring (constructor, `BeginPlay`, `Tick`) are given; the rest is yours.

- `Advance` banks the frame's real time, scaled by the playback rate, and plays whole recorded steps while a step's worth of time is waiting. It stops when the recording runs out.
- `PlayStep` plays the step at `StepIndex`: the distance grows by that step's speed times `StepSeconds`, and the previous distance is kept for drawing.
- `SetPlaybackRate` takes any rate of 0 or more; 2 plays twice as fast, 0 pauses.
- `GetAlpha` and `GetDisplayDistance` blend the drawing between the last two steps, as the blade did.
- `IsFinished` is true once every recorded step has played; the label then reads DONE, and before that "Step 5 / 64" (the next step to play, out of the total).
- A hitch must not turn into a sprint: no single `Advance` may run more than `MaxStepsPerAdvance` steps, and after a hitch the ghost goes back to normal speed on the next frame.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP2ReplayGhost` in the sandbox map and press Play: the label slides along the X axis, speeding up and then slowing down, and reads DONE after four seconds. Stop, open the Level Blueprint, and on Begin Play call Set Playback Rate on the ghost with 2: the same run finishes in two seconds and stops at the same spot. Try 0.5, then 0. Finally run `t.MaxFPS 10` in the console and play again: the motion is choppy, but it still ends at the same spot after the same time.

# Files

## DojoP2ReplayGhost.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP2ReplayGhost.generated.h"

class UTextRenderComponent;

/** A ghost runner that replays a recorded run one fixed step at a time, at any playback speed and any frame rate. */
UCLASS()
class ADojoP2ReplayGhost : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills a sample recording, and turns ticking on. */
	ADojoP2ReplayGhost();

	/** Floating text that shows the step being played, or DONE. */
	UPROPERTY(VisibleAnywhere, Category = "Replay")
	TObjectPtr<UTextRenderComponent> Label;

	/** The recorded run: the runner's speed during each fixed step, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Replay")
	TArray<float> RecordedSpeeds;

	/** Length of one recorded step, in seconds; must match the rate the run was recorded at. */
	UPROPERTY(EditAnywhere, Category = "Replay", meta = (ClampMin = "0.001"))
	float StepSeconds = 1.f / 16.f;

	/** The most steps one Advance may run. */
	UPROPERTY(EditAnywhere, Category = "Replay", meta = (ClampMin = "1"))
	int32 MaxStepsPerAdvance = 4;

	/** Sets how fast the replay plays: 1 is real time, 2 is double speed, 0 pauses. */
	UFUNCTION(BlueprintCallable, Category = "Replay")
	void SetPlaybackRate(float NewRate);

	/** Plays the recording forward by the real time that passed, scaled by the playback rate, in whole recorded steps. */
	UFUNCTION(BlueprintCallable, Category = "Replay")
	void Advance(float DeltaSeconds);

	/** Distance the ghost has covered after the last step, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetDistance() const;

	/** The next recorded step to play; equals the recording's length once finished. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	int32 GetStepIndex() const;

	/** True once every recorded step has been played. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	bool IsFinished() const;

	/** How far the leftover time is toward the next step, from 0 up to but not including 1. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetAlpha() const;

	/** The distance to draw this frame, between the last two steps by the alpha. */
	UFUNCTION(BlueprintPure, Category = "Replay")
	float GetDisplayDistance() const;

	/** Advances the replay and moves the ghost to its display distance from where it started. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Remembers the start location and shows the first step. */
	virtual void BeginPlay() override;

private:
	/** Plays one recorded step. */
	void PlayStep();

	/** Writes the step being played, or DONE, into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float PlaybackRate = 1.f;
	float Distance = 0.f;
	float PreviousDistance = 0.f;
	float Lag = 0.f;
	int32 StepIndex = 0;
};
```

## DojoP2ReplayGhost.cpp

```cpp
#include "DojoP2ReplayGhost.h"

#include "Components/TextRenderComponent.h"

ADojoP2ReplayGhost::ADojoP2ReplayGhost()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	// A sample run for the editor: four seconds that speed up, then slow down.
	for (int32 Step = 0; Step < 64; ++Step) RecordedSpeeds.Add(Step < 32 ? 100.f + Step * 10.f : 420.f - (Step - 32) * 10.f);
}

void ADojoP2ReplayGhost::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP2ReplayGhost::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Advance(DeltaSeconds);
	SetActorLocation(StartLocation + FVector(GetDisplayDistance(), 0.f, 0.f));
}

void ADojoP2ReplayGhost::SetPlaybackRate(float NewRate)
{
}

void ADojoP2ReplayGhost::Advance(float DeltaSeconds)
{
}

void ADojoP2ReplayGhost::PlayStep()
{
}

float ADojoP2ReplayGhost::GetDistance() const
{
	return Distance;
}

int32 ADojoP2ReplayGhost::GetStepIndex() const
{
	return StepIndex;
}

bool ADojoP2ReplayGhost::IsFinished() const
{
	return false;
}

float ADojoP2ReplayGhost::GetAlpha() const
{
	return 0.f;
}

float ADojoP2ReplayGhost::GetDisplayDistance() const
{
	return 0.f;
}

void ADojoP2ReplayGhost::RefreshLabel()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p2-replay-ghost/DojoP2ReplayGhost.h"
#include "Support/DojoTestWorld.h"

namespace DojoP2ReplayGhostTest
{
	/** Spawns a ghost with a two-second recording of 32 uneven speeds. */
	ADojoP2ReplayGhost* SpawnGhost(FDojoTestWorld& TestWorld)
	{
		ADojoP2ReplayGhost* Ghost = TestWorld.SpawnActor<ADojoP2ReplayGhost>();
		if (!Ghost) return nullptr;

		Ghost->RecordedSpeeds.Reset();
		for (int32 Step = 0; Step < 32; ++Step) Ghost->RecordedSpeeds.Add(100.f + static_cast<float>((Step * 37) % 90));
		return Ghost;
	}

	/** Feeds a ghost FrameCount frames of FrameSeconds each, the way Tick would. */
	void Feed(ADojoP2ReplayGhost* Ghost, int32 FrameCount, float FrameSeconds)
	{
		for (int32 Frame = 0; Frame < FrameCount; ++Frame) Ghost->Advance(FrameSeconds);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_ReplayGhost_SameRunAtAnyFrameRate, "Dojo.P2.ReplayGhost.SameRunAtAnyFrameRate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A two-second recording fed at 64, 8, and 4 frames per second ends at exactly the same distance. */
bool FDojo_P2_ReplayGhost_SameRunAtAnyFrameRate::RunTest(const FString& Parameters)
{
	using namespace DojoP2ReplayGhostTest;

	FDojoTestWorld TestWorld;

	ADojoP2ReplayGhost* Fast = SpawnGhost(TestWorld);
	ADojoP2ReplayGhost* Slow = SpawnGhost(TestWorld);
	ADojoP2ReplayGhost* Choppy = SpawnGhost(TestWorld);
	if (!TestNotNull(TEXT("Ghosts spawned"), Fast) || !TestNotNull(TEXT("Ghosts spawned"), Slow) || !TestNotNull(TEXT("Ghosts spawned"), Choppy)) return false;

	Feed(Fast, 127, 1.f / 64.f);
	TestFalse(TEXT("Not finished one frame early"), Fast->IsFinished());
	Feed(Fast, 1, 1.f / 64.f);
	Feed(Slow, 16, 1.f / 8.f);
	Feed(Choppy, 8, 1.f / 4.f);

	TestTrue(TEXT("Finished after two seconds at 64 frames per second"), Fast->IsFinished());
	TestTrue(TEXT("Finished after two seconds at 8 frames per second"), Slow->IsFinished());
	TestTrue(TEXT("Finished after two seconds at 4 frames per second"), Choppy->IsFinished());
	TestEqual(TEXT("Every step played"), Fast->GetStepIndex(), 32);
	TestTrue(FString::Printf(TEXT("Same end at 64 and 8 frames per second (%f and %f)"), Fast->GetDistance(), Slow->GetDistance()), Fast->GetDistance() == Slow->GetDistance());
	TestTrue(FString::Printf(TEXT("Same end at 64 and 4 frames per second (%f and %f)"), Fast->GetDistance(), Choppy->GetDistance()), Fast->GetDistance() == Choppy->GetDistance());
	TestTrue(TEXT("The ghost covered ground"), Fast->GetDistance() > 200.f);

	if (!TestNotNull(TEXT("Ghost has a label"), Fast->Label.Get())) return false;
	TestEqual(TEXT("The label reads DONE"), Fast->Label->Text.ToString(), FString(TEXT("DONE")));

	Feed(Fast, 10, 1.f / 4.f);
	TestEqual(TEXT("A finished replay stays put"), Fast->GetStepIndex(), 32);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_ReplayGhost_PlaybackRateScalesTime, "Dojo.P2.ReplayGhost.PlaybackRateScalesTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** At double speed the two-second run ends after one second of real time; at zero it does not move. */
bool FDojo_P2_ReplayGhost_PlaybackRateScalesTime::RunTest(const FString& Parameters)
{
	using namespace DojoP2ReplayGhostTest;

	FDojoTestWorld TestWorld;

	ADojoP2ReplayGhost* Double = SpawnGhost(TestWorld);
	ADojoP2ReplayGhost* Paused = SpawnGhost(TestWorld);
	ADojoP2ReplayGhost* Normal = SpawnGhost(TestWorld);
	if (!TestNotNull(TEXT("Ghosts spawned"), Double) || !TestNotNull(TEXT("Ghosts spawned"), Paused) || !TestNotNull(TEXT("Ghosts spawned"), Normal)) return false;

	Double->SetPlaybackRate(2.f);
	Feed(Double, 60, 1.f / 64.f);
	TestEqual(TEXT("At double speed, 0.9375 seconds plays 30 steps"), Double->GetStepIndex(), 30);
	TestFalse(TEXT("Not finished yet"), Double->IsFinished());
	if (!TestNotNull(TEXT("Ghost has a label"), Double->Label.Get())) return false;
	TestEqual(TEXT("The label shows the next step"), Double->Label->Text.ToString(), FString(TEXT("Step 30 / 32")));

	Feed(Double, 4, 1.f / 64.f);
	TestTrue(TEXT("At double speed, one second finishes the two-second run"), Double->IsFinished());

	Feed(Normal, 128, 1.f / 64.f);
	TestTrue(FString::Printf(TEXT("Double speed ends where normal speed ends (%f and %f)"), Double->GetDistance(), Normal->GetDistance()), Double->GetDistance() == Normal->GetDistance());

	Paused->SetPlaybackRate(0.f);
	Feed(Paused, 64, 1.f / 64.f);
	TestEqual(TEXT("A paused replay plays no step"), Paused->GetStepIndex(), 0);

	Paused->SetPlaybackRate(1.f);
	Feed(Paused, 4, 1.f / 64.f);
	TestEqual(TEXT("Resuming plays on from where it paused"), Paused->GetStepIndex(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_ReplayGhost_HitchDoesNotTurnIntoASprint, "Dojo.P2.ReplayGhost.HitchDoesNotTurnIntoASprint", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A three-second hitch plays at most the capped steps, and the very next normal frame plays at normal speed. */
bool FDojo_P2_ReplayGhost_HitchDoesNotTurnIntoASprint::RunTest(const FString& Parameters)
{
	using namespace DojoP2ReplayGhostTest;

	FDojoTestWorld TestWorld;

	ADojoP2ReplayGhost* Ghost = SpawnGhost(TestWorld);
	if (!TestNotNull(TEXT("Ghost spawned"), Ghost)) return false;

	Ghost->Advance(3.f);
	TestEqual(TEXT("A three-second hitch plays only MaxStepsPerAdvance steps"), Ghost->GetStepIndex(), Ghost->MaxStepsPerAdvance);

	Ghost->Advance(1.f / 16.f);
	TestEqual(TEXT("The next normal frame plays one step, not another burst"), Ghost->GetStepIndex(), Ghost->MaxStepsPerAdvance + 1);
	TestTrue(TEXT("The alpha stays below one"), Ghost->GetAlpha() < 1.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P2_ReplayGhost_DrawsBetweenSteps, "Dojo.P2.ReplayGhost.DrawsBetweenSteps", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One and a half steps of time play one step, and the drawing sits halfway to the next. */
bool FDojo_P2_ReplayGhost_DrawsBetweenSteps::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP2ReplayGhost* Ghost = TestWorld.SpawnActor<ADojoP2ReplayGhost>();
	if (!TestNotNull(TEXT("Ghost spawned"), Ghost)) return false;

	Ghost->RecordedSpeeds.Init(160.f, 8);
	Ghost->Advance(3.f / 32.f);

	TestEqual(TEXT("One and a half steps of time play one step"), Ghost->GetStepIndex(), 1);
	TestEqual(TEXT("One step at 160 centimeters per second covers 10 centimeters"), Ghost->GetDistance(), 10.f);
	TestEqual(TEXT("The half step left over is an alpha of one half"), Ghost->GetAlpha(), 0.5f);
	TestEqual(TEXT("The drawing is halfway between the last two steps"), Ghost->GetDisplayDistance(), 5.f);

	return true;
}

#endif
```

# Hints

- The failing test feeds one enormous frame, then one normal frame. Count how many steps the second frame plays in your version, and ask where the hitch's extra time went.
- Capping the loop is half of it; the time the cap refused must also leave the bank, or every frame after the hitch hits the cap again. When the recording runs out, empty the bank too.
- Nothing new from the engine is needed: `FMath::Max` and `FMath::Lerp` from `Math/UnrealMathUtility.h` are the only helpers, and the label uses `FString::Printf` as in the earlier quests.

# Rubric

- Advance banks DeltaSeconds times the playback rate and plays whole steps of StepSeconds, keeping the remainder; the step length never changes with the rate.
- No single Advance plays more than MaxStepsPerAdvance steps, and time the cap refuses is dropped, so the ghost returns to normal speed on the next frame.
- The replay stops cleanly at the end of the recording and never reads past it.
- Display distance blends the last two steps by the alpha; the recorded distance never uses the alpha.
- Rates below zero are refused by SetPlaybackRate, and 0 pauses without losing the place.
- Tick only calls Advance and moves the actor; nothing else in the class reads the frame's delta.

# Alternative

Unreal's own Replay System (Demo Net Driver) records and plays back whole networked matches, with scrubbing and speed control, and is the right tool for full match replays. It records replicated state, not your inputs, so it needs the game set up for replication, and it is heavy for a single ghost runner in a time trial. A per-actor recording of fixed steps is small, needs no networking, and is easy to test, at the price of writing the clock yourself, which is the part this quest teaches.

# Parsons

```yaml
- id: ghost-play-step
  prompt: Put PlayStep in order.
  lines:
    - "void ADojoP2ReplayGhost::PlayStep()"
    - "{"
    - "	PreviousDistance = Distance;"
    - "	Distance += RecordedSpeeds[StepIndex] * StepSeconds;"
    - "	StepIndex++;"
    - "}"
  distractors:
    - line: "	Distance += RecordedSpeeds[StepIndex] * StepSeconds * PlaybackRate;"
      mistake: The playback rate already decides how many steps play per second; scaling each step as well would make a double-speed run end twice as far away.
```
