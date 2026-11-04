---
id: m5-laser
title: A laser that bounces off mirrors
order: 8
kind: build
scaffold: blank
difficulty: 4
patterns: []
skills: [collision, math]
terms: [line-trace, fhitresult, reflection-vector, collision-query-params, debug-draw]
prerequisites: [m5-piercer]
xp: 120
estimatedMinutes: 30
concepts:
  - A bounce is a new trace that starts at the last impact and heads along the old heading mirrored about the surface's normal
  - A loop that follows a beam needs a limit, a way out for the open air, and a start that is not inside the surface it just hit
---

# Brief

When you place a laser facing a mirror turned 45 degrees and press Play, a red beam flies out, turns at the mirror, flies on to a second mirror, turns again, and ends on a plain wall; a surface only bounces the beam when its actor carries the laser's mirror tag, the beam never bounces more times than the laser allows, and a beam that meets nothing flies its full length and stops in the air.

Write `ADojoM5Laser` from nothing. It has a scene root with an arrow, no tick, and works only when fired. Each straight piece of the beam is one line trace from where the last piece ended, on the Visibility channel, leaving the laser itself out. A piece that meets nothing ends in the air at its full length and ends the beam. A piece that meets a surface adds the impact point to the path; a surface whose actor has the mirror tag bounces the beam while bounces remain, by mirroring the heading about the surface's normal and starting the next piece just off the surface, and any other surface ends the beam. The beam is drawn for one second.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MaxBounces = 4;` the most bounces, 0 or more.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) float SegmentLength = 2000.f;` the longest straight piece, in units.
- `UPROPERTY(EditAnywhere, BlueprintReadWrite) FName MirrorTag = TEXT("Mirror");` the actor tag that makes a surface bounce the beam.
- `UFUNCTION(BlueprintCallable) void Fire();` fires once and replaces the last path.
- `UFUNCTION(BlueprintPure) int32 GetPointCount() const;` the points of the path: the start, then every point where the beam touched something, or its end in the air.
- `UFUNCTION(BlueprintPure) FVector GetPoint(int32 Index) const;` one point, or the zero vector for an index outside the path.
- `UFUNCTION(BlueprintPure) int32 GetBounceCount() const;` how many times the beam bounced.

Dependency direction: the laser reads tags on whatever it hits; the surfaces know nothing about the laser.

This laser is the second piece of the Watchtower boss, where it crosses the yard as a fence.

## See it in the editor

Place a `DojoM5Laser` and two cubes, each scaled to a thin wall (X 0.2, Y 3, Z 2) and then turned 45 degrees about Z, one ahead of the laser and one to the side of the first so the beam would reach it after turning. Select each wall, open Actor in Details, and add the tag Mirror under Tags. Call Fire from the level Blueprint on the 1 key, press Play and press 1: the red beam turns at each wall. It stays on screen for one second, so press 1 again to look again. Remove the tag from the second wall and the beam stops on it. Select the laser and lower Max Bounces to 1 to see it stop turning, or set Segment Length to 500 to see a short beam in open air. Put two tagged walls facing each other on either side of the laser for a beam that zigzags until the bounces run out.

# Files

## DojoM5Laser.h

```cpp
// Declare ADojoM5Laser here.
```

## DojoM5Laser.cpp

```cpp
// Define ADojoM5Laser here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m5-laser/DojoM5Laser.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5LaserTest
{
	/** Spawns a solid panel of the given half extent, turned by YawDegrees about Z, tagged with Tag when Tag is not none. */
	ADojoTestActor* SpawnPanel(FDojoTestWorld& TestWorld, const FVector& Where, float YawDegrees, const FVector& HalfExtent, FName Tag)
	{
		ADojoTestActor* Host = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator(0.0, YawDegrees, 0.0));
		if (!Host) return nullptr;

		UBoxComponent* Box = TestWorld.AddComponent<UBoxComponent>(Host);
		Box->SetBoxExtent(HalfExtent);
		Box->SetCollisionProfileName(TEXT("BlockAll"));
		Box->AttachToComponent(Host->GetRootComponent(), FAttachmentTransformRules::SnapToTargetIncludingScale);

		if (!Tag.IsNone()) Host->Tags.Add(Tag);
		return Host;
	}

	/** Spawns a laser at the origin facing along X with the given settings. */
	ADojoM5Laser* SpawnLaser(FDojoTestWorld& TestWorld, int32 MaxBounces, float SegmentLength)
	{
		ADojoM5Laser* Laser = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Laser>(ADojoM5Laser::StaticClass(), FTransform::Identity);
		Laser->MaxBounces = MaxBounces;
		Laser->SegmentLength = SegmentLength;
		Laser->FinishSpawning(FTransform::Identity);
		return Laser;
	}

	/** Builds two mirrors turned 45 degrees opposite ways and a plain wall, which send a beam along X, then along -Y, then back along -X. */
	void BuildBend(FDojoTestWorld& TestWorld)
	{
		const FVector Panel(20.f, 300.f, 200.f);
		SpawnPanel(TestWorld, FVector(1000.0, 0.0, 0.0), 45.f, Panel, TEXT("Mirror"));
		SpawnPanel(TestWorld, FVector(950.0, -800.0, 0.0), -45.f, Panel, TEXT("Mirror"));
		SpawnPanel(TestWorld, FVector(-500.0, -750.0, 0.0), 0.f, Panel, NAME_None);
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Laser_FollowsTwoMirrorsToAWall, "Dojo.M5.Laser.FollowsTwoMirrorsToAWall", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Builds the bend, fires the beam, and checks every point it touched and how many times it bounced. */
bool FDojo_M5_Laser_FollowsTwoMirrorsToAWall::RunTest(const FString& Parameters)
{
	using namespace DojoM5LaserTest;

	FDojoTestWorld TestWorld;

	BuildBend(TestWorld);
	ADojoM5Laser* Laser = SpawnLaser(TestWorld, 4, 2000.f);
	if (!TestNotNull(TEXT("Laser spawned"), Laser)) return false;

	TestWorld.Tick(1);
	Laser->Fire();

	if (!TestEqual(TEXT("The beam has four points: its start, two mirrors, and the wall"), Laser->GetPointCount(), 4)) return false;
	TestEqual(TEXT("and it bounced twice"), Laser->GetBounceCount(), 2);

	const FVector Expected[] = { FVector(0.0, 0.0, 0.0), FVector(971.7, 0.0, 0.0), FVector(971.7, -750.0, 0.0), FVector(-480.0, -750.0, 0.0) };
	for (int32 Index = 0; Index < 4; ++Index)
	{
		TestTrue(*FString::Printf(TEXT("Point %d is where the beam touched"), Index), Laser->GetPoint(Index).Equals(Expected[Index], 3.0));
	}

	TestTrue(TEXT("A point past the end of the path is the zero vector"), Laser->GetPoint(4).IsZero());
	TestTrue(TEXT("and so is a negative index"), Laser->GetPoint(-1).IsZero());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Laser_StopsBouncingAtTheLimit, "Dojo.M5.Laser.StopsBouncingAtTheLimit", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires through the bend with a limit of one bounce and then with none. */
bool FDojo_M5_Laser_StopsBouncingAtTheLimit::RunTest(const FString& Parameters)
{
	using namespace DojoM5LaserTest;

	FDojoTestWorld TestWorld;

	BuildBend(TestWorld);
	ADojoM5Laser* Laser = SpawnLaser(TestWorld, 1, 2000.f);
	if (!TestNotNull(TEXT("Laser spawned"), Laser)) return false;

	TestWorld.Tick(1);
	Laser->Fire();
	TestEqual(TEXT("With one bounce allowed the beam has three points, ending on the second mirror"), Laser->GetPointCount(), 3);
	TestEqual(TEXT("and it bounced once"), Laser->GetBounceCount(), 1);
	TestTrue(TEXT("The last point is on the second mirror"), Laser->GetPoint(2).Equals(FVector(971.7, -750.0, 0.0), 3.0));

	Laser->MaxBounces = 0;
	Laser->Fire();
	TestEqual(TEXT("With no bounces allowed the beam ends on the first mirror"), Laser->GetPointCount(), 2);
	TestEqual(TEXT("and it did not bounce"), Laser->GetBounceCount(), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Laser_FacingMirrorsKeepItBouncing, "Dojo.M5.Laser.FacingMirrorsKeepItBouncing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires between two facing mirrors with a limit of four bounces and checks the zigzag. */
bool FDojo_M5_Laser_FacingMirrorsKeepItBouncing::RunTest(const FString& Parameters)
{
	using namespace DojoM5LaserTest;

	FDojoTestWorld TestWorld;

	const FVector Panel(20.f, 400.f, 200.f);
	SpawnPanel(TestWorld, FVector(500.0, 0.0, 0.0), 0.f, Panel, TEXT("Mirror"));
	SpawnPanel(TestWorld, FVector(-500.0, 0.0, 0.0), 0.f, Panel, TEXT("Mirror"));
	ADojoM5Laser* Zigzag = SpawnLaser(TestWorld, 4, 2000.f);
	if (!TestNotNull(TEXT("Laser spawned"), Zigzag)) return false;

	TestWorld.Tick(1);
	Zigzag->Fire();
	if (!TestEqual(TEXT("Between two facing mirrors the beam touches the start and five surfaces"), Zigzag->GetPointCount(), 6)) return false;
	TestEqual(TEXT("and it bounced four times"), Zigzag->GetBounceCount(), 4);
	TestTrue(TEXT("The first touch is the near mirror"), Zigzag->GetPoint(1).Equals(FVector(480.0, 0.0, 0.0), 3.0));
	TestTrue(TEXT("the second is the far one"), Zigzag->GetPoint(2).Equals(FVector(-480.0, 0.0, 0.0), 3.0));
	TestTrue(TEXT("and the fifth, the last, is the near one again"), Zigzag->GetPoint(5).Equals(FVector(480.0, 0.0, 0.0), 3.0));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Laser_OnlyTaggedSurfacesBounce, "Dojo.M5.Laser.OnlyTaggedSurfacesBounce", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires into open air, into a plain wall, and at a surface with a custom tag, and checks the beam ends or bounces accordingly. */
bool FDojo_M5_Laser_OnlyTaggedSurfacesBounce::RunTest(const FString& Parameters)
{
	using namespace DojoM5LaserTest;

	FDojoTestWorld TestWorld;

	ADojoM5Laser* Laser = SpawnLaser(TestWorld, 4, 700.f);
	if (!TestNotNull(TEXT("Laser spawned"), Laser)) return false;

	TestWorld.Tick(1);
	Laser->Fire();
	TestEqual(TEXT("In open air the beam has two points, its start and its end"), Laser->GetPointCount(), 2);
	TestTrue(TEXT("and the end is one segment length ahead"), Laser->GetPoint(1).Equals(FVector(700.0, 0.0, 0.0), 0.5));
	TestEqual(TEXT("with no bounces"), Laser->GetBounceCount(), 0);

	ADojoTestActor* Wall = SpawnPanel(TestWorld, FVector(400.0, 0.0, 0.0), 0.f, FVector(20.f, 400.f, 200.f), NAME_None);
	if (!TestNotNull(TEXT("Wall spawned"), Wall)) return false;

	TestWorld.Tick(1);
	Laser->Fire();
	TestEqual(TEXT("A wall without the tag ends the beam on its face"), Laser->GetPointCount(), 2);
	TestTrue(TEXT("at 380 units"), Laser->GetPoint(1).Equals(FVector(380.0, 0.0, 0.0), 0.5));
	TestEqual(TEXT("with no bounces"), Laser->GetBounceCount(), 0);

	Wall->Tags.Add(TEXT("Shiny"));
	Laser->Fire();
	TestEqual(TEXT("The tag the laser is not looking for changes nothing"), Laser->GetBounceCount(), 0);

	Laser->MirrorTag = TEXT("Shiny");
	Laser->Fire();
	TestTrue(TEXT("With the laser's mirror tag set to the wall's tag the beam bounces"), Laser->GetBounceCount() > 0);

	return true;
}

#endif
```

# Hints

- Fire is a loop with one trace per turn, so ask what can end a turn and what the next turn needs from the last.
- What happens if the next trace starts exactly on the surface the last one hit?
- `FMath::GetReflectionVector` or `FVector::MirrorByVector` turns the heading, `AActor::ActorHasTag` reads the tag, and `FHitResult::ImpactPoint` and `ImpactNormal` give the rest.

# Rubric

- Each piece of the beam is a line trace from the end of the last piece along the current heading, with the laser itself left out.
- A surface bounces the beam only when its actor has the mirror tag and bounces remain; any other surface ends the beam on its face.
- The new heading is the old heading mirrored about the surface's impact normal, and the next piece starts just off the surface.
- A beam that meets nothing ends at the full segment length, and the loop always ends: at open air, at a plain surface, or at the bounce limit.
- The path and the bounce count are replaced on every `Fire`, `GetPoint` is safe for any index, and the limits and the tag are properties a designer can tune.
- The beam is drawn piece by piece as a debug line; the laser reads tags on whatever it hits, and the surfaces know nothing about the laser.

# Alternative

The laser could bounce by moving a projectile with a sweep each frame and reflecting its velocity when it hits, the way the bumper does. That makes the beam a thing that travels, which is right for a slow glowing ball and wrong for a laser, which should appear whole in one instant. Tracing the entire path in one call keeps the cost to a few queries when it fires and nothing between shots, and the path can be read back as a list of points, which a test or a beam effect can both use. The cost is that the beam cannot be partly through a mirror when something moves, because it is recomputed from scratch each time it fires.
