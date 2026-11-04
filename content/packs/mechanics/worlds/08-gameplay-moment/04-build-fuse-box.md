---
id: m8-fuse-box
title: Fuses that power a box
order: 4
kind: build
scaffold: faded
difficulty: 3
patterns: [observer]
skills: [collision, delegates]
terms: [overlap-event, adddynamic, ufunction, sphere-component, destroy, dynamic-multicast-delegate]
prerequisites: [m8-searchlight, m3-checkpoint]
xp: 80
estimatedMinutes: 22
concepts:
  - A pickup announces itself while it still stands and then leaves, and knows nothing about who counts it
  - A counter announces a threshold once, however many more arrive
---

# Brief

When you place three fuses and a fuse box that watches them, and walk a runner onto each, the box counts 1, 2, and 3, announces that it is powered when the third arrives, and does not announce again when a fourth fuse is collected.

Most of the code is written for you. Fill the two gaps:

1. `ADojoM8Fuse::Collect`: refuse a second pickup; otherwise mark it collected, announce it to every listener with the fuse and the collector, and then destroy the fuse.
2. `ADojoM8FuseBox::HandleCollected`: count the fuse and, the first time the count reaches `RequiredFuses`, power the box and announce it once.

Dependency direction: the box points at nothing and holds no list of fuses; it subscribes to each fuse it is told to watch. The fuses hold no pointer to the box. Each notice carries the fuse itself. `DojoM8PowerLog` is a listener provided for the tests.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`, the runner that stands in for the hero).

This fuse box is the second piece of the Blackout Escape boss.

## See it in the editor

Place four `DojoM8Fuse` actors a few hundred units apart, a `DojoM8FuseBox`, and a `DojoM8PowerLog`; the fuses have no mesh, so switch on Show, then Collision in the viewport to see their balls. With them selected, right-click the level Blueprint's graph to add references. On BeginPlay call Watch on the box once for each fuse and Listen on the log with the box. On the 1 key call Collect on each fuse in turn with the player pawn, and after each call print the box's Get Collected and the log's Get Powered Count. Press Play and press 1 four times: the printed fuse count goes 1, 2, 3, 4, and the Get Powered Count becomes 1 on the third press and stays at 1 on the fourth.

# Files

## DojoM8Fuse.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8Fuse.generated.h"

class ADojoM8Fuse;
class USphereComponent;

/** Broadcast when a fuse is picked up, with the fuse and whoever picked it up. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoM8OnFuseCollected, ADojoM8Fuse*, Fuse, AActor*, Collector);

/** A pickup that is collected when a pawn touches it: it announces the pickup while it still stands and then leaves the world. */
UCLASS()
class ADojoM8Fuse : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger sphere as the root and turns ticking off. */
	ADojoM8Fuse();

	/** The area that feels pawns: it overlaps the Pawn channel and ignores everything else. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Fuse")
	TObjectPtr<USphereComponent> Zone;

	/** Fires once, when the fuse is collected, while it still stands. */
	UPROPERTY(BlueprintAssignable, Category = "Fuse")
	FDojoM8OnFuseCollected OnCollected;

	/** Announces the pickup to every listener, then destroys the fuse; false if it was already collected. */
	UFUNCTION(BlueprintCallable, Category = "Fuse")
	bool Collect(AActor* Collector);

	/** True once the fuse has been collected. */
	UFUNCTION(BlueprintPure, Category = "Fuse")
	bool IsCollected() const;

protected:
	/** Starts listening to the zone. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	bool bCollected = false;
};
```

## DojoM8Fuse.cpp

```cpp
#include "DojoM8Fuse.h"

#include "Components/SphereComponent.h"

ADojoM8Fuse::ADojoM8Fuse()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<USphereComponent>(TEXT("Zone"));
	Zone->SetSphereRadius(80.f);
	Zone->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
	Zone->SetCollisionResponseToAllChannels(ECR_Ignore);
	Zone->SetCollisionResponseToChannel(ECC_Pawn, ECR_Overlap);
	RootComponent = Zone;
}

void ADojoM8Fuse::BeginPlay()
{
	Super::BeginPlay();

	Zone->OnComponentBeginOverlap.AddDynamic(this, &ADojoM8Fuse::HandleZoneBeginOverlap);
}

bool ADojoM8Fuse::Collect(AActor* Collector)
{
	// Your code: refuse a second pickup.
	// Your code: mark it collected, tell every listener with this fuse and the collector, and then destroy the fuse.
	return false;
}

bool ADojoM8Fuse::IsCollected() const
{
	return bCollected;
}

void ADojoM8Fuse::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!IsValid(OtherActor)) return;

	Collect(OtherActor);
}
```

## DojoM8FuseBox.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8FuseBox.generated.h"

class ADojoM8Fuse;

/** Broadcast once, when the box has received every fuse it needs. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FDojoM8OnPowered);

/** Counts the fuses it is told to watch and announces once when there are enough; the fuses know nothing about the box. */
UCLASS()
class ADojoM8FuseBox : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8FuseBox();

	/** How many fuses power the box. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fuse Box", meta = (ClampMin = "1"))
	int32 RequiredFuses = 3;

	/** Fires once, when the count first reaches RequiredFuses. */
	UPROPERTY(BlueprintAssignable, Category = "Fuse Box")
	FDojoM8OnPowered OnPowered;

	/** Starts listening to the fuse, binding only once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Fuse Box")
	void Watch(ADojoM8Fuse* Fuse);

	/** Forgets every fuse counted and unpowers the box, ready for another round. */
	UFUNCTION(BlueprintCallable, Category = "Fuse Box")
	void StartOver();

	/** How many fuses have been collected since the last reset. */
	UFUNCTION(BlueprintPure, Category = "Fuse Box")
	int32 GetCollected() const;

	/** True once enough fuses have been collected. */
	UFUNCTION(BlueprintPure, Category = "Fuse Box")
	bool IsPowered() const;

private:
	/** Counts one more fuse and powers the box when there are enough. */
	UFUNCTION()
	void HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector);

	int32 Collected = 0;

	bool bPowered = false;
};
```

## DojoM8FuseBox.cpp

```cpp
#include "DojoM8FuseBox.h"

#include "Components/SceneComponent.h"
#include "DojoM8Fuse.h"

ADojoM8FuseBox::ADojoM8FuseBox()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoM8FuseBox::Watch(ADojoM8Fuse* Fuse)
{
	if (!IsValid(Fuse)) return;

	Fuse->OnCollected.AddUniqueDynamic(this, &ADojoM8FuseBox::HandleCollected);
}

void ADojoM8FuseBox::StartOver()
{
	Collected = 0;
	bPowered = false;
}

int32 ADojoM8FuseBox::GetCollected() const
{
	return Collected;
}

bool ADojoM8FuseBox::IsPowered() const
{
	return bPowered;
}

void ADojoM8FuseBox::HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector)
{
	// Your code: count the fuse.
	// Your code: the first time the count reaches RequiredFuses, power the box and announce it once.
}
```

## DojoM8PowerLog.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM8PowerLog.generated.h"

class ADojoM8Fuse;
class ADojoM8FuseBox;

/** A listener for tests and Blueprints: counts how often a fuse box announced that it was powered, and how many fuse pickups it heard and whether each fuse still stood when it was announced. */
UCLASS()
class ADojoM8PowerLog : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoM8PowerLog();

	/** Starts counting the box's announcements, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Power Log")
	void Listen(ADojoM8FuseBox* Box);

	/** Starts counting the pickup of one fuse, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Power Log")
	void ListenToFuse(ADojoM8Fuse* Fuse);

	/** How many times the box announced that it was powered. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetPoweredCount() const;

	/** How many fuse pickups were heard. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetPickupCount() const;

	/** How many pickups were announced after the fuse had already started leaving the world. */
	UFUNCTION(BlueprintPure, Category = "Power Log")
	int32 GetLateNotices() const;

private:
	/** Adds one to the powered count. */
	UFUNCTION()
	void HandlePowered();

	/** Counts a pickup, and a late one if the fuse is already leaving. */
	UFUNCTION()
	void HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector);

	int32 PoweredCount = 0;

	int32 PickupCount = 0;

	int32 LateNotices = 0;
};
```

## DojoM8PowerLog.cpp

```cpp
#include "DojoM8PowerLog.h"

#include "DojoM8Fuse.h"
#include "DojoM8FuseBox.h"

ADojoM8PowerLog::ADojoM8PowerLog()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADojoM8PowerLog::Listen(ADojoM8FuseBox* Box)
{
	if (!IsValid(Box)) return;

	Box->OnPowered.AddUniqueDynamic(this, &ADojoM8PowerLog::HandlePowered);
}

void ADojoM8PowerLog::ListenToFuse(ADojoM8Fuse* Fuse)
{
	if (!IsValid(Fuse)) return;

	Fuse->OnCollected.AddUniqueDynamic(this, &ADojoM8PowerLog::HandleCollected);
}

int32 ADojoM8PowerLog::GetPoweredCount() const
{
	return PoweredCount;
}

int32 ADojoM8PowerLog::GetPickupCount() const
{
	return PickupCount;
}

int32 ADojoM8PowerLog::GetLateNotices() const
{
	return LateNotices;
}

void ADojoM8PowerLog::HandlePowered()
{
	PoweredCount++;
}

void ADojoM8PowerLog::HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector)
{
	PickupCount++;
	if (!Fuse || Fuse->IsActorBeingDestroyed()) LateNotices++;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m8-fuse-box/DojoM8Fuse.h"
#include "Quests/m8-fuse-box/DojoM8FuseBox.h"
#include "Quests/m8-fuse-box/DojoM8PowerLog.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"
#include "UObject/UnrealType.h"

namespace DojoM8FuseBoxTest
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
		ADojoTestActor* Holder = TestWorld.SpawnActor<ADojoTestActor>();
		USphereComponent* Sphere = TestWorld.AddComponent<USphereComponent>(Holder);
		Sphere->SetSphereRadius(40.f);
		Sphere->SetCollisionProfileName(Profile);
		Sphere->SetWorldLocation(FVector(0.0, 0.0, -5000.0));
		return Sphere;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_FuseBox_ARunnerTakesAFuse, "Dojo.M8.FuseBox.ARunnerTakesAFuse", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Walks a runner onto a fuse and checks it is collected once, announced while it still stood, and counted by the box. */
bool FDojo_M8_FuseBox_ARunnerTakesAFuse::RunTest(const FString& Parameters)
{
	using namespace DojoM8FuseBoxTest;

	FDojoTestWorld TestWorld;

	ADojoM8Fuse* Fuse = SpawnAt<ADojoM8Fuse>(TestWorld, FVector(600.0, 0.0, 0.0));
	ADojoM8FuseBox* Box = TestWorld.SpawnActor<ADojoM8FuseBox>();
	ADojoM8PowerLog* Log = TestWorld.SpawnActor<ADojoM8PowerLog>();
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Fuse, box, log, and runner spawned"), Runner) || !Fuse || !Box || !Log) return false;

	Box->Watch(Fuse);
	Log->ListenToFuse(Fuse);
	TestFalse(TEXT("A new fuse is not collected"), Fuse->IsCollected());

	Runner->SetActorLocation(FVector(580.0, 0.0, 0.0));
	TestTrue(TEXT("A runner inside the fuse's sphere collects it"), Fuse->IsCollected());
	TestTrue(TEXT("The fuse leaves the world"), Fuse->IsActorBeingDestroyed());
	TestEqual(TEXT("The box counted one fuse"), Box->GetCollected(), 1);
	TestEqual(TEXT("The log heard one pickup"), Log->GetPickupCount(), 1);
	TestEqual(TEXT("and heard it while the fuse still stood"), Log->GetLateNotices(), 0);
	TestFalse(TEXT("Collecting again is refused"), Fuse->Collect(Runner));
	TestEqual(TEXT("so the count stays at one"), Box->GetCollected(), 1);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_FuseBox_EnoughFusesPowerTheBoxOnce, "Dojo.M8.FuseBox.EnoughFusesPowerTheBoxOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Collects three fuses, then a fourth, and checks the box powers up once; then resets it and powers it again. */
bool FDojo_M8_FuseBox_EnoughFusesPowerTheBoxOnce::RunTest(const FString& Parameters)
{
	using namespace DojoM8FuseBoxTest;

	FDojoTestWorld TestWorld;

	ADojoM8FuseBox* Box = TestWorld.SpawnActor<ADojoM8FuseBox>();
	ADojoM8PowerLog* Log = TestWorld.SpawnActor<ADojoM8PowerLog>();
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, 0.0, 5000.0));
	if (!TestNotNull(TEXT("Box, log, and runner spawned"), Runner) || !Box || !Log) return false;

	Log->Listen(Box);
	Log->Listen(Box);

	TArray<ADojoM8Fuse*> Fuses;
	for (int32 Index = 0; Index < 4; ++Index)
	{
		ADojoM8Fuse* Fuse = SpawnAt<ADojoM8Fuse>(TestWorld, FVector(600.0 * (Index + 1), 0.0, 0.0));
		Box->Watch(Fuse);
		Box->Watch(Fuse);
		Fuses.Add(Fuse);
	}

	for (int32 Index = 0; Index < 2; ++Index) Fuses[Index]->Collect(Runner);
	TestFalse(TEXT("Two fuses do not power a box that needs three"), Box->IsPowered());
	TestEqual(TEXT("Nothing is announced yet"), Log->GetPoweredCount(), 0);

	Fuses[2]->Collect(Runner);
	TestTrue(TEXT("The third fuse powers the box"), Box->IsPowered());
	TestEqual(TEXT("and it is announced once, however many times the fuses were watched"), Log->GetPoweredCount(), 1);

	Fuses[3]->Collect(Runner);
	TestEqual(TEXT("A fourth fuse is still counted"), Box->GetCollected(), 4);
	TestEqual(TEXT("but the box is not announced again"), Log->GetPoweredCount(), 1);

	Box->StartOver();
	TestEqual(TEXT("A reset forgets the fuses"), Box->GetCollected(), 0);
	TestFalse(TEXT("and the power"), Box->IsPowered());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_FuseBox_OnlyPawnsTakeFuses, "Dojo.M8.FuseBox.OnlyPawnsTakeFuses", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves a solid prop onto a fuse and checks it is left alone, then a pawn-type prop and checks it is taken. */
bool FDojo_M8_FuseBox_OnlyPawnsTakeFuses::RunTest(const FString& Parameters)
{
	using namespace DojoM8FuseBoxTest;

	FDojoTestWorld TestWorld;

	ADojoM8Fuse* Fuse = SpawnAt<ADojoM8Fuse>(TestWorld, FVector(600.0, 0.0, 0.0));
	USphereComponent* Crate = MakeProp(TestWorld, TEXT("BlockAll"));
	USphereComponent* Pawnlike = MakeProp(TestWorld, TEXT("Pawn"));
	if (!TestNotNull(TEXT("Fuse and props made"), Pawnlike) || !Fuse || !Crate) return false;

	Crate->SetWorldLocation(FVector(600.0, 0.0, 0.0));
	TestFalse(TEXT("A crate sitting on the fuse does not collect it"), Fuse->IsCollected());

	Pawnlike->SetWorldLocation(FVector(600.0, 0.0, 0.0));
	TestTrue(TEXT("A pawn-type shape does"), Fuse->IsCollected());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M8_FuseBox_DesignersCanTuneIt, "Dojo.M8.FuseBox.DesignersCanTuneIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks through reflection that the count is editable and that Blueprints can listen to both events. */
bool FDojo_M8_FuseBox_DesignersCanTuneIt::RunTest(const FString& Parameters)
{
	const FProperty* Required = ADojoM8FuseBox::StaticClass()->FindPropertyByName(TEXT("RequiredFuses"));
	if (!TestNotNull(TEXT("RequiredFuses is a UPROPERTY"), Required)) return false;
	TestTrue(TEXT("RequiredFuses is editable in Details"), Required->HasAnyPropertyFlags(CPF_Edit));

	const FProperty* OnPowered = ADojoM8FuseBox::StaticClass()->FindPropertyByName(TEXT("OnPowered"));
	if (!TestNotNull(TEXT("OnPowered is a UPROPERTY"), OnPowered)) return false;
	TestTrue(TEXT("Blueprints can bind to OnPowered"), OnPowered->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	const FProperty* OnCollected = ADojoM8Fuse::StaticClass()->FindPropertyByName(TEXT("OnCollected"));
	if (!TestNotNull(TEXT("OnCollected is a UPROPERTY"), OnCollected)) return false;
	TestTrue(TEXT("Blueprints can bind to OnCollected"), OnCollected->HasAnyPropertyFlags(CPF_BlueprintAssignable));

	return true;
}

#endif
```

# Hints

- In Collect, the listeners should hear about the fuse while it still exists, so announce first and destroy last.
- Broadcast passes the same two values the delegate was declared with, the fuse and the collector.
- For the box, remember in a flag that the power has been announced, so only the call that first reaches the requirement announces it.

# Rubric

- Collect broadcasts with the fuse and the collector before calling Destroy, and refuses a second pickup.
- The box binds with AddUniqueDynamic, so watching a fuse twice counts it once.
- OnPowered fires once when the count first reaches `RequiredFuses`, and a later fuse is counted but not announced.
- The fuse holds no pointer to the box, and the box holds no list of fuses.
- The handler is a UFUNCTION with the delegate's exact parameters.
- OnCollected and OnPowered are BlueprintAssignable, and `RequiredFuses` is editable in Details.

# Alternative

The fuse could look up the box and add itself to it when touched. That is shorter, but every fuse then carries a link to the box, and a second box, a sound, or a HUD that wants to know has to be added to the fuse's code. Announcing the pickup lets anything subscribe, including Blueprints through the Events section in Details. This shape, a sender that announces and listeners that subscribe, is the Observer pattern, as in Pack 2's first world.

# Parsons

```yaml
- id: fuse-collect
  prompt: Put Collect in order.
  lines:
    - "bool ADojoM8Fuse::Collect(AActor* Collector)"
    - "{"
    - "	if (bCollected) return false;"
    - "	bCollected = true;"
    - "	OnCollected.Broadcast(this, Collector);"
    - "	Destroy();"
    - "	return true;"
    - "}"
  distractors:
    - line: "	OnCollected.Broadcast(Collector);"
      mistake: The delegate was declared with two parameters, the fuse and the collector, so Broadcast must pass both.
- id: fuse-box-handle
  prompt: Put HandleCollected in order.
  lines:
    - "void ADojoM8FuseBox::HandleCollected(ADojoM8Fuse* Fuse, AActor* Collector)"
    - "{"
    - "	Collected++;"
    - "	if (bPowered || Collected < RequiredFuses) return;"
    - "	bPowered = true;"
    - "	OnPowered.Broadcast();"
    - "}"
  distractors:
    - line: "	if (Collected < RequiredFuses) return;"
      mistake: Without the powered flag every extra fuse announces the box again.
```
