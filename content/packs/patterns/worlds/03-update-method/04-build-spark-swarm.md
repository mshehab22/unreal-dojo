---
id: p3-spark-swarm
title: A spark swarm with one walk per frame
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [update-method]
skills: [update-method, containers]
terms: [ustruct, tarray, tick, deltatime, uproperty]
prerequisites: [p3-update-method-card]
xp: 100
estimatedMinutes: 25
concepts:
  - Many light objects can be plain structs updated by one owner's walk instead of one actor each
  - Objects added during the walk wait for the next step, so the walk stops at the count it started with
  - Objects removed during the walk are marked and swept after it, so no neighbor is skipped
---

# Brief

When you press Play and run `ke * Launch`, one orange spark flies out, bursts into two after a second, those burst into four, and those fade out, while the label counts Sparks: 1, 2, 4, 0.

A firework could be an actor per spark, but hundreds of actors each with its own Tick is heavy for something this small. Here the sparks are plain `FDojoP3Spark` structs in one array, and one actor, the swarm, updates all of them in a single walk each frame. The declarations, the struct, and the wiring (`Tick` calls `Step` and draws the sparks) are given. Yours:

- `Launch` adds one spark at the swarm, flying forward at `LaunchSpeed`, living `SparkLifetime` seconds.
- `Step` is the walk. It moves every spark by its velocity times `DeltaSeconds`, takes the frame's time off its life, and counts it in `MovedLastStep`. A spark whose life runs out bursts.
- `Burst` marks the spark dead and, if its generation is below `MaxGeneration`, adds two children at its position, one flying forward and one back, each one generation older with a fresh lifetime.
- `RefreshLabel` writes "Sparks: N", where N is the number alive after the step.

Two rules make the walk safe. Children born during a step do not move in that step; they start on the next one. And a spark that bursts is removed only after the walk, so the walk never skips the spark after it.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP3SparkSwarm` in the sandbox map, press Play, open the console, and run `ke * Launch`. An orange point flies along the X axis; after a second it splits into two flying apart, then four, then they vanish, and the label follows: 1, 2, 4, 0. Run `ke * Launch` several times quickly: every firework runs at once, from one actor's single walk per frame. Set Max Generation to 6 in the swarm's Details and launch again: 64 sparks at the end, still one actor ticking.

# Files

## DojoP3SparkSwarm.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3SparkSwarm.generated.h"

class UTextRenderComponent;

/** One spark of the swarm: plain data the swarm updates, not an actor. */
USTRUCT()
struct FDojoP3Spark
{
	GENERATED_BODY()

	/** Distance from the swarm along its X axis, in centimeters. */
	UPROPERTY()
	float Position = 0.f;

	/** Speed along the X axis, in centimeters per second; negative flies back. */
	UPROPERTY()
	float Velocity = 0.f;

	/** Seconds until the spark bursts. */
	UPROPERTY()
	float SecondsLeft = 1.f;

	/** 0 for a launched spark, one more for each burst it came from. */
	UPROPERTY()
	int32 Generation = 0;

	/** Set when the spark bursts; it is removed after the walk that set it. */
	UPROPERTY()
	bool bDead = false;
};

/** A firework swarm whose sparks are plain structs updated by one walk per frame; bursting sparks split into two that start next step. */
UCLASS()
class ADojoP3SparkSwarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3SparkSwarm();

	/** Floating text that shows how many sparks are alive. */
	UPROPERTY(VisibleAnywhere, Category = "Swarm")
	TObjectPtr<UTextRenderComponent> Label;

	/** Speed of a launched spark and of each child, in centimeters per second. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	float LaunchSpeed = 200.f;

	/** Seconds each spark lives before it bursts. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0.01"))
	float SparkLifetime = 1.f;

	/** Sparks of this generation burst without children. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	int32 MaxGeneration = 2;

	/** Adds one spark at the swarm, flying forward. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Launch();

	/** One update walk: moves and ages every spark that was alive when the walk began, bursts the expired ones, then removes them. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void Step(float DeltaSeconds);

	/** Sparks alive right now. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetSparkCount() const;

	/** How many sparks the last Step moved. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetMovedLastStep() const;

	/** Adds a spark exactly as given; used by tests and by Launch. */
	void AddSpark(const FDojoP3Spark& Spark);

	/** The sparks alive right now, in walk order. */
	const TArray<FDojoP3Spark>& GetSparks() const;

	/** Steps the swarm and draws every spark as a point. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Shows the starting count. */
	virtual void BeginPlay() override;

private:
	/** Marks the spark at Index dead and, below MaxGeneration, adds its two children at its position. */
	void Burst(int32 Index);

	/** Writes the number of sparks alive into the label. */
	void RefreshLabel();

	/** Every spark, alive or marked dead during the current walk. */
	UPROPERTY(VisibleInstanceOnly, Category = "Swarm")
	TArray<FDojoP3Spark> Sparks;

	int32 MovedLastStep = 0;
};
```

## DojoP3SparkSwarm.cpp

```cpp
#include "DojoP3SparkSwarm.h"

#include "Components/TextRenderComponent.h"
#include "DrawDebugHelpers.h"

ADojoP3SparkSwarm::ADojoP3SparkSwarm()
{
	PrimaryActorTick.bCanEverTick = true;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP3SparkSwarm::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP3SparkSwarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	for (const FDojoP3Spark& Spark : Sparks)
	{
		DrawDebugPoint(GetWorld(), GetActorLocation() + FVector(Spark.Position, 0.f, 0.f), 12.f, FColor::Orange);
	}
}

void ADojoP3SparkSwarm::Launch()
{
}

void ADojoP3SparkSwarm::Step(float DeltaSeconds)
{
}

void ADojoP3SparkSwarm::Burst(int32 Index)
{
}

int32 ADojoP3SparkSwarm::GetSparkCount() const
{
	return Sparks.Num();
}

int32 ADojoP3SparkSwarm::GetMovedLastStep() const
{
	return MovedLastStep;
}

void ADojoP3SparkSwarm::AddSpark(const FDojoP3Spark& Spark)
{
	Sparks.Add(Spark);
}

const TArray<FDojoP3Spark>& ADojoP3SparkSwarm::GetSparks() const
{
	return Sparks;
}

void ADojoP3SparkSwarm::RefreshLabel()
{
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p3-spark-swarm/DojoP3SparkSwarm.h"
#include "Support/DojoTestWorld.h"

namespace DojoP3SparkSwarmTest
{
	/** Builds a spark with the given fields. */
	FDojoP3Spark MakeSpark(float Position, float Velocity, float SecondsLeft, int32 Generation)
	{
		FDojoP3Spark Spark;
		Spark.Position = Position;
		Spark.Velocity = Velocity;
		Spark.SecondsLeft = SecondsLeft;
		Spark.Generation = Generation;
		return Spark;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_SparkSwarm_NewSparksWaitAStep, "Dojo.P3.SparkSwarm.NewSparksWaitAStep", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A spark bursts during a step; its two children appear where it burst and only start moving on the next step. */
bool FDojo_P3_SparkSwarm_NewSparksWaitAStep::RunTest(const FString& Parameters)
{
	using namespace DojoP3SparkSwarmTest;

	FDojoTestWorld TestWorld;

	ADojoP3SparkSwarm* Swarm = TestWorld.SpawnActor<ADojoP3SparkSwarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;

	Swarm->AddSpark(MakeSpark(50.f, 100.f, 0.5f, 0));
	Swarm->Step(0.5f);

	TestEqual(TEXT("Only the spark alive when the step began moved"), Swarm->GetMovedLastStep(), 1);
	TestEqual(TEXT("The burst left two children"), Swarm->GetSparkCount(), 2);
	if (Swarm->GetSparkCount() != 2) return false;

	TestEqual(TEXT("The first child waits where its parent burst"), Swarm->GetSparks()[0].Position, 100.f);
	TestEqual(TEXT("The second child waits where its parent burst"), Swarm->GetSparks()[1].Position, 100.f);
	TestEqual(TEXT("A child keeps its whole lifetime until its first step"), Swarm->GetSparks()[0].SecondsLeft, Swarm->SparkLifetime);

	Swarm->Step(0.25f);
	TestEqual(TEXT("Next step both children move"), Swarm->GetMovedLastStep(), 2);
	TestEqual(TEXT("The forward child flew forward"), Swarm->GetSparks()[0].Position, 150.f);
	TestEqual(TEXT("The other child flew back"), Swarm->GetSparks()[1].Position, 50.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_SparkSwarm_NoSparkSkipped, "Dojo.P3.SparkSwarm.NoSparkSkipped", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two neighbors burst out in the same step; every spark still moves exactly once and only the burst ones are removed. */
bool FDojo_P3_SparkSwarm_NoSparkSkipped::RunTest(const FString& Parameters)
{
	using namespace DojoP3SparkSwarmTest;

	FDojoTestWorld TestWorld;

	ADojoP3SparkSwarm* Swarm = TestWorld.SpawnActor<ADojoP3SparkSwarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;

	const int32 LastGeneration = Swarm->MaxGeneration;
	Swarm->AddSpark(MakeSpark(0.f, 10.f, 1.f, LastGeneration));
	Swarm->AddSpark(MakeSpark(100.f, 10.f, 0.1f, LastGeneration));
	Swarm->AddSpark(MakeSpark(200.f, 10.f, 0.1f, LastGeneration));
	Swarm->AddSpark(MakeSpark(300.f, 10.f, 1.f, LastGeneration));
	Swarm->AddSpark(MakeSpark(400.f, 10.f, 1.f, LastGeneration));

	Swarm->Step(0.5f);

	TestEqual(TEXT("All five sparks moved exactly once"), Swarm->GetMovedLastStep(), 5);
	TestEqual(TEXT("The two that ran out are gone, with no children"), Swarm->GetSparkCount(), 3);
	if (Swarm->GetSparkCount() != 3) return false;

	TestEqual(TEXT("The first survivor moved 5 centimeters"), Swarm->GetSparks()[0].Position, 5.f);
	TestEqual(TEXT("The second survivor moved 5 centimeters"), Swarm->GetSparks()[1].Position, 305.f);
	TestEqual(TEXT("The third survivor moved 5 centimeters"), Swarm->GetSparks()[2].Position, 405.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P3_SparkSwarm_LaunchBurstsToTheEnd, "Dojo.P3.SparkSwarm.LaunchBurstsToTheEnd", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One launch with the defaults goes 1, 2, 4, 0 sparks over three one-second steps, and the label follows. */
bool FDojo_P3_SparkSwarm_LaunchBurstsToTheEnd::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP3SparkSwarm* Swarm = TestWorld.SpawnActor<ADojoP3SparkSwarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm) || !TestNotNull(TEXT("Swarm has a label"), Swarm->Label.Get())) return false;

	Swarm->Launch();
	TestEqual(TEXT("One spark after a launch"), Swarm->GetSparkCount(), 1);
	if (Swarm->GetSparkCount() != 1) return false;
	TestEqual(TEXT("It flies forward at the launch speed"), Swarm->GetSparks()[0].Velocity, Swarm->LaunchSpeed);

	Swarm->Step(1.f);
	TestEqual(TEXT("After one second it burst into two"), Swarm->GetSparkCount(), 2);

	Swarm->Step(1.f);
	TestEqual(TEXT("After two seconds there are four"), Swarm->GetSparkCount(), 4);
	TestEqual(TEXT("The label shows four"), Swarm->Label->Text.ToString(), FString(TEXT("Sparks: 4")));

	Swarm->Step(1.f);
	TestEqual(TEXT("The last generation fades without children"), Swarm->GetSparkCount(), 0);
	TestEqual(TEXT("The label shows none"), Swarm->Label->Text.ToString(), FString(TEXT("Sparks: 0")));

	return true;
}

#endif
```

# Hints

- The failing test lets one spark burst mid-step and then checks where its children are. Ask whether your loop's end moves while you are adding to the array.
- Read the array's length once, before the walk, and loop to that number; anything added after that point is next step's business. Keep marking burst sparks instead of removing them, and sweep the marked ones out with one call after the loop.
- `TArray::Num`, `TArray::Add`, and `TArray::RemoveAll` with a lambda are in `Containers/Array.h`. Index into the array inside the loop rather than holding a reference across an Add, which can move the array's memory.

# Rubric

- Step walks only the sparks that existed when it began; children start moving next step.
- Burst sparks are marked during the walk and removed in one sweep after it, so no spark is skipped or moved twice.
- No reference into the array is held across an Add; children are built from copied values.
- Every spark moves by velocity times DeltaSeconds; launch speed, lifetime, and generation cap come from editable properties.
- One actor ticks for the whole swarm; sparks are plain structs, not actors.
- The label shows the live count after each step.

# Alternative

Each spark could be its own small actor with a projectile movement component and a lifespan, which gives collision, the editor's outliner, and Blueprint access for free. That is the right call for a dozen grenades a designer wants to tweak one by one. For hundreds of short-lived sparks, the actor route pays spawn and destroy costs and one tick per spark every frame; a struct array walked once is far cheaper and keeps the burst rules in one readable function. The engine's Mass framework and Niagara particles take the same idea much further for crowds and effects.

# Parsons

```yaml
- id: swarm-walk
  prompt: Put the heart of Step in order.
  lines:
    - "	const int32 CountAtStart = Sparks.Num();"
    - "	for (int32 Index = 0; Index < CountAtStart; ++Index)"
    - "	{"
    - "		if (Sparks[Index].bDead) continue;"
    - "		Sparks[Index].Position += Sparks[Index].Velocity * DeltaSeconds;"
    - "		Sparks[Index].SecondsLeft -= DeltaSeconds;"
    - "		if (Sparks[Index].SecondsLeft <= 0.f) Burst(Index);"
    - "	}"
    - "	Sparks.RemoveAll([](const FDojoP3Spark& Spark) { return Spark.bDead; });"
  distractors:
    - line: "		if (Sparks[Index].SecondsLeft <= 0.f) Sparks.RemoveAt(Index);"
      mistake: Removing inside the walk slides the next spark into this slot, and the loop moves on without ever updating it.
```
