---
id: p16-shell-fuse
title: Shells that rest and wake clean
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [object-pool]
skills: [object-pool, lifecycle]
terms: [object-pool, set-actor-hidden-in-game, set-actor-enable-collision, primary-actor-tick, tsubclassof, tick]
prerequisites: [p16-object-pool-card]
xp: 110
estimatedMinutes: 30
concepts:
  - A resting shell is out of play in every way, and a woken shell starts exactly like a fresh one
  - A shell can be sent to rest at any moment, and its next use must start clean
  - The shell knows how to rest and how to wake; the pool only decides when
  - Every switch that waking turns on, resting turns off
  - Fire, Tick, and the burst are given and stay as they are
---

# Brief

When you press Play with the setup below, four shells burst again and again from a pool that never spawns a fifth, and every shell the pool lends out waits, in play and clean, until it is fired.

`ADojoP16Shell` is a firework shell. `Fire` lights its fuse: the shell climbs at `RiseSpeed` and bursts when `FuseSeconds` have passed, and `HasBurst` says so. `Fire` refuses, returning false, while the shell rests or is already flying. All of that is given, and so is `ADojoP16ShellPool`, which spawns `PoolSize` shells, 4 by default, when play begins and sends each one to rest, wakes a resting shell for every `Acquire`, and sends it back to rest on `Release`.

Yours are `RestInPool` and `WakeFromPool`. A resting shell is out of play: hidden, not colliding, not ticking, not flying, and not burst, and `IsResting` is true, so it refuses to fire. A shell can be sent to rest at any moment, also in the middle of its flight, for example when the show is stopped. `WakeFromPool` brings a resting shell back into play at the spot it is given: drawn, colliding, ticking, not resting, not flying, and not burst, as clean as a freshly spawned shell, and it waits there until it is fired. A resting shell never bursts, and a woken shell bursts only after it is fired again, however its last use ended. `Fire`, `Tick`, and the burst are given and stay as they are; the shell knows nothing about the pool.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP16ShellPool`. In the Level Blueprint, on Begin Play, first wait a Delay of 0.2 seconds so the pool has spawned its shells, then call Acquire on it four times, store each result in a variable, Fire each shell with a fuse of 1 second, and call Acquire a fifth time: print Is Valid of the fifth result, false. After a Delay of 1.5 seconds, print Has Burst on each of the four stored shells, true four times, then call Release on each and Acquire four times again: Is Valid prints true four times. Press Play, then press F8 to eject: the Outliner lists four `DojoP16Shell` actors the whole time.

# Files

## DojoP16Shell.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Shell.generated.h"

class USphereComponent;

/** A firework shell: fired, it climbs until its fuse runs out and it bursts. It can be sent to rest out of play and woken again, and knows nothing about the pool that keeps it. */
UCLASS()
class ADojoP16Shell : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the body sphere and lets the shell tick. */
	ADojoP16Shell();

	/** Lights the fuse: the shell climbs at RiseSpeed and bursts after FuseSeconds. Refused, returning false, while resting or already flying. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	bool Fire(float FuseSeconds);

	/** Takes the shell out of play, at any moment of its flight, ready to be woken again. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	void RestInPool();

	/** Brings a resting shell back into play at Where, as clean as a fresh one, waiting to be fired. */
	UFUNCTION(BlueprintCallable, Category = "Shell")
	void WakeFromPool(const FVector& Where);

	/** True while the shell is out of play. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool IsResting() const;

	/** True from Fire until the burst. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool IsFlying() const;

	/** True once the fuse has run out, until the shell rests, wakes, or is fired again. */
	UFUNCTION(BlueprintPure, Category = "Shell")
	bool HasBurst() const;

	/** Climbs while the shell flies. */
	virtual void Tick(float DeltaSeconds) override;

	/** How fast a flying shell climbs, in units per second. */
	UPROPERTY(EditAnywhere, Category = "Shell")
	float RiseSpeed = 800.f;

protected:
	/** The shell's body, which collides. */
	UPROPERTY(VisibleAnywhere, Category = "Shell")
	TObjectPtr<USphereComponent> Body;

private:
	/** The end of the fuse: the shell stops climbing and has burst. */
	void Burst();

	/** The fuse lit by Fire. */
	FTimerHandle FuseTimer;

	/** True while the shell is out of play. */
	bool bResting = false;

	/** True from Fire until the burst. */
	bool bFlying = false;

	/** True once the fuse has run out. */
	bool bBurst = false;
};
```

## DojoP16Shell.cpp

```cpp
#include "DojoP16Shell.h"

#include "Components/SphereComponent.h"
#include "TimerManager.h"

ADojoP16Shell::ADojoP16Shell()
{
	PrimaryActorTick.bCanEverTick = true;

	Body = CreateDefaultSubobject<USphereComponent>(TEXT("Body"));
	Body->InitSphereRadius(30.f);
	Body->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = Body;
}

bool ADojoP16Shell::Fire(float FuseSeconds)
{
	if (bResting || bFlying) return false;

	bFlying = true;
	bBurst = false;
	GetWorldTimerManager().SetTimer(FuseTimer, this, &ADojoP16Shell::Burst, FuseSeconds, false);
	return true;
}

void ADojoP16Shell::RestInPool()
{
}

void ADojoP16Shell::WakeFromPool(const FVector& Where)
{
}

bool ADojoP16Shell::IsResting() const
{
	return bResting;
}

bool ADojoP16Shell::IsFlying() const
{
	return bFlying;
}

bool ADojoP16Shell::HasBurst() const
{
	return bBurst;
}

void ADojoP16Shell::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (!bFlying) return;

	AddActorWorldOffset(FVector(0.f, 0.f, RiseSpeed * DeltaSeconds));
}

void ADojoP16Shell::Burst()
{
	bFlying = false;
	bBurst = true;
}
```

## DojoP16ShellPool.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16ShellPool.generated.h"

class ADojoP16Shell;

/** Spawns a fixed set of shells when play begins, wakes one for every request, and sends it back to rest when it is returned. It decides when shells rest and wake; the shells decide how. */
UCLASS()
class ADojoP16ShellPool : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, turns ticking off, and picks the C++ shell class. */
	ADojoP16ShellPool();

	/** The shell class the pool spawns. */
	UPROPERTY(EditAnywhere, Category = "Pool")
	TSubclassOf<ADojoP16Shell> ShellClass;

	/** How many shells the pool spawns when play begins, which is the most it can ever lend at once. */
	UPROPERTY(EditAnywhere, Category = "Pool", meta = (ClampMin = "1"))
	int32 PoolSize = 4;

	/** Wakes a resting shell at Where and lends it; nullptr when every shell is out. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	ADojoP16Shell* Acquire(const FVector& Where);

	/** Sends a shell this pool lent back to rest. False, changing nothing, for any shell the pool has not lent. */
	UFUNCTION(BlueprintCallable, Category = "Pool")
	bool Release(ADojoP16Shell* Shell);

	/** Shells resting in the pool. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetRestingCount() const;

	/** Shells lent out now. */
	UFUNCTION(BlueprintPure, Category = "Pool")
	int32 GetLentCount() const;

protected:
	/** Spawns every shell the pool will ever use and sends each one to rest. */
	virtual void BeginPlay() override;

	/** Destroys the shells the pool owns. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Shells waiting to be lent, at rest. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Shell>> Resting;

	/** Shells lent out now, in play. */
	UPROPERTY()
	TArray<TObjectPtr<ADojoP16Shell>> Lent;
};
```

## DojoP16ShellPool.cpp

```cpp
#include "DojoP16ShellPool.h"

#include "Components/SceneComponent.h"
#include "DojoP16Shell.h"
#include "Engine/World.h"

ADojoP16ShellPool::ADojoP16ShellPool()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

	ShellClass = ADojoP16Shell::StaticClass();
}

void ADojoP16ShellPool::BeginPlay()
{
	Super::BeginPlay();

	if (!ShellClass) return;

	for (int32 Index = 0; Index < PoolSize; ++Index)
	{
		ADojoP16Shell* Shell = GetWorld()->SpawnActor<ADojoP16Shell>(ShellClass, GetActorLocation(), GetActorRotation());
		if (!Shell) continue;

		Shell->RestInPool();
		Resting.Add(Shell);
	}
}

void ADojoP16ShellPool::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	for (ADojoP16Shell* Shell : Resting)
	{
		if (IsValid(Shell)) Shell->Destroy();
	}

	for (ADojoP16Shell* Shell : Lent)
	{
		if (IsValid(Shell)) Shell->Destroy();
	}

	Resting.Empty();
	Lent.Empty();

	Super::EndPlay(EndPlayReason);
}

ADojoP16Shell* ADojoP16ShellPool::Acquire(const FVector& Where)
{
	if (Resting.Num() == 0) return nullptr;

	ADojoP16Shell* Shell = Resting.Pop();
	Lent.Add(Shell);
	Shell->WakeFromPool(Where);
	return Shell;
}

bool ADojoP16ShellPool::Release(ADojoP16Shell* Shell)
{
	if (!Lent.Contains(Shell)) return false;

	Lent.Remove(Shell);
	Shell->RestInPool();
	Resting.Add(Shell);
	return true;
}

int32 ADojoP16ShellPool::GetRestingCount() const
{
	return Resting.Num();
}

int32 ADojoP16ShellPool::GetLentCount() const
{
	return Lent.Num();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "Quests/p16-shell-fuse/DojoP16Shell.h"
#include "Quests/p16-shell-fuse/DojoP16ShellPool.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_ShellFuse_ARestingShellIsOutOfPlay, "Dojo.P16.ShellFuse.ARestingShellIsOutOfPlay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A shell sent to rest mid-flight is hidden, does not collide, does not tick, is not flying, refuses to fire, and stays where it stopped. */
bool FDojo_P16_ShellFuse_ARestingShellIsOutOfPlay::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16Shell* Shell = TestWorld.SpawnActor<ADojoP16Shell>();
	if (!TestNotNull(TEXT("Shell spawned"), Shell)) return false;

	TestTrue(TEXT("A fresh shell fires"), Shell->Fire(5.f));
	TestWorld.Tick(30);
	TestTrue(TEXT("It climbs"), Shell->GetActorLocation().Z > 0.f);

	Shell->RestInPool();
	TestTrue(TEXT("It rests"), Shell->IsResting());
	TestTrue(TEXT("A resting shell is hidden"), Shell->IsHidden());
	TestFalse(TEXT("A resting shell does not collide"), Shell->GetActorEnableCollision());
	TestFalse(TEXT("A resting shell does not tick"), Shell->IsActorTickEnabled());
	TestFalse(TEXT("A resting shell is not flying"), Shell->IsFlying());
	TestFalse(TEXT("A resting shell refuses to fire"), Shell->Fire(1.f));

	const FVector WhereItStopped = Shell->GetActorLocation();
	TestWorld.Tick(30);
	TestTrue(TEXT("Half a second later it is still where it stopped"), Shell->GetActorLocation().Equals(WhereItStopped));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_ShellFuse_AWokenShellStartsClean, "Dojo.P16.ShellFuse.AWokenShellStartsClean", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A shell that burst, rested, and woke is in play at its new spot, not burst and not flying, and fires and climbs again. */
bool FDojo_P16_ShellFuse_AWokenShellStartsClean::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16Shell* Shell = TestWorld.SpawnActor<ADojoP16Shell>();
	if (!TestNotNull(TEXT("Shell spawned"), Shell)) return false;

	Shell->Fire(0.5f);
	TestWorld.Tick(45);
	TestTrue(TEXT("Its fuse ran out and it burst"), Shell->HasBurst());

	Shell->RestInPool();
	TestFalse(TEXT("A resting shell has no burst left from its last use"), Shell->HasBurst());
	const FVector NewSpot(100.f, 0.f, 0.f);
	Shell->WakeFromPool(NewSpot);
	TestFalse(TEXT("A woken shell is not resting"), Shell->IsResting());
	TestFalse(TEXT("It is drawn again"), Shell->IsHidden());
	TestTrue(TEXT("It collides again"), Shell->GetActorEnableCollision());
	TestTrue(TEXT("It ticks again"), Shell->IsActorTickEnabled());
	TestFalse(TEXT("It is not flying until fired"), Shell->IsFlying());
	TestFalse(TEXT("Its last burst is forgotten"), Shell->HasBurst());
	TestTrue(TEXT("It stands where it was woken"), Shell->GetActorLocation().Equals(NewSpot));

	TestTrue(TEXT("It fires again"), Shell->Fire(5.f));
	TestWorld.Tick(30);
	TestTrue(TEXT("And flies"), Shell->IsFlying());
	TestTrue(TEXT("Climbing from its new spot"), Shell->GetActorLocation().Z > NewSpot.Z);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_ShellFuse_AShellSentBackEarlyStaysQuiet, "Dojo.P16.ShellFuse.AShellSentBackEarlyStaysQuiet", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two shells fired with a 2 second fuse are sent to rest after 1 second; one stays at rest and one is woken half a second later. Neither bursts until fired again. */
bool FDojo_P16_ShellFuse_AShellSentBackEarlyStaysQuiet::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP16Shell* Woken = TestWorld.SpawnActor<ADojoP16Shell>();
	ADojoP16Shell* Resting = TestWorld.SpawnActor<ADojoP16Shell>();
	if (!TestNotNull(TEXT("First shell spawned"), Woken) || !TestNotNull(TEXT("Second shell spawned"), Resting)) return false;

	TestTrue(TEXT("The first shell fires with a 2 second fuse"), Woken->Fire(2.f));
	TestTrue(TEXT("The second shell fires with a 2 second fuse"), Resting->Fire(2.f));
	TestWorld.Tick(60);
	TestFalse(TEXT("One second in, nothing has burst"), Woken->HasBurst() || Resting->HasBurst());

	Woken->RestInPool();
	Resting->RestInPool();
	TestWorld.Tick(30);
	Woken->WakeFromPool(FVector::ZeroVector);
	TestWorld.Tick(45);

	TestFalse(TEXT("The shell still resting has not burst, 2.25 seconds after it was fired and 1.25 seconds after it was sent to rest"), Resting->HasBurst());
	TestFalse(TEXT("The shell woken at 1.5 seconds has not burst, because it has not been fired since it woke"), Woken->HasBurst());

	TestTrue(TEXT("Fired now, the woken shell accepts"), Woken->Fire(2.f));
	TestWorld.Tick(110);
	TestFalse(TEXT("Its new fuse takes its full 2 seconds"), Woken->HasBurst());
	TestWorld.Tick(20);
	TestTrue(TEXT("And then it bursts"), Woken->HasBurst());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_ShellFuse_FourShellsMakeAShow, "Dojo.P16.ShellFuse.FourShellsMakeAShow", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The given pool spawns four shells once and lends them for three volleys of four: twelve bursts, four shells ever spawned. */
bool FDojo_P16_ShellFuse_FourShellsMakeAShow::RunTest(const FString& Parameters)
{
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;
	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor* Actor)
	{
		if (Actor->IsA<ADojoP16Shell>()) Spawned++;
	}));

	ADojoP16ShellPool* Pool = TestWorld.SpawnActor<ADojoP16ShellPool>();
	if (!TestNotNull(TEXT("Pool spawned"), Pool)) return false;
	TestEqual(TEXT("Four shells rest in the pool"), Pool->GetRestingCount(), 4);

	int32 Bursts = 0;
	for (int32 Volley = 0; Volley < 3; ++Volley)
	{
		TArray<ADojoP16Shell*> Shells;
		for (int32 Index = 0; Index < 4; ++Index)
		{
			ADojoP16Shell* Shell = Pool->Acquire(FVector(100.f * Index, 0.f, 0.f));
			if (!TestNotNull(TEXT("Each of four requests gets a shell"), Shell)) return false;
			TestTrue(TEXT("A lent shell fires"), Shell->Fire(0.5f));
			Shells.Add(Shell);
		}
		TestNull(TEXT("A fifth request in a volley gets none"), Pool->Acquire(FVector::ZeroVector));

		TestWorld.Tick(45);
		for (ADojoP16Shell* Shell : Shells)
		{
			if (Shell->HasBurst()) Bursts++;
			TestTrue(TEXT("Each shell comes back"), Pool->Release(Shell));
		}
	}

	TestEqual(TEXT("Three volleys of four make twelve bursts"), Bursts, 12);
	TestEqual(TEXT("From only four shells ever spawned"), Spawned, 4);
	TestEqual(TEXT("All four rest again"), Pool->GetRestingCount(), 4);

	return true;
}

#endif
```

# Hints

- Read the failing test's message for which shell burst and when it was sent to rest.
- Hiding a shell and stopping its Tick only change what it does each frame, so find what else `Fire` set going.
- A shell sent back mid-flight must behave, when it is next fired, as if it had never been fired before.

# Rubric

- A resting shell is hidden, does not collide, does not tick, is not flying, is not burst, and refuses to fire.
- A resting shell stays quiet until it is fired.
- A woken shell is in play at the spot it was given, not resting, not flying, and not burst, and waits to be fired.
- Every switch WakeFromPool turns on, RestInPool turns off.
- Fire, Tick, and the burst are unchanged, and the shell knows nothing about the pool.
- The pool spawns its shells only when play begins.

# Alternative

`Fire` hands the fuse to the world's timer manager, and the timer manager keeps counting whatever the shell's own switches say. Hiding stops drawing and turning ticking off stops the shell's `Tick`, but the timer manager is not the shell's `Tick`. When an actor is destroyed, its pending timers never fire, because a timer holds its object weakly and a destroyed actor no longer counts. That is clean-up `Destroy` gave you for free, and a pool takes it away: a resting shell is alive, so the fuse lit in its last use bursts it at rest or in its next use. `RestInPool` has to put the fuse out with `GetWorldTimerManager().ClearTimer(FuseTimer)`, or every timer the shell owns with `ClearAllTimersForObject(this)`.

The pool could also do the resting and waking itself, flipping the three switches on any actor. Then any class can be pooled without changes, but the pool has to know every class's own clean-up, and the fuse is exactly the kind of thing it would not know about. With the shell owning `RestInPool` and `WakeFromPool`, each class says how it rests, and the pool only decides when. A `UINTERFACE` with those two functions lets one pool class hold many kinds of actors and still leave the how to each of them.

# Parsons

```yaml
- id: pool-acquire
  prompt: "Put the pool's Acquire in order. Refuse when no shell rests, mark the shell lent before waking it, then hand it out."
  lines:
    - "ADojoP16Shell* ADojoP16ShellPool::Acquire(const FVector& Where)"
    - "{"
    - "	if (Resting.Num() == 0) return nullptr;"
    - "	ADojoP16Shell* Shell = Resting.Pop();"
    - "	Lent.Add(Shell);"
    - "	Shell->WakeFromPool(Where);"
    - "	return Shell;"
    - "}"
  distractors:
    - line: "	ADojoP16Shell* Shell = GetWorld()->SpawnActor<ADojoP16Shell>(ShellClass, Where, FRotator::ZeroRotator);"
      mistake: Spawning in Acquire is exactly the work the pool exists to avoid; the shells it lends are the ones it spawned when play began.
```
