---
id: p21-turret-refactor
title: Three ways to fire, one way to make
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [factory-method]
skills: [factory-method, refactoring]
terms: [spawn-actor-deferred, tsubclassof, spawnactor, tobjectptr]
prerequisites: [p21-wave-spawner, p21-launchers]
xp: 110
estimatedMinutes: 30
concepts:
  - Three firing functions that each spawn and prepare their own bolt repeat one piece of work three times
  - One virtual function that makes a bolt from a class gives the turret a single place where bolts are made
  - A subclass that overrides that one function changes every kind of shot, with no change to the firing functions
  - A function that makes things may make nothing, and each caller has to cope
  - Which bolts, where, how hard, and how many each shot makes stay exactly as they were
---

# Brief

After the refactor, an ember shot, a frost shot, and a fan of three ember bolts all get their bolts by asking one function, `MakeBolt`, so a turret that changes `MakeBolt` changes every kind of shot, and everything the turret did before, step for step, stays the same.

Compiles against earlier quests: p21-launchers (`Quests/p21-launchers/DojoP21Bolt.h`, `Quests/p21-launchers/DojoP21EmberBolt.h`, `Quests/p21-launchers/DojoP21FrostBolt.h`).

`ADojoP21Turret` has three ways to fire. `FireEmber` and `FireFrost` each make one bolt at the muzzle in front of the turret. `FireSpread` makes three ember bolts at the same muzzle, the first turned `FanDegrees` to one side, the second straight, and the third `FanDegrees` to the other side, and returns the ones it made. Each bolt gets the turret as its shooter before it begins play, and each is counted in `ShotsFired`. A bolt that cannot be made is not returned and not counted.

Today each of the three functions spawns, prepares, brings to life, and counts its bolt by itself, so the same five steps are written three times. The range is about to take its bolts from a pool, and the turret has no single place to put that. The header already declares a virtual `MakeBolt(BoltClass, Muzzle)`, but nothing calls it and its body only returns `nullptr`.

Refactor the turret:

- `MakeBolt` makes one bolt of `BoltClass` at `Muzzle`, gives it the turret as its shooter before it begins play, brings it to life, counts it in `ShotsFired`, and returns it, or returns `nullptr` and counts nothing when no bolt could be made.
- `FireEmber`, `FireFrost`, and `FireSpread` get every bolt they fire by calling `MakeBolt` with the class they want and the muzzle they want, and do not spawn anything themselves.
- The signatures of the three firing functions stay as they are, and so do the bolts they produce, where they appear, and how many are counted.

`ADojoP21CountingTurret` is a turret that notes each request to `MakeBolt` and can be told to refuse them. Leave it as it is. Two of the four tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place a `DojoP21CountingTurret` in the level, facing the +X direction. In the Level Blueprint, on Begin Play call Fire Ember, Fire Frost, and Fire Spread on it, then print `Make Calls` and `Shots Fired`. Before the refactor the prints are 0 and 5: five bolts were fired and the turret's own maker was never asked. After it they are 5 and 5. Tick `Refuse` in the turret's Details and play again: after the refactor `Shots Fired` is 0 and no bolt appears at all; before it, the turret ignores the refusal and fires all five. The firing functions did not change what they fire, only where they get it.

# Files

## DojoP21Turret.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/p21-launchers/DojoP21Bolt.h"
#include "DojoP21Turret.generated.h"

/** A range turret with three ways to fire: an ember bolt, a frost bolt, and a fan of three ember bolts. */
UCLASS()
class ADojoP21Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Turret();

	/** How far in front of the turret a bolt appears. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	float MuzzleDistance = 50.f;

	/** How many degrees to the left and right the outer bolts of a fan turn. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	float FanDegrees = 15.f;

	/** How many bolts this turret has fired in all. */
	UPROPERTY(BlueprintReadOnly, Category = "Turret")
	int32 ShotsFired = 0;

	/** Fires one ember bolt; nullptr when none could be made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	ADojoP21Bolt* FireEmber();

	/** Fires one frost bolt; nullptr when none could be made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	ADojoP21Bolt* FireFrost();

	/** Fires three ember bolts, the left one turned by FanDegrees, the middle one straight, and the right one turned the other way; returns the bolts that were made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	TArray<ADojoP21Bolt*> FireSpread();

protected:
	/** Makes one bolt of BoltClass at the muzzle with the turret as its shooter, brought to life and counted; nullptr when none could be made. */
	virtual ADojoP21Bolt* MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle);
};
```

## DojoP21Turret.cpp

```cpp
#include "DojoP21Turret.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/p21-launchers/DojoP21EmberBolt.h"
#include "Quests/p21-launchers/DojoP21FrostBolt.h"

ADojoP21Turret::ADojoP21Turret()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Bolt* ADojoP21Turret::FireEmber()
{
	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

	ADojoP21Bolt* Bolt = GetWorld()->SpawnActorDeferred<ADojoP21EmberBolt>(ADojoP21EmberBolt::StaticClass(), Muzzle);
	if (Bolt == nullptr) return nullptr;

	Bolt->Shooter = this;
	Bolt->FinishSpawning(Muzzle);

	ShotsFired++;
	return Bolt;
}

ADojoP21Bolt* ADojoP21Turret::FireFrost()
{
	const FTransform Muzzle(GetActorRotation(), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

	ADojoP21Bolt* Bolt = GetWorld()->SpawnActorDeferred<ADojoP21FrostBolt>(ADojoP21FrostBolt::StaticClass(), Muzzle);
	if (Bolt == nullptr) return nullptr;

	Bolt->Shooter = this;
	Bolt->FinishSpawning(Muzzle);

	ShotsFired++;
	return Bolt;
}

TArray<ADojoP21Bolt*> ADojoP21Turret::FireSpread()
{
	TArray<ADojoP21Bolt*> Fired;

	for (const float Offset : { -FanDegrees, 0.f, FanDegrees })
	{
		const FTransform Muzzle(GetActorRotation() + FRotator(0.f, Offset, 0.f), GetActorLocation() + GetActorForwardVector() * MuzzleDistance);

		ADojoP21Bolt* Bolt = GetWorld()->SpawnActorDeferred<ADojoP21EmberBolt>(ADojoP21EmberBolt::StaticClass(), Muzzle);
		if (Bolt == nullptr) continue;

		Bolt->Shooter = this;
		Bolt->FinishSpawning(Muzzle);

		ShotsFired++;
		Fired.Add(Bolt);
	}

	return Fired;
}

ADojoP21Bolt* ADojoP21Turret::MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle)
{
	return nullptr;
}
```

## DojoP21CountingTurret.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Turret.h"
#include "DojoP21CountingTurret.generated.h"

/** A turret that notes every request for a bolt and can be told to refuse them, to show where its bolts come from. */
UCLASS()
class ADojoP21CountingTurret : public ADojoP21Turret
{
	GENERATED_BODY()

public:
	/** How many times a bolt was asked for. */
	UPROPERTY(BlueprintReadOnly, Category = "Counting")
	int32 MakeCalls = 0;

	/** The class asked for each time, in order. */
	UPROPERTY(BlueprintReadOnly, Category = "Counting")
	TArray<TSubclassOf<ADojoP21Bolt>> AskedFor;

	/** When true, every request is answered with nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Counting")
	bool bRefuse = false;

protected:
	/** Notes the request, then refuses it or lets the turret's own way of making a bolt answer. */
	virtual ADojoP21Bolt* MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle) override;
};
```

## DojoP21CountingTurret.cpp

```cpp
#include "DojoP21CountingTurret.h"

ADojoP21Bolt* ADojoP21CountingTurret::MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle)
{
	MakeCalls++;
	AskedFor.Add(BoltClass);

	if (bRefuse) return nullptr;

	return Super::MakeBolt(BoltClass, Muzzle);
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p21-launchers/DojoP21Bolt.h"
#include "Quests/p21-launchers/DojoP21EmberBolt.h"
#include "Quests/p21-launchers/DojoP21FrostBolt.h"
#include "Quests/p21-turret-refactor/DojoP21CountingTurret.h"
#include "Quests/p21-turret-refactor/DojoP21Turret.h"
#include "Support/DojoTestWorld.h"

namespace DojoP21TurretTest
{
	/** Puts a turret at 100, 0, 0 facing the positive Y axis, so its muzzle is at 100, 50, 0. */
	void PlaceTurret(ADojoP21Turret* Turret)
	{
		Turret->SetActorLocation(FVector(100.f, 0.f, 0.f));
		Turret->SetActorRotation(FRotator(0.f, 90.f, 0.f));
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_TurretRefactor_SingleShotsAreUnchanged, "Dojo.P21.TurretRefactor.SingleShotsAreUnchanged", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** An ember shot and a frost shot make the right bolt at the muzzle, with the turret as shooter before the bolt begins play, and count one each. */
bool FDojo_P21_TurretRefactor_SingleShotsAreUnchanged::RunTest(const FString& Parameters)
{
	using namespace DojoP21TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP21Turret* Turret = TestWorld.SpawnActor<ADojoP21Turret>();
	if (!TestNotNull(TEXT("Turret spawned"), Turret)) return false;
	PlaceTurret(Turret);

	ADojoP21Bolt* Ember = Turret->FireEmber();
	if (!TestNotNull(TEXT("An ember bolt was made"), Ember)) return false;
	TestTrue(TEXT("It is an ember bolt"), Cast<ADojoP21EmberBolt>(Ember) != nullptr);
	TestEqual(TEXT("It hits for 12"), Ember->Damage, 12);
	TestTrue(TEXT("It appears at the muzzle"), Ember->GetActorLocation().Equals(FVector(100.f, 50.f, 0.f), 0.1f));
	TestTrue(TEXT("Its shooter is the turret"), Ember->Shooter == Turret);
	TestTrue(TEXT("And it knew that when it began play"), Ember->bShooterKnownAtBeginPlay);

	ADojoP21Bolt* Frost = Turret->FireFrost();
	if (!TestNotNull(TEXT("A frost bolt was made"), Frost)) return false;
	TestTrue(TEXT("It is a frost bolt"), Cast<ADojoP21FrostBolt>(Frost) != nullptr);
	TestEqual(TEXT("It hits for 7"), Frost->Damage, 7);
	TestTrue(TEXT("It appears at the muzzle"), Frost->GetActorLocation().Equals(FVector(100.f, 50.f, 0.f), 0.1f));
	TestTrue(TEXT("And it knew its shooter when it began play"), Frost->bShooterKnownAtBeginPlay);

	TestEqual(TEXT("Two shots were counted"), Turret->ShotsFired, 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_TurretRefactor_SpreadFansOut, "Dojo.P21.TurretRefactor.SpreadFansOut", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A spread makes three ember bolts, turned minus FanDegrees, straight, and plus FanDegrees from the turret's facing, and counts three. */
bool FDojo_P21_TurretRefactor_SpreadFansOut::RunTest(const FString& Parameters)
{
	using namespace DojoP21TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP21Turret* Turret = TestWorld.SpawnActor<ADojoP21Turret>();
	if (!TestNotNull(TEXT("Turret spawned"), Turret)) return false;
	PlaceTurret(Turret);
	Turret->FanDegrees = 20.f;

	const TArray<ADojoP21Bolt*> Fan = Turret->FireSpread();
	if (!TestEqual(TEXT("Three bolts were made"), Fan.Num(), 3)) return false;

	const double ExpectedYaw[3] = { 70.0, 90.0, 110.0 };
	for (int32 Index = 0; Index < 3; Index++)
	{
		TestTrue(TEXT("Each is an ember bolt"), Cast<ADojoP21EmberBolt>(Fan[Index]) != nullptr);
		TestTrue(TEXT("Each appears at the muzzle"), Fan[Index]->GetActorLocation().Equals(FVector(100.f, 50.f, 0.f), 0.1f));
		TestTrue(TEXT("Each knew its shooter when it began play"), Fan[Index]->bShooterKnownAtBeginPlay);
		TestTrue(TEXT("And each is turned as the fan says"), FMath::IsNearlyEqual(Fan[Index]->GetActorRotation().Yaw, ExpectedYaw[Index], 0.1));
	}

	TestEqual(TEXT("Three shots were counted"), Turret->ShotsFired, 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_TurretRefactor_EveryShotAsksTheOneMaker, "Dojo.P21.TurretRefactor.EveryShotAsksTheOneMaker", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Every kind of shot gets its bolt by asking MakeBolt, so a turret that changes MakeBolt changes them all, and the bolts still come out right. */
bool FDojo_P21_TurretRefactor_EveryShotAsksTheOneMaker::RunTest(const FString& Parameters)
{
	using namespace DojoP21TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP21CountingTurret* Turret = TestWorld.SpawnActor<ADojoP21CountingTurret>();
	if (!TestNotNull(TEXT("Counting turret spawned"), Turret)) return false;
	PlaceTurret(Turret);

	Turret->FireEmber();
	TestEqual(TEXT("An ember shot asks once"), Turret->MakeCalls, 1);
	Turret->FireFrost();
	TestEqual(TEXT("A frost shot asks once more"), Turret->MakeCalls, 2);
	Turret->FireSpread();
	TestEqual(TEXT("A spread asks three times more"), Turret->MakeCalls, 5);

	if (!TestEqual(TEXT("Every request was noted"), Turret->AskedFor.Num(), 5)) return false;
	TestTrue(TEXT("The first asked for an ember bolt"), Turret->AskedFor[0].Get() == ADojoP21EmberBolt::StaticClass());
	TestTrue(TEXT("The second asked for a frost bolt"), Turret->AskedFor[1].Get() == ADojoP21FrostBolt::StaticClass());
	TestTrue(TEXT("The three of the spread asked for ember bolts"), Turret->AskedFor[2].Get() == ADojoP21EmberBolt::StaticClass() && Turret->AskedFor[3].Get() == ADojoP21EmberBolt::StaticClass() && Turret->AskedFor[4].Get() == ADojoP21EmberBolt::StaticClass());
	TestEqual(TEXT("And all five bolts were counted as fired"), Turret->ShotsFired, 5);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_TurretRefactor_ARefusalStopsEveryKindOfShot, "Dojo.P21.TurretRefactor.ARefusalStopsEveryKindOfShot", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** When the one maker refuses, no kind of shot fires anything or counts anything, and when it stops refusing the turret works again. */
bool FDojo_P21_TurretRefactor_ARefusalStopsEveryKindOfShot::RunTest(const FString& Parameters)
{
	using namespace DojoP21TurretTest;

	FDojoTestWorld TestWorld;

	ADojoP21CountingTurret* Turret = TestWorld.SpawnActor<ADojoP21CountingTurret>();
	if (!TestNotNull(TEXT("Counting turret spawned"), Turret)) return false;
	PlaceTurret(Turret);
	Turret->bRefuse = true;

	TestTrue(TEXT("An ember shot returns nothing"), Turret->FireEmber() == nullptr);
	TestTrue(TEXT("A frost shot returns nothing"), Turret->FireFrost() == nullptr);
	TestEqual(TEXT("A spread returns no bolts"), Turret->FireSpread().Num(), 0);
	TestEqual(TEXT("Nothing was counted as fired"), Turret->ShotsFired, 0);

	Turret->bRefuse = false;
	TestTrue(TEXT("Once the maker works again, so do the shots"), Turret->FireEmber() != nullptr);
	TestEqual(TEXT("And that one shot is counted"), Turret->ShotsFired, 1);

	return true;
}

#endif
```

# Hints

- Put the three firing functions side by side. Which lines are word for word the same in all of them, and what is the one thing that differs between an ember shot and a frost shot?
- `MakeBolt` receives the class as a value, so the firing functions no longer need to name a bolt type in a spawn call. Where should the count of shots fired be kept, so that a bolt which was never made is never counted?
- A turret that overrides `MakeBolt` only changes the shots that really ask it. If one firing function still builds its own bolt, which of the tests would notice, and what would it say?

# Rubric

- FireEmber, FireFrost, and FireSpread each get every bolt they fire by calling MakeBolt, and none of them spawns a bolt itself.
- MakeBolt makes a bolt of the class it is given at the muzzle it is given, sets the turret as shooter before the bolt begins play, brings it to life, and counts it.
- When MakeBolt makes nothing, the firing function returns nothing, FireSpread returns only the bolts that were made, and nothing is counted for the others.
- Which bolts each shot makes, where they appear, how they are turned, how hard they hit, and how many are counted are exactly as before.
- A subclass that overrides MakeBolt changes every kind of shot with no change to the three firing functions.
- The turret knows the bolt base class and the classes it asks for; the bolts know the turret only as their shooter, an actor.

# Alternative

The shared steps could move into a helper that only prepares a bolt that the firing function has already spawned. That removes some repetition, but each function still spawns its own bolt, so the pool has no single place to plug in. A separate factory object handed to the turret would let the maker be swapped without subclassing the turret, and is the better choice when many different classes need the same maker or the maker has state of its own. It is also more to build and to wire up. A virtual function on the turret is the smallest change that gives the turret one place where its bolts are made, and the counting turret shows how a subclass takes that place over. Moving the shot counter into `MakeBolt` also means a subclass that makes bolts a different way still has to decide whether to count them, so the counting turret calls the turret's own way and lets it count.
