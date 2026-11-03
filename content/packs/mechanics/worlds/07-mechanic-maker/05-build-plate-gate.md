---
id: m7-plate-gate
title: A gate that waits for its plates
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: [observer]
skills: [delegates, movement, planning]
terms: [adddynamic, interpolation, tick, clamp-min-meta, tarray, scene-component]
prerequisites: [m7-tuning-knobs, m7-signal-plate, m3-checkpoint, m3-scale-plate]
xp: 75
estimatedMinutes: 20
concepts:
  - A gate stands open only while its plates are held
  - A panel moves at a steady speed taken from two knobs, so a full trip always takes the time a designer set
  - Arrival events fire once at each end, so listeners never watch the panel
---

# Brief

When you place two signal plates and a plate gate that lists both, and press Play, the gate's panel stays down while the plates are empty, rises 300 cm in 0.8 s once a crate stands on each plate and announces that it is open, and sinks back the same way, announcing that it is closed, when either crate steps off.

The header is done, and in the source file the constructor, `BeginPlay`, and the three getters are written. Write `BindPlates`, `HandlePlateChanged`, `Tick`, and its helper `StepHeight`. Rules:

- `BeginPlay` calls `BindPlates`. It sends both the press and the release of every valid plate in `Plates` to `HandlePlateChanged`, never binding twice however often it runs, and hands each of those plates to `HandlePlateChanged` once, so the gate knows from the start whether it wants to be open. A director may add plates later and call it again.
- `HandlePlateChanged` keeps `bWantsOpen`, which `WantsOpen` returns and `Tick` follows. What you should see: with the two plates above, the panel stays down while only one crate is on a plate, rises once a crate stands on each, and sinks when either leaves; a gate with no plates never rises.
- Each frame, `Tick` moves the panel's relative height toward `OpenHeight` while the gate wants to be open, and toward 0 otherwise, at a steady `OpenHeight / OpenSeconds` cm per second, so a full trip takes `OpenSeconds`. It lands exactly on either end. `StepHeight` works out one frame of that movement and `Tick` applies it.
- On arriving fully open, `OnOpened` fires once. On arriving fully closed after having been fully open, `OnClosed` fires once.
- The two knobs keep the ranges written in the header, from the last card.

Dependency direction: the gate holds pointers to its plates and subscribes to them; the plates broadcast and know nothing about gates. Anything that cares about the gate listens to `OnOpened` and `OnClosed` instead of watching the panel.

This gate is the second piece of the Shrine Gate boss. It includes the signal plate from the last build, and its tests reuse World 3's runner and crate to stand on plates, and two parked crates to count announcements: each announcement is bound to a crate's `ReturnHome`, and `GetReturns` says how many times it fired.

Compiles against earlier quests: m7-signal-plate (`Quests/m7-signal-plate/DojoM7SignalPlate.h`); in the tests also m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`) and m3-scale-plate (`Quests/m3-scale-plate/DojoM3Crate.h`).

## See it in the editor

Place two `DojoM7SignalPlate` actors at X 0, Y -300 and X 0, Y 300, and a `DojoM7PlateGate` at X 600, Y 0. In the gate's Details, add both plates to Plates. Place two `DojoM3Crate` actors at X -600, Y -300 and X -600, Y 300. In the level Blueprint, on the 1 and 2 keys, add Set Actor Location for each crate onto its plate, and on the 3 and 4 keys send each back. Bind Print String to the gate's On Opened and On Closed in BeginPlay. Press Play, type `slomo 0.25` to slow time, and try the keys in different orders: watch when the panel moves and when the two messages print. Then the A/B: set Open Seconds to 2 on the gate and play again.

# Files

## DojoM7PlateGate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM7PlateGate.generated.h"

class ADojoM7SignalPlate;
class UBoxComponent;
class USceneComponent;

/** Broadcast when a gate's panel arrives fully open or fully closed. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM7OnGateMoved); // @explain: An event with no parameters: arriving open or closed is the whole message, and listeners know which gate they bound to.

/** A gate whose panel rises at a steady speed while every plate it is given is pressed and sinks back otherwise; it listens to its plates, which never know it exists. */
UCLASS()
class ADojoM7PlateGate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the frame as the root and the blocking panel inside it. */
	ADojoM7PlateGate();

	/** The gate's fixed frame; the panel moves inside it. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<USceneComponent> Frame;

	/** The solid panel that blocks the way and rises to open. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<UBoxComponent> Panel;

	/** The plates this gate needs. */
	UPROPERTY(EditAnywhere, Category = "Gate")
	TArray<TObjectPtr<ADojoM7SignalPlate>> Plates;

	/** How far the panel rises to open. */
	UPROPERTY(EditAnywhere, Category = "Gate", meta = (ClampMin = "0", Units = "cm"))
	float OpenHeight = 300.f;

	/** How long a full trip up or down takes. */
	UPROPERTY(EditAnywhere, Category = "Gate", meta = (ClampMin = "0.05", Units = "s")) // @explain: A designer cannot type a trip shorter than 0.05 s, so the speed, height over time, never divides by zero from Details.
	float OpenSeconds = 0.8f;

	/** Fires once each time the panel arrives fully open. */
	UPROPERTY(BlueprintAssignable, Category = "Gate")
	FDojoM7OnGateMoved OnOpened;

	/** Fires once each time the panel arrives fully closed after having been fully open. */
	UPROPERTY(BlueprintAssignable, Category = "Gate")
	FDojoM7OnGateMoved OnClosed;

	/** Listens to every valid plate in Plates, never twice, and decides whether the gate wants to be open now; safe to call again after adding plates. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void BindPlates();

	/** True while the panel is heading for, or standing at, fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool WantsOpen() const;

	/** How far open the panel is, from 0 closed to 1 fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	float GetOpenFraction() const;

	/** True while the panel stands fully open. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsOpen() const;

	/** Moves the panel toward open or closed at a steady speed and announces each arrival. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Listens to the plates placed in Details. */
	virtual void BeginPlay() override;

private:
	/** Runs when one of the gate's plates is pressed or released, and once for each plate when the plates are bound; decides whether the gate wants to be open. */
	UFUNCTION()
	void HandlePlateChanged(ADojoM7SignalPlate* ChangedPlate);

	/** The panel's height one frame later: a steady OpenHeight / OpenSeconds cm per second toward TargetHeight, landing exactly on it. */
	float StepHeight(float Height, float TargetHeight, float DeltaSeconds) const;

	/** Whether the panel is heading for fully open. */
	bool bWantsOpen = false;

	/** Set on arriving fully open and cleared on arriving closed, so OnClosed follows only a real opening. */
	bool bHasOpened = false;
};
```

## DojoM7PlateGate.cpp

```cpp
#include "DojoM7PlateGate.h"

#include "Components/BoxComponent.h"
#include "Components/SceneComponent.h"
#include "Quests/m7-signal-plate/DojoM7SignalPlate.h" // @explain: The signal plate lives in an earlier quest's folder, and only the module root is on the include path, so the include names that folder.

ADojoM7PlateGate::ADojoM7PlateGate()
{
	PrimaryActorTick.bCanEverTick = true;

	Frame = CreateDefaultSubobject<USceneComponent>(TEXT("Frame"));
	RootComponent = Frame;

	Panel = CreateDefaultSubobject<UBoxComponent>(TEXT("Panel"));
	Panel->SetupAttachment(Frame);
	Panel->SetBoxExtent(FVector(20.f, 150.f, 150.f));
	Panel->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	Panel->SetHiddenInGame(false);

	// A gate built over a plate must never count as something standing on it.
	Panel->SetGenerateOverlapEvents(false);
}

void ADojoM7PlateGate::BeginPlay()
{
	Super::BeginPlay();

	BindPlates();
}

void ADojoM7PlateGate::BindPlates()
{
	// Your code: send the press and the release of every valid plate in Plates to HandlePlateChanged, never binding twice.
	// Your code: also hand each of those plates to HandlePlateChanged once, so the gate decides whether it wants to be open now.
}

bool ADojoM7PlateGate::WantsOpen() const
{
	return bWantsOpen;
}

float ADojoM7PlateGate::GetOpenFraction() const
{
	if (OpenHeight <= 0.f) return 0.f;

	return static_cast<float>(Panel->GetRelativeLocation().Z) / OpenHeight; // @explain: The panel's height relative to the frame is how far it has risen, wherever the gate stands in the level.
}

bool ADojoM7PlateGate::IsOpen() const
{
	return GetOpenFraction() >= 1.f;
}

void ADojoM7PlateGate::HandlePlateChanged(ADojoM7SignalPlate* ChangedPlate)
{
	// Your code: decide whether the gate wants to be open now, and keep it in bWantsOpen.
}

void ADojoM7PlateGate::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// Your code: pick the target height, OpenHeight while the gate wants to be open and 0 otherwise; when the panel is already there, there is nothing to do.
	// Your code: set the panel's relative height to the next step from StepHeight.
	// Your code: on arriving open, announce it; on arriving closed after having been open, announce that.
}

float ADojoM7PlateGate::StepHeight(float Height, float TargetHeight, float DeltaSeconds) const
{
	// Your code: move Height toward TargetHeight at OpenHeight / OpenSeconds cm per second for this frame, and land exactly on TargetHeight once it is within a hair of it.
	return Height;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m7-plate-gate/DojoM7PlateGate.h"
#include "Quests/m7-signal-plate/DojoM7SignalPlate.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM7PlateGateTest
{
	/** Frames in 0.8 s at 60 frames a second, plus one: a full trip with the default knobs. */
	constexpr int32 FullTripFrames = 49;

	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Spawns a gate far from the plates with the plates and knobs a designer would set in Details. */
	ADojoM7PlateGate* PlaceGate(FDojoTestWorld& TestWorld, const TArray<ADojoM7SignalPlate*>& GatePlates, float Height = 300.f, float Seconds = 0.8f)
	{
		const FTransform Spot(FVector(0.0, 5000.0, 0.0));
		ADojoM7PlateGate* Gate = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM7PlateGate>(ADojoM7PlateGate::StaticClass(), Spot);
		for (ADojoM7SignalPlate* GatePlate : GatePlates) Gate->Plates.Add(GatePlate);
		Gate->OpenHeight = Height;
		Gate->OpenSeconds = Seconds;
		Gate->FinishSpawning(Spot);
		return Gate;
	}

	/** Parks a crate far away to serve as a counter; a test binds an announcement to its ReturnHome, so its return count is how often the announcement fired. */
	ADojoM3Crate* MakeCounter(FDojoTestWorld& TestWorld, double Y)
	{
		return SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, Y, 0.0));
	}

	/** The panel's height above the frame. */
	double PanelHeight(const ADojoM7PlateGate* Gate)
	{
		return Gate->Panel->GetRelativeLocation().Z;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_PlateGate_WaitsForEveryPlate, "Dojo.M7.PlateGate.WaitsForEveryPlate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Presses one of a gate's two plates and checks it stays shut, then presses the other and checks the steady rise and one OnOpened. */
bool FDojo_M7_PlateGate_WaitsForEveryPlate::RunTest(const FString& Parameters)
{
	using namespace DojoM7PlateGateTest;

	FDojoTestWorld TestWorld;

	ADojoM7SignalPlate* Left = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM7SignalPlate* Right = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 2000.0, 0.0));
	ADojoM7PlateGate* Gate = PlaceGate(TestWorld, { Left, Right });
	ADojoM3Crate* First = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Crate* Second = SpawnAt<ADojoM3Crate>(TestWorld, FVector(300.0, -1000.0, 0.0));
	ADojoM3Crate* Opened = MakeCounter(TestWorld, -6000.0);
	ADojoM3Crate* Closed = MakeCounter(TestWorld, -7000.0);
	if (!TestNotNull(TEXT("Plates, gate, and crates spawned"), Closed) || !Opened || !Second || !First || !Gate || !Right || !Left) return false;

	Gate->OnOpened.AddDynamic(Opened, &ADojoM3Crate::ReturnHome);
	Gate->OnClosed.AddDynamic(Closed, &ADojoM3Crate::ReturnHome);

	TestFalse(TEXT("With both plates empty the gate does not want to open"), Gate->WantsOpen());

	First->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	TestWorld.Tick(90);
	TestFalse(TEXT("With two plates and only one pressed, the gate does not want to open"), Gate->WantsOpen());
	TestEqual(TEXT("With two plates and only one pressed, the gate stays shut after 1.5 s"), Gate->GetOpenFraction(), 0.f);
	TestEqual(TEXT("and nothing was announced"), Opened->GetReturns() + Closed->GetReturns(), 0);

	Second->SetActorLocation(FVector(0.0, 2000.0, 0.0));
	TestTrue(TEXT("With both plates pressed the gate wants to open"), Gate->WantsOpen());

	TestWorld.Tick(24);
	TestTrue(TEXT("Halfway through 0.8 s the panel is about halfway up"), Gate->GetOpenFraction() > 0.4f && Gate->GetOpenFraction() < 0.6f);
	TestFalse(TEXT("and not open yet"), Gate->IsOpen());
	TestEqual(TEXT("so OnOpened has not fired"), Opened->GetReturns(), 0);

	TestWorld.Tick(FullTripFrames - 24);
	TestTrue(TEXT("0.8 s plus a frame after both plates were pressed, the gate is fully open"), Gate->IsOpen());
	TestEqual(TEXT("The panel stands exactly 300 cm up"), PanelHeight(Gate), 300.0, 0.001);
	TestEqual(TEXT("OnOpened fired once"), Opened->GetReturns(), 1);

	TestWorld.Tick(60);
	TestEqual(TEXT("Standing open announces nothing more"), Opened->GetReturns(), 1);
	TestEqual(TEXT("and nothing was closed"), Closed->GetReturns(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_PlateGate_SinksWhenAPlateIsLeft, "Dojo.M7.PlateGate.SinksWhenAPlateIsLeft", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens a gate, lets a runner step off one plate, and checks the panel sinks in 0.8 s and OnClosed fires once, and only after a real opening. */
bool FDojo_M7_PlateGate_SinksWhenAPlateIsLeft::RunTest(const FString& Parameters)
{
	using namespace DojoM7PlateGateTest;

	FDojoTestWorld TestWorld;

	ADojoM7SignalPlate* Left = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM7SignalPlate* Right = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 2000.0, 0.0));
	ADojoM7PlateGate* Gate = PlaceGate(TestWorld, { Left, Right });
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(300.0, -1000.0, 0.0));
	ADojoM3Crate* Opened = MakeCounter(TestWorld, -6000.0);
	ADojoM3Crate* Closed = MakeCounter(TestWorld, -7000.0);
	if (!TestNotNull(TEXT("Plates, gate, crate, and runner spawned"), Closed) || !Opened || !Runner || !Crate || !Gate || !Right || !Left) return false;

	Gate->OnOpened.AddDynamic(Opened, &ADojoM3Crate::ReturnHome);
	Gate->OnClosed.AddDynamic(Closed, &ADojoM3Crate::ReturnHome);

	Crate->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	Runner->SetActorLocation(FVector(0.0, 2000.0, 0.0));
	TestWorld.Tick(FullTripFrames);
	TestTrue(TEXT("A crate and a runner on the two plates open the gate"), Gate->IsOpen());
	TestEqual(TEXT("OnOpened fired once"), Opened->GetReturns(), 1);

	Runner->SetActorLocation(FVector(300.0, -1000.0, 0.0));
	TestFalse(TEXT("When the runner steps off, the gate no longer wants to be open"), Gate->WantsOpen());

	TestWorld.Tick(40);
	TestTrue(TEXT("After 40 frames the panel is still on its way down"), Gate->GetOpenFraction() > 0.f && Gate->GetOpenFraction() < 0.5f);
	TestEqual(TEXT("so OnClosed has not fired"), Closed->GetReturns(), 0);

	TestWorld.Tick(FullTripFrames - 40);
	TestEqual(TEXT("0.8 s plus a frame later the panel is fully down"), PanelHeight(Gate), 0.0, 0.001);
	TestEqual(TEXT("OnClosed fired once"), Closed->GetReturns(), 1);

	Runner->SetActorLocation(FVector(0.0, 2000.0, 0.0));
	TestWorld.Tick(24);
	Runner->SetActorLocation(FVector(300.0, -1000.0, 0.0));
	TestWorld.Tick(FullTripFrames);
	TestEqual(TEXT("A panel that turned back halfway is down again"), PanelHeight(Gate), 0.0, 0.001);
	TestEqual(TEXT("but it never opened, so OnOpened is still at one"), Opened->GetReturns(), 1);
	TestEqual(TEXT("and OnClosed did not fire again"), Closed->GetReturns(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_PlateGate_NeedsAtLeastOnePlate, "Dojo.M7.PlateGate.NeedsAtLeastOnePlate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks a gate with no plates, or only an empty slot, never opens, and a plate added after play and bound with BindPlates works. */
bool FDojo_M7_PlateGate_NeedsAtLeastOnePlate::RunTest(const FString& Parameters)
{
	using namespace DojoM7PlateGateTest;

	FDojoTestWorld TestWorld;

	ADojoM7PlateGate* Bare = PlaceGate(TestWorld, {});
	ADojoM7PlateGate* EmptySlot = PlaceGate(TestWorld, { nullptr });
	ADojoM7SignalPlate* Plate = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Gates, plate, and crate spawned"), Crate) || !Plate || !EmptySlot || !Bare) return false;

	TestWorld.Tick(90);
	TestFalse(TEXT("A gate with no plates does not want to open"), Bare->WantsOpen());
	TestEqual(TEXT("and stays shut"), Bare->GetOpenFraction(), 0.f);
	TestFalse(TEXT("A gate whose only slot is empty does not want to open"), EmptySlot->WantsOpen());
	TestEqual(TEXT("and stays shut"), EmptySlot->GetOpenFraction(), 0.f);

	Crate->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	EmptySlot->Plates.Add(Plate);
	EmptySlot->BindPlates();
	EmptySlot->BindPlates();
	TestTrue(TEXT("After a pressed plate is added and bound, the gate wants to open, skipping the empty slot"), EmptySlot->WantsOpen());
	TestTrue(TEXT("The gate listens to the new plate's press"), Plate->OnPlatePressed.Contains(EmptySlot, TEXT("HandlePlateChanged")));
	TestTrue(TEXT("and to its release"), Plate->OnPlateReleased.Contains(EmptySlot, TEXT("HandlePlateChanged")));

	TestWorld.Tick(FullTripFrames);
	TestTrue(TEXT("and opens"), EmptySlot->IsOpen());

	Crate->SetActorLocation(FVector(0.0, -1000.0, 0.0));
	TestFalse(TEXT("When the crate leaves, the late plate's release reaches the gate"), EmptySlot->WantsOpen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M7_PlateGate_KnobsSetTheTrip, "Dojo.M7.PlateGate.KnobsSetTheTrip", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Gives a gate 200 cm and 0.4 s and checks the trip follows the knobs, and that the knobs carry their ranges and units. */
bool FDojo_M7_PlateGate_KnobsSetTheTrip::RunTest(const FString& Parameters)
{
	using namespace DojoM7PlateGateTest;

	FDojoTestWorld TestWorld;

	ADojoM7SignalPlate* Plate = SpawnAt<ADojoM7SignalPlate>(TestWorld, FVector(0.0, 1000.0, 0.0));
	ADojoM7PlateGate* Gate = PlaceGate(TestWorld, { Plate }, 200.f, 0.4f);
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plate, gate, and crate spawned"), Crate) || !Gate || !Plate) return false;

	Crate->SetActorLocation(FVector(0.0, 1000.0, 0.0));
	TestWorld.Tick(20);
	TestFalse(TEXT("With 0.4 s set, the gate is not open after a third of a second"), Gate->IsOpen());

	TestWorld.Tick(5);
	TestTrue(TEXT("but is open 0.4 s plus a frame after the press"), Gate->IsOpen());
	TestEqual(TEXT("at exactly the 200 cm set in OpenHeight"), PanelHeight(Gate), 200.0, 0.001);

#if WITH_METADATA
	const FProperty* Height = ADojoM7PlateGate::StaticClass()->FindPropertyByName(TEXT("OpenHeight"));
	const FProperty* Seconds = ADojoM7PlateGate::StaticClass()->FindPropertyByName(TEXT("OpenSeconds"));
	if (!TestNotNull(TEXT("OpenHeight is a UPROPERTY"), Height) || !TestNotNull(TEXT("OpenSeconds is a UPROPERTY"), Seconds)) return false;

	TestEqual(TEXT("OpenHeight cannot be typed below 0"), Height->GetMetaData(TEXT("ClampMin")), FString(TEXT("0")));
	TestEqual(TEXT("OpenHeight shows centimetres"), Height->GetMetaData(TEXT("Units")), FString(TEXT("cm")));
	TestEqual(TEXT("OpenSeconds cannot be typed below 0.05"), Seconds->GetMetaData(TEXT("ClampMin")), FString(TEXT("0.05")));
	TestEqual(TEXT("OpenSeconds shows seconds"), Seconds->GetMetaData(TEXT("Units")), FString(TEXT("s")));
#endif

	return true;
}

#endif
```

# Hints

- Four small jobs: `BindPlates` connects the plates, the handler runs whenever a plate changes, `StepHeight` works out one frame of movement, and `Tick` moves the panel toward where `bWantsOpen` points. `Tick` never looks at a plate.
- The handler is told which plate changed, but the plate it receives is only one of the gate's plates, and the gate's answer is about the gate. `AddUniqueDynamic` ignores a binding that is already there, and one handler can be bound to both events because both carry the same one parameter. `FMath::FInterpConstantTo` moves a value toward a target by at most speed times the frame's duration, and the speed here is the height over the time.
- With two plates and one pressed, the plate the handler receives says pressed while the other plate is still empty, so the answer has to come from every entry in `Plates`, skipping empty slots with `IsValid`. The panel's height is the Z of `GetRelativeLocation` on the panel, written back with `SetRelativeLocation`; `FMath::IsNearlyEqual` decides that the panel has arrived. All of them come through `CoreMinimal.h` and `Components/SceneComponent.h`.

# Rubric

- Every valid plate's press and release reach one UFUNCTION handler through `AddUniqueDynamic`, and calling `BindPlates` again binds nothing twice.
- The gate wants to be open only while it has at least one plate and all of its plates are pressed.
- The panel moves at `OpenHeight / OpenSeconds` cm per second in both directions and lands exactly on each end.
- `OnOpened` fires once on arriving open, and `OnClosed` once on arriving closed after a real opening.
- No number in `Tick` is fixed: the height and the time come from the knobs, which keep their ranges and units.
- The gate holds and subscribes to its plates; the plates hold no pointer to the gate.

# Alternative

A natural first handler lets the plate that just spoke decide: it opens the gate when that plate is pressed and closes it when that plate is released. With one plate that is right, which is why it feels finished; with two, one crate opens the gate alone, and the test with one of two plates pressed catches it. The plate passed to the handler says who changed, not what the whole set looks like, so the handler should ask every plate again, which is what the reference handler does with its loop. Another fix keeps a count of pressed plates, adding one on a press and taking one on a release; it avoids the loop, but the count goes wrong when a plate starts pressed before the gate binds, or when a plate is bound twice, and a loop over a handful of plates costs nothing. A gate that checks its plates in `Tick` would also be correct, and needs no binding at all, at the cost of asking every plate on every frame even while nothing moves. The gate is an observer of several subjects at once, the shape a puzzle director will use in the boss.

# Parsons

```yaml
- id: gate-step
  prompt: Put StepHeight in order.
  lines:
    - "float ADojoM7PlateGate::StepHeight(float Height, float TargetHeight, float DeltaSeconds) const"
    - "{"
    - "	const float Speed = OpenHeight / FMath::Max(OpenSeconds, 0.05f);"
    - "	const float NextHeight = FMath::FInterpConstantTo(Height, TargetHeight, DeltaSeconds, Speed);"
    - "	if (FMath::IsNearlyEqual(NextHeight, TargetHeight, 0.01f)) return TargetHeight;"
    - "	return NextHeight;"
    - "}"
  distractors:
    - line: "	const float NextHeight = FMath::FInterpTo(Height, TargetHeight, DeltaSeconds, Speed);"
      mistake: FInterpTo eases out and slows as it nears the target, so the trip no longer takes OpenSeconds; the constant version moves a fixed number of centimetres per second.
    - line: "	const float Speed = OpenHeight * OpenSeconds;"
      mistake: A speed is distance over time; multiplying makes a longer OpenSeconds give a faster panel.
```
