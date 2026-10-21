---
id: f4-carrier
title: A carrier that takes a dummy wherever it goes
order: 5
kind: build
scaffold: faded
difficulty: 2
patterns: []
skills: [components]
terms: [scene-component, attach-to-component, root-component, isvalid]
prerequisites: [f4-hit-counter, f1-training-dummy]
xp: 60
estimatedMinutes: 15
concepts:
  - A scene component as a mount point
  - Attaching snaps cargo on; detaching keeps it where it is
---

# Brief

When you press Play and the carrier picks up a training dummy, the dummy jumps onto the carrier's mount, 150 units above it, and rides along as the carrier moves; after a drop, the dummy stays where it was let go.

The header and the constructor are written for you: a root and a `Mount` scene component 150 units above it. Fill in:

1. `Carry`: refuse when already carrying, when the cargo is not valid, or when it is the carrier itself; otherwise attach the cargo to the mount so it snaps onto it, and remember it.
2. `Drop`: when carrying, detach the cargo where it is in the world now, forget it, and return it; otherwise return nullptr.

Dependency direction: the carrier holds its cargo; the cargo does not know it is being carried, so any actor works, including your World 1 dummy.

Compiles against earlier quests: f1-training-dummy, in the tests only (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`).

## See it in the editor

Place a `DojoF4Carrier` and a `DojoF1TrainingDummy` a few meters apart. In the level Blueprint, on BeginPlay, call Carry on the carrier with the dummy. Press Play: the dummy appears above the carrier. Eject with F8 and drag the carrier around: the dummy follows. Call Drop from a key event and move the carrier again: the dummy stays put.

# Files

## DojoF4Carrier.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF4Carrier.generated.h"

class USceneComponent;

/** Carries one actor at a time on a mount point above itself, so the cargo moves wherever the carrier goes. */
UCLASS()
class ADojoF4Carrier : public AActor
{
	GENERATED_BODY()

public:
	/** Builds the root and the mount 150 units above it, and turns ticking off. */
	ADojoF4Carrier();

	/** Where cargo rides, relative to the carrier. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Carrier")
	TObjectPtr<USceneComponent> Mount;

	/** Attaches Cargo to the mount, snapped to it; refuses when already carrying, when Cargo is invalid, or when it is the carrier itself. */
	UFUNCTION(BlueprintCallable, Category = "Carrier")
	bool Carry(AActor* NewCargo);

	/** Detaches the cargo where it is now and returns it; nullptr when carrying nothing. */
	UFUNCTION(BlueprintCallable, Category = "Carrier")
	AActor* Drop();

	/** True while an actor rides on the mount. */
	UFUNCTION(BlueprintPure, Category = "Carrier")
	bool IsCarrying() const;

	/** The actor on the mount, or nullptr. */
	UFUNCTION(BlueprintPure, Category = "Carrier")
	AActor* GetCargo() const;

private:
	UPROPERTY(VisibleInstanceOnly, Category = "Carrier")
	TObjectPtr<AActor> Cargo;
};
```

## DojoF4Carrier.cpp

```cpp
#include "DojoF4Carrier.h"

#include "Components/SceneComponent.h"

ADojoF4Carrier::ADojoF4Carrier()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	Mount = CreateDefaultSubobject<USceneComponent>(TEXT("Mount"));
	Mount->SetupAttachment(RootComponent); // @explain: In the constructor, SetupAttachment records the mount's parent so every carrier is built with the mount under its root.
	Mount->SetRelativeLocation(FVector(0.f, 0.f, 150.f)); // @explain: Relative to the root, so the mount stays 150 above the carrier wherever it is placed.
}

bool ADojoF4Carrier::Carry(AActor* NewCargo)
{
	// Your code: refuse when already carrying, when NewCargo is not valid, or when it is this carrier.
	// Your code: attach NewCargo to the mount so it snaps onto it, remember it, and return true.
	return false;
}

AActor* ADojoF4Carrier::Drop()
{
	// Your code: return nullptr when carrying nothing.
	// Your code: detach the cargo where it is in the world, forget it, and return it.
	return nullptr;
}

bool ADojoF4Carrier::IsCarrying() const
{
	return IsValid(Cargo);
}

AActor* ADojoF4Carrier::GetCargo() const
{
	return IsCarrying() ? Cargo.Get() : nullptr;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f4-carrier/DojoF4Carrier.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F4_Carrier_CargoRidesAndStays, "Dojo.F4.Carrier.CargoRidesAndStays", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Carries a World 1 dummy, moves and turns the carrier, drops the dummy, and moves again. */
bool FDojo_F4_Carrier_CargoRidesAndStays::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF4Carrier* Carrier = TestWorld.SpawnActor<ADojoF4Carrier>();
	ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	if (!TestNotNull(TEXT("Carrier spawned"), Carrier) || !TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;

	Dummy->SetActorLocation(FVector(300.f, 0.f, 0.f));

	TestFalse(TEXT("Cannot carry nothing"), Carrier->Carry(nullptr));
	TestFalse(TEXT("Cannot carry itself"), Carrier->Carry(Carrier));
	TestTrue(TEXT("Picks up the dummy"), Carrier->Carry(Dummy));
	TestTrue(TEXT("Now carrying"), Carrier->IsCarrying());
	TestTrue(TEXT("The dummy is attached to the carrier"), Dummy->GetAttachParentActor() == Carrier);
	TestEqual(TEXT("Snapped onto the mount, 150 above"), Dummy->GetActorLocation(), FVector(0.f, 0.f, 150.f));

	ADojoF1TrainingDummy* Second = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	TestFalse(TEXT("One at a time"), Carrier->Carry(Second));

	Carrier->SetActorLocation(FVector(500.f, 0.f, 0.f));
	TestEqual(TEXT("The cargo rides along"), Dummy->GetActorLocation(), FVector(500.f, 0.f, 150.f));

	Carrier->SetActorRotation(FRotator(0.f, 90.f, 0.f));
	TestEqual(TEXT("The cargo turns with the carrier"), Dummy->GetActorRotation().Yaw, 90.0, 0.01);
	TestEqual(TEXT("A mount straight above stays above when turning"), Dummy->GetActorLocation(), FVector(500.f, 0.f, 150.f));

	TestTrue(TEXT("Drop returns the dummy"), Carrier->Drop() == Dummy);
	TestFalse(TEXT("Carrying nothing after the drop"), Carrier->IsCarrying());
	TestNull(TEXT("No parent after the drop"), Dummy->GetAttachParentActor());

	Carrier->SetActorLocation(FVector(-500.f, 0.f, 0.f));
	TestEqual(TEXT("A dropped dummy stays where it was dropped"), Dummy->GetActorLocation(), FVector(500.f, 0.f, 150.f));
	TestNull(TEXT("A second drop has nothing to drop"), Carrier->Drop());

	return true;
}

#endif
```

# Hints

- Each function is a guard, one engine call, and a change to the Cargo member; write the guard first.
- The actor has a call to attach itself to a component with a set of rules, and one to detach itself; the rules come as ready-made constants for snapping onto the target and for keeping the world position.
- `AActor::AttachToComponent` and `AActor::DetachFromActor` are in `GameFramework/Actor.h`; `FAttachmentTransformRules` and `FDetachmentTransformRules` are in `Engine/EngineTypes.h`.

# Rubric

- Carry refuses when already carrying, for invalid cargo, and for the carrier itself.
- Carry attaches with a snap rule so the cargo lands on the mount, not where it was.
- Drop detaches keeping the world transform, so the cargo stays where it was let go.
- The Cargo member is the one source of truth for IsCarrying and GetCargo.
- The carrier holds the cargo; the cargo needs no code of its own, so the World 1 dummy works unchanged.

# Alternative

The carrier could move the cargo itself, setting its location to the mount's every frame in Tick. That works and is sometimes needed for a smoothed or delayed follow, but it costs a tick on every carrier, lags a frame behind, and fights any physics on the cargo. Attachment makes the engine do the following through the transform hierarchy, for free and in the same frame.

# Parsons

```yaml
- id: carrier-carry
  prompt: Put Carry in order.
  lines:
    - "bool ADojoF4Carrier::Carry(AActor* NewCargo)"
    - "{"
    - "	if (IsCarrying() || !IsValid(NewCargo) || NewCargo == this) return false;"
    - "	NewCargo->AttachToComponent(Mount, FAttachmentTransformRules::SnapToTargetNotIncludingScale);"
    - "	Cargo = NewCargo;"
    - "	return true;"
    - "}"
  distractors:
    - line: "	NewCargo->AttachToComponent(Mount, FAttachmentTransformRules::KeepWorldTransform);"
      mistake: KeepWorldTransform attaches the cargo but leaves it where it was instead of putting it on the mount.
```
