---
id: m8-exit-gate
title: An exit that needs power
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: [state]
skills: [collision, delegates]
terms: [get-overlapping-actors, overlap-event, box-component, collision-response, adddynamic]
prerequisites: [m8-fuse-box, m3-checkpoint]
xp: 80
estimatedMinutes: 22
concepts:
  - A zone that reacts to who enters only while it has power, and also to who was already inside when it got power
  - One decision function that every way in goes through
---

# Brief

When you place an exit gate and walk a runner into its zone with the power off, nothing happens; switch the power on while the runner stands there and it escapes at once; step out and back in and the gate announces no second escape.

Most of `ADojoM8ExitGate` is written for you. Fill the two gaps:

1. `ADojoM8ExitGate::SetPowered`: remember the new power state, and when the power comes on, let out every pawn already inside the zone.
2. `ADojoM8ExitGate::LetOut`: do nothing without power, after an escape, or for an invalid pawn; otherwise remember the escape and announce the pawn once.

Dependency direction: the gate announces and listens to nothing about fuses or clocks; whoever powers it calls `SetPowered`, and whoever wants to know subscribes to `OnEscaped`. `DojoM8EscapeLog` is a listener provided for the tests.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This gate is the third piece of the Blackout Escape boss.

## See it in the editor

Place a `DojoM8ExitGate` and a `DojoM8EscapeLog` near the player start; the gate's zone is an invisible box, so switch on Show, then Collision in the viewport to see it. Add references to both in the level Blueprint, call Listen on the log with the gate on BeginPlay, and on the 1 key call Set Powered with true on the gate and print the log's Get Escape Count; on the 2 key print Get Escape Count without changing anything. Press Play, walk the player pawn into the zone, and press 2: it prints 0. Press 1 while standing in the zone and it prints 1; walk out and back in, press 2, and it still prints 1.

# Files

## DojoM8ExitGate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8ExitGate.generated.h"

class UBoxComponent;

/** Broadcast once, when a pawn reaches the open exit. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FDojoM8OnEscaped, AActor*, Escapee);

/** The way out: a zone that lets a pawn escape only once the gate has power; a pawn already standing in it when the power comes on escapes at once. */
UCLASS()
class ADojoM8ExitGate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the zone as the root and turns ticking off. */
	ADojoM8ExitGate();

	/** The area that feels pawns: it overlaps the Pawn channel and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Exit Gate")
	TObjectPtr<UBoxComponent> Zone;

	/** Fires once, with the pawn that got out. */
	UPROPERTY(BlueprintAssignable, Category = "Exit Gate")
	FDojoM8OnEscaped OnEscaped;

	/** Turns the power on or off; turning it on lets out a pawn that is already inside the zone. */
	UFUNCTION(BlueprintCallable, Category = "Exit Gate")
	void SetPowered(bool bNewPowered);

	/** Powers the gate down and forgets that anyone escaped, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Exit Gate")
	void StartOver();

	/** True while the gate has power. */
	UFUNCTION(BlueprintPure, Category = "Exit Gate")
	bool IsPowered() const;

	/** True once a pawn has escaped through the gate. */
	UFUNCTION(BlueprintPure, Category = "Exit Gate")
	bool HasEscaped() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Lets one pawn out if the gate has power and nobody has escaped yet. */
	void LetOut(AActor* Candidate);

	bool bPowered = false;

	bool bEscaped = false;
};
```

## DojoM8ExitGate.cpp

```cpp
#include "DojoM8ExitGate.h"

#include "Components/BoxComponent.h"

ADojoM8ExitGate::ADojoM8ExitGate()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(150.f, 100.f, 150.f));
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RootComponent = Zone;
}

void ADojoM8ExitGate::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM8ExitGate::HandleZoneBeginOverlap);
}

void ADojoM8ExitGate::SetPowered(bool bNewPowered)
{
	// Your code: remember the new power state.
	// Your code: when the power comes on, let out every pawn that is already inside the zone.
}

void ADojoM8ExitGate::StartOver()
{
	bPowered = false;
	bEscaped = false;
}

bool ADojoM8ExitGate::IsPowered() const
{
	return bPowered;
}

bool ADojoM8ExitGate::HasEscaped() const
{
	return bEscaped;
}

void ADojoM8ExitGate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	LetOut(OtherActor);
}

void ADojoM8ExitGate::LetOut(AActor* Candidate)
{
	// Your code: do nothing without power, after an escape, or for an invalid pawn.
	// Your code: otherwise remember the escape and announce the pawn once.
}
```

## DojoM8EscapeLog.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8EscapeLog.generated.h"

class ADojoM8ExitGate;

/** A listener for tests and Blueprints: counts how often a gate announced an escape and remembers who escaped. */
UCLASS()
class ADojoM8EscapeLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8EscapeLog();

	/** Starts counting the gate's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Escape Log")
	void Listen(ADojoM8ExitGate* Gate);

	/** How many times the gate announced an escape. */
	UFUNCTION(BlueprintPure, Category = "Escape Log")
	int32 GetEscapeCount() const;

	/** The pawn named in the last announcement, or null. */
	UFUNCTION(BlueprintPure, Category = "Escape Log")
	AActor* GetLastEscapee() const;

private:
	/** Adds one to the count and remembers the pawn. */
	UFUNCTION()
	void HandleEscaped(AActor* Escapee);

	int32 EscapeCount = 0;

	TWeakObjectPtr<AActor> LastEscapee;
};
```

## DojoM8EscapeLog.cpp

```cpp
#include "DojoM8EscapeLog.h"

#include "DojoM8ExitGate.h"

ADojoM8EscapeLog::ADojoM8EscapeLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8EscapeLog::Listen(ADojoM8ExitGate* Gate)
{
	if (!IsValid(Gate)) return;

	Gate->OnEscaped.AddUniqueDynamic(this, &ADojoM8EscapeLog::HandleEscaped);
}

int32 ADojoM8EscapeLog::GetEscapeCount() const
{
	return EscapeCount;
}

AActor* ADojoM8EscapeLog::GetLastEscapee() const
{
	return LastEscapee.Get();
}

void ADojoM8EscapeLog::HandleEscaped(AActor* Escapee)
{
	EscapeCount++;
	LastEscapee = Escapee;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m8-exit-gate/DojoM8EscapeLog.h"
#include "Quests/m8-exit-gate/DojoM8ExitGate.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM8ExitGateTest
{
	/** The gate's spot, and a spot inside and outside its zone. */
	const FVector GateSpot(0.0, 1200.0, 0.0);
	const FVector OutsideSpot(0.0, 0.0, 0.0);

	/** A gate, a runner, and a log that listens to the gate. */
	struct FGateScene
	{
		ADojoM8ExitGate* Gate = nullptr;
		ADojoM3Runner* Runner = nullptr;
		ADojoM8EscapeLog* Log = nullptr;
	};

	/** Builds a gate at its spot with a runner outside it. */
	FGateScene MakeScene(FDojoTestWorld& TestWorld)
	{
		FGateScene Scene;
		Scene.Gate = TestWorld.GetWorld()->SpawnActor<ADojoM8ExitGate>(GateSpot, FRotator::ZeroRotator);
		Scene.Runner = TestWorld.GetWorld()->SpawnActor<ADojoM3Runner>(OutsideSpot, FRotator::ZeroRotator);
		Scene.Log = TestWorld.SpawnActor<ADojoM8EscapeLog>();
		if (Scene.Log) Scene.Log->Listen(Scene.Gate);
		return Scene;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_ExitGate_PowerLetsAPawnOut, "Dojo.M8.ExitGate.PowerLetsAPawnOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a runner in with the power off, out, and in again with it on, and checks only the second visit lets it out, once. */
bool FDojo_M8_ExitGate_PowerLetsAPawnOut::RunTest(const FString& Parameters)
{
	using namespace DojoM8ExitGateTest;

	FDojoTestWorld TestWorld;
	FGateScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Gate, runner, and log made"), Scene.Log) || !Scene.Gate || !Scene.Runner) return false;

	TestFalse(TEXT("A new gate has no power"), Scene.Gate->IsPowered());

	Scene.Runner->SetActorLocation(GateSpot);
	TestEqual(TEXT("Without power nobody gets out"), Scene.Log->GetEscapeCount(), 0);
	TestFalse(TEXT("and the gate remembers no escape"), Scene.Gate->HasEscaped());

	Scene.Runner->SetActorLocation(OutsideSpot);
	Scene.Gate->SetPowered(true);
	TestEqual(TEXT("Powering the gate with nobody inside lets nobody out"), Scene.Log->GetEscapeCount(), 0);

	Scene.Runner->SetActorLocation(GateSpot);
	TestEqual(TEXT("With power, a runner walking in gets out"), Scene.Log->GetEscapeCount(), 1);
	TestTrue(TEXT("and the log names that runner"), Scene.Log->GetLastEscapee() == Scene.Runner);
	TestTrue(TEXT("and the gate remembers the escape"), Scene.Gate->HasEscaped());

	Scene.Runner->SetActorLocation(OutsideSpot);
	Scene.Runner->SetActorLocation(GateSpot);
	TestEqual(TEXT("Walking in again does not announce a second escape"), Scene.Log->GetEscapeCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_ExitGate_ALatePowerStillLetsOutAWaitingPawn, "Dojo.M8.ExitGate.ALatePowerStillLetsOutAWaitingPawn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Stands a runner in the zone before the power comes on, then switches it on. */
bool FDojo_M8_ExitGate_ALatePowerStillLetsOutAWaitingPawn::RunTest(const FString& Parameters)
{
	using namespace DojoM8ExitGateTest;

	FDojoTestWorld TestWorld;
	FGateScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Gate, runner, and log made"), Scene.Log) || !Scene.Gate || !Scene.Runner) return false;

	Scene.Runner->SetActorLocation(GateSpot);
	TestEqual(TEXT("Nobody gets out before the power"), Scene.Log->GetEscapeCount(), 0);

	Scene.Gate->SetPowered(true);
	TestEqual(TEXT("Switching the power on lets out the runner already standing there"), Scene.Log->GetEscapeCount(), 1);
	TestTrue(TEXT("and it is the runner"), Scene.Log->GetLastEscapee() == Scene.Runner);

	Scene.Gate->SetPowered(true);
	TestEqual(TEXT("Switching it on again does not announce again"), Scene.Log->GetEscapeCount(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_ExitGate_PowerOffAndResetStartOver, "Dojo.M8.ExitGate.PowerOffAndResetStartOver", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Switches the power off again and checks nobody gets out, then resets the gate and lets the same runner out a second time. */
bool FDojo_M8_ExitGate_PowerOffAndResetStartOver::RunTest(const FString& Parameters)
{
	using namespace DojoM8ExitGateTest;

	FDojoTestWorld TestWorld;
	FGateScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Gate, runner, and log made"), Scene.Log) || !Scene.Gate || !Scene.Runner) return false;

	Scene.Gate->SetPowered(true);
	Scene.Gate->SetPowered(false);
	TestFalse(TEXT("The power can be switched off"), Scene.Gate->IsPowered());

	Scene.Runner->SetActorLocation(GateSpot);
	TestEqual(TEXT("An unpowered gate lets nobody out"), Scene.Log->GetEscapeCount(), 0);

	Scene.Gate->SetPowered(true);
	TestEqual(TEXT("Power back on, the waiting runner is out"), Scene.Log->GetEscapeCount(), 1);

	Scene.Gate->StartOver();
	TestFalse(TEXT("A reset removes the power"), Scene.Gate->IsPowered());
	TestFalse(TEXT("and the memory of the escape"), Scene.Gate->HasEscaped());

	Scene.Gate->SetPowered(true);
	TestEqual(TEXT("After a reset the runner still standing there gets out again"), Scene.Log->GetEscapeCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_ExitGate_OnlyPawnsGetOut, "Dojo.M8.ExitGate.OnlyPawnsGetOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves a solid prop into a powered zone and checks it is not let out. */
bool FDojo_M8_ExitGate_OnlyPawnsGetOut::RunTest(const FString& Parameters)
{
	using namespace DojoM8ExitGateTest;

	FDojoTestWorld TestWorld;
	FGateScene Scene = MakeScene(TestWorld);
	if (!TestNotNull(TEXT("Gate, runner, and log made"), Scene.Log) || !Scene.Gate) return false;

	ADojoTestActor* Holder = TestWorld.SpawnActor<ADojoTestActor>();
	USphereComponent* Crate = TestWorld.AddComponent<USphereComponent>(Holder);
	Crate->SetSphereRadius(40.f);
	Crate->SetCollisionProfileName(TEXT("BlockAll"));
	Crate->SetWorldLocation(FVector(0.0, 0.0, -5000.0));

	Scene.Gate->SetPowered(true);
	Crate->SetWorldLocation(GateSpot);
	TestEqual(TEXT("A crate in a powered exit is not an escape"), Scene.Log->GetEscapeCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_ExitGate_BlueprintsCanListen, "Dojo.M8.ExitGate.BlueprintsCanListen", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that Blueprints can bind to OnEscaped. */
bool FDojo_M8_ExitGate_BlueprintsCanListen::RunTest(const FString& Parameters)
{
	const FProperty* OnEscaped = ADojoM8ExitGate::StaticClass()->FindPropertyByName(TEXT("OnEscaped"));
	if (!TestNotNull(TEXT("OnEscaped is a UPROPERTY"), OnEscaped)) return false;

	TestTrue(TEXT("OnEscaped is a multicast delegate"), OnEscaped->IsA<FMulticastDelegateProperty>());
	TestTrue(TEXT("Blueprints can bind to it"), OnEscaped->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

#endif
```

# Hints

- Send both ways out through the one function `LetOut`, so the power check and the once-only check are written in a single place.
- An overlap that began earlier will not begin again, so `SetPowered` has to ask the zone who is inside right now.
- In `LetOut`, put the plain refusals first, then the flag, then the announcement.

# Rubric

- LetOut does nothing without power, after an escape, or for an invalid pawn, and otherwise announces the pawn exactly once.
- SetPowered lets out a pawn that is already inside the zone when the power comes on, using the zone's list of overlapping actors.
- The overlap handler and SetPowered both go through LetOut, so the rules are written once.
- The zone overlaps only the Pawn channel, so a crate in the zone is not an escape.
- The gate holds no pointer to its listeners or to whatever powers it.
- OnEscaped is BlueprintAssignable.

# Alternative

The gate could check power in the overlap handler only and ignore pawns already inside. That is simpler, but a hero who reaches the exit a moment before the last fuse is collected would stand in the open exit and not get out until they stepped out and back in, because no overlap begins again. Asking the zone who is inside at the moment of power closes that gap. This shape, an object whose answer depends on whether it is powered, is the State pattern, as in Pack 2's "One mode at a time" world, with two states kept in one flag.

# Parsons

```yaml
- id: gate-set-powered
  prompt: Put SetPowered in order.
  lines:
    - "void ADojoM8ExitGate::SetPowered(bool bNewPowered)"
    - "{"
    - "	bPowered = bNewPowered;"
    - "	if (!bPowered) return;"
    - "	TArray<AActor*> Inside;"
    - "	Zone->GetOverlappingActors(Inside);"
    - "	for (AActor* Candidate : Inside) LetOut(Candidate);"
    - "}"
  distractors:
    - line: "	for (AActor* Candidate : Inside) OnEscaped.Broadcast(Candidate);"
      mistake: Broadcasting directly skips the checks in LetOut, so a pawn could escape twice.
- id: gate-let-out
  prompt: Put LetOut in order.
  lines:
    - "void ADojoM8ExitGate::LetOut(AActor* Candidate)"
    - "{"
    - "	if (!bPowered || bEscaped || !IsValid(Candidate)) return;"
    - "	bEscaped = true;"
    - "	OnEscaped.Broadcast(Candidate);"
    - "}"
  distractors:
    - line: "	if (!bPowered && !bEscaped && !IsValid(Candidate)) return;"
      mistake: With && the function returns only when all three conditions fail together, so an unpowered gate, a second escape, or an invalid pawn would still get through.
```
