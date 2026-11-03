---
id: m3-return-pit
title: A pit that sends things back where they belong
order: 9
kind: build
scaffold: blank
difficulty: 4
patterns: []
skills: [collision, delegates]
terms: [overlap-event, collision-preset, box-component, cast, adddynamic, ufunction]
prerequisites: [m3-shapes-and-actors, m3-checkpoint, m3-scale-plate]
xp: 120
estimatedMinutes: 28
concepts:
  - One trigger, two kinds of visitor, two different answers
  - The pit decides what happens; the runner and the crate each know how to go back
---

# Brief

When you place a pit and drop a runner into it, the runner appears at its respawn point at once; drop a crate in and it appears back at the spot where it started; anything else that falls in stays where it is, and the pit's catch count goes up by one for each runner and crate it sends back.

Write `ADojoM3Pit` from nothing. It has a box zone as its root that overlaps everything, never ticks, and listens for shapes arriving in the zone. When a runner arrives it calls the runner's `Respawn`; when a crate arrives it calls the crate's `ReturnHome`; either way it counts a catch. Anything else is left alone and not counted.

The tests use this public interface, so keep these names:

- `UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<UBoxComponent> Zone;` the root, with an extent of 150 by 150 by 100 and the `OverlapAllDynamic` profile.
- `UFUNCTION(BlueprintPure) int32 GetCatches() const;` how many runners and crates the pit has sent back.

Dependency direction: the pit holds no pointer to anything; it reacts to whatever arrives. The runner and the crate know nothing about pits, only how to go back to their own spot.

This pit is the last piece of the Vault Room boss.

Compiles against earlier quests: m3-checkpoint (`Quests/m3-checkpoint/DojoM3Runner.h`) and m3-scale-plate (`Quests/m3-scale-plate/DojoM3Crate.h`).

## See it in the editor

Place a `DojoM3Pit` at X 1000, a `DojoM3Runner` at the origin, and a `DojoM3Crate` at Y 500. Type `show Collision` and press Play. In the level Blueprint, on the 1 key, set the runner's location to X 1000, and on the 2 key, set the crate's location to X 1000: each pops back to where it started. Add a `DojoM3Checkpoint` at X 500 and, on the 4 key, set the runner's location to X 500 to touch it; press 4, then 1: now the runner comes back at the flag. Print the pit's Get Catches on the 3 key.

# Files

## DojoM3Pit.h

```cpp
// Declare ADojoM3Pit here.
```

## DojoM3Pit.cpp

```cpp
// Define ADojoM3Pit here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Quests/m3-checkpoint/DojoM3Runner.h"
#include "Quests/m3-return-pit/DojoM3Pit.h"
#include "Quests/m3-scale-plate/DojoM3Crate.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM3PitTest
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
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ReturnPit_RunnerGoesBack, "Dojo.M3.ReturnPit.RunnerGoesBack", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Drops a runner into a pit by a teleport and by a swept fall, and checks it comes back to its respawn point each time. */
bool FDojo_M3_ReturnPit_RunnerGoesBack::RunTest(const FString& Parameters)
{
	using namespace DojoM3PitTest;

	FDojoTestWorld TestWorld;

	ADojoM3Pit* Pit = SpawnAt<ADojoM3Pit>(TestWorld, FVector(1000.0, 0.0, 0.0));
	ADojoM3Runner* Runner = SpawnAt<ADojoM3Runner>(TestWorld, FVector::ZeroVector);
	if (!TestNotNull(TEXT("Pit and runner spawned"), Runner) || !Pit) return false;

	TestEqual(TEXT("A new pit has caught nothing"), Pit->GetCatches(), 0);
	TestTrue(TEXT("Its zone is its root"), Pit->GetRootComponent() == Pit->Zone);

	Runner->SetRespawnPoint(FVector(-500.0, 0.0, 0.0));
	Runner->SetActorLocation(FVector(1000.0, 0.0, 0.0));
	TestTrue(TEXT("A runner dropped in the pit is back at its respawn point"), Runner->GetActorLocation().Equals(FVector(-500.0, 0.0, 0.0), 0.1));
	TestEqual(TEXT("The pit counts one catch"), Pit->GetCatches(), 1);
	TestEqual(TEXT("and the runner respawned once"), Runner->GetRespawns(), 1);

	Runner->SetActorLocation(FVector(1100.0, 50.0, 400.0));
	Runner->AddActorWorldOffset(FVector(0.0, 0.0, -400.0), true);
	TestTrue(TEXT("A runner falling in with a sweep is sent back too"), Runner->GetActorLocation().Equals(FVector(-500.0, 0.0, 0.0), 0.1));
	TestEqual(TEXT("and the pit counts a second catch"), Pit->GetCatches(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ReturnPit_CrateGoesHome, "Dojo.M3.ReturnPit.CrateGoesHome", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Drops a crate into a pit and checks it goes back to where it started, not to any runner's respawn point. */
bool FDojo_M3_ReturnPit_CrateGoesHome::RunTest(const FString& Parameters)
{
	using namespace DojoM3PitTest;

	FDojoTestWorld TestWorld;

	ADojoM3Pit* Pit = SpawnAt<ADojoM3Pit>(TestWorld, FVector(1000.0, 0.0, 0.0));
	ADojoM3Crate* Crate = SpawnAt<ADojoM3Crate>(TestWorld, FVector(0.0, 600.0, 0.0));
	if (!TestNotNull(TEXT("Pit and crate spawned"), Crate) || !Pit) return false;

	Crate->SetActorLocation(FVector(950.0, -50.0, 0.0));
	TestTrue(TEXT("A crate dropped in the pit is back where it started"), Crate->GetActorLocation().Equals(FVector(0.0, 600.0, 0.0), 0.1));
	TestEqual(TEXT("The crate went home once"), Crate->GetReturns(), 1);
	TestEqual(TEXT("and the pit counts one catch"), Pit->GetCatches(), 1);

	Crate->SetActorLocation(FVector(1000.0, 0.0, 0.0));
	TestEqual(TEXT("A second drop sends it home again"), Crate->GetReturns(), 2);
	TestEqual(TEXT("and counts a second catch"), Pit->GetCatches(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M3_ReturnPit_OthersStay, "Dojo.M3.ReturnPit.OthersStay", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Drops shapes that belong to neither a runner nor a crate into a pit and checks they stay and are not counted. */
bool FDojo_M3_ReturnPit_OthersStay::RunTest(const FString& Parameters)
{
	using namespace DojoM3PitTest;

	FDojoTestWorld TestWorld;

	ADojoM3Pit* Pit = SpawnAt<ADojoM3Pit>(TestWorld, FVector(0.0, 2000.0, 0.0));
	if (!TestNotNull(TEXT("Pit spawned"), Pit)) return false;

	USphereComponent* Rock = MakeProp(TestWorld, TEXT("BlockAllDynamic"), FVector(0.0, 2000.0, 0.0));
	TestTrue(TEXT("A solid rock overlaps the pit's zone"), Pit->Zone->IsOverlappingComponent(Rock));
	TestTrue(TEXT("but stays where it fell"), Rock->GetComponentLocation().Equals(FVector(0.0, 2000.0, 0.0), 0.1));

	USphereComponent* Stranger = MakeProp(TestWorld, TEXT("Pawn"), FVector(50.0, 2050.0, 0.0));
	TestTrue(TEXT("A pawn shape that is not a runner overlaps the zone"), Pit->Zone->IsOverlappingComponent(Stranger));
	TestTrue(TEXT("and stays too"), Stranger->GetComponentLocation().Equals(FVector(50.0, 2050.0, 0.0), 0.1));

	TestEqual(TEXT("Neither is counted as a catch"), Pit->GetCatches(), 0);

	return true;
}

#endif
```

# Hints

- The pit is a trigger with one handler. The handler's first job is to find out what fell in, and each kind of visitor already knows how to go back on its own.
- Two `Cast` calls, one to each class, tell a runner from a crate from anything else. Bind the handler the same way as the flag and the plate did, and make the zone overlap every channel.
- `UBoxComponent` is in `Components/BoxComponent.h`; `SetBoxExtent` and `SetCollisionProfileName` set the zone up in the constructor; `OnComponentBeginOverlap` is the event to bind in `BeginPlay`.

# Rubric

- The zone is the root, overlaps everything, and is never solid, so nothing is stopped on its way in.
- The begin overlap handler is a `UFUNCTION` bound with `AddDynamic` in `BeginPlay`, and the pit never ticks.
- A runner is sent to its respawn point with `Respawn`, and a crate to its home with `ReturnHome`, whether it arrived by a teleport or a swept fall.
- Anything else stays where it is and is not counted; each runner or crate sent back counts one catch.
- The pit holds no pointer to anything; it asks each arriving actor what it is.
- The constructor, header, and comments follow the conventions of the earlier pieces: forward declarations, `TObjectPtr`, a comment above every function.

# Alternative

The runner and the crate could share an interface, say `IDojoReturnable` with one `ReturnToStart` function, so the pit casts once to the interface and never learns either class; a new kind of fallen thing would only implement the interface. That is the Pack 1 interface lesson put to work, and it is the better shape once a third or fourth kind of visitor appears. With two, two casts are shorter and say plainly what happens to each. A kill zone in a shipped game usually goes further and calls the game mode, which owns respawning, so the pit does not even know that runners respawn.
