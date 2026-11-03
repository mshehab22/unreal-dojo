---
id: p19-firefly-swarm
title: One swarm, one loop
order: 2
kind: build
scaffold: worked
difficulty: 3
patterns: [data-locality]
skills: [data-locality, performance]
terms: [ustruct, tarray, fvector3f, cache-line, tick, deltatime]
prerequisites: [p19-scattered-memory]
xp: 60
estimatedMinutes: 20
concepts:
  - Every firefly is a 32 byte record kept by value in one TArray, so the records sit side by side
  - One actor and one tick update the whole swarm with one loop from front to back
  - The loop changes the records through a reference; a copy would change nothing
  - A static_assert keeps the record at its size, so a careless new field fails the build instead of the frame rate
  - The swarm depends on nothing; nothing in a firefly points anywhere
---

# Brief

When you press Play with the setup below, one actor moves a thousand fireflies: they drift, turn back at the floor and the ceiling of the meadow, and pulse between dark and bright, and the Outliner lists that one actor and no firefly at all.

`FDojoP19Firefly` is one firefly: a position, a velocity, a glow, and the rate its glow changes, 32 bytes in all. `ADojoP19Swarm` keeps every firefly by value in one `UPROPERTY` array. When play begins it adds `StartingFireflies` fireflies, scattered by a fixed random seed, and each frame its `Tick` calls `Step` with the frame's length. `AddFirefly`, `GetFireflyCount`, `GetFireflyPosition`, and `GetFireflyGlow` are given.

Most of the code is written. First read the marked lines and say in a sentence why each one is there. Then fill the one gap: `Step`. For every firefly, in one loop over the array: move it by its velocity times `DeltaSeconds`; if it is now below 0 and still moving down, or above `Ceiling` and still moving up, turn its vertical velocity around; then change its glow by its glow rate times `DeltaSeconds`, and if the glow is now above 1 and still rising, or below 0 and still falling, turn its glow rate around. Nothing else changes, and no firefly is added or removed.

## See it in the editor

Place a `DojoP19Swarm` and set Starting Fireflies to 1000 and Draw Debug to true in the Details panel. Press Play: a cloud of points drifts over the swarm, rising and falling between the floor and 300 units up, each point brightening and dimming. Press F8 to eject and look at the Outliner: one `DojoP19Swarm` and no firefly actors. Type `stat game` in the console to see how little the one tick costs.

# Files

## DojoP19Firefly.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP19Firefly.generated.h"

/** One firefly: where it is, where it is going, and how bright it is. Small and plain, so thousands can sit side by side. */
USTRUCT()
struct FDojoP19Firefly
{
	GENERATED_BODY()

	/** Where the firefly is. */
	UPROPERTY()
	FVector3f Position = FVector3f::ZeroVector; // @explain: FVector3f holds three floats, half the size of a UE 5 FVector's three doubles, which is plenty of precision for a meadow and keeps the whole record at 32 bytes.

	/** Where it is going, in units per second. */
	UPROPERTY()
	FVector3f Velocity = FVector3f::ZeroVector;

	/** How bright it is, from 0 to 1. */
	UPROPERTY()
	float Glow = 0.f;

	/** How fast its glow changes per second; the sign says brightening or dimming. */
	UPROPERTY()
	float GlowRate = 0.f;
};

static_assert(sizeof(FDojoP19Firefly) == 32, "A firefly must stay 32 bytes, two to a cache line."); // @explain: The record's size is what decides how many fireflies each cache line brings, so a field added without thinking fails the build here instead of quietly slowing the swarm.
```

## DojoP19Swarm.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP19Firefly.h"
#include "DojoP19Swarm.generated.h"

/** A whole swarm of fireflies in one actor: the fireflies are records in one array, moved by one loop each frame. */
UCLASS()
class ADojoP19Swarm : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and lets the swarm tick. */
	ADojoP19Swarm();

	/** How many fireflies the swarm adds when play begins. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0"))
	int32 StartingFireflies = 0;

	/** The seed that scatters the starting fireflies, so every play starts the same. */
	UPROPERTY(EditAnywhere, Category = "Swarm")
	int32 Seed = 19;

	/** Half the width of the square the starting fireflies are scattered over. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "0.0"))
	float Extent = 500.f;

	/** The top of the meadow; fireflies turn back between 0 and here. */
	UPROPERTY(EditAnywhere, Category = "Swarm", meta = (ClampMin = "1.0"))
	float Ceiling = 300.f;

	/** Draws every firefly as a debug point while playing. */
	UPROPERTY(EditAnywhere, Category = "Swarm")
	bool bDrawDebug = false;

	/** Adds one firefly. */
	UFUNCTION(BlueprintCallable, Category = "Swarm")
	void AddFirefly(FVector Position, FVector Velocity, float Glow, float GlowRate);

	/** How many fireflies the swarm holds. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	int32 GetFireflyCount() const;

	/** Where the firefly at Index is, or zero for an index the swarm does not hold. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	FVector GetFireflyPosition(int32 Index) const;

	/** How bright the firefly at Index is, or zero for an index the swarm does not hold. */
	UFUNCTION(BlueprintPure, Category = "Swarm")
	float GetFireflyGlow(int32 Index) const;

	/** Moves every firefly and changes its glow by DeltaSeconds, in one loop over the array. */
	void Step(float DeltaSeconds);

	/** Steps the swarm by the frame's length and draws it when asked. */
	virtual void Tick(float DeltaSeconds) override;

protected:
	/** Adds the starting fireflies. */
	virtual void BeginPlay() override;

private:
	/** Every firefly, by value, side by side. */
	UPROPERTY()
	TArray<FDojoP19Firefly> Fireflies; // @explain: The array holds the records themselves, not pointers to them, so walking it reads memory in order from front to back.
};
```

## DojoP19Swarm.cpp

```cpp
#include "DojoP19Swarm.h"

#include "Components/SceneComponent.h"
#include "DrawDebugHelpers.h"
#include "Math/RandomStream.h"

ADojoP19Swarm::ADojoP19Swarm()
{
	PrimaryActorTick.bCanEverTick = true;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP19Swarm::BeginPlay()
{
	Super::BeginPlay();

	FRandomStream Stream(Seed);
	const FVector Origin = GetActorLocation();
	Fireflies.Reserve(StartingFireflies); // @explain: Reserving once makes the array take all its memory in one block before the loop, instead of growing and moving its records again and again while they are added.
	for (int32 Index = 0; Index < StartingFireflies; ++Index)
	{
		const FVector Position = Origin + FVector(Stream.FRandRange(-Extent, Extent), Stream.FRandRange(-Extent, Extent), Stream.FRandRange(0.f, Ceiling));
		const FVector Velocity(Stream.FRandRange(-40.f, 40.f), Stream.FRandRange(-40.f, 40.f), Stream.FRandRange(-60.f, 60.f));
		const float GlowRate = Stream.FRandRange(0.5f, 1.5f) * (Stream.RandBool() ? 1.f : -1.f);
		AddFirefly(Position, Velocity, Stream.FRand(), GlowRate);
	}
}

void ADojoP19Swarm::AddFirefly(FVector Position, FVector Velocity, float Glow, float GlowRate)
{
	FDojoP19Firefly Firefly;
	Firefly.Position = FVector3f(Position);
	Firefly.Velocity = FVector3f(Velocity);
	Firefly.Glow = Glow;
	Firefly.GlowRate = GlowRate;
	Fireflies.Add(Firefly);
}

int32 ADojoP19Swarm::GetFireflyCount() const
{
	return Fireflies.Num();
}

FVector ADojoP19Swarm::GetFireflyPosition(int32 Index) const
{
	return Fireflies.IsValidIndex(Index) ? FVector(Fireflies[Index].Position) : FVector::ZeroVector;
}

float ADojoP19Swarm::GetFireflyGlow(int32 Index) const
{
	return Fireflies.IsValidIndex(Index) ? Fireflies[Index].Glow : 0.f;
}

void ADojoP19Swarm::Step(float DeltaSeconds)
{
}

void ADojoP19Swarm::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	Step(DeltaSeconds);

	if (!bDrawDebug) return;

	for (const FDojoP19Firefly& Firefly : Fireflies)
	{
		const uint8 Brightness = static_cast<uint8>(FMath::Clamp(Firefly.Glow, 0.f, 1.f) * 255.f);
		DrawDebugPoint(GetWorld(), FVector(Firefly.Position), 6.f, FColor(Brightness, Brightness, 0));
	}
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "EngineUtils.h"
#include "Quests/p19-firefly-swarm/DojoP19Swarm.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Swarm_FirefliesFlyByTheirVelocity, "Dojo.P19.Swarm.FirefliesFlyByTheirVelocity", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** One step moves every firefly by its own velocity times the step's length. */
bool FDojo_P19_Swarm_FirefliesFlyByTheirVelocity::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Swarm* Swarm = TestWorld.SpawnActor<ADojoP19Swarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;
	Swarm->SetActorTickEnabled(false);

	Swarm->AddFirefly(FVector(0.f, 0.f, 100.f), FVector(10.f, 0.f, 50.f), 0.5f, 0.f);
	Swarm->AddFirefly(FVector(200.f, 0.f, 150.f), FVector(0.f, -20.f, -40.f), 0.5f, 0.f);
	Swarm->Step(1.f);

	TestTrue(TEXT("The first firefly moved by its velocity"), Swarm->GetFireflyPosition(0).Equals(FVector(10.f, 0.f, 150.f), 0.01f));
	TestTrue(TEXT("The second moved by its own"), Swarm->GetFireflyPosition(1).Equals(FVector(200.f, -20.f, 110.f), 0.01f));

	Swarm->Step(0.5f);
	TestTrue(TEXT("Half a step moves half as far"), Swarm->GetFireflyPosition(0).Equals(FVector(15.f, 0.f, 175.f), 0.01f));
	TestEqual(TEXT("A step adds and removes no firefly"), Swarm->GetFireflyCount(), 2);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Swarm_TheyTurnAtFloorAndCeiling, "Dojo.P19.Swarm.TheyTurnAtFloorAndCeiling", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A firefly that passes the ceiling going up comes back down, one that passes the floor going down comes back up, and one already above the ceiling and coming down is left alone. */
bool FDojo_P19_Swarm_TheyTurnAtFloorAndCeiling::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Swarm* Swarm = TestWorld.SpawnActor<ADojoP19Swarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;
	Swarm->SetActorTickEnabled(false);

	Swarm->AddFirefly(FVector(0.f, 0.f, 290.f), FVector(0.f, 0.f, 50.f), 0.5f, 0.f);
	Swarm->AddFirefly(FVector(0.f, 0.f, 10.f), FVector(0.f, 0.f, -50.f), 0.5f, 0.f);
	Swarm->AddFirefly(FVector(0.f, 0.f, 400.f), FVector(0.f, 0.f, -50.f), 0.5f, 0.f);

	Swarm->Step(0.5f);
	TestTrue(TEXT("The rising firefly went past the ceiling, to 315"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(0).Z, 315.f, 0.01f));
	TestTrue(TEXT("The falling firefly went past the floor, to -15"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(1).Z, -15.f, 0.01f));

	Swarm->Step(0.5f);
	TestTrue(TEXT("Having turned, it comes back down to 290"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(0).Z, 290.f, 0.01f));
	TestTrue(TEXT("Having turned, it comes back up to 10"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(1).Z, 10.f, 0.01f));

	TestTrue(TEXT("The firefly above the ceiling that was already coming down keeps coming down, to 350"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(2).Z, 350.f, 0.01f));

	Swarm->Step(0.5f);
	TestTrue(TEXT("It keeps going down inside the meadow, without turning again"), FMath::IsNearlyEqual(Swarm->GetFireflyPosition(0).Z, 265.f, 0.01f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Swarm_GlowPulsesBetweenDarkAndBright, "Dojo.P19.Swarm.GlowPulsesBetweenDarkAndBright", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A glow that passes 1 while rising starts falling, one that passes 0 while falling starts rising, and one already above 1 and falling keeps falling. */
bool FDojo_P19_Swarm_GlowPulsesBetweenDarkAndBright::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP19Swarm* Swarm = TestWorld.SpawnActor<ADojoP19Swarm>();
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;
	Swarm->SetActorTickEnabled(false);

	Swarm->AddFirefly(FVector(0.f, 0.f, 100.f), FVector::ZeroVector, 0.5f, 1.f);
	Swarm->AddFirefly(FVector(0.f, 0.f, 100.f), FVector::ZeroVector, 0.3f, -1.f);
	Swarm->AddFirefly(FVector(0.f, 0.f, 100.f), FVector::ZeroVector, 2.f, -1.f);

	Swarm->Step(0.6f);
	TestTrue(TEXT("The rising glow went past 1, to 1.1"), FMath::IsNearlyEqual(Swarm->GetFireflyGlow(0), 1.1f, 0.001f));
	TestTrue(TEXT("The falling glow went past 0, to -0.3"), FMath::IsNearlyEqual(Swarm->GetFireflyGlow(1), -0.3f, 0.001f));

	Swarm->Step(0.2f);
	TestTrue(TEXT("Having turned, it dims to 0.9"), FMath::IsNearlyEqual(Swarm->GetFireflyGlow(0), 0.9f, 0.001f));
	TestTrue(TEXT("Having turned, it brightens to -0.1"), FMath::IsNearlyEqual(Swarm->GetFireflyGlow(1), -0.1f, 0.001f));
	TestTrue(TEXT("The glow above 1 that was already falling keeps falling, to 1.2"), FMath::IsNearlyEqual(Swarm->GetFireflyGlow(2), 1.2f, 0.001f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P19_Swarm_OneActorTicksTheWholeSwarm, "Dojo.P19.Swarm.OneActorTicksTheWholeSwarm", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A thousand starting fireflies add one actor to the world, and the swarm's own tick moves every one of them. */
bool FDojo_P19_Swarm_OneActorTicksTheWholeSwarm::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	int32 ActorsBefore = 0;
	for (TActorIterator<AActor> Each(TestWorld.GetWorld()); Each; ++Each) ActorsBefore++;

	ADojoP19Swarm* Swarm = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP19Swarm>(ADojoP19Swarm::StaticClass(), FTransform::Identity);
	if (!TestNotNull(TEXT("Swarm spawned"), Swarm)) return false;
	Swarm->StartingFireflies = 1000;
	Swarm->FinishSpawning(FTransform::Identity);

	int32 ActorsAfter = 0;
	for (TActorIterator<AActor> Each(TestWorld.GetWorld()); Each; ++Each) ActorsAfter++;
	TestEqual(TEXT("The swarm holds a thousand fireflies"), Swarm->GetFireflyCount(), 1000);
	TestEqual(TEXT("And the world holds one more actor, the swarm itself"), ActorsAfter, ActorsBefore + 1);

	TArray<FVector> Before;
	for (int32 Index = 0; Index < 1000; ++Index) Before.Add(Swarm->GetFireflyPosition(Index));
	TestWorld.Tick(10);

	int32 Moved = 0;
	for (int32 Index = 0; Index < 1000; ++Index)
	{
		if (!Swarm->GetFireflyPosition(Index).Equals(Before[Index], 0.001f)) Moved++;
	}
	TestEqual(TEXT("Ten frames of the swarm's own tick moved every firefly"), Moved, 1000);

	return true;
}

#endif
```

# Hints

- `Step` is one loop over `Fireflies`. How must the loop name each firefly so that what it changes reaches the array?
- Each turn has two conditions: past the edge, and still heading out. What goes wrong if a firefly turns only because it is past the edge?
- Move first and check the edge after, then do the same for the glow. Which test pins that order?

# Rubric

- Step moves every firefly by its velocity times DeltaSeconds, in one loop over the array, changing the records in place.
- A firefly below 0 still moving down, or above Ceiling still moving up, turns its vertical velocity around, and only then.
- The glow changes by the glow rate times DeltaSeconds, and turns around above 1 while rising or below 0 while falling.
- Step adds and removes no firefly and changes nothing else.
- The whole swarm is one actor with one tick, and every firefly is a record by value in one array.
- The firefly record stays 32 bytes.

# Alternative

The fireflies could be drawn with an instanced static mesh, one instance per firefly, updated from the array after the step; that is the usual way to make thousands of copies visible, and the array stays the one place their state lives. The swarm could also store each field in its own array, all positions together and all velocities together, which helps when a loop reads only one field. Here every step reads every field of every firefly, so one array of whole records is the better fit, and easier to read.

# Parsons

```yaml
- id: step-loop
  prompt: "Put Step in order. Inside the loop: move the firefly, turn it at the floor or the ceiling, change its glow, then turn its glow."
  lines:
    - "void ADojoP19Swarm::Step(float DeltaSeconds)"
    - "{"
    - "	for (FDojoP19Firefly& Firefly : Fireflies)"
    - "	{"
    - "		Firefly.Position += Firefly.Velocity * DeltaSeconds;"
    - "		if ((Firefly.Position.Z < 0.f && Firefly.Velocity.Z < 0.f) || (Firefly.Position.Z > Ceiling && Firefly.Velocity.Z > 0.f)) Firefly.Velocity.Z = -Firefly.Velocity.Z;"
    - "		Firefly.Glow += Firefly.GlowRate * DeltaSeconds;"
    - "		if ((Firefly.Glow > 1.f && Firefly.GlowRate > 0.f) || (Firefly.Glow < 0.f && Firefly.GlowRate < 0.f)) Firefly.GlowRate = -Firefly.GlowRate;"
    - "	}"
    - "}"
  distractors:
    - line: "	for (FDojoP19Firefly Firefly : Fireflies)"
      mistake: A loop by value changes a copy of each firefly and throws it away, so the swarm never moves; loop by reference to change the records in the array.
```
