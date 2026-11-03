---
id: m5-piercer
title: A shot that passes through thin things and stops at a wall
order: 7
kind: build
scaffold: stub
difficulty: 4
patterns: []
skills: [collision, math]
terms: [multi-trace, line-trace, fhitresult, collision-query-params, debug-draw]
prerequisites: [m5-feeler]
xp: 100
estimatedMinutes: 25
concepts:
  - A multi trace returns the things that only overlap in order, and ends with the first thing that blocks
  - Which hits count as passed through and which one stops the shot is decided by reading the list
---

# Brief

When you place a piercer facing a row of things, fire it, and read its results, it reports every thin sheet the shot went through, nearest first, then the solid wall that stopped it, and how far the shot flew; a sheet behind the wall is not in the list, a thing that ignores the shot's channel is not in the list either, and with nothing solid ahead the shot flies its whole reach.

The header is written and the bodies are stubs. Write each body in `DojoM5Piercer.cpp`:

1. `Fire` clears the last shot's results, starts with the shot as long as the reach, makes a multi trace from the actor along its forward, leaving the piercer itself out, and walks the hits in order: a hit that does not block is remembered as pierced, and the first hit that does block is remembered as the stopper, sets the shot's length, and ends the walk. It draws the shot for one second and a yellow marker at each thing it passed through.
2. The four getters return what `Fire` remembered. `GetPiercedAt` returns nothing for an index that is not in the list.

Dependency direction: the piercer knows nothing about the sheets or the wall; they only answer the channel as their collision settings say.

This piercer is a side tool: the Watchtower boss does not use it, but its multi trace is the one the shapes card describes.

## See it in the editor

Place a `DojoM5Piercer`, three thin cubes in a row ahead of it, and a tall wall behind them. Select each cube, find Collision in Details, and set its Visibility response to Overlap; leave the wall at Block. In the level Blueprint, on the 1 key, call Fire, then Print String of Get Pierced Count and of Get Stopped By. Press Play and press 1: the count is the number of cubes in front of the wall, and a yellow marker is drawn on each. Set one cube back to Block and press 1 again: the shot stops there and the cubes behind it are not counted.

# Files

## DojoM5Piercer.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM5Piercer.generated.h"

/** Fires one shot along its forward that passes through thin things and stops at the first solid one. */
UCLASS()
class ADojoM5Piercer : public AActor
{
	GENERATED_BODY()

public:
	/** Creates a scene root and an arrow that shows the way the shot flies. */
	ADojoM5Piercer();

	/** How far the shot flies, in units. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Piercer", meta = (ClampMin = "1"))
	float Reach = 2000.f;

	/** Fires once: finds everything the shot passes through, in order, and what stops it. Replaces the last shot's results. */
	UFUNCTION(BlueprintCallable, Category = "Piercer")
	void Fire();

	/** How many things the last shot passed through. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	int32 GetPiercedCount() const;

	/** The Index-th thing the last shot passed through, nearest first, or nullptr when there is none. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	AActor* GetPiercedAt(int32 Index) const;

	/** The solid thing that stopped the last shot, or nullptr when it flew its whole reach. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	AActor* GetStoppedBy() const;

	/** How far the last shot flew: the distance to the solid thing that stopped it, or the whole reach. */
	UFUNCTION(BlueprintPure, Category = "Piercer")
	float GetShotLength() const;

private:
	TArray<TWeakObjectPtr<AActor>> Pierced;

	TWeakObjectPtr<AActor> StoppedBy;

	float ShotLength = 0.f;
};
```

## DojoM5Piercer.cpp

```cpp
#include "DojoM5Piercer.h"

#include "CollisionQueryParams.h"
#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/EngineTypes.h"
#include "Engine/HitResult.h"
#include "Engine/World.h"

ADojoM5Piercer::ADojoM5Piercer()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

void ADojoM5Piercer::Fire()
{
}

int32 ADojoM5Piercer::GetPiercedCount() const
{
	return 0;
}

AActor* ADojoM5Piercer::GetPiercedAt(int32 Index) const
{
	return nullptr;
}

AActor* ADojoM5Piercer::GetStoppedBy() const
{
	return nullptr;
}

float ADojoM5Piercer::GetShotLength() const
{
	return 0.f;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/BoxComponent.h"
#include "Quests/m5-piercer/DojoM5Piercer.h"
#include "Support/DojoTestActor.h"
#include "Support/DojoTestWorld.h"

namespace DojoM5PiercerTest
{
	/** Spawns a thin box at Where that answers the Visibility channel with the given response. */
	ADojoTestActor* SpawnSheet(FDojoTestWorld& TestWorld, const FVector& Where, ECollisionResponse VisibilityResponse)
	{
		ADojoTestActor* Host = TestWorld.GetWorld()->SpawnActor<ADojoTestActor>(Where, FRotator::ZeroRotator);
		if (!Host) return nullptr;

		UBoxComponent* Box = TestWorld.AddComponent<UBoxComponent>(Host);
		Box->SetBoxExtent(FVector(10.f, 200.f, 200.f));
		Box->SetCollisionProfileName(TEXT("BlockAll"));
		Box->SetCollisionResponseToChannel(ECC_Visibility, VisibilityResponse);
		Box->AttachToComponent(Host->GetRootComponent(), FAttachmentTransformRules::SnapToTargetNotIncludingScale);
		return Host;
	}

	/** Spawns a piercer at the origin facing along X with the given reach. */
	ADojoM5Piercer* SpawnPiercer(FDojoTestWorld& TestWorld, float Reach)
	{
		ADojoM5Piercer* Piercer = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM5Piercer>(ADojoM5Piercer::StaticClass(), FTransform::Identity);
		Piercer->Reach = Reach;
		Piercer->FinishSpawning(FTransform::Identity);
		return Piercer;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Piercer_PassesThinThingsAndStopsAtTheWall, "Dojo.M5.Piercer.PassesThinThingsAndStopsAtTheWall", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Lines up two overlapping sheets, a solid wall, and a third sheet behind it, and checks what the shot passed through and what stopped it. */
bool FDojo_M5_Piercer_PassesThinThingsAndStopsAtTheWall::RunTest(const FString& Parameters)
{
	using namespace DojoM5PiercerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* FarSheet = SpawnSheet(TestWorld, FVector(500.0, 0.0, 0.0), ECR_Overlap);
	ADojoTestActor* NearSheet = SpawnSheet(TestWorld, FVector(300.0, 0.0, 0.0), ECR_Overlap);
	ADojoTestActor* Wall = SpawnSheet(TestWorld, FVector(800.0, 0.0, 0.0), ECR_Block);
	ADojoTestActor* HiddenSheet = SpawnSheet(TestWorld, FVector(1100.0, 0.0, 0.0), ECR_Overlap);
	ADojoM5Piercer* Piercer = SpawnPiercer(TestWorld, 2000.f);
	if (!TestNotNull(TEXT("Sheets spawned"), NearSheet) || !TestNotNull(TEXT("Far sheet spawned"), FarSheet)) return false;
	if (!TestNotNull(TEXT("Wall spawned"), Wall) || !TestNotNull(TEXT("Hidden sheet spawned"), HiddenSheet)) return false;
	if (!TestNotNull(TEXT("Piercer spawned"), Piercer)) return false;

	TestWorld.Tick(1);
	Piercer->Fire();

	TestEqual(TEXT("The shot passed through the two sheets in front of the wall and nothing else"), Piercer->GetPiercedCount(), 2);
	TestTrue(TEXT("The nearer sheet comes first, whichever was spawned first"), Piercer->GetPiercedAt(0) == NearSheet);
	TestTrue(TEXT("and the farther sheet second"), Piercer->GetPiercedAt(1) == FarSheet);
	TestNull(TEXT("Asking past the end gives nothing"), Piercer->GetPiercedAt(2));
	TestNull(TEXT("A negative index gives nothing"), Piercer->GetPiercedAt(-1));
	TestTrue(TEXT("The wall stopped the shot"), Piercer->GetStoppedBy() == Wall);
	TestEqual(TEXT("The shot flew to the wall's near face, 790 units out"), Piercer->GetShotLength(), 790.f, 1.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Piercer_FliesItsWholeReachWhenNothingStopsIt, "Dojo.M5.Piercer.FliesItsWholeReachWhenNothingStopsIt", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Fires through overlapping sheets only, then shortens the reach, then fires into an empty hall, and checks each result. */
bool FDojo_M5_Piercer_FliesItsWholeReachWhenNothingStopsIt::RunTest(const FString& Parameters)
{
	using namespace DojoM5PiercerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* FirstSheet = SpawnSheet(TestWorld, FVector(300.0, 0.0, 0.0), ECR_Overlap);
	ADojoTestActor* SecondSheet = SpawnSheet(TestWorld, FVector(900.0, 0.0, 0.0), ECR_Overlap);
	ADojoM5Piercer* Piercer = SpawnPiercer(TestWorld, 1500.f);
	if (!TestNotNull(TEXT("Sheets spawned"), FirstSheet) || !TestNotNull(TEXT("Second sheet spawned"), SecondSheet)) return false;
	if (!TestNotNull(TEXT("Piercer spawned"), Piercer)) return false;

	TestWorld.Tick(1);
	Piercer->Fire();
	TestEqual(TEXT("Both sheets are passed through"), Piercer->GetPiercedCount(), 2);
	TestNull(TEXT("Nothing stopped the shot"), Piercer->GetStoppedBy());
	TestEqual(TEXT("so it flew its whole reach"), Piercer->GetShotLength(), 1500.f, 0.5f);

	Piercer->Reach = 600.f;
	Piercer->Fire();
	TestEqual(TEXT("With a shorter reach only the first sheet is in range, and the old results are replaced"), Piercer->GetPiercedCount(), 1);
	TestEqual(TEXT("and the shot is as long as the reach"), Piercer->GetShotLength(), 600.f, 0.5f);

	FirstSheet->Destroy();
	SecondSheet->Destroy();
	TestWorld.Tick(1);
	Piercer->Fire();
	TestEqual(TEXT("Into an empty hall nothing is passed through"), Piercer->GetPiercedCount(), 0);
	TestNull(TEXT("and nothing is named"), Piercer->GetPiercedAt(0));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M5_Piercer_ThingsThatIgnoreTheChannelAreNotCounted, "Dojo.M5.Piercer.ThingsThatIgnoreTheChannelAreNotCounted", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Puts a sheet that ignores the channel in front of one that overlaps it and checks that only the overlapping one is listed. */
bool FDojo_M5_Piercer_ThingsThatIgnoreTheChannelAreNotCounted::RunTest(const FString& Parameters)
{
	using namespace DojoM5PiercerTest;

	FDojoTestWorld TestWorld;

	ADojoTestActor* Ghost = SpawnSheet(TestWorld, FVector(300.0, 0.0, 0.0), ECR_Ignore);
	ADojoTestActor* Sheet = SpawnSheet(TestWorld, FVector(600.0, 0.0, 0.0), ECR_Overlap);
	ADojoM5Piercer* Piercer = SpawnPiercer(TestWorld, 2000.f);
	if (!TestNotNull(TEXT("Ghost spawned"), Ghost) || !TestNotNull(TEXT("Sheet spawned"), Sheet)) return false;
	if (!TestNotNull(TEXT("Piercer spawned"), Piercer)) return false;

	TestWorld.Tick(1);
	Piercer->Fire();

	TestEqual(TEXT("Only the sheet that overlaps the channel is listed"), Piercer->GetPiercedCount(), 1);
	TestTrue(TEXT("and it is the sheet, not the ghost"), Piercer->GetPiercedAt(0) == Sheet);

	return true;
}

#endif
```

# Hints

- Ask what the shot should do for a hit that only overlaps, and what it should do for one that blocks.
- Each hit in the array says by itself whether it was a block, in a field on the hit result.
- `UWorld::LineTraceMultiByChannel` fills a `TArray<FHitResult>` whose hits carry `bBlockingHit`, `GetActor` and `Distance`, and `TArray::IsValidIndex` guards the getter.

# Rubric

- The shot is one multi trace on the Visibility channel from the actor along its forward, with the piercer left out.
- Hits that do not block are listed as pierced in the order the trace gave them; the first blocking hit ends the shot, is named as the stopper, and sets the shot's length, which is the whole reach when nothing blocks.
- Every `Fire` replaces the last shot's results, so nothing from an earlier shot or a destroyed actor is left behind.
- `GetPiercedAt` returns nothing for an index outside the list, and the list holds weak pointers, so destroyed actors never dangle.
- A debug line is drawn for the shot and a marker at each thing it passed through, and reach is a property a designer can tune.
- The piercer reads only what the trace reports; the sheets and the wall know nothing about the piercer.

# Alternative

A single trace in a loop would do the same job: trace, note what overlapped, and trace again from just past that point until something blocks. It costs one query per thing pierced and has to nudge the start forward each time, and a thin thing can be skipped by the nudge. The multi trace asks the physics scene once and hands back the whole ordered list, which is why it is the tool for this. A multi trace by object type also lists things, but it asks what they are rather than how they answer a channel, so it is a different question from the one this quest asks.

# Parsons

```yaml
- id: piercer-walk
  prompt: Put the walk through the hits in order. A blocking hit names the stopper first and then takes the shot's length.
  lines:
    - "for (const FHitResult& Hit : Hits)"
    - "{"
    - "	if (Hit.bBlockingHit)"
    - "	{"
    - "		StoppedBy = Hit.GetActor();"
    - "		ShotLength = Hit.Distance;"
    - "		break;"
    - "	}"
    - "	Pierced.Add(Hit.GetActor());"
    - "}"
  distractors:
    - line: "	Pierced.Add(Hit.GetComponent());"
      mistake: The list holds the actors the shot passed through, and a component pointer is not an actor.
    - line: "	if (Hit.bBlockingHit) Pierced.Add(Hit.GetActor());"
      mistake: This lists the thing that blocks as pierced and drops the things the shot passed through.
```
