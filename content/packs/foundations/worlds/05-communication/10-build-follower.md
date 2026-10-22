---
id: f5-follower
title: A follower that moves the same at any frame rate
order: 10
kind: build
scaffold: blank
difficulty: 3
patterns: [update-method]
skills: [time]
terms: [tick, deltatime, primary-actor-tick, tweakobjectptr, fvector]
prerequisites: [f5-choosing-a-channel]
xp: 120
estimatedMinutes: 30
concepts:
  - Speed times DeltaSeconds makes movement frame-rate independent
  - Tick only while there is something to do
---

# Brief

When you press Play and tell the follower to follow a crate 1200 units away, it glides toward it at 600 units per second, stops 50 units short, and covers the same distance per second whether the game runs at 30 or 120 frames per second.

Write `ADojoF5Follower` from nothing. It has a scene root. It can tick, but starts with ticking off: following a target turns ticking on, and losing the target turns it off. Each frame it moves straight toward the target by Speed times the frame's duration, never closer than StopDistance. It does not own its target: anyone may destroy it, and then the follower stops ticking.

The tests use this public interface, so keep these names:

- `UPROPERTY(EditAnywhere) float Speed = 600.f;` and `float StopDistance = 50.f;`, both clamped at 0 or more.
- `UFUNCTION(BlueprintCallable) void Follow(AActor* NewTarget);` nullptr stops following.
- `UFUNCTION(BlueprintPure) AActor* GetTarget() const;` nullptr once the target is gone.
- `UFUNCTION(BlueprintPure) bool HasArrived() const;` true within StopDistance.
- `virtual void Tick(float DeltaSeconds) override;`

## See it in the editor

Place a `DojoF5Follower` and a crate 1200 units away. In the level Blueprint, on BeginPlay, call Follow with the crate. Press Play: the follower glides there in about two seconds and stops short. Type `t.MaxFPS 30`, then `t.MaxFPS 120`, and replay: the trip takes the same time. Type `stat game` before and after it arrives to see that it costs nothing once it has no target.

# Files

## DojoF5Follower.h

```cpp
// Declare ADojoF5Follower here.
```

## DojoF5Follower.cpp

```cpp
// Define ADojoF5Follower here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/f5-follower/DojoF5Follower.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoF5FollowerTest
{
	/** Runs one second of following a target 1200 away at the given frame rate and returns how far the follower moved. */
	double DistanceInOneSecond(int32 FramesPerSecond)
	{
		FDojoTestWorld TestWorld;

		ADojoF5Follower* Follower = TestWorld.SpawnActor<ADojoF5Follower>();
		ADojoTestActor* Target = TestWorld.SpawnActor<ADojoTestActor>();
		Target->SetActorLocation(FVector(1200.f, 0.f, 0.f));

		Follower->Follow(Target);
		TestWorld.Tick(FramesPerSecond, 1.f / FramesPerSecond);
		return Follower->GetActorLocation().X;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Follower_SameSpeedAtAnyFrameRate, "Dojo.F5.Follower.SameSpeedAtAnyFrameRate", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Follows for one second at 30 and at 120 frames per second and checks both cover 600 units. */
bool FDojo_F5_Follower_SameSpeedAtAnyFrameRate::RunTest(const FString& Parameters)
{
	using namespace DojoF5FollowerTest;

	TestEqual(TEXT("600 units in one second at 30 frames per second"), DistanceInOneSecond(30), 600.0, 1.0);
	TestEqual(TEXT("600 units in one second at 120 frames per second"), DistanceInOneSecond(120), 600.0, 1.0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F5_Follower_StopsAndSleeps, "Dojo.F5.Follower.StopsAndSleeps", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Checks the follower does not tick without a target, stops at its distance, and stops ticking when the target is gone. */
bool FDojo_F5_Follower_StopsAndSleeps::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF5Follower* Follower = TestWorld.SpawnActor<ADojoF5Follower>();
	ADojoTestActor* Target = TestWorld.SpawnActor<ADojoTestActor>();
	if (!TestNotNull(TEXT("Follower spawned"), Follower) || !TestNotNull(TEXT("Target spawned"), Target)) return false;
	Target->SetActorLocation(FVector(0.f, 800.f, 0.f));

	TestFalse(TEXT("No ticking without a target"), Follower->IsActorTickEnabled());
	TestEqual(TEXT("Speed defaults to 600"), Follower->Speed, 600.f);

	Follower->Follow(Target);
	TestTrue(TEXT("Ticking once it has a target"), Follower->IsActorTickEnabled());

	TestWorld.Tick(120);
	TestTrue(TEXT("Arrived after two seconds"), Follower->HasArrived());
	TestEqual(TEXT("Stops 50 short of the target"), Follower->GetActorLocation().Y, 750.0, 0.5);

	Target->Destroy();
	TestWorld.Tick(2);
	TestFalse(TEXT("Stops ticking once the target is gone"), Follower->IsActorTickEnabled());
	TestNull(TEXT("No target any more"), Follower->GetTarget());

	return true;
}

#endif
```

# Hints

- Two jobs in Tick: decide whether there is still a target worth moving toward, then take one step of the right length.
- The step is the smaller of speed times DeltaSeconds and the gap left before StopDistance, along the normalized offset; the target is a weak pointer, and the actor can switch its own tick on and off.
- `AActor::SetActorTickEnabled` and `PrimaryActorTick.bStartWithTickEnabled` are in `GameFramework/Actor.h` and `Engine/EngineBaseTypes.h`; `TWeakObjectPtr` is in `UObject/WeakObjectPtrTemplates.h`.

# Rubric

- Movement per frame is Speed times DeltaSeconds, so the distance per second is the same at any frame rate.
- The follower stops at StopDistance and never overshoots the target.
- Ticking starts off, turns on in Follow with a valid target, and turns off when the target is null or destroyed.
- The target is held weakly and checked before use.
- Speed and StopDistance are editable, clamped properties with the given defaults.
- Tick calls Super::Tick.

# Alternative

`FMath::VInterpConstantTo(Current, Target, DeltaSeconds, Speed)` does the same constant-speed step in one call, and `FMath::VInterpTo` eases in, slowing as it closes. Either keeps the frame-rate independence because both take DeltaSeconds. For anything that walks on the ground, a character's movement component, or AI MoveTo with a navigation mesh, handles collision and slopes that a raw SetActorLocation ignores. The hand-written step is right for floating things like this follower, and it shows the one rule all of them follow: scale by DeltaSeconds. This per-frame update loop is the Update Method pattern, which Pack 2 covers in its own world.
