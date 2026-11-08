---
id: p16-rocket-rack
title: A rack that lends rockets and takes them back
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [object-pool]
skills: [object-pool, lifecycle]
terms: [spawnactor, set-actor-hidden-in-game, set-actor-enable-collision, primary-actor-tick, tobjectptr, tarray]
prerequisites: [p16-spawn-cost]
xp: 60
estimatedMinutes: 20
concepts:
  - The rack spawns every rocket it will ever use when play begins, and never spawns during play
  - Lending a rocket resets it and brings it back into play; taking it back puts it out of play again
  - Taking a rocket back undoes every switch that lending turned on, ticking included
  - A rocket can only come back once per loan, and the rack refuses rockets it did not lend
  - The rack depends on the rockets; the rockets know nothing about the rack
---

# Brief

When you press Play with the setup below, the rack lends out four rockets and no more, takes one back once and refuses it the second time, and the Outliner shows the same four rockets the whole time.

`ADojoP16Rocket` is a festival rocket. `Launch` sends it off at a velocity with a fuse of some seconds; its `Tick` moves it, slows its climb with gravity, and burns the fuse, and when the fuse runs out it has burst. `ResetForLaunch` puts every field back to how a freshly spawned rocket starts.

`ADojoP16RocketRack` spawns `RocketCount` rockets, 4 by default, when play begins, and puts each one out of play: hidden, not colliding, not ticking. It never spawns another one. `Acquire` lends a resting rocket: it resets it, moves it to the spot it was asked for, and turns drawing, collision, and ticking back on. When every rocket is out, `Acquire` returns nullptr. The rack depends on the rockets; the rockets know nothing about the rack.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Release`. It takes back a rocket the rack lent out, at any point in its flight: the rocket leaves the lent rockets, goes out of play with every switch that `Acquire` turned on turned off again, and waits with the resting rockets to be lent once more; `Release` returns true. A rocket the rack has not lent, one it already took back, or nullptr is refused: `Release` returns false and changes nothing.

## See it in the editor

Place a `DojoP16RocketRack`. In the Level Blueprint, on Begin Play, first wait a Delay of 0.2 seconds so the rack has spawned its rockets, then call Acquire on it five times, store the first result in a variable, and print Is Valid of each result: true four times, then false. After a Delay of 1 second, call Release twice with the stored result and print both answers: true, then false. Press Play, then press F8 to eject and look at the Outliner: it lists four `DojoP16Rocket` actors, and the number never changes while you play.

# Files

## DojoP16Rocket.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Rocket.generated.h"

class USphereComponent;

/** A festival rocket: it flies on its launch velocity, slows under gravity, and bursts when its fuse runs out. It knows nothing about the rack it comes from. */
UCLASS()
class ADojoP16Rocket : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body sphere; the rocket can tick but starts with ticking off. */
	ADojoP16Rocket();

	/** Sends the rocket off at LaunchVelocity; it bursts after FuseSeconds of flight. */
	UFUNCTION(BlueprintCallable, Category = "Rocket")
	void Launch(const FVector& LaunchVelocity, float FuseSeconds);

	/** Puts every field back to how a freshly spawned rocket starts. */
	UFUNCTION(BlueprintCallable, Category = "Rocket")
	void ResetForLaunch();

	/** True from Launch until the burst. */
	UFUNCTION(BlueprintPure, Category = "Rocket")
	bool IsFlying() const;

	/** True once the fuse has run out, until the next reset. */
	UFUNCTION(BlueprintPure, Category = "Rocket")
	bool HasBurst() const;

	/** Moves the rocket along its flight and burns its fuse. */
	virtual void Tick(float DeltaSeconds) override;

	/** How fast gravity slows the climb, in units per second per second. */
	UPROPERTY(EditAnywhere, Category = "Rocket")
	float Gravity = 980.f;

protected:
	/** The rocket's body, which collides. */
	UPROPERTY(VisibleAnywhere, Category = "Rocket")
	TObjectPtr<USphereComponent> Body;

private:
	/** How fast and which way the rocket moves now. */
	FVector Velocity = FVector::ZeroVector;

	/** Seconds of flight left before the burst. */
	float FuseLeft = 0.f;

	/** True from Launch until the burst. */
	bool bFlying = false;

	/** True once the fuse has run out. */
	bool bBurst = false;
};
```

## DojoP16Rocket.cpp

```cpp
#include "DojoP16Rocket.h"

#include "Components/SphereComponent.h"

ADojoP16Rocket::ADojoP16Rocket()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.bStartWithTickEnabled = false; // @explain: The class may tick, but a rocket only needs to while it flies, so ticking is something the rack turns on and off rather than something every rocket does from the moment it exists.

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->InitSphereRadius(20.f);
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Body;
}

void ADojoP16Rocket::Launch(const FVector& LaunchVelocity, float FuseSeconds)
{
	Velocity = LaunchVelocity;
	FuseLeft = FuseSeconds;
	bFlying = true;
	bBurst = false;
}

void ADojoP16Rocket::ResetForLaunch()
{
	Velocity = FVector::ZeroVector;
	FuseLeft = 0.f;
	bFlying = false;
	bBurst = false;
}

bool ADojoP16Rocket::IsFlying() const
{
	return bFlying;
}

bool ADojoP16Rocket::HasBurst() const
{
	return bBurst;
}

void ADojoP16Rocket::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bFlying) return;

	AddActorWorldOffset(Velocity * DeltaSeconds);
	Velocity.Z -= Gravity * DeltaSeconds;

	FuseLeft -= DeltaSeconds;
	if (FuseLeft > 0.f) return;

	bFlying = false;
	bBurst = true;
}
```

## DojoP16RocketRack.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16RocketRack.generated.h"

class ADojoP16Rocket;

/** Spawns a fixed set of rockets once when play begins, lends them out, and takes them back. The rockets know nothing about the rack. */
UCLASS()
class ADojoP16RocketRack : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, turns ticking off, and picks the C++ rocket class. */
	ADojoP16RocketRack();

	/** The rocket class the rack spawns. */
	UPROPERTY(EditAnywhere, Category = "Rack")
	TSubclassOf<ADojoP16Rocket> RocketClass;

	/** How many rockets the rack spawns when play begins, which is the most it can ever lend at once. */
	UPROPERTY(EditAnywhere, Category = "Rack", meta = (ClampMin = "1"))
	int32 RocketCount = 4;

	/** Lends a resting rocket at Where, reset and back in play; nullptr when every rocket is out. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	ADojoP16Rocket* Acquire(const FVector& Where);

	/** Takes back a rocket this rack lent out and puts it out of play, ready to lend again. False, changing nothing, for any rocket the rack has not lent. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	bool Release(ADojoP16Rocket* Rocket);

	/** Rockets waiting in the rack. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetRestingCount() const;

	/** Rockets lent out now. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	int32 GetLentCount() const;

protected:
	/** Spawns every rocket the rack will ever use, out of play. */
	virtual void BeginPlay() override;

	/** Destroys the rockets the rack owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Rockets waiting to be lent, out of play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Rocket>> Resting; // @explain: A UPROPERTY array is one the garbage collector can see, so if anything ever destroys a resting rocket, the collector clears its entry here instead of leaving a pointer to a dead actor.

	/** Rockets lent out now, in play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Rocket>> Lent;
};
```

## DojoP16RocketRack.cpp

```cpp
#include "DojoP16RocketRack.h"

#include "Components/SceneComponent.h"
#include "DojoP16Rocket.h"
#include "Engine/World.h"

ADojoP16RocketRack::ADojoP16RocketRack()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	RocketClass = ADojoP16Rocket::StaticClass();
}

void ADojoP16RocketRack::BeginPlay()
{
	Super::BeginPlay();

	if (!RocketClass) return;

	for (int32 Index = 0; Index < RocketCount; ++Index)
	{
		ADojoP16Rocket* Rocket = GetWorld()->SpawnActor<ADojoP16Rocket>(RocketClass, GetActorLocation(), GetActorRotation()); // @explain: Every spawn the rack will ever make happens here, when play begins, so the busiest moment of the show spawns nothing at all.
		if (!Rocket) continue;

		Rocket->SetActorHiddenInGame(true);
		Rocket->SetActorEnableCollision(false);
		Rocket->SetActorTickEnabled(false);
		Resting.Add(Rocket);
	}
}

void ADojoP16RocketRack::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP16Rocket* Rocket : Resting)
	{
		if (IsValid(Rocket)) Rocket->Destroy();
	}

	for (ADojoP16Rocket* Rocket : Lent)
	{
		if (IsValid(Rocket)) Rocket->Destroy();
	}

	Resting.Empty();
	Lent.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoP16Rocket* ADojoP16RocketRack::Acquire(const FVector& Where)
{
	if (Resting.Num() == 0) return nullptr; // @explain: With every rocket out, the request gets none; the rack never spawns during play, so the number of rockets it owns is the most that can ever fly at once.

	ADojoP16Rocket* Rocket = Resting.Pop();
	Lent.Add(Rocket);

	Rocket->ResetForLaunch();
	Rocket->SetActorLocation(Where);
	Rocket->SetActorHiddenInGame(false);
	Rocket->SetActorEnableCollision(true);
	Rocket->SetActorTickEnabled(true);
	return Rocket;
}

bool ADojoP16RocketRack::Release(ADojoP16Rocket* Rocket)
{
	return false;
}

int32 ADojoP16RocketRack::GetRestingCount() const
{
	return Resting.Num();
}

int32 ADojoP16RocketRack::GetLentCount() const
{
	return Lent.Num();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p16-rocket-rack/DojoP16Rocket.h"
#include "Quests/p16-rocket-rack/DojoP16RocketRack.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_RocketRack_TheRackSpawnsOnlyAtTheStart, "Dojo.P16.RocketRack.TheRackSpawnsOnlyAtTheStart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The rack spawns its four rockets when play begins, lends four and no more, and lends a rocket that came back again without spawning. */
bool FDojo_P16_RocketRack_TheRackSpawnsOnlyAtTheStart::RunTest(const FString& Parameters)
{
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;
	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor* Actor)
	{
		if (Actor->IsA<ADojoP16Rocket>()) Spawned++;
	}));

	ADojoP16RocketRack* Rack = TestWorld.SpawnActor<ADojoP16RocketRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;
	TestEqual(TEXT("The rack spawns its four rockets when play begins"), Spawned, 4);
	TestEqual(TEXT("All four rest"), Rack->GetRestingCount(), 4);

	TArray<ADojoP16Rocket*> Out;
	for (int32 Index = 0; Index < 4; ++Index)
	{
		ADojoP16Rocket* Rocket = Rack->Acquire(FVector(0.f, 0.f, 100.f * Index));
		if (!TestNotNull(TEXT("Each of the first four requests gets a rocket"), Rocket)) return false;
		Out.AddUnique(Rocket);
	}
	TestEqual(TEXT("Four different rockets are lent"), Out.Num(), 4);
	TestNull(TEXT("A fifth request gets none"), Rack->Acquire(FVector::ZeroVector));
	TestEqual(TEXT("Four are out"), Rack->GetLentCount(), 4);

	TestTrue(TEXT("One comes back"), Rack->Release(Out[1]));
	TestEqual(TEXT("It rests again"), Rack->GetRestingCount(), 1);
	TestTrue(TEXT("The next request gets the rocket that came back"), Rack->Acquire(FVector::ZeroVector) == Out[1]);
	TestEqual(TEXT("Nothing was spawned during play"), Spawned, 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_RocketRack_ARestingRocketIsOutOfPlay, "Dojo.P16.RocketRack.ARestingRocketIsOutOfPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A rocket taken back mid-flight is hidden, does not collide, does not tick, and stays put with its fuse unburnt. */
bool FDojo_P16_RocketRack_ARestingRocketIsOutOfPlay::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16RocketRack* Rack = TestWorld.SpawnActor<ADojoP16RocketRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;
	ADojoP16Rocket* Rocket = Rack->Acquire(FVector::ZeroVector);
	if (!TestNotNull(TEXT("A rocket is lent"), Rocket)) return false;

	Rocket->Launch(FVector(0.f, 0.f, 600.f), 1.f);
	TestWorld.Tick(10);
	TestTrue(TEXT("It is flying"), Rocket->IsFlying());

	TestTrue(TEXT("It is taken back mid-flight"), Rack->Release(Rocket));
	TestTrue(TEXT("A resting rocket is hidden"), Rocket->IsHidden());
	TestFalse(TEXT("A resting rocket does not collide"), Rocket->GetActorEnableCollision());
	TestFalse(TEXT("A resting rocket does not tick"), Rocket->IsActorTickEnabled());
	TestEqual(TEXT("It waits with the others"), Rack->GetRestingCount(), 4);

	const FVector WhereItStopped = Rocket->GetActorLocation();
	TestWorld.Tick(120);
	TestTrue(TEXT("Two seconds later it is still where it was taken back"), Rocket->GetActorLocation().Equals(WhereItStopped));
	TestFalse(TEXT("Its fuse no longer burns, so it never bursts in the rack"), Rocket->HasBurst());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_RocketRack_ALentRocketStartsClean, "Dojo.P16.RocketRack.ALentRocketStartsClean", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A rack's only rocket burst, came back, and is lent again: it is in play at its new spot, with nothing of its last flight left. */
bool FDojo_P16_RocketRack_ALentRocketStartsClean::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16RocketRack* Rack = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP16RocketRack>(ADojoP16RocketRack::StaticClass(), FTransform::Identity);
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;
	Rack->RocketCount = 1;
	Rack->FinishSpawning(FTransform::Identity);
	ADojoP16Rocket* Rocket = Rack->Acquire(FVector::ZeroVector);
	if (!TestNotNull(TEXT("A rocket is lent"), Rocket)) return false;

	Rocket->Launch(FVector(0.f, 0.f, 600.f), 0.5f);
	TestWorld.Tick(45);
	TestTrue(TEXT("Its fuse ran out and it burst"), Rocket->HasBurst());
	TestTrue(TEXT("It comes back"), Rack->Release(Rocket));

	const FVector NewSpot(0.f, 0.f, 500.f);
	ADojoP16Rocket* Again = Rack->Acquire(NewSpot);
	TestTrue(TEXT("The rack lends its only rocket again"), Again == Rocket);
	if (!Again) return false;
	TestFalse(TEXT("It is drawn again"), Again->IsHidden());
	TestTrue(TEXT("It collides again"), Again->GetActorEnableCollision());
	TestTrue(TEXT("It ticks again"), Again->IsActorTickEnabled());
	TestFalse(TEXT("It is not flying until launched"), Again->IsFlying());
	TestFalse(TEXT("Its last burst is forgotten"), Again->HasBurst());
	TestTrue(TEXT("It stands where it was lent"), Again->GetActorLocation().Equals(NewSpot));

	Again->Launch(FVector(0.f, 0.f, 600.f), 1.f);
	TestWorld.Tick(30);
	TestTrue(TEXT("Half a second into a one second fuse it still flies"), Again->IsFlying());
	TestTrue(TEXT("And it climbed from its new spot"), Again->GetActorLocation().Z > NewSpot.Z);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_RocketRack_ReleasingTwiceLendsItOnce, "Dojo.P16.RocketRack.ReleasingTwiceLendsItOnce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A rocket comes back once per loan; a second release, nullptr, and a rocket the rack never lent are refused, so the rack still lends four different rockets. */
bool FDojo_P16_RocketRack_ReleasingTwiceLendsItOnce::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16RocketRack* Rack = TestWorld.SpawnActor<ADojoP16RocketRack>();
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;
	ADojoP16Rocket* Rocket = Rack->Acquire(FVector::ZeroVector);
	if (!TestNotNull(TEXT("A rocket is lent"), Rocket)) return false;

	TestTrue(TEXT("The first release takes it back"), Rack->Release(Rocket));
	TestFalse(TEXT("A second release of the same rocket is refused"), Rack->Release(Rocket));
	TestFalse(TEXT("nullptr is refused"), Rack->Release(nullptr));

	ADojoP16Rocket* Stranger = TestWorld.SpawnActor<ADojoP16Rocket>();
	if (!TestNotNull(TEXT("A rocket from somewhere else spawned"), Stranger)) return false;
	TestFalse(TEXT("A rocket the rack never lent is refused"), Rack->Release(Stranger));
	TestEqual(TEXT("The rack still rests exactly four"), Rack->GetRestingCount(), 4);

	TSet<ADojoP16Rocket*> LentNow;
	for (int32 Index = 0; Index < 4; ++Index)
	{
		LentNow.Add(Rack->Acquire(FVector::ZeroVector));
	}
	TestEqual(TEXT("Four requests get four different rockets"), LentNow.Num(), 4);
	TestFalse(TEXT("None of them came back empty"), LentNow.Contains(nullptr));
	TestFalse(TEXT("The stranger is never lent"), LentNow.Contains(Stranger));
	TestNull(TEXT("A fifth request gets none"), Rack->Acquire(FVector::ZeroVector));

	return true;
}

#endif
```

# Hints

- The list of lent rockets already tells you whether this one is the rack's to take back.
- Read `Acquire` again, since taking a rocket back has to answer everything it turned on.
- Whatever keeps a rocket moving through its flight has to be dealt with before it waits.

# Rubric

- Release takes back only a rocket the rack has lent and not yet taken back, and returns false, changing nothing, for anything else, nullptr included.
- A rocket taken back is hidden, does not collide, and does not tick, wherever it was in its flight.
- A rocket taken back waits with the resting rockets and can be lent again.
- The rack spawns its rockets only when play begins and never during play.
- A lent rocket is reset and in play at the spot it was asked for, with nothing of its last flight left.
- The rack depends on the rockets; the rockets know nothing about the rack.

# Alternative

`Release` could reset the rocket as well as `Acquire`, or instead of it. Resetting on the way back means a resting rocket holds nothing from its last flight, which matters once rockets keep pointers to other objects, because a resting rocket that still points at an object made for its last flight keeps that object from being collected. Resetting on the way out guarantees a clean start even if something touched a resting rocket while it waited. This rack resets on the way out because a reset there is what the next flight depends on; doing both costs one more function call per loan and is the safest choice once rockets hold references.

# Parsons

```yaml
- id: release
  prompt: "Put Release in order. Refuse first, take the rocket off the lent list, hide it, turn its collision off, stop its ticking, and only then put it with the resting rockets."
  lines:
    - "bool ADojoP16RocketRack::Release(ADojoP16Rocket* Rocket)"
    - "{"
    - "	if (!Lent.Contains(Rocket)) return false;"
    - "	Lent.Remove(Rocket);"
    - "	Rocket->SetActorHiddenInGame(true);"
    - "	Rocket->SetActorEnableCollision(false);"
    - "	Rocket->SetActorTickEnabled(false);"
    - "	Resting.Add(Rocket);"
    - "	return true;"
    - "}"
  distractors:
    - line: "	Rocket->Destroy();"
      mistake: Destroying the rocket throws away the very actor the rack spawned to keep; the next request would find one rocket fewer, and a new one could only come from spawning during play.
```
