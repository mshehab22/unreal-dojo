---
id: m2-lift
title: A lift that eases into each floor and ignores calls while moving
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [math, movement, time]
terms: [interpolation, deltatime, fvector, tick, primary-actor-tick, tarray]
prerequisites: [m2-interpolation]
xp: 90
estimatedMinutes: 22
concepts:
  - An ease-out helper plus a tolerance gives a mover that settles and knows it has arrived
  - An actor ticks only while it has somewhere to go
---

# Brief

When you place a lift with floors at heights 0, 400, and 800 and call it to floor 2, its label reads GOING TO 2, it rises fast and slows as it nears 800, it lands exactly on 800 and reads FLOOR 2, a call made while it is moving is refused, and while it sits still it is not ticking at all.

Write the bodies of `CallTo`, `Tick`, and `RefreshLabel` in `ADojoM2Lift`; the rest is written for you. Rules:

- `CallTo` returns false and changes nothing when the lift is moving, is already at that floor, or the floor does not exist. Otherwise it sets the target, starts moving, turns ticking on, refreshes the label, and returns true.
- While moving, each frame eases the lift's height toward the target floor's height, keeping its X and Y, with `FloorHeights`, `InterpSpeed`, and the frame's duration. Once it is within `ArriveTolerance` units of the floor it lands exactly on it, stops moving, turns ticking off, and refreshes the label.
- The label reads `FLOOR` and the current floor while at rest, and `GOING TO` and the target floor while moving.

Dependency direction: the lift knows nothing about who calls it; any actor, widget, or Blueprint may call `CallTo`.

## See it in the editor

Place a `DojoM2Lift` at the origin and leave Floor Heights at 0, 400, and 800. In the level Blueprint, on the 1, 2, and 3 keys, call Call To with 0, 1, and 2. Press Play and press 3: the label reads GOING TO 2 and the lift rises fast and settles at 800. Press 1 while it is rising: nothing changes. After it lands, press 1: it descends. Type `stat game` in the console and see the lift's tick cost disappear while it is at rest.

# Files

## DojoM2Lift.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM2Lift.generated.h"

class UTextRenderComponent;

/** A lift that rises and falls between floor heights on request, slowing as it arrives, and ignores calls while it is moving. */
UCLASS()
class ADojoM2Lift : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label as the root and keeps ticking off until the lift has somewhere to go. */
	ADojoM2Lift();

	/** Floating text that reads FLOOR and the floor number at rest, or GOING TO and the floor number on the way. */
	UPROPERTY(VisibleAnywhere, Category = "Lift")
	TObjectPtr<UTextRenderComponent> Label;

	/** The world height of each floor. The lift starts at floor 0, so place it at the first height. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift")
	TArray<float> FloorHeights = { 0.f, 400.f, 800.f };

	/** How eagerly the lift closes the gap to its floor; higher arrives sooner. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift", meta = (ClampMin = "0.1"))
	float InterpSpeed = 4.f;

	/** The lift lands exactly on the floor once it is this close, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Lift", meta = (ClampMin = "0.01"))
	float ArriveTolerance = 1.f;

	/** Sends the lift to a floor; false when it is already moving, already there, or the floor does not exist. */
	UFUNCTION(BlueprintCallable, Category = "Lift")
	bool CallTo(int32 FloorIndex);

	/** True while the lift is on its way. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	bool IsMoving() const;

	/** The floor the lift last stopped at. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	int32 GetCurrentFloor() const;

	/** The floor the lift is heading for, or the current floor when it is at rest. */
	UFUNCTION(BlueprintPure, Category = "Lift")
	int32 GetTargetFloor() const;

	/** Closes in on the target height, slowing as it nears, and stops exactly on it. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting floor. */
	virtual void BeginPlay() override;

private:
	/** Writes the label for the current state. */
	void RefreshLabel();

	int32 CurrentFloor = 0;

	int32 TargetFloor = 0;

	bool bMoving = false;
};
```

## DojoM2Lift.cpp

```cpp
#include "DojoM2Lift.h"

#include "Components/TextRenderComponent.h"

ADojoM2Lift::ADojoM2Lift()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM2Lift::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

bool ADojoM2Lift::CallTo(int32 FloorIndex)
{
	// Your code: refuse when the lift is moving, the floor does not exist, or it is already there.
	// Your code: otherwise set the target, start moving, turn ticking on, refresh the label, and say yes.
	return false;
}

bool ADojoM2Lift::IsMoving() const
{
	return bMoving;
}

int32 ADojoM2Lift::GetCurrentFloor() const
{
	return CurrentFloor;
}

int32 ADojoM2Lift::GetTargetFloor() const
{
	return TargetFloor;
}

void ADojoM2Lift::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Your code: ease the lift's height toward the target floor's height, keeping its X and Y.
	// Your code: within ArriveTolerance of the floor, land exactly on it, stop moving, turn ticking off, and refresh the label.
}

void ADojoM2Lift::RefreshLabel()
{
	// Your code: show FLOOR and the current floor at rest, or GOING TO and the target floor while moving.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m2-lift/DojoM2Lift.h"
#include "Support/DojoTestWorld.h"

namespace DojoM2LiftTest
{
	/** The lift's label text. */
	FString LabelOf(const ADojoM2Lift* Lift)
	{
		return Lift->Label->Text.ToString();
	}

	/** Ticks the lift one frame at a time until it stops, up to MaxFrames, and returns its height after each frame. */
	TArray<double> RecordRide(FDojoTestWorld& TestWorld, const ADojoM2Lift* Lift, int32 MaxFrames)
	{
		TArray<double> Heights;
		Heights.Add(Lift->GetActorLocation().Z);

		for (int32 Frame = 0; Frame < MaxFrames && (Frame == 0 || Lift->IsMoving()); ++Frame)
		{
			TestWorld.Tick(1);
			Heights.Add(Lift->GetActorLocation().Z);
		}

		return Heights;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Lift_GoesToTheFloorAndSettles, "Dojo.M2.Lift.GoesToTheFloorAndSettles", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Calls the lift to the top floor and checks the label, the landing, and that it stops ticking. */
bool FDojo_M2_Lift_GoesToTheFloorAndSettles::RunTest(const FString& Parameters)
{
	using namespace DojoM2LiftTest;

	FDojoTestWorld TestWorld;

	ADojoM2Lift* Lift = TestWorld.SpawnActor<ADojoM2Lift>();
	if (!TestNotNull(TEXT("Lift spawned"), Lift)) return false;

	TestEqual(TEXT("It starts reading FLOOR 0"), LabelOf(Lift), FString(TEXT("FLOOR 0")));
	TestFalse(TEXT("A lift at rest is not ticking"), Lift->IsActorTickEnabled());

	TestTrue(TEXT("A call to floor 2 is accepted"), Lift->CallTo(2));
	TestTrue(TEXT("It is moving"), Lift->IsMoving());
	TestEqual(TEXT("It is heading for floor 2"), Lift->GetTargetFloor(), 2);
	TestEqual(TEXT("The label says where it is going"), LabelOf(Lift), FString(TEXT("GOING TO 2")));
	TestTrue(TEXT("A moving lift ticks"), Lift->IsActorTickEnabled());

	TestWorld.Tick(60 * 6);
	TestFalse(TEXT("After 6 seconds it has stopped"), Lift->IsMoving());
	TestEqual(TEXT("It landed exactly on the floor's height"), Lift->GetActorLocation().Z, 800.0, 0.001);
	TestEqual(TEXT("It kept its X"), Lift->GetActorLocation().X, 0.0, 0.001);
	TestEqual(TEXT("Its current floor is 2"), Lift->GetCurrentFloor(), 2);
	TestEqual(TEXT("The label reads the new floor"), LabelOf(Lift), FString(TEXT("FLOOR 2")));
	TestFalse(TEXT("A lift that has landed stops ticking"), Lift->IsActorTickEnabled());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Lift_EasesIntoTheFloor, "Dojo.M2.Lift.EasesIntoTheFloor", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rides to floor 1 frame by frame and checks the rise is fast at first, slow at the end, and never overshoots. */
bool FDojo_M2_Lift_EasesIntoTheFloor::RunTest(const FString& Parameters)
{
	using namespace DojoM2LiftTest;

	FDojoTestWorld TestWorld;

	ADojoM2Lift* Lift = TestWorld.SpawnActor<ADojoM2Lift>();
	if (!TestNotNull(TEXT("Lift spawned"), Lift)) return false;

	TestTrue(TEXT("The call is accepted"), Lift->CallTo(1));
	const TArray<double> Heights = RecordRide(TestWorld, Lift, 600);
	const int32 Last = Heights.Num() - 1;
	if (!TestTrue(TEXT("The ride took more than 20 frames and fewer than 600"), Last > 20 && Last < 600)) return false;

	const double FirstTen = Heights[10] - Heights[0];
	const double LastTen = Heights[Last] - Heights[Last - 10];
	TestTrue(TEXT("It rises faster at the start than at the end"), FirstTen > 3.0 * LastTen && LastTen > 0.0);

	bool bNeverBackwardsOrOver = true;
	for (int32 Index = 1; Index <= Last; ++Index)
	{
		if (Heights[Index] < Heights[Index - 1] - 0.0001 || Heights[Index] > 400.0001) bNeverBackwardsOrOver = false;
	}

	TestTrue(TEXT("It only ever rises and never goes past the floor"), bNeverBackwardsOrOver);
	TestEqual(TEXT("It ends exactly on the floor"), Heights[Last], 400.0, 0.001);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Lift_RefusesCallsItCannotTake, "Dojo.M2.Lift.RefusesCallsItCannotTake", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Makes calls while moving, to the floor it is on, and to floors that do not exist, and checks nothing changes. */
bool FDojo_M2_Lift_RefusesCallsItCannotTake::RunTest(const FString& Parameters)
{
	using namespace DojoM2LiftTest;

	FDojoTestWorld TestWorld;

	ADojoM2Lift* Lift = TestWorld.SpawnActor<ADojoM2Lift>();
	if (!TestNotNull(TEXT("Lift spawned"), Lift)) return false;

	TestFalse(TEXT("The floor it is on is refused"), Lift->CallTo(0));
	TestFalse(TEXT("A floor below zero is refused"), Lift->CallTo(-1));
	TestFalse(TEXT("A floor that does not exist is refused"), Lift->CallTo(3));
	TestFalse(TEXT("Refused calls leave it at rest"), Lift->IsMoving());

	TestTrue(TEXT("A real call is accepted"), Lift->CallTo(1));
	TestWorld.Tick(10);
	TestFalse(TEXT("A call while moving is refused"), Lift->CallTo(2));
	TestEqual(TEXT("It is still heading for floor 1"), Lift->GetTargetFloor(), 1);
	TestEqual(TEXT("The label did not change"), LabelOf(Lift), FString(TEXT("GOING TO 1")));

	TestWorld.Tick(60 * 6);
	TestFalse(TEXT("The first call finished"), Lift->IsMoving());
	TestFalse(TEXT("Calling the floor it landed on is refused"), Lift->CallTo(1));
	TestTrue(TEXT("Calling another floor is accepted"), Lift->CallTo(2));
	TestEqual(TEXT("It is heading for floor 2"), Lift->GetTargetFloor(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M2_Lift_FrameRateBarelyMatters, "Dojo.M2.Lift.FrameRateBarelyMatters", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rides the same call for 0.4 seconds at 30 and at 120 frames a second and checks the lift is in nearly the same place. */
bool FDojo_M2_Lift_FrameRateBarelyMatters::RunTest(const FString& Parameters)
{
	using namespace DojoM2LiftTest;

	double SlowHeight = 0.0;
	{
		FDojoTestWorld TestWorld;
		ADojoM2Lift* Lift = TestWorld.SpawnActor<ADojoM2Lift>();
		Lift->CallTo(1);
		TestWorld.Tick(12, 1.f / 30.f);
		SlowHeight = Lift->GetActorLocation().Z;
	}

	double FastHeight = 0.0;
	{
		FDojoTestWorld TestWorld;
		ADojoM2Lift* Lift = TestWorld.SpawnActor<ADojoM2Lift>();
		Lift->CallTo(1);
		TestWorld.Tick(48, 1.f / 120.f);
		FastHeight = Lift->GetActorLocation().Z;
	}

	TestTrue(TEXT("The lift has risen a good way in 0.4 seconds"), FastHeight > 200.0 && FastHeight < 380.0);
	TestTrue(TEXT("At 30 frames a second it is within 20 units of where 120 frames a second put it"), FMath::Abs(SlowHeight - FastHeight) < 20.0);

	return true;
}

#endif
```

# Hints

- Two facts decide everything: whether the lift is moving, and which floor it is heading for. Tick only has work while it is moving, so a call that is accepted turns ticking on and a landing turns it off.
- `FMath::VInterpTo` takes the current location, the goal, the frame's duration, and an interpolation speed. The goal keeps the lift's own X and Y and takes its Z from the target floor's height.
- `FVector::DistSquared` and `FMath::Square` compare a distance to a tolerance without a square root; `SetActorTickEnabled` is on `AActor`; `FString::Printf` builds the label text.

# Rubric

- `CallTo` refuses when the lift is moving, is already at the floor, or the floor does not exist, and changes nothing when it refuses.
- Each frame, the lift eases toward the target height with `VInterpTo`, the frame's duration, and `InterpSpeed`, keeping its X and Y.
- Within `ArriveTolerance` the lift lands exactly on the floor's height, so it stops cleanly and does not creep forever.
- Ticking is turned on by an accepted call and off by the landing, so a lift at rest costs nothing.
- The label always matches the state, and the floors are data in `FloorHeights`, not code.

# Alternative

A lift that moves at a constant speed, with `VInterpConstantTo`, takes a known time for any trip and feels mechanical, like a freight elevator. The ease-out version feels softer but a trip's length depends on the distance and the speed in a less obvious way. A curve asset or a timeline could soften both the start and the end of a trip, at the cost of an asset to author for every feel. Choose by how the lift should feel, then expose the number the designer will want to change.

# Parsons

```yaml
- id: lift-call
  prompt: Put CallTo in order.
  lines:
    - "bool ADojoM2Lift::CallTo(int32 FloorIndex)"
    - "{"
    - "	if (bMoving || !FloorHeights.IsValidIndex(FloorIndex) || FloorIndex == CurrentFloor) return false;"
    - "	TargetFloor = FloorIndex;"
    - "	bMoving = true;"
    - "	SetActorTickEnabled(true);"
    - "	RefreshLabel();"
    - "	return true;"
    - "}"
  distractors:
    - line: "	PrimaryActorTick.bCanEverTick = true;"
      mistake: Whether an actor can ever tick is decided in the constructor; to start and stop ticking later, call SetActorTickEnabled.
    - line: "	CurrentFloor = FloorIndex;"
      mistake: The lift has not arrived yet; the current floor changes on landing, or the label and the refusal rules would be wrong during the ride.
```
