---
id: m3-pawn-gate
title: A gate that only lets runners through
order: 6
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [collision]
terms: [collision-response, collision-channel, get-overlapping-actors, box-component, overlap-event]
prerequisites: [m3-cracking-wall, m3-checkpoint, m2-bumper]
xp: 70
estimatedMinutes: 20
concepts:
  - Opening for one kind of thing is a change to one channel's response, not collision off
  - A gate asks who is in its doorway before it shuts
---

# Brief

When you place a gate across a corridor and press Play, a runner that walks into it stops at its face and the label reads SHUT; after `Open` the label reads OPEN and the runner walks straight through, while World 2's bouncing ball still bounces off it; after `Close` with the runner standing in the doorway the label reads CLEARING, and the gate turns solid again the moment the runner steps out.

Most of the gate is written for you, including the label and the listener for shapes leaving the doorway. Write the bodies of `Open`, `Close`, `HasPawnInside`, and `ShutIfClear` in `ADojoM3Gate`:

1. `Open` lets pawns into the box, so they pass through and the box can tell they are in it, and leaves its response to every other channel alone.
2. `Close` marks the gate as no longer open and tries to shut it.
3. `HasPawnInside` says whether any shape whose object type is Pawn overlaps the box right now.
4. `ShutIfClear` makes the box block pawns again, but only when the gate is not open and no pawn is inside.

Dependency direction: the gate holds no pointer to runners, plates, or anything that opens it; whoever wants it open calls `Open` and `Close`. It reuses the runner from the flag quest and World 2's ball only as things that walk and roll into it.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`) and m2-bumper (`Quests/m2-bumper/DojoM2Bumper.h`).

## See it in the editor

Place a `DojoM3Gate` at X 500, a `DojoM3Runner` at the origin, a `DojoM2Bumper` at Y 200 with its Heading set to X 1, Y 0, and a `DojoM2Wall` at X -300, Y 200 turned 90 degrees about Z so the ball has something to come back from. Type `show Collision` and press Play: the ball bounces between the wall and the gate. In the level Blueprint, on the 1 key, add Add Actor World Offset on the runner with X 800 and Sweep ticked: the runner stops at the gate. On the 2 key, call Open on the gate, and press 1 again: the runner passes and the ball keeps bouncing. Then put the runner in the doorway with Set Actor Location at X 500, call Close on the 3 key, and read CLEARING until you move the runner out.

# Files

## DojoM3Gate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Gate.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A gate that lets pawns through while open, always stops everything else, and never shuts on a pawn standing in it. */
UCLASS()
class ADojoM3Gate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid box as the root and the label above it. */
	ADojoM3Gate();

	/** The solid shape; it blocks everything while shut. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Gate")
	TObjectPtr<UBoxComponent> Box;

	/** Floating text: SHUT, OPEN, or CLEARING while it waits for a pawn to leave. */
	UPROPERTY(VisibleAnywhere, Category = "Gate")
	TObjectPtr<UTextRenderComponent> Label;

	/** Lets pawns through, and only pawns. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void Open();

	/** Stops letting pawns through, as soon as none is standing in the gate. */
	UFUNCTION(BlueprintCallable, Category = "Gate")
	void Close();

	/** True from Open until Close. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsOpen() const;

	/** True while the box blocks pawns. */
	UFUNCTION(BlueprintPure, Category = "Gate")
	bool IsBlockingPawns() const;

protected:
	/** Starts listening for shapes leaving the box and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape stops overlapping the box. */
	UFUNCTION()
	void HandleBoxEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

	/** True when a shape whose object type is Pawn overlaps the box. */
	bool HasPawnInside() const;

	/** Blocks pawns again when the gate is not open and no pawn is inside. */
	void ShutIfClear();

	/** Writes SHUT, OPEN, or CLEARING. */
	void RefreshLabel();

	bool bOpen = false;
};
```

## DojoM3Gate.cpp

```cpp
#include "DojoM3Gate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3Gate::ADojoM3Gate()
{
	PrimaryActorTick.bCanEverTick = false;

	Box = CreateDefaultSubobject<UBoxComponent>(TEXT("Box"));
	Box->SetBoxExtent(FVector(40.f, 300.f, 200.f));
	Box->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Box;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Box);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 250.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3Gate::BeginPlay()
{
	Super::BeginPlay();

	Box->OnComponentEndOverlap.AddDynamic(this, &ADojoM3Gate::HandleBoxEndOverlap);
	RefreshLabel();
}

void ADojoM3Gate::Open()
{
	// Your code: mark the gate open.
	// Your code: change only the box's response to the Pawn channel, so pawns pass through and the box still knows they are inside.
	// Your code: refresh the label.
}

void ADojoM3Gate::Close()
{
	// Your code: mark the gate as no longer open, refresh the label, and try to shut it.
}

bool ADojoM3Gate::IsOpen() const
{
	return bOpen;
}

bool ADojoM3Gate::IsBlockingPawns() const
{
	return Box->GetCollisionResponseToChannel(ECC_Pawn) == ECR_Block;
}

void ADojoM3Gate::HandleBoxEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	ShutIfClear();
}

bool ADojoM3Gate::HasPawnInside() const
{
	// Your code: look at every shape overlapping the box and answer true if any has the Pawn object type.
	return false;
}

void ADojoM3Gate::ShutIfClear()
{
	// Your code: do nothing while the gate is open or a pawn is inside.
	// Your code: otherwise block pawns again and refresh the label.
}

void ADojoM3Gate::RefreshLabel()
{
	const TCHAR* Text = bOpen ? TEXT("OPEN") : (IsBlockingPawns() ? TEXT("SHUT") : TEXT("CLEARING"));
	Label->SetText(FText::FromString(Text));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m2-bumper/DojoM2Bumper.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-pawn-gate/DojoM3Gate.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3GateTest
{
	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Gives a bare actor a sphere with the named profile at a spot, and returns the sphere. */
	USphereComponent* MakeProp(FDojoTestWorld& TestWorld, FName Profile, const FVector& Where)
	{
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		USphereComponent* Sphere = TestWorld.AddComponent<USphereComponent>(Owner);
		Sphere->SetSphereRadius(40.f);
		Sphere->SetCollisionProfileName(Profile);
		Sphere->SetWorldLocation(Where);
		return Sphere;
	}

	/** The gate's label text. */
	FString LabelOf(const ADojoM3Gate* Gate)
	{
		return Gate->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_PawnGate_OpensForRunners, "Dojo.M3.PawnGate.OpensForRunners", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a runner into a shut gate, opens it, and walks the runner on through. */
bool FDojo_M3_PawnGate_OpensForRunners::RunTest(const FString& Parameters)
{
	using namespace DojoM3GateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Gate* Gate = SpawnAt<ADojoM3Gate>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Gate and runner spawned"), Runner) || !Gate) return false;

	TestFalse(TEXT("A new gate is not open"), Gate->IsOpen());
	TestTrue(TEXT("and blocks pawns"), Gate->IsBlockingPawns());
	TestEqual(TEXT("and reads SHUT"), LabelOf(Gate), FString(TEXT("SHUT")));

	Runner->AddActorWorldOffset(FVector(800.0, 0.0, 0.0), true);
	TestTrue(TEXT("A shut gate stops the runner with its body against the face at 460"), Runner->GetActorLocation().X > 410.0 && Runner->GetActorLocation().X < 421.0);

	Gate->Open();
	TestTrue(TEXT("Open opens it"), Gate->IsOpen());
	TestFalse(TEXT("An open gate does not block pawns"), Gate->IsBlockingPawns());
	TestEqual(TEXT("and reads OPEN"), LabelOf(Gate), FString(TEXT("OPEN")));

	const double Before = Runner->GetActorLocation().X;
	Runner->AddActorWorldOffset(FVector(400.0, 0.0, 0.0), true);
	TestTrue(TEXT("The runner walks straight through an open gate"), FMath::IsNearlyEqual(Runner->GetActorLocation().X, Before + 400.0, 0.5));

	Gate->Close();
	TestFalse(TEXT("Close closes it"), Gate->IsOpen());
	TestTrue(TEXT("With nobody inside it blocks pawns at once"), Gate->IsBlockingPawns());
	TestEqual(TEXT("and reads SHUT"), LabelOf(Gate), FString(TEXT("SHUT")));

	Runner->AddActorWorldOffset(FVector(-800.0, 0.0, 0.0), true);
	TestTrue(TEXT("Walking back, the runner is stopped at the far face"), Runner->GetActorLocation().X > 579.0 && Runner->GetActorLocation().X < 590.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_PawnGate_OpenGateStillStopsTheRest, "Dojo.M3.PawnGate.OpenGateStillStopsTheRest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Opens a gate and rolls World 2's ball at it, then sweeps a solid shape at it, and checks both are still stopped. */
bool FDojo_M3_PawnGate_OpenGateStillStopsTheRest::RunTest(const FString& Parameters)
{
	using namespace DojoM3GateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Gate* Gate = SpawnAt<ADojoM3Gate>(TestWorld, FVector(500.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Gate spawned"), Gate)) return false;
	Gate->Open();

	ADojoM2Bumper* Ball = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM2Bumper>(ADojoM2Bumper::StaticClass(), FTransform::Identity);
	Ball->Heading = FVector(1.0, 0.0, 0.0);
	Ball->Speed = 600.f;
	Ball->FinishSpawning(FTransform::Identity);

	double FurthestIn = 0.0;
	for (int32 Frame = 0; Frame < 60; ++Frame)
	{
		TestWorld.Tick(1);
		FurthestIn = FMath::Max(FurthestIn, Ball->GetActorLocation().X);
	}

	TestTrue(TEXT("The ball never gets past an open gate's face"), FurthestIn < 421.0);
	TestEqual(TEXT("It bounced off the open gate"), Ball->GetBounces(), 1);

	USphereComponent* Crate = MakeProp(TestWorld, TEXT("BlockAllDynamic"), FVector(300.0, 200.0, 0.0));
	Crate->SetWorldLocation(FVector(700.0, 200.0, 0.0), true);
	TestTrue(TEXT("A solid WorldDynamic shape is stopped by the open gate too"), Crate->GetComponentLocation().X < 421.0);
	TestTrue(TEXT("The gate is still open"), Gate->IsOpen());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_PawnGate_NeverShutsOnARunner, "Dojo.M3.PawnGate.NeverShutsOnARunner", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Closes a gate with a runner in the doorway and checks it waits for the runner, and that a shape that is not a pawn does not hold it open. */
bool FDojo_M3_PawnGate_NeverShutsOnARunner::RunTest(const FString& Parameters)
{
	using namespace DojoM3GateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Gate* Gate = SpawnAt<ADojoM3Gate>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -2000.0, 0.0));
	if (!TestNotNull(TEXT("Gate and runner spawned"), Runner) || !Gate) return false;

	Gate->Open();
	Runner->SetActorLocation(FVector(500.0, 0.0, 0.0));
	Gate->Close();
	TestFalse(TEXT("Close with a runner inside closes the gate"), Gate->IsOpen());
	TestFalse(TEXT("but does not block pawns while the runner stands in it"), Gate->IsBlockingPawns());
	TestEqual(TEXT("and reads CLEARING"), LabelOf(Gate), FString(TEXT("CLEARING")));

	Runner->SetActorLocation(FVector(700.0, 0.0, 0.0));
	TestTrue(TEXT("The moment the runner steps out, the gate blocks pawns"), Gate->IsBlockingPawns());
	TestEqual(TEXT("and reads SHUT"), LabelOf(Gate), FString(TEXT("SHUT")));

	Runner->AddActorWorldOffset(FVector(-400.0, 0.0, 0.0), true);
	TestTrue(TEXT("and the runner cannot walk back through"), Runner->GetActorLocation().X > 579.0);

	Gate->Open();
	USphereComponent* Ghost = MakeProp(TestWorld, TEXT("OverlapAllDynamic"), FVector(500.0, 100.0, 0.0));
	TestTrue(TEXT("An overlapping shape that is not a pawn sits in the open doorway"), Gate->Box->IsOverlappingComponent(Ghost));
	Gate->Close();
	TestTrue(TEXT("It does not hold the gate open: only pawns do"), Gate->IsBlockingPawns());

	return true;
}

#endif
```

# Hints

- A box keeps one response per channel, and the runner's body is on the Pawn channel. Opening changes that one response to the value that lets pawns in without being stopped and still tells the box they are there; shutting changes it back.
- To know who stands in the doorway, ask the box for the shapes overlapping it now, then look at each shape's object type rather than at its actor's class.
- `SetCollisionResponseToChannel`, `GetOverlappingComponents`, and `GetCollisionObjectType` are on `UPrimitiveComponent`; the channel is `ECC_Pawn` and the responses are `ECR_Overlap` and `ECR_Block`.

# Rubric

- `Open` and the shutting step change only the box's response to `ECC_Pawn`, so every other channel, and World 2's ball, is still blocked while the gate is open.
- Open sets the Pawn response to Overlap, not Ignore, so the box can tell when a pawn is inside.
- `Close` never turns the box solid around a pawn: it waits, and the end overlap listener shuts the gate when the last pawn leaves.
- Only shapes with the Pawn object type hold the gate open; other overlapping shapes do not.
- The label always matches the state: OPEN, CLEARING, or SHUT.
- The gate holds no pointer to runners or to whatever opens it.

# Alternative

The gate could switch its whole collision off with `SetCollisionEnabled(ECollisionEnabled::NoCollision)` when it opens. That is one line and works for a door that everyone may walk through, but it lets crates, balls, and enemies through as well, which is the whole puzzle broken. Another route is a custom object type for the player, say a Runner channel added in Project Settings, so the gate can let the player through while still blocking AI pawns; that is the same code with `ECC_GameTraceChannel1` in place of `ECC_Pawn`, at the cost of a project setting every level depends on.

# Parsons

```yaml
- id: gate-shut
  prompt: Put ShutIfClear in order.
  lines:
    - "void ADojoM3Gate::ShutIfClear()"
    - "{"
    - "	if (bOpen || HasPawnInside()) return;"
    - "	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Block);"
    - "	RefreshLabel();"
    - "}"
  distractors:
    - line: "	Box->SetCollisionResponseToChannel(ECC_Pawn, ECR_Ignore);"
      mistake: Ignore lets pawns walk straight through a gate that is meant to be shut; shutting means Block.
    - line: "	Box->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);"
      mistake: The gate never turned its collision off, so there is nothing to turn back on; what changed was one response.
```
