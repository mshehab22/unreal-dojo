---
id: p3-patrol-drone
title: A drone that patrols on its own
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: [update-method]
skills: [update-method, time]
terms: [tick, deltatime, primary-actor-tick, beginplay, super]
prerequisites: [p3-per-frame-behavior]
xp: 50
estimatedMinutes: 15
concepts:
  - An object's per-frame behavior lives in its own Tick, and the engine calls it every frame
  - Behavior sliced into frames must store where it was, such as a heading, to carry on next frame
  - With a variable frame, one update may cover more ground than the space it has, so the update must correct overshoot
---

# Brief

When you press Play, the drone glides 400 centimeters down its corridor, turns, comes back, and keeps patrolling, and it never leaves the corridor even when a frame takes a whole second.

Nobody calls the drone. It has opted into the engine's per-frame walk, so its own `Tick` runs once a frame with that frame's real length, and moves it a little. Because the patrol is spread over hundreds of frames, the drone has to remember between frames where it is (`Offset`) and which way it is going (`Heading`). Most of the class is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap in `Tick`: when the move carries the drone past either end, turn it around at that end and fold the leftover distance back into the corridor.

Naive first: a single check that flips the heading at the far end looks right at 60 frames per second. Then run the tests: one of them hands the drone a five-second frame, which carries it past both ends at once.

## See it in the editor

Place a `DojoP3PatrolDrone` in the sandbox map and press Play: the >> label glides along the X axis, turns into << at 400 centimeters, and comes back. Open the console and run `t.MaxFPS 2`: the drone now jumps in big steps but still turns at the ends and never leaves the corridor. Run `t.MaxFPS 0` to restore. Place a second drone with Speed 900: both patrol at once, each from its own Tick, and neither knows the other exists.

# Files

## DojoP3PatrolDrone.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3PatrolDrone.generated.h"

class UTextRenderComponent;

/** A drone that patrols back and forth along a corridor, updating itself every frame and remembering its heading between frames. */
UCLASS()
class ADojoP3PatrolDrone : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3PatrolDrone();

	/** Floating text that shows which way the drone is heading. */
	UPROPERTY(VisibleAnywhere, Category = "Drone")
	TObjectPtr<UTextRenderComponent> Label;

	/** Length of the corridor from where the drone starts, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Drone", meta = (ClampMin = "1"))
	float PatrolLength = 400.f;

	/** Patrol speed, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Drone", meta = (ClampMin = "0"))
	float Speed = 300.f;

	/** Moves the drone along its patrol for one frame of DeltaSeconds, turning at either end. */
	virtual void Tick(float DeltaSeconds) override;

	/** Distance from the start of the corridor, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Drone")
	float GetOffset() const;

	/** 1 while heading away from the start, -1 while heading back. */
	UFUNCTION(BlueprintPure, Category = "Drone")
	float GetHeading() const;

protected:
	/** Remembers where the corridor starts. */
	virtual void BeginPlay() override;

private:
	/** Writes the heading into the label. */
	void RefreshLabel();

	FVector StartLocation = FVector::ZeroVector;
	float Offset = 0.f;
	float Heading = 1.f; // @explain: A frame ends in the middle of the patrol, so the drone must store which way it was going to carry on next frame.
};
```

## DojoP3PatrolDrone.cpp

```cpp
#include "DojoP3PatrolDrone.h"

#include "Components/TextRenderComponent.h"

ADojoP3PatrolDrone::ADojoP3PatrolDrone()
{
	PrimaryActorTick.bCanEverTick = true; // @explain: This opts the drone into the engine's per-frame walk, so its own Tick runs every frame without anyone calling it.

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3PatrolDrone::BeginPlay()
{
	Super::BeginPlay();

	StartLocation = GetActorLocation();
	RefreshLabel();
}

void ADojoP3PatrolDrone::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Offset += Heading * Speed * DeltaSeconds; // @explain: One frame of the patrol: move by speed times this frame's real length, in the stored direction.

	// Your code: if the move carried the drone past either end of the corridor, turn it around there and fold the extra distance back into the corridor. A long frame can carry it past both ends.

	SetActorLocation(StartLocation + FVector(Offset, 0.f, 0.f)); // @explain: The drone keeps its own position as an offset and only tells the engine where to draw it at the end of its update.
	RefreshLabel();
}

float ADojoP3PatrolDrone::GetOffset() const
{
	return Offset;
}

float ADojoP3PatrolDrone::GetHeading() const
{
	return Heading;
}

void ADojoP3PatrolDrone::RefreshLabel()
{
	Label->SetText(FText::FromString(Heading > 0.f ? TEXT(">>") : TEXT("<<")));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p3-patrol-drone/DojoP3PatrolDrone.h"
#include "Support/DojoTestWorld.h"

namespace DojoP3PatrolDroneTest
{
	/** Ticks a drone FrameCount frames of FrameSeconds each and reports whether it ever left the corridor. */
	bool FeedAndStayInside(ADojoP3PatrolDrone* Drone, int32 FrameCount, float FrameSeconds)
	{
		bool bStayedInside = true;

		for (int32 Frame = 0; Frame < FrameCount; ++Frame)
		{
			Drone->Tick(FrameSeconds);
			if (Drone->GetOffset() < 0.f || Drone->GetOffset() > Drone->PatrolLength) bStayedInside = false;
		}

		return bStayedInside;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_PatrolDrone_SameSpotAtAnyFrameLength, "Dojo.P3.PatrolDrone.SameSpotAtAnyFrameLength", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three seconds in frames of 0.01, 0.1, and 1 second end at the same spot and heading, inside the corridor all along. */
bool FDojo_P3_PatrolDrone_SameSpotAtAnyFrameLength::RunTest(const FString& Parameters)
{
	using namespace DojoP3PatrolDroneTest;

	FDojoTestWorld TestWorld;

	ADojoP3PatrolDrone* Smooth = TestWorld.SpawnActor<ADojoP3PatrolDrone>();
	ADojoP3PatrolDrone* Choppy = TestWorld.SpawnActor<ADojoP3PatrolDrone>();
	ADojoP3PatrolDrone* Stalling = TestWorld.SpawnActor<ADojoP3PatrolDrone>();
	if (!TestNotNull(TEXT("Drones spawned"), Smooth) || !TestNotNull(TEXT("Drones spawned"), Choppy) || !TestNotNull(TEXT("Drones spawned"), Stalling)) return false;

	TestTrue(TEXT("Inside the corridor at 0.01 second frames"), FeedAndStayInside(Smooth, 300, 0.01f));
	TestTrue(TEXT("Inside the corridor at 0.1 second frames"), FeedAndStayInside(Choppy, 30, 0.1f));
	TestTrue(TEXT("Inside the corridor at 1 second frames"), FeedAndStayInside(Stalling, 3, 1.f));

	// 900 centimeters of travel: out to 400, back to 0, out again to 100.
	TestEqual(TEXT("At 0.01 second frames the drone is 100 centimeters out"), Smooth->GetOffset(), 100.f, 0.1f);
	TestEqual(TEXT("At 0.1 second frames the drone is 100 centimeters out"), Choppy->GetOffset(), 100.f, 0.1f);
	TestEqual(TEXT("At 1 second frames the drone is 100 centimeters out"), Stalling->GetOffset(), 100.f, 0.1f);
	TestEqual(TEXT("Heading out again"), Stalling->GetHeading(), 1.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_PatrolDrone_LongFramePassesBothEnds, "Dojo.P3.PatrolDrone.LongFramePassesBothEnds", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One five-second frame carries the drone 1500 centimeters, past both ends; it must still land inside, heading the right way. */
bool FDojo_P3_PatrolDrone_LongFramePassesBothEnds::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP3PatrolDrone* Drone = TestWorld.SpawnActor<ADojoP3PatrolDrone>();
	if (!TestNotNull(TEXT("Drone spawned"), Drone)) return false;

	Drone->Tick(5.f);

	// Out to 400, back to 0, out to 400, back to 100.
	TestEqual(TEXT("1500 centimeters of patrol ends 100 centimeters out"), Drone->GetOffset(), 100.f, 0.01f);
	TestEqual(TEXT("Heading back toward the start"), Drone->GetHeading(), -1.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_PatrolDrone_EngineDrivesIt, "Dojo.P3.PatrolDrone.EngineDrivesIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Ticking the world for one second moves the drone with no one calling it, and its actor follows its offset. */
bool FDojo_P3_PatrolDrone_EngineDrivesIt::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP3PatrolDrone* Drone = TestWorld.SpawnActor<ADojoP3PatrolDrone>();
	if (!TestNotNull(TEXT("Drone spawned"), Drone)) return false;

	TestTrue(TEXT("The drone ticks every frame"), Drone->PrimaryActorTick.bCanEverTick);

	TestWorld.Tick(60);

	TestEqual(TEXT("One second of frames moves it about 300 centimeters (within two frames)"), Drone->GetOffset(), 300.f, 10.f);
	TestEqual(TEXT("The actor stands where its offset says"), static_cast<float>(Drone->GetActorLocation().X), Drone->GetOffset(), 0.01f);

	return true;
}

#endif
```

# Hints

- One check for the far end is not enough: a long frame can carry the drone past the far end and then past the start as well.
- Past an end, the extra distance is reflected: if the drone is 30 centimeters beyond the far end, it belongs 30 centimeters back inside, heading the other way. Repeat until it is inside.
- No engine API is needed for the gap; it uses only Offset, Heading, and PatrolLength.

# Rubric

- The drone's per-frame behavior lives in its own Tick, which calls Super::Tick first and is driven by the engine, not by another actor.
- Heading and Offset are stored on the drone between frames; nothing is recomputed from the time since play started.
- Overshoot past either end, including past both in one frame, is folded back inside and the heading set to match.
- Movement is speed times DeltaSeconds, so the patrol takes the same time at any frame rate.
- Patrol length and speed are editable properties, not numbers in Tick.

# Alternative

The drone could compute its position from the total time since play started with a triangle wave: `Offset = PatrolLength - FMath::Abs(FMath::Fmod(Time * Speed, 2 * PatrolLength) - PatrolLength)`. That needs no stored heading and no overshoot code, and it is exact at any frame length. It only works while the patrol is a pure function of time: the first time a designer wants the drone to pause when it sees the player, or to speed up when alarmed, the formula breaks and the stored heading comes back. Stored state is the general tool; a formula is a shortcut for motion that never reacts.

# Parsons

```yaml
- id: drone-fold
  prompt: Put the overshoot fold in order.
  lines:
    - "	while (Offset > PatrolLength || Offset < 0.f)"
    - "	{"
    - "		if (Offset > PatrolLength)"
    - "		{"
    - "			Offset = 2.f * PatrolLength - Offset;"
    - "			Heading = -1.f;"
    - "		}"
    - "		else"
    - "		{"
    - "			Offset = -Offset;"
    - "			Heading = 1.f;"
    - "		}"
    - "	}"
  distractors:
    - line: "			Offset = PatrolLength;"
      mistake: Clamping to the end throws away the distance the drone travelled past it, so the patrol runs slower on long frames.
- id: drone-tick-start
  prompt: Put the start of Tick in order.
  lines:
    - "void ADojoP3PatrolDrone::Tick(float DeltaSeconds)"
    - "{"
    - "	Super::Tick(DeltaSeconds);"
    - "	Offset += Heading * Speed * DeltaSeconds;"
  distractors:
    - line: "	Offset += Heading * Speed;"
      mistake: Without DeltaSeconds the drone moves a fixed amount per frame, so it patrols faster on faster machines.
```
