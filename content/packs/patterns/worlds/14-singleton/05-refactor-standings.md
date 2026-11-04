---
id: p14-standings-refactor
title: Standings that outlive the race
order: 5
kind: refactor
scaffold: stub
difficulty: 4
patterns: [singleton]
skills: [singleton, refactoring]
terms: [world-subsystem, static-variable, add-to-root, play-in-editor, newobject, tmap]
prerequisites: [p14-start-lights]
xp: 110
estimatedMinutes: 30
concepts:
  - Standings that belong to a race belong to the world the race runs in
  - A world subsystem is made with its world and destroyed with it, so every new world starts with empty standings
  - Checkpoints find the standings through their own world, never through a static
  - Two worlds open at once each keep their own standings
  - The checkpoints' and the standings' functions and a single race's rules stay exactly as they were
---

# Brief

After the refactor, every track starts with empty standings, two tracks open at the same time keep their standings apart, and a single race is counted exactly as before.

`ADojoP14Checkpoint` stands on the track with an `Index`. Drivers must reach the checkpoints in order: `Touch` reports a driver to the standings, which count the checkpoint only when it is the next one that driver needs, and return whether they counted it. `UDojoP14Standings` keeps how many checkpoints each driver has passed (`GetPassed`) and who is ahead (`GetLeader`): the driver who has passed the most, the first to get there on a tie, or None before anyone has passed one. A checkpoint's `GetStandings` returns the standings it reports to. The checkpoints depend on the standings; the standings know nothing about checkpoints.

Today the standings are a static `Get`: the first call makes them with `NewObject`, roots them with `AddToRoot` so the garbage collector leaves them alone, and keeps them for the rest of the program. In the editor, that means the standings of yesterday's play session are still there today, and two players in Play In Editor race on one shared table.

Refactor the standings so their world owns them:

- `UDojoP14Standings` becomes a `UWorldSubsystem`. Its static `Get` and the rooting go; nothing about the standings is static.
- `GetStandings` returns the standings of the checkpoint's own world, or nullptr when the checkpoint has no world, and `Touch` reports through it.
- `Pass`, `GetPassed`, `GetLeader`, `Touch`, and `GetStandings` keep their names and signatures, and a single race is counted exactly as before.

Two of the four tests pass on the starter and must pass after; two do not. Read their messages.

## See it in the editor

Place three `DojoP14Checkpoint` actors with Index 0, 1, and 2. In the Level Blueprint, on Begin Play, take checkpoint 0's Get Standings, print its Get Passed for driver Ada, then call Touch (Ada) on checkpoints 0 and 1 and print Get Passed again. Press Play: 0, then 2. Stop and press Play again: before the refactor the first print says 2, because the standings remembered a race from a world that no longer exists, and both touches are refused. After the refactor every play prints 0, then 2.

# Files

## DojoP14Standings.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP14Standings.generated.h"

/** Who is ahead in the race: how many checkpoints each driver has passed, in order. */
UCLASS()
class UDojoP14Standings : public UObject
{
	GENERATED_BODY()

public:
	/** The standings, made the first time anyone asks and kept until the program closes. */
	static UDojoP14Standings* Get();

	/** Driver reached the checkpoint numbered Index; counted only when it is the next one they need. True when counted. */
	UFUNCTION(BlueprintCallable, Category = "Standings")
	bool Pass(FName Driver, int32 Index);

	/** How many checkpoints Driver has passed in order. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	int32 GetPassed(FName Driver) const;

	/** The driver who has passed the most checkpoints, the first to get there on a tie; None before anyone has passed one. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	FName GetLeader() const;

private:
	/** Checkpoints passed, by driver. */
	TMap<FName, int32> Passed;

	/** The driver ahead. */
	FName Leader;
};
```

## DojoP14Standings.cpp

```cpp
#include "DojoP14Standings.h"

UDojoP14Standings* UDojoP14Standings::Get()
{
	static UDojoP14Standings* Instance = nullptr;
	if (!Instance)
	{
		Instance = NewObject<UDojoP14Standings>();
		Instance->AddToRoot();
	}
	return Instance;
}

bool UDojoP14Standings::Pass(FName Driver, int32 Index)
{
	int32& Count = Passed.FindOrAdd(Driver);
	if (Index != Count) return false;

	Count++;
	if (Leader.IsNone() || Count > GetPassed(Leader)) Leader = Driver;
	return true;
}

int32 UDojoP14Standings::GetPassed(FName Driver) const
{
	const int32* Count = Passed.Find(Driver);
	return Count ? *Count : 0;
}

FName UDojoP14Standings::GetLeader() const
{
	return Leader;
}
```

## DojoP14Checkpoint.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP14Checkpoint.generated.h"

class UDojoP14Standings;

/** A checkpoint on the track. Drivers must reach the checkpoints in the order of their numbers. */
UCLASS()
class ADojoP14Checkpoint : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP14Checkpoint();

	/** Where this checkpoint comes in the race, from 0. */
	UPROPERTY(EditAnywhere, Category = "Checkpoint", meta = (ClampMin = "0"))
	int32 Index = 0;

	/** Driver reaches this checkpoint; true when it was the next one they needed. */
	UFUNCTION(BlueprintCallable, Category = "Checkpoint")
	bool Touch(FName Driver);

	/** The standings this checkpoint reports to. */
	UFUNCTION(BlueprintPure, Category = "Checkpoint")
	UDojoP14Standings* GetStandings() const;
};
```

## DojoP14Checkpoint.cpp

```cpp
#include "DojoP14Checkpoint.h"

#include "Components/SceneComponent.h"
#include "DojoP14Standings.h"

ADojoP14Checkpoint::ADojoP14Checkpoint()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

bool ADojoP14Checkpoint::Touch(FName Driver)
{
	UDojoP14Standings* Standings = GetStandings();
	if (!Standings) return false;

	return Standings->Pass(Driver, Index);
}

UDojoP14Standings* ADojoP14Checkpoint::GetStandings() const
{
	return UDojoP14Standings::Get();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p14-standings-refactor/DojoP14Checkpoint.h"
#include "Quests/p14-standings-refactor/DojoP14Standings.h"
#include "Support/DojoTestWorld.h"

namespace DojoP14StandingsTest
{
	/** A driver name nothing has used before, so standings left over from earlier races cannot change this test's counts. */
	FName FreshDriver()
	{
		return FName(*FString::Printf(TEXT("Driver_%s"), *FGuid::NewGuid().ToString()));
	}

	/** Spawns Count checkpoints numbered from 0. */
	TArray<ADojoP14Checkpoint*> LayCheckpoints(FDojoTestWorld& TestWorld, int32 Count)
	{
		TArray<ADojoP14Checkpoint*> Result;
		for (int32 Number = 0; Number < Count; Number++)
		{
			ADojoP14Checkpoint* Checkpoint = TestWorld.SpawnActor<ADojoP14Checkpoint>();
			if (Checkpoint) Checkpoint->Index = Number;
			Result.Add(Checkpoint);
		}
		return Result;
	}

	/** True when every checkpoint in the list was spawned. */
	bool AllSpawned(const TArray<ADojoP14Checkpoint*>& Checkpoints)
	{
		for (const ADojoP14Checkpoint* Checkpoint : Checkpoints)
		{
			if (!Checkpoint) return false;
		}
		return true;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_Standings_CheckpointsCountInOrder, "Dojo.P14.Standings.CheckpointsCountInOrder", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A driver's checkpoints count only in order: skipping ahead and touching one twice are refused. */
bool FDojo_P14_Standings_CheckpointsCountInOrder::RunTest(const FString& Parameters)
{
	using namespace DojoP14StandingsTest;

	FDojoTestWorld Track;
	const TArray<ADojoP14Checkpoint*> Checkpoints = LayCheckpoints(Track, 3);
	if (!TestTrue(TEXT("Checkpoints spawned"), AllSpawned(Checkpoints))) return false;

	UDojoP14Standings* Standings = Checkpoints[0]->GetStandings();
	if (!TestNotNull(TEXT("The checkpoints report to standings"), Standings)) return false;
	TestTrue(TEXT("Every checkpoint on the track reports to the same standings"), Checkpoints[1]->GetStandings() == Standings && Checkpoints[2]->GetStandings() == Standings);

	const FName Driver = FreshDriver();
	TestTrue(TEXT("Checkpoint 0 counts"), Checkpoints[0]->Touch(Driver));
	TestFalse(TEXT("Skipping ahead to checkpoint 2 is refused"), Checkpoints[2]->Touch(Driver));
	TestTrue(TEXT("Checkpoint 1 counts"), Checkpoints[1]->Touch(Driver));
	TestFalse(TEXT("Touching checkpoint 1 again is refused"), Checkpoints[1]->Touch(Driver));
	TestTrue(TEXT("Checkpoint 2 counts now"), Checkpoints[2]->Touch(Driver));
	TestEqual(TEXT("Three checkpoints passed"), Standings->GetPassed(Driver), 3);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_Standings_DriversAreCountedApart, "Dojo.P14.Standings.DriversAreCountedApart", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two drivers on one track each need their own next checkpoint. */
bool FDojo_P14_Standings_DriversAreCountedApart::RunTest(const FString& Parameters)
{
	using namespace DojoP14StandingsTest;

	FDojoTestWorld Track;
	const TArray<ADojoP14Checkpoint*> Checkpoints = LayCheckpoints(Track, 3);
	if (!TestTrue(TEXT("Checkpoints spawned"), AllSpawned(Checkpoints))) return false;

	const FName Fast = FreshDriver();
	const FName Slow = FreshDriver();
	Checkpoints[0]->Touch(Fast);
	Checkpoints[1]->Touch(Fast);
	Checkpoints[0]->Touch(Slow);

	UDojoP14Standings* Standings = Checkpoints[0]->GetStandings();
	if (!TestNotNull(TEXT("The checkpoints report to standings"), Standings)) return false;
	TestEqual(TEXT("The fast driver passed two"), Standings->GetPassed(Fast), 2);
	TestEqual(TEXT("The slow driver passed one"), Standings->GetPassed(Slow), 1);
	TestFalse(TEXT("The slow driver cannot use the fast driver's progress"), Checkpoints[2]->Touch(Slow));
	TestTrue(TEXT("The fast driver can"), Checkpoints[2]->Touch(Fast));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_Standings_EachTrackKeepsItsOwn, "Dojo.P14.Standings.EachTrackKeepsItsOwn", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two tracks open at once, as with two players in Play In Editor, report to two different standings, and a race on one leaves the other untouched. */
bool FDojo_P14_Standings_EachTrackKeepsItsOwn::RunTest(const FString& Parameters)
{
	using namespace DojoP14StandingsTest;

	FDojoTestWorld TrackA;
	FDojoTestWorld TrackB;
	const TArray<ADojoP14Checkpoint*> CheckpointsA = LayCheckpoints(TrackA, 2);
	const TArray<ADojoP14Checkpoint*> CheckpointsB = LayCheckpoints(TrackB, 2);
	if (!TestTrue(TEXT("Checkpoints spawned"), AllSpawned(CheckpointsA) && AllSpawned(CheckpointsB))) return false;

	UDojoP14Standings* StandingsA = CheckpointsA[0]->GetStandings();
	UDojoP14Standings* StandingsB = CheckpointsB[0]->GetStandings();
	if (!TestNotNull(TEXT("Track A has standings"), StandingsA) || !TestNotNull(TEXT("Track B has standings"), StandingsB)) return false;
	TestTrue(TEXT("Track B's checkpoints report to other standings than track A's"), StandingsA != StandingsB);

	const FName Ada = TEXT("Ada");
	CheckpointsA[0]->Touch(Ada);
	CheckpointsA[1]->Touch(Ada);
	TestEqual(TEXT("Ada passed two on track A"), StandingsA->GetPassed(Ada), 2);
	TestEqual(TEXT("Ada passed none on track B"), StandingsB->GetPassed(Ada), 0);
	TestTrue(TEXT("Track B has no leader yet"), StandingsB->GetLeader().IsNone());
	TestTrue(TEXT("On track B, Ada starts at checkpoint 0"), CheckpointsB[0]->Touch(Ada));
	TestEqual(TEXT("Track A's leader is Ada"), StandingsA->GetLeader(), Ada);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P14_Standings_ANewTrackStartsEmpty, "Dojo.P14.Standings.ANewTrackStartsEmpty", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A race on a track that has since closed leaves nothing in the standings of the next track. */
bool FDojo_P14_Standings_ANewTrackStartsEmpty::RunTest(const FString& Parameters)
{
	using namespace DojoP14StandingsTest;

	const FName Ada = TEXT("Ada");
	{
		FDojoTestWorld Yesterday;
		const TArray<ADojoP14Checkpoint*> Checkpoints = LayCheckpoints(Yesterday, 3);
		if (!TestTrue(TEXT("Yesterday's checkpoints spawned"), AllSpawned(Checkpoints))) return false;
		Checkpoints[0]->Touch(Ada);
		Checkpoints[1]->Touch(Ada);
		Checkpoints[2]->Touch(Ada);
		UDojoP14Standings* YesterdaysStandings = Checkpoints[0]->GetStandings();
		if (!TestNotNull(TEXT("Yesterday's track has standings"), YesterdaysStandings)) return false;
		TestEqual(TEXT("Ada leads yesterday's race"), YesterdaysStandings->GetLeader(), Ada);
	}

	FDojoTestWorld Today;
	const TArray<ADojoP14Checkpoint*> Checkpoints = LayCheckpoints(Today, 3);
	if (!TestTrue(TEXT("Today's checkpoints spawned"), AllSpawned(Checkpoints))) return false;

	UDojoP14Standings* Standings = Checkpoints[0]->GetStandings();
	if (!TestNotNull(TEXT("Today's track has standings"), Standings)) return false;
	TestEqual(TEXT("Today Ada has passed nothing"), Standings->GetPassed(Ada), 0);
	TestTrue(TEXT("Today there is no leader"), Standings->GetLeader().IsNone());
	TestTrue(TEXT("Today Ada starts at checkpoint 0"), Checkpoints[0]->Touch(Ada));

	return true;
}

#endif
```

# Hints

- `ANewTrackStartsEmpty` closes one track and opens another. Read its message: what did the standings of the new track already hold, and where did that come from?
- The standings live as long as whatever owns them. Who owns them in the starter, and how long does that owner live in the editor? Which owner lives exactly as long as one track?
- Derive the standings from `UWorldSubsystem`, drop everything static, and let `GetStandings` ask the checkpoint's own world for its standings. The test file only uses the checkpoints' and the standings' public functions, so their signatures must not change.

# Rubric

- The standings are a UWorldSubsystem, with no static Get, no static pointer, and no AddToRoot.
- Each checkpoint finds the standings through its own world and returns nullptr when it has none.
- Every new world starts with empty standings, and two worlds open at once keep theirs apart.
- A single race is counted exactly as before: in order, per driver, with the same leader rule.
- Pass, GetPassed, GetLeader, Touch, and GetStandings keep their names and signatures.
- The checkpoints depend on the standings; the standings know nothing about checkpoints.

# Alternative

Keeping the static `Get` and adding a `Reset` that the game mode calls when a race starts fixes yesterday's leftovers, as long as every mode remembers to call it; it does nothing for two worlds open at once, which still share one table. A `UGameInstanceSubsystem` is the right owner when standings must survive a level change, as a championship's would; for one race it keeps the old race's numbers in the next level. Handing each checkpoint the standings, as the finish line was handed its log, works too and makes tests easy, at the cost of a setup step that wires every checkpoint in the level; a world subsystem needs no wiring, because every actor already knows its world.
