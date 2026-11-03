---
id: m3-scale-plate
title: A plate that counts what stands on it
order: 7
kind: build
scaffold: stub
difficulty: 3
patterns: []
skills: [collision, delegates]
terms: [overlap-event, get-overlapping-actors, adddynamic, ufunction, box-component, collision-preset]
prerequisites: [m3-pawn-gate, m3-checkpoint]
xp: 90
estimatedMinutes: 22
concepts:
  - A plate's state is how many things stand on it, kept up to date by enter and leave events
  - The plate is pressed while the count reaches a number a designer sets
---

# Brief

When you place a plate that needs two things and press Play, its label reads 0 / 2; a runner stepping on makes it 1 / 2, a crate beside the runner makes it 2 / 2 and the plate pressed, and when either steps off it drops back to 1 / 2 and is no longer pressed; a crate that is destroyed while standing on it counts as stepping off.

Two classes are in this quest. The crate, `ADojoM3Crate`, is given in full: a solid box body, and a small grab handle on top that later grabbers will find with an overlap query, plus a home it can be sent back to. Write the bodies of `BeginPlay`, both handlers, and `RefreshLabel` in `ADojoM3Plate`; the getters are written for you. Rules:

- The plate listens for shapes arriving on its zone and leaving it.
- `GetCount` is the number of things standing on the plate. A runner is one thing and a crate is one thing.
- The plate is pressed while the count is at least `RequiredCount`.
- The label reads the count, a slash, and `RequiredCount`, such as `1 / 2`, and changes whenever the count does.

Dependency direction: the plate holds no pointer to what stands on it or to anything it might open; anything that cares asks it. The crates and runners know nothing about plates.

This plate is the third piece of the Vault Room boss. It reuses the runner from the flag quest in its tests.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`).

## See it in the editor

Place a `DojoM3Plate` at the origin, a `DojoM3Runner` at Y -500, and two `DojoM3Crate` actors at Y -800 and Y -1000. Type `show Collision` and press Play. In the level Blueprint, on the 1, 2, and 3 keys, add Set Actor Location for the runner and each crate to spots on the plate (X -50, X 0, and X 50, with Y 0), and on the 4, 5, and 6 keys back to where they started. Press the keys in different orders and watch the label. Then the A/B: set the plate's Required Count to 1 in Details and press Play again.

# Files

## DojoM3Crate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Crate.generated.h"

class UBoxComponent;
class USphereComponent;

/** A crate to stand on plates: a solid body, a grab handle on top that grabbers find with an overlap query, and a home to go back to. */
UCLASS()
class ADojoM3Crate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the solid body as the root and the handle on top of it. */
	ADojoM3Crate();

	/** The solid shape, 80 units on a side. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Crate")
	TObjectPtr<UBoxComponent> Body;

	/** A small overlapping sphere on top, for anything that grabs crates. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Crate")
	TObjectPtr<USphereComponent> Handle;

	/** Where the crate stood when play began. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	FVector GetHome() const;

	/** Teleports the crate to its home and counts it. */
	UFUNCTION(BlueprintCallable, Category = "Crate")
	void ReturnHome();

	/** How many times ReturnHome has run. */
	UFUNCTION(BlueprintPure, Category = "Crate")
	int32 GetReturns() const;

protected:
	/** Remembers the starting spot as home. */
	virtual void BeginPlay() override;

private:
	FVector Home = FVector::ZeroVector;

	int32 Returns = 0;
};
```

## DojoM3Crate.cpp

```cpp
#include "DojoM3Crate.h"

#include "Components/BoxComponent.h"
#include "Components/SphereComponent.h"

ADojoM3Crate::ADojoM3Crate()
{
	PrimaryActorTick.bCanEverTick = false;

	Body = CreateDefaultSubobject<UBoxComponent>(TEXT("Body"));
	Body->SetBoxExtent(FVector(40.f, 40.f, 40.f));
	Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
	RootComponent = Body;

	Handle = CreateDefaultSubobject<USphereComponent>(TEXT("Handle"));
	Handle->SetupAttachment(Body);
	Handle->SetRelativeLocation(FVector(0.f, 0.f, 50.f));
	Handle->SetSphereRadius(20.f);
	Handle->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
}

void ADojoM3Crate::BeginPlay()
{
	Super::BeginPlay();

	Home = GetActorLocation();
}

FVector ADojoM3Crate::GetHome() const
{
	return Home;
}

void ADojoM3Crate::ReturnHome()
{
	SetActorLocation(Home, false, nullptr, ETeleportType::TeleportPhysics);
	Returns++;
}

int32 ADojoM3Crate::GetReturns() const
{
	return Returns;
}
```

## DojoM3Plate.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM3Plate.generated.h"

class UBoxComponent;
class UTextRenderComponent;

/** A plate that counts the things standing on it and is pressed while at least RequiredCount of them are there. */
UCLASS()
class ADojoM3Plate : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the trigger zone as the root and the label above it. */
	ADojoM3Plate();

	/** The space above the plate; whatever overlaps it stands on the plate. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Plate")
	TObjectPtr<UBoxComponent> Zone;

	/** Floating text: the count, a slash, and RequiredCount. */
	UPROPERTY(VisibleAnywhere, Category = "Plate")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many things must stand on the plate for it to be pressed. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Plate", meta = (ClampMin = "1"))
	int32 RequiredCount = 2;

	/** How many things stand on the plate now. */
	UFUNCTION(BlueprintPure, Category = "Plate")
	int32 GetCount() const;

	/** True while at least RequiredCount things stand on the plate. */
	UFUNCTION(BlueprintPure, Category = "Plate")
	bool IsPressed() const;

protected:
	/** Starts listening to the zone and writes the first label. */
	virtual void BeginPlay() override;

private:
	/** Runs when a shape starts overlapping the zone. */
	UFUNCTION()
	void HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Runs when a shape stops overlapping the zone. */
	UFUNCTION()
	void HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex);

	/** Writes the count and the required count. */
	void RefreshLabel();

	int32 Count = 0;
};
```

## DojoM3Plate.cpp

```cpp
#include "DojoM3Plate.h"

#include "Components/BoxComponent.h"
#include "Components/TextRenderComponent.h"

ADojoM3Plate::ADojoM3Plate()
{
	PrimaryActorTick.bCanEverTick = false;

	Zone = CreateDefaultSubobject<UBoxComponent>(TEXT("Zone"));
	Zone->SetBoxExtent(FVector(100.f, 100.f, 100.f));
	Zone->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Zone;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	Label->SetupAttachment(Zone);
	Label->SetRelativeLocation(FVector(0.f, 0.f, 150.f));
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoM3Plate::BeginPlay()
{
	Super::BeginPlay();

	// Your code: listen for shapes arriving on the zone and leaving it, then write the first label.
}

int32 ADojoM3Plate::GetCount() const
{
	return Count;
}

bool ADojoM3Plate::IsPressed() const
{
	return Count >= RequiredCount;
}

void ADojoM3Plate::HandleZoneBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	// Your code: bring Count up to date and refresh the label.
}

void ADojoM3Plate::HandleZoneEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex)
{
	// Your code: bring Count up to date and refresh the label.
}

void ADojoM3Plate::RefreshLabel()
{
	// Your code: show the count, a slash, and RequiredCount.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Quests/m3-scale-plate/DojoM3Plate.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3PlateTest
{
	/** Spawns an actor of a quest class at a spot. */
	template<typename TActor>
	TActor* SpawnAt(FDojoTestWorld& TestWorld, const FVector& Where)
	{
		return TestWorld.GetWorld()->SpawnActor<TActor>(Where, FRotator::ZeroRotator);
	}

	/** Spawns a plate at a spot, with the count a designer would give it in Details. */
	ADojoM3Plate* PlacePlate(FDojoTestWorld& TestWorld, const FVector& Where, int32 RequiredCount)
	{
		const FTransform Spot(Where);
		ADojoM3Plate* Plate = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM3Plate>(ADojoM3Plate::StaticClass(), Spot);
		Plate->RequiredCount = RequiredCount;
		Plate->FinishSpawning(Spot);
		return Plate;
	}

	/** The plate's label text. */
	FString LabelOf(const ADojoM3Plate* Plate)
	{
		return Plate->Label->Text.ToString();
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ScalePlate_CountsRunners, "Dojo.M3.ScalePlate.CountsRunners", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Steps two runners on and off a plate that needs two and checks the count, the label, and the pressed state at every step. */
bool FDojo_M3_ScalePlate_CountsRunners::RunTest(const FString& Parameters)
{
	using namespace DojoM3PlateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Plate* Plate = PlacePlate(TestWorld, FVector(0.0, 1000.0, 0.0), 2);
	ADojoM3Runner* First = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Runner* Second = SpawnAt<ADojoM3Runner>(TestWorld, FVector(300.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plate and runners spawned"), Second) || !First || !Plate) return false;

	TestEqual(TEXT("An empty plate counts nothing"), Plate->GetCount(), 0);
	TestEqual(TEXT("and reads 0 / 2"), LabelOf(Plate), FString(TEXT("0 / 2")));

	First->SetActorLocation(FVector(-50.0, 1000.0, 0.0));
	TestEqual(TEXT("One runner on the plate counts one"), Plate->GetCount(), 1);
	TestFalse(TEXT("One of two is not pressed"), Plate->IsPressed());
	TestEqual(TEXT("and reads 1 / 2"), LabelOf(Plate), FString(TEXT("1 / 2")));

	Second->SetActorLocation(FVector(50.0, 1000.0, 0.0));
	TestEqual(TEXT("Two runners count two"), Plate->GetCount(), 2);
	TestTrue(TEXT("Two of two is pressed"), Plate->IsPressed());
	TestEqual(TEXT("and reads 2 / 2"), LabelOf(Plate), FString(TEXT("2 / 2")));

	First->SetActorLocation(FVector(0.0, -1000.0, 0.0));
	TestEqual(TEXT("When one steps off, the count drops to one"), Plate->GetCount(), 1);
	TestFalse(TEXT("and the plate is no longer pressed"), Plate->IsPressed());

	Second->SetActorLocation(FVector(300.0, -1000.0, 0.0));
	TestEqual(TEXT("When both step off, the count is zero"), Plate->GetCount(), 0);
	TestEqual(TEXT("and reads 0 / 2"), LabelOf(Plate), FString(TEXT("0 / 2")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ScalePlate_ACrateIsOneThing, "Dojo.M3.ScalePlate.ACrateIsOneThing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a crate on a plate, alone and beside a runner, and checks the crate counts as one thing. */
bool FDojo_M3_ScalePlate_ACrateIsOneThing::RunTest(const FString& Parameters)
{
	using namespace DojoM3PlateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Plate* Plate = PlacePlate(TestWorld, FVector(0.0, 1000.0, 0.0), 2);
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(300.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plate, crate, and runner spawned"), Runner) || !Crate || !Plate) return false;

	Crate->SetActorLocation(FVector(-50.0, 1000.0, 0.0));
	TestEqual(TEXT("A crate on the plate is one thing, though its body and its handle both touch the zone"), Plate->GetCount(), 1);
	TestFalse(TEXT("so one crate does not press a plate that needs two"), Plate->IsPressed());
	TestEqual(TEXT("and the label reads 1 / 2"), LabelOf(Plate), FString(TEXT("1 / 2")));

	Runner->SetActorLocation(FVector(50.0, 1000.0, 0.0));
	TestEqual(TEXT("A crate and a runner are two things"), Plate->GetCount(), 2);
	TestTrue(TEXT("and press the plate"), Plate->IsPressed());

	Crate->SetActorLocation(FVector(0.0, -1000.0, 0.0));
	TestEqual(TEXT("When the crate steps off, the runner is the one thing left"), Plate->GetCount(), 1);
	TestFalse(TEXT("and the plate is no longer pressed"), Plate->IsPressed());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ScalePlate_DestroyedThingsStepOff, "Dojo.M3.ScalePlate.DestroyedThingsStepOff", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Destroys a crate standing on a pressed plate, and checks a plate that needs one is pressed by a single runner. */
bool FDojo_M3_ScalePlate_DestroyedThingsStepOff::RunTest(const FString& Parameters)
{
	using namespace DojoM3PlateTest;

	FDojoTestWorld TestWorld;

	ADojoM3Plate* Plate = PlacePlate(TestWorld, FVector(0.0, 1000.0, 0.0), 2);
	ADojoM3Crate* Left = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, -1000.0, 0.0));
	ADojoM3Crate* Right = SpawnAt<ADojoM3Crate>(TestWorld, FVector(300.0, -1000.0, 0.0));
	if (!TestNotNull(TEXT("Plate and crates spawned"), Right) || !Left || !Plate) return false;

	Left->SetActorLocation(FVector(-50.0, 1000.0, 0.0));
	Right->SetActorLocation(FVector(50.0, 1000.0, 0.0));
	TestTrue(TEXT("Two crates press the plate"), Plate->IsPressed());

	Right->Destroy();
	TestEqual(TEXT("A crate destroyed on the plate counts as stepping off"), Plate->GetCount(), 1);
	TestFalse(TEXT("so the plate is no longer pressed"), Plate->IsPressed());
	TestEqual(TEXT("and reads 1 / 2"), LabelOf(Plate), FString(TEXT("1 / 2")));

	ADojoM3Plate* Light = PlacePlate(TestWorld, FVector(0.0, 3000.0, 0.0), 1);
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector(0.0, -3000.0, 0.0));
	if (!TestNotNull(TEXT("Second plate and runner spawned"), Runner) || !Light) return false;

	TestEqual(TEXT("A plate that needs one reads 0 / 1"), LabelOf(Light), FString(TEXT("0 / 1")));
	Runner->SetActorLocation(FVector(0.0, 3000.0, 0.0));
	TestTrue(TEXT("and one runner presses it"), Light->IsPressed());

	return true;
}

#endif
```

# Hints

- Both handlers have the same job: bring the count up to date and refresh the label. Bind them in `BeginPlay` the way the flag bound its handler, one to each of the zone's two overlap events.
- The handlers are told about one shape at a time, arriving or leaving, and one thing can be made of more than one shape, as a crate is. The zone can also be asked, at any moment, which actors overlap it now, and that list has each actor once.
- `GetOverlappingActors` is on `UPrimitiveComponent` and fills a `TArray<AActor*>`; `FString::Printf` with `%d` builds the label.

# Rubric

- Both handlers are `UFUNCTION`s bound with `AddDynamic` in `BeginPlay`, one to the begin overlap and one to the end overlap.
- The count is the number of things on the plate: a runner counts as one and a crate counts as one.
- The plate is pressed exactly while the count is at least `RequiredCount`, and the label always shows the current count.
- Something destroyed while on the plate stops counting.
- The plate holds no pointer to what stands on it or to what it might open.

# Alternative

The plate could listen to its actor's `OnActorBeginOverlap` and `OnActorEndOverlap` instead, which fire once when the first of another actor's shapes arrives and once when its last shape leaves; adding one and taking one away is then right. That is shorter, but the actor events fire for every shape the plate owns, so a plate given a second shape later, such as a wide ring that lights up as things approach, would count things near the ring as standing on the plate. Asking the zone itself for its overlapping actors keeps the count tied to the one shape that means "on the plate", at the cost of building a small array each time something arrives or leaves.
