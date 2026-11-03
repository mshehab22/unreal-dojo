---
id: p16-ripple-refactor
title: Ripples that come back
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [object-pool]
skills: [object-pool, refactoring]
terms: [object-pool, spawnactor, destroy, tweakobjectptr, set-actor-hidden-in-game, primary-actor-tick]
prerequisites: [p16-shell-fuse]
xp: 110
estimatedMinutes: 30
concepts:
  - A short-lived effect can fade out of play instead of destroying itself, and wait to be shown again
  - The water spawns a ripple only when none is free, so it never owns more than ever showed at once
  - When every ripple shows, the oldest moves to the newest splash and starts its time again
  - A lifespan ends an actor for good, so a ripple that comes back counts its own time
  - Splash, the showing count, and what each splash looks like stay exactly as they were
---

# Brief

After the refactor, a night of hundreds of splashes spawns only as many ripples as ever showed at once, and every splash looks exactly as it did before.

`ADojoP16Water` is the harbor's water. Every `Splash` shows a ripple at a spot for `RippleSeconds`, 1 by default, and returns it. At most `MaxRipples`, 5 by default, show at once: when that many already show, the oldest one gives way to the new splash. `GetShowingCount` says how many show now. `ADojoP16Ripple` is the ring on the water. The water depends on the ripples; the ripples know nothing about the water.

Today every splash spawns a new ripple and gives it a lifespan with `SetLifeSpan`, so it destroys itself when its time is up, and a full water destroys its oldest ripple to make room. A show splashes twice a second for minutes on end, and every splash is a spawn and, a second later, a destroy for the garbage collector to clean up.

Refactor the ripples so they come back:

- The water keeps the ripples it spawns, in a `UPROPERTY` array, never destroys one during play, and destroys them when it ends play.
- A splash shows a ripple that has faded. Only when none has, and the water has fewer than `MaxRipples`, does it spawn a new one.
- When `MaxRipples` show, the one that has shown longest moves to the new splash and shows for the full `RippleSeconds` from then.
- A ripple whose time is up fades out of play, hidden and not ticking, and waits to be shown again. Nothing gives it a lifespan.
- `Splash`, `GetShowingCount`, `RippleSeconds`, and `MaxRipples` keep their names and signatures, and every splash looks exactly as it did before.

Four of the six tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place a `DojoP16Water`. In the Level Blueprint, on Begin Play, use Set Timer by Event with a looping time of 0.4 seconds to call Splash on the water at its own location. Press Play, then press F8 to eject and watch the Outliner. Before the refactor, `DojoP16Ripple` actors keep appearing and disappearing, each with a new number in its name. After it, the same three ripples stay in the list for the whole session.

# Files

## DojoP16Ripple.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Ripple.generated.h"

/** A ring on the water where a burst's sparks came down. It knows nothing about the water. */
UCLASS()
class ADojoP16Ripple : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP16Ripple();
};
```

## DojoP16Ripple.cpp

```cpp
#include "DojoP16Ripple.h"

#include "Components/SceneComponent.h"

ADojoP16Ripple::ADojoP16Ripple()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}
```

## DojoP16Water.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP16Water.generated.h"

class ADojoP16Ripple;

/** The harbor's water: every splash shows a ripple for RippleSeconds, and at most MaxRipples show at once, the oldest giving way to the newest. */
UCLASS()
class ADojoP16Water : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP16Water();

	/** How long each ripple shows. */
	UPROPERTY(EditAnywhere, Category = "Water", meta = (ClampMin = "0.1"))
	float RippleSeconds = 1.f;

	/** The most ripples that show at once. */
	UPROPERTY(EditAnywhere, Category = "Water", meta = (ClampMin = "1"))
	int32 MaxRipples = 5;

	/** Shows a ripple at Where for RippleSeconds and returns it; when MaxRipples already show, the oldest gives way. */
	UFUNCTION(BlueprintCallable, Category = "Water")
	ADojoP16Ripple* Splash(const FVector& Where);

	/** Ripples showing now. */
	UFUNCTION(BlueprintPure, Category = "Water")
	int32 GetShowingCount() const;

private:
	/** Ripples showing now, oldest first; each destroys itself when its lifespan ends. */
	TArray<TWeakObjectPtr<ADojoP16Ripple>> Showing;
};
```

## DojoP16Water.cpp

```cpp
#include "DojoP16Water.h"

#include "Components/SceneComponent.h"
#include "DojoP16Ripple.h"
#include "Engine/World.h"

ADojoP16Water::ADojoP16Water()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP16Ripple* ADojoP16Water::Splash(const FVector& Where)
{
	Showing.RemoveAll([](const TWeakObjectPtr<ADojoP16Ripple>& Ripple) { return !Ripple.IsValid(); });

	if (Showing.Num() >= MaxRipples)
	{
		if (ADojoP16Ripple* Oldest = Showing[0].Get()) Oldest->Destroy();
		Showing.RemoveAt(0);
	}

	ADojoP16Ripple* Ripple = GetWorld()->SpawnActor<ADojoP16Ripple>(ADojoP16Ripple::StaticClass(), Where, FRotator::ZeroRotator);
	if (!Ripple) return nullptr;

	Ripple->SetLifeSpan(RippleSeconds);
	Showing.Add(Ripple);
	return Ripple;
}

int32 ADojoP16Water::GetShowingCount() const
{
	int32 Count = 0;
	for (const TWeakObjectPtr<ADojoP16Ripple>& Ripple : Showing)
	{
		if (Ripple.IsValid()) Count++;
	}
	return Count;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/World.h"
#include "EngineUtils.h"
#include "Quests/p16-ripple-refactor/DojoP16Ripple.h"
#include "Quests/p16-ripple-refactor/DojoP16Water.h"
#include "Support/DojoTestWorld.h"

namespace DojoP16RippleTest
{
	/** Spawns the water with MaxRipples set before its BeginPlay. */
	ADojoP16Water* SpawnWater(FDojoTestWorld& TestWorld, int32 MaxRipples)
	{
		ADojoP16Water* Water = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP16Water>(ADojoP16Water::StaticClass(), FTransform::Identity);
		if (!Water) return nullptr;
		Water->MaxRipples = MaxRipples;
		Water->FinishSpawning(FTransform::Identity);
		return Water;
	}

	/** Where every ripple that shows now stands, counted from the world itself. */
	TArray<FVector> ShowingSpots(FDojoTestWorld& TestWorld)
	{
		TArray<FVector> Spots;
		for (TActorIterator<ADojoP16Ripple> Ripple(TestWorld.GetWorld()); Ripple; ++Ripple)
		{
			if (!Ripple->IsHidden()) Spots.Add(Ripple->GetActorLocation());
		}
		return Spots;
	}

	/** True when one of Spots is Where. */
	bool HasSpot(const TArray<FVector>& Spots, const FVector& Where)
	{
		for (const FVector& Spot : Spots)
		{
			if (Spot.Equals(Where)) return true;
		}
		return false;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_EverySplashShowsARipple, "Dojo.P16.Ripples.EverySplashShowsARipple", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three splashes show three ripples, each where its splash was. Passes before and after the refactor. */
bool FDojo_P16_Ripples_EverySplashShowsARipple::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	FDojoTestWorld TestWorld;

	ADojoP16Water* Water = SpawnWater(TestWorld, 5);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	const FVector A(100.f, 0.f, 0.f);
	const FVector B(200.f, 0.f, 0.f);
	const FVector C(300.f, 0.f, 0.f);
	TestNotNull(TEXT("A splash returns its ripple"), Water->Splash(A));
	Water->Splash(B);
	Water->Splash(C);

	TestEqual(TEXT("Three ripples show"), Water->GetShowingCount(), 3);
	const TArray<FVector> Spots = ShowingSpots(TestWorld);
	TestEqual(TEXT("The world shows three ripples too"), Spots.Num(), 3);
	TestTrue(TEXT("One shows at each splash"), HasSpot(Spots, A) && HasSpot(Spots, B) && HasSpot(Spots, C));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_RipplesFadeAfterTheirTime, "Dojo.P16.Ripples.RipplesFadeAfterTheirTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A ripple shows for its second and then is gone. Passes before and after the refactor. */
bool FDojo_P16_Ripples_RipplesFadeAfterTheirTime::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	FDojoTestWorld TestWorld;

	ADojoP16Water* Water = SpawnWater(TestWorld, 5);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	Water->Splash(FVector(100.f, 0.f, 0.f));
	TestWorld.Tick(54);
	TestEqual(TEXT("At 0.9 seconds the ripple still shows"), Water->GetShowingCount(), 1);
	TestEqual(TEXT("And the world shows it"), ShowingSpots(TestWorld).Num(), 1);

	TestWorld.Tick(12);
	TestEqual(TEXT("At 1.1 seconds it is gone"), Water->GetShowingCount(), 0);
	TestEqual(TEXT("And the world shows none"), ShowingSpots(TestWorld).Num(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_AFullWaterLetsTheOldestGo, "Dojo.P16.Ripples.AFullWaterLetsTheOldestGo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With room for three, a fourth splash takes the place of the first. Passes before and after the refactor. */
bool FDojo_P16_Ripples_AFullWaterLetsTheOldestGo::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	FDojoTestWorld TestWorld;

	ADojoP16Water* Water = SpawnWater(TestWorld, 3);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	const FVector A(100.f, 0.f, 0.f);
	const FVector B(200.f, 0.f, 0.f);
	const FVector C(300.f, 0.f, 0.f);
	const FVector D(400.f, 0.f, 0.f);
	Water->Splash(A);
	TestWorld.Tick(1);
	Water->Splash(B);
	TestWorld.Tick(1);
	Water->Splash(C);
	TestWorld.Tick(1);
	Water->Splash(D);

	TestEqual(TEXT("Never more than three show"), Water->GetShowingCount(), 3);
	const TArray<FVector> Spots = ShowingSpots(TestWorld);
	TestEqual(TEXT("The world shows three"), Spots.Num(), 3);
	TestFalse(TEXT("The oldest, at the first splash, gave way"), HasSpot(Spots, A));
	TestTrue(TEXT("The other three show"), HasSpot(Spots, B) && HasSpot(Spots, C) && HasSpot(Spots, D));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_ARippleThatGaveWayShowsItsFullTime, "Dojo.P16.Ripples.ARippleThatGaveWayShowsItsFullTime", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** With room for one, a splash half a second after another shows for a full second from its own splash. Passes before and after the refactor. */
bool FDojo_P16_Ripples_ARippleThatGaveWayShowsItsFullTime::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	FDojoTestWorld TestWorld;

	ADojoP16Water* Water = SpawnWater(TestWorld, 1);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	const FVector B(200.f, 0.f, 0.f);
	Water->Splash(FVector(100.f, 0.f, 0.f));
	TestWorld.Tick(30);
	Water->Splash(B);

	TestWorld.Tick(48);
	TArray<FVector> Spots = ShowingSpots(TestWorld);
	TestEqual(TEXT("0.8 seconds after the second splash one ripple still shows"), Spots.Num(), 1);
	TestTrue(TEXT("At the second splash, timed from that splash and not from the first"), HasSpot(Spots, B));

	TestWorld.Tick(18);
	TestEqual(TEXT("1.1 seconds after the second splash it is gone"), Water->GetShowingCount(), 0);
	TestEqual(TEXT("And the world shows none"), ShowingSpots(TestWorld).Num(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_ABusyNightSpawnsOnlyWhatShows, "Dojo.P16.Ripples.ABusyNightSpawnsOnlyWhatShows", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Forty splashes, one every 0.4 seconds, never show more than three ripples at once, so no more than three are ever spawned. Fails on the starter. */
bool FDojo_P16_Ripples_ABusyNightSpawnsOnlyWhatShows::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	int32 Spawned = 0;
	FDojoTestWorld TestWorld;
	TestWorld.GetWorld()->AddOnActorSpawnedHandler(FOnActorSpawned::FDelegate::CreateLambda([&Spawned](AActor* Actor)
	{
		if (Actor->IsA<ADojoP16Ripple>()) Spawned++;
	}));

	ADojoP16Water* Water = SpawnWater(TestWorld, 5);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	int32 MostShowing = 0;
	for (int32 Splash = 0; Splash < 40; ++Splash)
	{
		Water->Splash(FVector(100.f * (Splash % 4), 0.f, 0.f));
		MostShowing = FMath::Max(MostShowing, Water->GetShowingCount());
		TestWorld.Tick(24);
	}

	TestEqual(TEXT("No more than three ripples ever show at once"), MostShowing, 3);
	TestTrue(FString::Printf(TEXT("Only as many ripples are spawned as ever showed at once: 3 at most, but %d were spawned"), Spawned), Spawned <= 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P16_Ripples_TheSameRippleComesBack, "Dojo.P16.Ripples.TheSameRippleComesBack", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A ripple that faded is the one the next splash shows, still alive and in play again. Fails on the starter. */
bool FDojo_P16_Ripples_TheSameRippleComesBack::RunTest(const FString& Parameters)
{
	using namespace DojoP16RippleTest;
	FDojoTestWorld TestWorld;

	ADojoP16Water* Water = SpawnWater(TestWorld, 5);
	if (!TestNotNull(TEXT("Water spawned"), Water)) return false;

	const TWeakObjectPtr<ADojoP16Ripple> First = Water->Splash(FVector(100.f, 0.f, 0.f));
	TestTrue(TEXT("The first splash shows a ripple"), First.IsValid());
	TestWorld.Tick(72);
	TestEqual(TEXT("1.2 seconds later it has faded"), Water->GetShowingCount(), 0);
	TestTrue(TEXT("The faded ripple is still alive, out of play"), First.IsValid());
	if (!First.IsValid()) return false;
	TestTrue(TEXT("And hidden"), First->IsHidden());

	const FVector B(200.f, 0.f, 0.f);
	ADojoP16Ripple* Second = Water->Splash(B);
	TestTrue(TEXT("The next splash shows the ripple that faded instead of a new one"), Second == First.Get());
	TestFalse(TEXT("It shows again"), First->IsHidden());
	TestTrue(TEXT("At the new splash"), First->GetActorLocation().Equals(B));

	return true;
}

#endif
```

# Hints

- The two failing tests count spawns and follow the first ripple. Read their messages: how many ripples did the starter spawn, and what became of the first one?
- A faded ripple only has to be out of play to be shown again. Which line of the starter ends a ripple's life for good, and what could the ripple do in its place?
- The water needs two answers at every splash: which of its ripples is free, and which has shown longest. What order could it keep its array in so the second answer is easy?

# Rubric

- The water spawns a ripple only when none of its ripples has faded and it has fewer than MaxRipples, and it destroys none during play.
- A faded ripple is out of play, hidden and not ticking, has no lifespan, and is shown again by a later splash.
- When MaxRipples show, the one that has shown longest moves to the new splash and shows for the full RippleSeconds.
- The water keeps its ripples in a UPROPERTY array and destroys them when it ends play.
- Splash, GetShowingCount, RippleSeconds, and MaxRipples keep their names and signatures, and each splash looks exactly as before.
- The water depends on the ripples; the ripples know nothing about the water.

# Alternative

The water could spawn all `MaxRipples` ripples when play begins instead of one at a time. Then no splash ever spawns, even the first five, but a quiet evening keeps five ripples in memory that it never shows. Spawning on demand up to the limit keeps exactly as many as the busiest moment needed, and pays for a spawn only until that moment has happened once. When the limit is reached, recycling the oldest suits ripples, because players watch the newest splash, and an old ring cut short draws no eye; for something the player tracks, such as a score popup, refusing the newest would be the kinder choice. And if the ring were a Niagara effect, none of this code would be needed: spawning it with the `AutoRelease` pooling method lets the engine reuse its components.
