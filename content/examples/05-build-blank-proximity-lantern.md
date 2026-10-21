---
id: example-build-blank-proximity-lantern
title: A lantern that wakes when something comes near
order: 5
kind: build
scaffold: blank
difficulty: 3
patterns: [observer]
skills: [collision, delegates]
terms: [sphere-component, overlap-event, adddynamic, generate-overlap-events]
prerequisites: [example-build-stub-lantern-switch]
xp: 120
estimatedMinutes: 30
concepts:
  - Overlap events instead of distance checks in Tick
  - Counting overlaps so two visitors do not switch the light off early
---

# Brief

When any actor with collision comes within 300 units of the lantern it lights up, and it goes dark only after the last one has left.

Write `ADojoExProximityLantern` from nothing. It owns a sphere for detection and a point light. It listens to its own sphere's overlap events; nothing outside the lantern knows it exists.

The tests use this public interface, so keep these names:

- `bool IsLit() const` returns whether the light is on.
- `UPROPERTY(EditAnywhere) float Radius = 300.f;` sets the sphere radius.
- The sphere uses the `OverlapAllDynamic` collision profile with overlap events on.

This one fails on purpose the first time for most people: bring two visitors in, take one out, and watch what happens. Find out why before you read the hints.

## See it in the editor

Place the lantern in the sandbox map with `show Collision` typed in the console so you can see the sphere. Press Play and walk into the sphere: the lantern lights. Eject with F8, drag a cube with collision into the sphere, then walk your own pawn out: the lantern must stay lit until both are gone.

# Files

## DojoExProximityLantern.h

```cpp
// Declare ADojoExProximityLantern here.
```

## DojoExProximityLantern.cpp

```cpp
// Define ADojoExProximityLantern here.
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/SphereComponent.h"
#include "Quests/example-build-blank-proximity-lantern/DojoExProximityLantern.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoExamplesProximity
{
	/** Far enough from the lantern at the origin that a 300 unit sphere never reaches it. */
	const FVector Far(2000.f, 0.f, 0.f);

	/** Spawns a test actor, moves it far away, then gives it a small overlapping sphere so it can trigger the lantern. */
	ADojoTestActor* SpawnVisitor(FDojoTestWorld& TestWorld)
	{
		ADojoTestActor* Visitor = TestWorld.SpawnActor<ADojoTestActor>();
		if (!Visitor) return nullptr;

		Visitor->SetActorLocation(Far);

		USphereComponent* Shape = TestWorld.AddComponent<USphereComponent>(Visitor);
		Shape->AttachToComponent(Visitor->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		Shape->SetSphereRadius(20.f);
		Shape->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
		Shape->SetGenerateOverlapEvents(true);

		return Visitor;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_Examples_Proximity_CountsVisitors, "Dojo.Examples.Proximity.CountsVisitors", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Moves two visitors in and out of the sphere and checks the light follows the visitor count, not the last event. */
bool FDojo_Examples_Proximity_CountsVisitors::RunTest(const FString& Parameters)
{
	using namespace DojoExamplesProximity;

	FDojoTestWorld TestWorld;

	ADojoExProximityLantern* Lantern = TestWorld.SpawnActor<ADojoExProximityLantern>();
	ADojoTestActor* First = SpawnVisitor(TestWorld);
	ADojoTestActor* Second = SpawnVisitor(TestWorld);
	if (!TestNotNull(TEXT("Lantern spawned"), Lantern) || !TestNotNull(TEXT("Visitors spawned"), First) || !TestNotNull(TEXT("Visitors spawned"), Second)) return false;

	TestEqual(TEXT("Radius defaults to 300"), Lantern->Radius, 300.f);

	TestWorld.Tick(2);
	TestFalse(TEXT("Dark with nobody near"), Lantern->IsLit());

	First->SetActorLocation(FVector(100.f, 0.f, 0.f));
	Second->SetActorLocation(FVector(-100.f, 0.f, 0.f));
	TestWorld.Tick(2);
	TestTrue(TEXT("Lit with two visitors"), Lantern->IsLit());

	First->SetActorLocation(Far);
	TestWorld.Tick(2);
	TestTrue(TEXT("Still lit with one visitor left"), Lantern->IsLit());

	Second->SetActorLocation(Far);
	TestWorld.Tick(2);
	TestFalse(TEXT("Dark after the last visitor leaves"), Lantern->IsLit());

	return true;
}

#endif
```

# Hints

- Think about what the end-overlap event tells you and what it does not tell you about anyone else still inside.
- The sphere component has begin and end overlap delegates that you bind with AddDynamic in BeginPlay; the handlers must be UFUNCTIONs.
- The handler signatures are declared next to the delegates in `Components/PrimitiveComponent.h`.

# Rubric

- The lantern binds to its own sphere's begin and end overlap events; nothing else references the lantern.
- Overlap handlers are UFUNCTIONs with the exact delegate signature.
- The light follows a visitor count or the current overlap set, so one visitor leaving does not switch it off early.
- No Tick and no distance checks.
- Radius is an editable property and the sphere is visible with `show Collision`.
- `IsLit` reports the state the tests read.

# Alternative

Instead of counting, the end-overlap handler can ask the sphere for its current overlapping actors and light only if any remain. That is robust against missed events and easy to read, but it allocates an array on every exit. For a lantern either is fine; for hundreds of trigger volumes the counter is cheaper.
