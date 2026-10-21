---
id: p4-drum-pad
title: A drum pad that scores one finished frame at a time
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [double-buffer]
skills: [double-buffer, input]
terms: [tarray, tick, ufunction, blueprintcallable]
prerequisites: [p4-double-buffer-card]
xp: 100
estimatedMinutes: 20
concepts:
  - Writers that arrive at any moment fill a back copy; readers only ever see the front copy
  - One swap at a fixed point in the frame hands the whole batch over at once
  - After a swap the back copy holds an old batch and must be emptied before it collects again
---

# Brief

When you press Play and run `ke * Hit 0` three times between two frames, the pad's score jumps by 30 on the next frame and never counts those hits again, however many frames pass.

In the arena's rhythm round, hits on the drum pad come from several places: the player's input bindings, a training dummy that drums along, and a level Blueprint replaying a pattern. They can arrive at any point in a frame, including while the scoring code is halfway through reading the last batch. Scoring must see one finished batch per frame, and a hit that lands while scoring is under way must wait for the next frame rather than sneak into this one.

`ADojoP4DrumPad` keeps two copies of the per-lane hit counts. `IncomingHits` is where new hits land. `FrameHits` is the finished snapshot that scoring reads. The declarations and the wiring (constructor, `BeginPlay`, `Tick`, `GetScore`) are given. Yours:

- `Hit` counts one hit on a lane in the incoming copy, and ignores lanes outside the pad.
- `BeginFrame` makes the incoming copy this frame's snapshot with one swap, and leaves an incoming copy that starts again from zero.
- `GetHitsThisFrame` reads the snapshot, 0 for lanes outside the pad.
- `ScoreFrame` adds `PointsPerHit` for every hit in the snapshot and shows the score.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP4DrumPad` in a map with no other pads, press Play, and open the console. Run `ke * Hit 0`, `ke * Hit 0`, `ke * Hit 3`: the label jumps from 0 to 30 on the next frame and stays there. Run `ke * Hit 9`: nothing changes, because lane 9 is not on the pad. In the Level Blueprint, bind a key to call Hit on the pad with lane 1: every press adds 10, once.

# Files

## DojoP4DrumPad.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4DrumPad.generated.h"

class UTextRenderComponent;

/** A drum pad for the arena's rhythm round: hits may arrive at any moment in a frame, but scoring reads one finished snapshot per frame. */
UCLASS()
class ADojoP4DrumPad : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP4DrumPad();

	/** Floating text that shows the score. */
	UPROPERTY(VisibleAnywhere, Category = "Drum")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many lanes the pad has. */
	UPROPERTY(EditAnywhere, Category = "Drum", meta = (ClampMin = "1"))
	int32 LaneCount = 4;

	/** Points for each hit scored. */
	UPROPERTY(EditAnywhere, Category = "Drum", meta = (ClampMin = "0"))
	int32 PointsPerHit = 10;

	/** Records one hit on a lane; it counts from the next frame on. Lanes outside the pad are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Drum")
	void Hit(int32 Lane);

	/** Starts a frame: the hits collected since the last frame become this frame's snapshot, and collecting starts again from zero. */
	UFUNCTION(BlueprintCallable, Category = "Drum")
	void BeginFrame();

	/** Hits on a lane in this frame's snapshot; 0 for lanes outside the pad. */
	UFUNCTION(BlueprintPure, Category = "Drum")
	int32 GetHitsThisFrame(int32 Lane) const;

	/** Points scored so far. */
	UFUNCTION(BlueprintPure, Category = "Drum")
	int32 GetScore() const;

	/** Begins the frame, then scores this frame's snapshot. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Sizes both copies to the lane count. */
	virtual void BeginPlay() override;

private:
	/** Adds this frame's hits to the score and shows it. */
	void ScoreFrame();

	/** The finished snapshot that scoring reads this frame. */
	TArray<int32> FrameHits;

	/** Hits arriving now, for the next frame. */
	TArray<int32> IncomingHits;

	int32 Score = 0;
};
```

## DojoP4DrumPad.cpp

```cpp
#include "DojoP4DrumPad.h"

#include "Components/TextRenderComponent.h"

ADojoP4DrumPad::ADojoP4DrumPad()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP4DrumPad::BeginPlay()
{
	Super::BeginPlay();

	FrameHits.Init(0, LaneCount);
	IncomingHits.Init(0, LaneCount);
	Label->SetText(FText::AsNumber(Score));
}

void ADojoP4DrumPad::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	BeginFrame();
	ScoreFrame();
}

void ADojoP4DrumPad::Hit(int32 Lane)
{
}

void ADojoP4DrumPad::BeginFrame()
{
}

int32 ADojoP4DrumPad::GetHitsThisFrame(int32 Lane) const
{
	return 0;
}

int32 ADojoP4DrumPad::GetScore() const
{
	return Score;
}

void ADojoP4DrumPad::ScoreFrame()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p4-drum-pad/DojoP4DrumPad.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_DrumPad_HitsShowNextFrame, "Dojo.P4.DrumPad.HitsShowNextFrame", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Hits are invisible until the next frame begins, and a hit landing mid-frame does not change the snapshot being read. */
bool FDojo_P4_DrumPad_HitsShowNextFrame::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP4DrumPad* Pad = TestWorld.SpawnActor<ADojoP4DrumPad>();
	if (!TestNotNull(TEXT("Pad spawned"), Pad)) return false;

	Pad->Hit(0);
	Pad->Hit(0);
	TestEqual(TEXT("Hits do not show before the frame begins"), Pad->GetHitsThisFrame(0), 0);

	Pad->BeginFrame();
	TestEqual(TEXT("Both hits show in the new frame"), Pad->GetHitsThisFrame(0), 2);

	Pad->Hit(1);
	TestEqual(TEXT("A hit landing mid-frame does not show yet"), Pad->GetHitsThisFrame(1), 0);
	TestEqual(TEXT("The snapshot being read is untouched"), Pad->GetHitsThisFrame(0), 2);

	Pad->BeginFrame();
	TestEqual(TEXT("Next frame shows the mid-frame hit"), Pad->GetHitsThisFrame(1), 1);
	TestEqual(TEXT("Next frame no longer shows the earlier hits"), Pad->GetHitsThisFrame(0), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_DrumPad_OldHitsNeverReturn, "Dojo.P4.DrumPad.OldHitsNeverReturn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three hits show in one frame only; two frames later a single new hit shows as one, not as four. */
bool FDojo_P4_DrumPad_OldHitsNeverReturn::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP4DrumPad* Pad = TestWorld.SpawnActor<ADojoP4DrumPad>();
	if (!TestNotNull(TEXT("Pad spawned"), Pad)) return false;

	Pad->Hit(2);
	Pad->Hit(2);
	Pad->Hit(2);

	Pad->BeginFrame();
	TestEqual(TEXT("Frame 1 shows the three hits"), Pad->GetHitsThisFrame(2), 3);

	Pad->BeginFrame();
	TestEqual(TEXT("Frame 2 shows none"), Pad->GetHitsThisFrame(2), 0);

	Pad->Hit(2);
	Pad->BeginFrame();
	TestEqual(TEXT("Frame 3 shows only the one new hit, not old hits coming back"), Pad->GetHitsThisFrame(2), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_DrumPad_EachHitScoresOnce, "Dojo.P4.DrumPad.EachHitScoresOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Each tick begins a frame and scores it: two hits score 20 once, and a lane outside the pad scores nothing. */
bool FDojo_P4_DrumPad_EachHitScoresOnce::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP4DrumPad* Pad = TestWorld.SpawnActor<ADojoP4DrumPad>();
	if (!TestNotNull(TEXT("Pad spawned"), Pad) || !TestNotNull(TEXT("Pad has a label"), Pad->Label.Get())) return false;

	Pad->Hit(0);
	Pad->Hit(3);
	Pad->Hit(7);
	Pad->Hit(-1);

	Pad->Tick(1.f / 60.f);
	TestEqual(TEXT("Two hits on the pad score 20"), Pad->GetScore(), 20);
	TestEqual(TEXT("The label shows the score"), Pad->Label->Text.ToString(), FString(TEXT("20")));

	Pad->Tick(1.f / 60.f);
	Pad->Tick(1.f / 60.f);
	TestEqual(TEXT("Later frames do not score the same hits again"), Pad->GetScore(), 20);

	return true;
}

#endif
```

# Hints

- The failing test checks a lane two frames after its hits were scored. Follow one array through two swaps and ask what is still inside it when it starts collecting again.
- A swap does not empty anything; it only changes which array plays which part. Right after the swap, the incoming copy is last frame's snapshot, so zero it before new hits land.
- `Swap` is in `Templates/UnrealTemplate.h`; `TArray::IsValidIndex` checks a lane, and a ranged-for loop over `int32&` can zero every lane.

# Rubric

- Hit writes only into the incoming copy and ignores lanes outside the pad.
- BeginFrame swaps the two copies once per frame and empties the new incoming copy, so old hits never return.
- Scoring and GetHitsThisFrame read only the snapshot, so a hit landing mid-frame waits for the next frame.
- Each hit is scored exactly once, at PointsPerHit from the editable property.
- The swap exchanges the arrays without copying lane by lane.
- Frames begin at one fixed point, the start of Tick, not wherever a hit happens to arrive.

# Alternative

The player's own key presses are already processed once per frame by the player controller and Enhanced Input, so for hits that only come from the keyboard or gamepad, binding straight to an Input Action is enough. The two copies earn their place here because hits also come from code that runs in the middle of the frame (a dummy drumming along, a replay), and because a scoring pass that broadcasts a delegate could trigger a new hit while it is still reading. If hits could arrive from another thread, the swap would also need a lock or an atomic exchange, which this game-thread version leaves out.

# Parsons

```yaml
- id: drum-begin-frame
  prompt: Put BeginFrame in order.
  lines:
    - "void ADojoP4DrumPad::BeginFrame()"
    - "{"
    - "	Swap(FrameHits, IncomingHits);"
    - "	for (int32& LaneHits : IncomingHits) LaneHits = 0;"
    - "}"
  distractors:
    - line: "	for (int32& LaneHits : FrameHits) LaneHits = 0;"
      mistake: Zeroing the snapshot right after the swap throws away the hits this frame is about to score.
```
