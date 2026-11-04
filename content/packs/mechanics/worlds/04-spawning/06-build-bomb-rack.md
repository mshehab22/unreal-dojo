---
id: m4-bomb-rack
title: A rack that loads bombs already burning
order: 6
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [spawning, time]
terms: [spawn-actor-deferred, spawnactor, tsubclassof, world-and-local-space]
prerequisites: [m4-fuse]
xp: 70
estimatedMinutes: 16
concepts:
  - A deferred spawn sets a property before the new actor's BeginPlay reads it
  - Each slot's bomb gets its own fuse, so the rack goes off in order
---

# Brief

When you place a rack of four slots and call Load, a bomb appears in every slot along the rack's right side, each one already counting down from its first frame, the first slot with 2 seconds and each next slot half a second more, so they blow one after another; turn the rack and the row turns with it.

Most of the rack is written for you, including where each slot is. Fill the gap in `ADojoM4BombRack::Load`:

1. Spawn a bomb of `BombClass` at the slot, deferred, so it is not started yet.
2. Give it a `StartFuse` of `FirstFuse` plus `FuseStep` for every slot before it.
3. Finish spawning it, so it begins play lit, and keep it.

Dependency direction: the rack knows the bomb class and the bombs it made; the bombs know nothing about the rack.

This quest reuses World 2's idea of a direction measured in the actor's own frame: the row follows the rack's right vector.

Compiles against earlier quests: m4-fuse (`Quests/m4-fuse/DojoM4Bomb.h`).

## See it in the editor

Place a `DojoM4BombRack`, set Bomb Class to `DojoM4Bomb` in Details, and in the level Blueprint call Load on BeginPlay. Press Play: four bombs appear with their labels already counting, and they go off left to right. Turn the rack 90 degrees about Z and play again. Then try one A/B change in the code: spawn with `SpawnActor` and set `StartFuse` on the returned bomb afterwards, play, and see every label read SAFE.

# Files

## DojoM4BombRack.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoM4BombRack.generated.h"

class ADojoM4Bomb;

/** Loads a row of bombs along its own right side, each lit from its first frame with a fuse a little longer than the one before. */
UCLASS()
class ADojoM4BombRack : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and an arrow that shows the rack's forward. */
	ADojoM4BombRack();

	/** What to load; nothing is loaded while it is empty. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack")
	TSubclassOf<ADojoM4Bomb> BombClass;

	/** How many bombs one Load makes. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "1"))
	int32 Slots = 4;

	/** Units between slots along the rack's right. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0"))
	float Spacing = 150.f;

	/** The first slot's fuse, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0.1"))
	float FirstFuse = 2.f;

	/** How much longer each next slot's fuse is, in seconds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rack", meta = (ClampMin = "0"))
	float FuseStep = 0.5f;

	/** Spawns a lit bomb in every slot; returns how many appeared. */
	UFUNCTION(BlueprintCallable, Category = "Rack")
	int32 Load();

	/** The bombs this rack has loaded, first slot first. */
	UFUNCTION(BlueprintPure, Category = "Rack")
	TArray<ADojoM4Bomb*> GetBombs() const;

private:
	UPROPERTY()
	TArray<TObjectPtr<ADojoM4Bomb>> Bombs;
};
```

## DojoM4BombRack.cpp

```cpp
#include "DojoM4BombRack.h"

#include "Components/ArrowComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"

ADojoM4BombRack::ADojoM4BombRack()
{
	PrimaryActorTick.bCanEverTick = false;

	USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	UArrowComponent* Arrow = CreateDefaultSubobject<UArrowComponent>(TEXT("Arrow"));
	Arrow->SetupAttachment(Root);
}

int32 ADojoM4BombRack::Load()
{
	if (!BombClass)
	{
		return 0;
	}

	int32 Loaded = 0;
	for (int32 Slot = 0; Slot < Slots; ++Slot)
	{
		const FTransform Spot(GetActorRotation(), GetActorLocation() + GetActorRightVector() * Spacing * Slot);

		// Your code: spawn a bomb of BombClass at Spot, deferred, so it has not begun play yet.
		// Your code: give it a StartFuse of FirstFuse plus FuseStep for every slot before this one.
		// Your code: finish spawning it at Spot, then keep it in Bombs and count it in Loaded.
	}

	return Loaded;
}

TArray<ADojoM4Bomb*> ADojoM4BombRack::GetBombs() const
{
	TArray<ADojoM4Bomb*> Result;
	for (ADojoM4Bomb* Bomb : Bombs)
	{
		Result.Add(Bomb);
	}

	return Result;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/m4-bomb-rack/DojoM4BombRack.h"
#include "Quests/m4-fuse/DojoM4Bomb.h"
#include "Support/DojoTestWorld.h"

namespace DojoM4RackTest
{
	/** Spawns a rack turned by Yaw at a spot, loading plain bombs. */
	ADojoM4BombRack* PlaceRack(FDojoTestWorld& TestWorld, const FVector& Where, double Yaw)
	{
		const FTransform Spot(FRotator(0.0, Yaw, 0.0), Where);
		ADojoM4BombRack* Rack = TestWorld.GetWorld()->SpawnActorDeferred<ADojoM4BombRack>(ADojoM4BombRack::StaticClass(), Spot);
		Rack->BombClass = ADojoM4Bomb::StaticClass();
		Rack->FinishSpawning(Spot);
		return Rack;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_BombRack_LoadsLitBombs, "Dojo.M4.BombRack.LoadsLitBombs", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Loads a rack and checks every bomb is in its slot and was lit as it began play, with fuses that grow by the step. */
bool FDojo_M4_BombRack_LoadsLitBombs::RunTest(const FString& Parameters)
{
	using namespace DojoM4RackTest;

	FDojoTestWorld TestWorld;

	ADojoM4BombRack* Rack = PlaceRack(TestWorld, FVector::ZeroVector, 0.0);
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;

	TestEqual(TEXT("Load fills every slot"), Rack->Load(), 4);
	const TArray<ADojoM4Bomb*> Bombs = Rack->GetBombs();
	if (!TestEqual(TEXT("The rack keeps the four bombs"), Bombs.Num(), 4)) return false;

	for (int32 Slot = 0; Slot < 4; ++Slot)
	{
		const FString Name = FString::Printf(TEXT("Slot %d: "), Slot);
		TestTrue(Name + TEXT("the bomb stands in its slot along the rack's right"), Bombs[Slot]->GetActorLocation().Equals(FVector(0.0, 150.0 * Slot, 0.0), 0.1));
		TestTrue(Name + TEXT("the bomb was already lit as it began play"), Bombs[Slot]->WasLitAtStart());
		TestEqual(Name + TEXT("with the first fuse plus a half second per earlier slot"), Bombs[Slot]->GetFuseRemaining(), 2.f + 0.5f * Slot, 0.01f);
	}

	const TWeakObjectPtr<ADojoM4Bomb> First(Bombs[0]);
	const TWeakObjectPtr<ADojoM4Bomb> Second(Bombs[1]);
	TestWorld.Tick(135);
	TestFalse(TEXT("A little over 2 seconds in, the first slot has blown"), First.IsValid());
	TestTrue(TEXT("and the second has not yet"), Second.IsValid());

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_M4_BombRack_RowFollowsTheRack, "Dojo.M4.BombRack.RowFollowsTheRack", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Loads a turned rack with its own settings and checks the row follows its right side; a rack with no class loads nothing. */
bool FDojo_M4_BombRack_RowFollowsTheRack::RunTest(const FString& Parameters)
{
	using namespace DojoM4RackTest;

	FDojoTestWorld TestWorld;

	ADojoM4BombRack* Rack = PlaceRack(TestWorld, FVector(1000.0, 0.0, 0.0), 90.0);
	if (!TestNotNull(TEXT("Rack spawned"), Rack)) return false;
	Rack->Slots = 3;
	Rack->Spacing = 200.f;
	Rack->FirstFuse = 1.f;
	Rack->FuseStep = 1.f;

	TestEqual(TEXT("Load fills the three slots"), Rack->Load(), 3);
	const TArray<ADojoM4Bomb*> Bombs = Rack->GetBombs();
	if (!TestEqual(TEXT("The rack keeps the three bombs"), Bombs.Num(), 3)) return false;

	TestTrue(TEXT("Turned 90 degrees, the rack's right points along minus X, and so does the row"), Bombs[2]->GetActorLocation().Equals(FVector(600.0, 0.0, 0.0), 0.1));
	TestEqual(TEXT("The third slot's fuse is 1 plus two steps of 1"), Bombs[2]->GetFuseRemaining(), 3.f, 0.01f);

	Rack->BombClass = nullptr;
	TestEqual(TEXT("With no class set, Load makes nothing"), Rack->Load(), 0);

	return true;
}

#endif
```

# Hints

- The bomb reads its fuse setting in `BeginPlay`, which runs as soon as an ordinary spawn finishes.
- The world has a spawn that hands you the actor before it starts, and a call on the actor that starts it once you have set it up.
- `SpawnActorDeferred` is a template on `UWorld` in `Engine/World.h` that takes the class and a transform; `FinishSpawning` is on `AActor` and takes the same transform.

# Rubric

- Each bomb is spawned deferred, gets its `StartFuse` set, and is then finished, so it is lit from its first frame.
- The slot's fuse is `FirstFuse` plus `FuseStep` for every earlier slot, so the row goes off in order.
- Each bomb stands at its slot along the rack's right, so turning the rack turns the row.
- Every spawned bomb is kept and counted; nothing is spawned without a class.
- The rack knows only the bomb class and its own bombs; the bombs know nothing about the rack.

# Alternative

The rack could spawn each bomb the usual way and then call `Light` on it. That reaches the same burning bomb with no deferred spawn, but only because this bomb happens to have a public `Light`; a class that sets itself up in `BeginPlay` from a property, such as a Blueprint child that picks its color from its fuse, would have started with the old value. Deferred spawning is the general way to hand an actor its settings before it starts. For many identical bombs a pool of hidden, ready bombs would avoid spawning at all, at the cost of resetting every property on reuse.

# Parsons

```yaml
- id: rack-slot
  prompt: Put the spawning of one slot in order; keeping the bomb comes afterwards.
  lines:
    - "const FTransform Spot(GetActorRotation(), GetActorLocation() + GetActorRightVector() * Spacing * Slot);"
    - "ADojoM4Bomb* Bomb = GetWorld()->SpawnActorDeferred<ADojoM4Bomb>(BombClass, Spot);"
    - "if (!Bomb) continue;"
    - "Bomb->StartFuse = FirstFuse + FuseStep * Slot;"
    - "Bomb->FinishSpawning(Spot);"
  distractors:
    - line: "ADojoM4Bomb* Bomb = GetWorld()->SpawnActor<ADojoM4Bomb>(BombClass, Spot);"
      mistake: SpawnActor runs BeginPlay before it returns, so a StartFuse set afterwards is never read.
    - line: "Bomb->BeginPlay();"
      mistake: BeginPlay is the engine's to call; FinishSpawning runs it once, with the values you set.
```
