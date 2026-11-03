---
id: m3-checkpoint
title: A flag that remembers where a runner should come back
order: 4
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [collision, delegates]
terms: [overlap-event, adddynamic, ufunction, collision-response, sphere-component, cast]
prerequisites: [m3-overlap-and-hit]
xp: 50
estimatedMinutes: 14
concepts:
  - A trigger that answers only one object type, and a handler that answers only one class
  - The flag changes the runner; the runner knows nothing about flags
---

# Brief

When you place a flag and a runner, press Play, and move the runner into the flag, the flag's label changes from FLAG to REACHED, the runner passes through without slowing, and from then on the runner's Respawn puts it back at the flag; a crate or any other actor that is not a runner leaves the flag as it was.

Two classes are in this quest. The runner, `ADojoM3Runner`, is given in full: it is this world's stand-in for the player, a solid sphere whose object type is Pawn, with a respawn point and a `Respawn` that teleports it there. Most of the flag is written too. Explain the marked lines, then fill the two gaps in `ADojoM3Checkpoint::HandleZoneBeginOverlap`:

1. Carry on only when the other actor is a runner.
2. Make this flag's location the runner's respawn point, mark the flag reached, and change the label to REACHED.

Dependency direction: the flag holds no pointer to anything; when a runner touches it, it tells that runner where to come back. The runner knows nothing about flags.

This flag is the first piece of the Vault Room boss, and the runner is the room's player.

## See it in the editor

Place a `DojoM3Checkpoint` at X 600 and a `DojoM3Runner` at the origin. Type `show Collision` in the console and press Play to see the flag's sphere and the runner's body. In the level Blueprint, on the 1 key, add Set Actor Location on the runner to X 580; press 1 and read REACHED. On the 2 key, set its location to X 1500, and on the 3 key, call Respawn: press 2, then 3, and the runner jumps back to the flag. Then try the A/B: select the flag's Zone in Details, untick Generate Overlap Events, press Play, and press 1: the label stays FLAG. Tick it again before you move on.

# Files

## DojoM3Runner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Runner.generated.h"

class USphereComponent;

/** The player's stand-in for this world: a solid ball whose object type is Pawn, with a place to come back to after a fall. */
UCLASS()
class ADojoM3Runner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body as the root, with the Pawn profile. */
	ADojoM3Runner();

	/** The solid shape; its object type is Pawn, so anything that listens for pawns feels it. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Runner")
	TObjectPtr<USphereComponent> Body;

	/** Changes where Respawn puts the runner. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void SetRespawnPoint(const FVector& NewPoint);

	/** Where Respawn puts the runner; where it stood at BeginPlay until something changes it. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	FVector GetRespawnPoint() const;

	/** Teleports the runner to its respawn point and counts it. */
	UFUNCTION(BlueprintCallable, Category = "Runner")
	void Respawn();

	/** How many times Respawn has run. */
	UFUNCTION(BlueprintPure, Category = "Runner")
	int32 GetRespawns() const;

protected:
	/** Makes the starting spot the first respawn point. */
	virtual void BeginPlay() override;

private:
	FVector RespawnPoint = FVector::ZeroVector;

	int32 Respawns = 0;
};
```

## DojoM3Runner.cpp

```cpp
#include "DojoM3Runner.h"

#include "Components/SphereComponent.h"

ADojoM3Runner::ADojoM3Runner()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->SetSphereRadius(40.f);
	Body->SetCollisionProfileName(TEXT("Pawn"));
	RootComponent = Body;
}

void ADojoM3Runner::BeginPlay()
{
	Super::BeginPlay();

	RespawnPoint = GetActorLocation();
}

void ADojoM3Runner::SetRespawnPoint(const FVector& NewPoint)
{
	RespawnPoint = NewPoint;
}

FVector ADojoM3Runner::GetRespawnPoint() const
{
	return RespawnPoint;
}

void ADojoM3Runner::Respawn()
{
	SetActorLocation(RespawnPoint, false, nullptr, ETeleportType::TeleportPhysics);
	Respawns++;
}

int32 ADojoM3Runner::GetRespawns() const
{
	return Respawns;
}
```

## DojoM3Checkpoint.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Checkpoint.generated.h"

class USphereComponent;
class UTextRenderComponent;

/** A flag that becomes a runner's respawn point when the runner touches it. */
UCLASS()
class ADojoM3Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger sphere as the root and the label above it. */
	ADojoM3Checkpoint();

	/** The area that feels runners: it overlaps pawns and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Checkpoint")
	TObjectPtr<USphereComponent> Zone;

	/** Floating text: FLAG until a runner touches it, then REACHED. */
	UPROPERTY(VisibleAnywhere, Category = "Checkpoint")
	TObjectPtr<UTextRenderComponent> Label;

	/** True once a runner has touched the flag. */
	UFUNCTION(BlueprintPure, Category = "Checkpoint")
	bool IsReached() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bReached = false;
};
```

## DojoM3Checkpoint.cpp

```cpp
#include "DojoM3Checkpoint.h"

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "DojoM3Runner.h"

ADojoM3Checkpoint::ADojoM3Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(120.f);
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly); // @explain: A flag answers overlap questions but is never solid, so physics never pushes against it.
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap); // @explain: After ignoring every channel, only shapes whose object type is Pawn can start an overlap with the zone, so crates and walls never reach the handler.
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
	Label->SetText(FText::FromString(TEXT("FLAG")));
}

void ADojoM3Checkpoint::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3Checkpoint::HandleZoneBeginOverlap); // @explain: The engine calls the handler by name through reflection whenever a shape starts overlapping the zone, which is why the handler is a UFUNCTION with the delegate's exact parameters.
}

bool ADojoM3Checkpoint::IsReached() const
{
	return bReached;
}

void ADojoM3Checkpoint::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	// Your code: carry on only when the other actor is a runner.
	// Your code: make this flag's location the runner's respawn point, mark the flag reached, and change the label to REACHED.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Checkpoint.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3CheckpointTest
{
	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Gives a bare actor a sphere with the named profile, far from everything, and returns the sphere. */
	USphereComponent* MakeProp(FDojoTestWorld& TestWorld, FName Profile)
	{
		ADojoTestActor* Owner = TestWorld.SpawnActor<ADojoTestActor>();
		USphereComponent* Sphere = TestWorld.AddComponent<USphereComponent>(Owner);
		Sphere->SetSphereRadius(40.f);
		Sphere->SetCollisionProfileName(Profile);
		Sphere->SetWorldLocation(FVector(0.0, 0.0, -5000.0));
		return Sphere;
	}

	/** The flag's label text. */
	FString LabelOf(const ADojoM3Checkpoint* Flag)
	{
		return Flag->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_Checkpoint_RunnerTakesTheFlag, "Dojo.M3.Checkpoint.RunnerTakesTheFlag", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves a runner into a flag, then away, and checks Respawn brings it back to the flag; a swept runner also passes through a second flag without stopping. */
bool FDojo_M3_Checkpoint_RunnerTakesTheFlag::RunTest(const FString& Parameters)
{
	using namespace DojoM3CheckpointTest;

	FDojoTestWorld TestWorld;

	ADojoM3Checkpoint* Flag = SpawnAt<ADojoM3Checkpoint>(TestWorld, FVector(600.0, 0.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Flag and runner spawned"), Runner) || !Flag) return false;

	TestFalse(TEXT("A new flag is not reached"), Flag->IsReached());
	TestEqual(TEXT("A new flag reads FLAG"), LabelOf(Flag), FString(TEXT("FLAG")));
	TestTrue(TEXT("The runner's first respawn point is where it started"), Runner->GetRespawnPoint().Equals(FVector::ZeroVector, 0.1));

	Runner->SetActorLocation(FVector(580.0, 0.0, 0.0));
	TestTrue(TEXT("A runner inside the flag's sphere reaches it"), Flag->IsReached());
	TestEqual(TEXT("The label reads REACHED"), LabelOf(Flag), FString(TEXT("REACHED")));
	TestTrue(TEXT("The flag's spot is now the runner's respawn point"), Runner->GetRespawnPoint().Equals(FVector(600.0, 0.0, 0.0), 0.1));

	Runner->SetActorLocation(FVector(1500.0, 0.0, 0.0));
	Runner->Respawn();
	TestTrue(TEXT("Respawn puts the runner back at the flag"), Runner->GetActorLocation().Equals(FVector(600.0, 0.0, 0.0), 0.1));

	ADojoM3Checkpoint* Later = SpawnAt<ADojoM3Checkpoint>(TestWorld, FVector(2400.0, 0.0, 0.0));
	ADojoM3Runner* Sprinter = SpawnAt<ADojoM3Runner>(TestWorld, FVector(2000.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Second flag and runner spawned"), Sprinter) || !Later) return false;

	Sprinter->AddActorWorldOffset(FVector(800.0, 0.0, 0.0), true);
	TestTrue(TEXT("A flag never stops a runner moving with a sweep"), Sprinter->GetActorLocation().Equals(FVector(2800.0, 0.0, 0.0), 0.1));
	TestTrue(TEXT("Running through the flag still reaches it"), Later->IsReached());
	TestTrue(TEXT("and gives that runner its respawn point"), Sprinter->GetRespawnPoint().Equals(FVector(2400.0, 0.0, 0.0), 0.1));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_Checkpoint_OnlyRunnersTakeIt, "Dojo.M3.Checkpoint.OnlyRunnersTakeIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves a solid crate shape and a pawn shape that is not a runner into a flag, and checks only a runner reaches it. */
bool FDojo_M3_Checkpoint_OnlyRunnersTakeIt::RunTest(const FString& Parameters)
{
	using namespace DojoM3CheckpointTest;

	FDojoTestWorld TestWorld;

	ADojoM3Checkpoint* Flag = SpawnAt<ADojoM3Checkpoint>(TestWorld, FVector(0.0, 1000.0, 0.0));
	if (!TestNotNull(TEXT("Flag spawned"), Flag)) return false;

	USphereComponent* Crate = MakeProp(TestWorld, TEXT("BlockAllDynamic"));
	Crate->SetWorldLocation(FVector(0.0, 1000.0, 0.0));
	TestFalse(TEXT("A WorldDynamic shape is ignored by the zone"), Flag->IsReached());
	TestFalse(TEXT("so it never overlaps the zone"), Flag->Zone->IsOverlappingComponent(Crate));

	USphereComponent* Stranger = MakeProp(TestWorld, TEXT("Pawn"));
	Stranger->SetWorldLocation(FVector(0.0, 1000.0, 0.0));
	TestTrue(TEXT("A Pawn shape on an actor that is not a runner does overlap the zone"), Flag->Zone->IsOverlappingComponent(Stranger));
	TestFalse(TEXT("but it is not a runner, so the flag is not reached"), Flag->IsReached());
	TestEqual(TEXT("and the label still reads FLAG"), Flag->Label->Text.ToString(), FString(TEXT("FLAG")));

	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, 0.0, 0.0));
	if (!TestNotNull(TEXT("Runner spawned"), Runner)) return false;

	Runner->SetActorLocation(FVector(0.0, 1050.0, 0.0));
	TestTrue(TEXT("A runner reaches the same flag"), Flag->IsReached());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_Checkpoint_LatestFlagWins, "Dojo.M3.Checkpoint.LatestFlagWins", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a runner through two flags and back to the first, and checks its respawn point is always the last flag it touched. */
bool FDojo_M3_Checkpoint_LatestFlagWins::RunTest(const FString& Parameters)
{
	using namespace DojoM3CheckpointTest;

	FDojoTestWorld TestWorld;

	ADojoM3Checkpoint* First = SpawnAt<ADojoM3Checkpoint>(TestWorld, FVector(500.0, 0.0, 0.0));
	ADojoM3Checkpoint* Second = SpawnAt<ADojoM3Checkpoint>(TestWorld, FVector(1000.0, 0.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Flags and runner spawned"), Runner) || !First || !Second) return false;

	Runner->SetActorLocation(FVector(500.0, 0.0, 0.0));
	Runner->SetActorLocation(FVector(1000.0, 0.0, 0.0));
	TestTrue(TEXT("After two flags the respawn point is the second"), Runner->GetRespawnPoint().Equals(FVector(1000.0, 0.0, 0.0), 0.1));
	TestTrue(TEXT("Both flags are reached"), First->IsReached() && Second->IsReached());

	Runner->SetActorLocation(FVector(500.0, 0.0, 0.0));
	TestTrue(TEXT("Going back to the first flag makes it the respawn point again"), Runner->GetRespawnPoint().Equals(FVector(500.0, 0.0, 0.0), 0.1));

	Runner->SetActorLocation(FVector(3000.0, 0.0, 0.0));
	Runner->Respawn();
	TestTrue(TEXT("Respawn uses the latest flag"), Runner->GetActorLocation().Equals(FVector(500.0, 0.0, 0.0), 0.1));
	TestEqual(TEXT("and counts once"), Runner->GetRespawns(), 1);

	return true;
}

#endif
```

# Hints

- The handler receives the other actor. The flag only cares when that actor is a runner, so the first job is to turn the plain actor pointer into a runner pointer, or learn that it is not one.
- Unreal's `Cast` template, given the runner class and the other actor, hands back a runner or nullptr. The runner has a function that changes its respawn point, and the flag's own spot is its actor location.
- `Cast` lives in `Templates/Casts.h`, which the actor header already brings in; `UTextRenderComponent::SetText` takes an `FText`, which `FText::FromString` builds.

# Rubric

- The handler returns at once unless `Cast<ADojoM3Runner>` succeeds, so a pawn shape on any other actor changes nothing.
- A runner's respawn point becomes the flag's own location, and the latest flag touched always wins.
- The flag marks itself reached and its label reads REACHED.
- The zone stays query only and overlaps only the Pawn channel, so it never stops a runner and never hears about crates.
- The flag holds no pointer to the runner; it tells the runner that touched it, and the runner knows nothing about flags.

# Alternative

The flag could listen with the actor-level `OnActorBeginOverlap` instead of the zone's own event: its handler takes only the two actors, which is shorter, and it fires for whichever of the flag's shapes was touched. The cost appears the day the flag gets a second shape, such as a wide sphere that plays a sound as a runner approaches: the actor event cannot tell which shape it was. Filtering by tag (`OtherActor->ActorHasTag(TEXT("Runner"))`) instead of `Cast` would also let a Blueprint runner take the flag without inheriting from the C++ class, at the price of a string that nothing checks at compile time.

# Parsons

```yaml
- id: checkpoint-handler
  prompt: Put the flag's handler in order.
  lines:
    - "void ADojoM3Checkpoint::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)"
    - "{"
    - "	ADojoM3Runner* Runner = Cast<ADojoM3Runner>(OtherActor);"
    - "	if (!Runner) return;"
    - "	Runner->SetRespawnPoint(GetActorLocation());"
    - "	bReached = true;"
    - "	Label->SetText(FText::FromString(TEXT(\"REACHED\")));"
    - "}"
  distractors:
    - line: "	ADojoM3Runner* Runner = Cast<ADojoM3Runner>(OverlappedComponent);"
      mistake: OverlappedComponent is the flag's own zone; the actor that walked in is OtherActor.
    - line: "	Runner->SetActorLocation(GetActorLocation());"
      mistake: That teleports the runner onto the flag now; the flag should only change where the runner comes back to later.
- id: checkpoint-bind
  prompt: Put the flag's BeginPlay in order.
  lines:
    - "void ADojoM3Checkpoint::BeginPlay()"
    - "{"
    - "	Super::BeginPlay();"
    - "	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM3Checkpoint::HandleZoneBeginOverlap);"
    - "}"
  distractors:
    - line: "	Zone->OnComponentBeginOverlap.AddDynamic(this, HandleZoneBeginOverlap);"
      mistake: AddDynamic takes the member function's address, written with the class name and an ampersand.
    - line: "	Zone->OnComponentHit.AddDynamic(this, &ADojoM3Checkpoint::HandleZoneBeginOverlap);"
      mistake: A hit event has a different parameter list and fires only on blocking contact, which a query only zone never makes.
```
