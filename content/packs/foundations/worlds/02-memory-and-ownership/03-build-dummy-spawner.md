---
id: f2-dummy-spawner
title: A spawner that makes whatever dummy you pick
order: 3
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [memory, spawning]
terms: [tsubclassof, spawnactor, tobjectptr, garbage-collection, createdefaultsubobject]
prerequisites: [f2-tsubclassof-and-spawning, f1-training-dummy]
xp: 50
estimatedMinutes: 12
concepts:
  - A TSubclassOf property lets a designer pick a class, including Blueprint children
  - SpawnActor creates an actor of a class chosen at run time
---

# Brief

When you press Play and run `ke * SpawnDummy` twice, two training dummies appear in a line beside the spawner, each showing 3 above it.

The dummy is the one you wrote in World 1, reused unchanged. The spawner holds a `TSubclassOf<ADojoF1TrainingDummy>` that the Details panel turns into a class picker. Read the marked lines and explain each one, then fill the gap: write `SpawnDummy` so it spawns one dummy of the picked class, one `SpawnSpacing` further along than the last, remembers it, and returns it. When no class is picked it returns nullptr and spawns nothing.

Dependency direction: the spawner holds references to the dummies it made; the dummies know nothing about the spawner.

Compiles against earlier quests: f1-training-dummy (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`).

## See it in the editor

Place a `DojoF2DummySpawner` in the sandbox map and press Play. Run `ke * SpawnDummy` twice: two dummies appear 200 and 400 units away, each reading 3. Then stop, right-click `DojoF1TrainingDummy` in the C++ Classes folder, create a Blueprint child named `BP_SturdyDummy`, set its Hits To Knock Down to 6, and pick it as the spawner's Dummy Class. Play and spawn again: the new dummies read 6. The spawner's code never mentioned the Blueprint; the class picker did the work.

# Files

## DojoF2DummySpawner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF2DummySpawner.generated.h"

class ADojoF1TrainingDummy;

/** Spawns training dummies of whatever class a designer picks, each one further along a line. */
UCLASS()
class ADojoF2DummySpawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root, sets the default dummy class, and turns ticking off. */
	ADojoF2DummySpawner();

	/** The dummy class to spawn; any Blueprint child of the training dummy can be picked. */
	UPROPERTY(EditAnywhere, Category = "Spawner") // @explain: EditAnywhere on a TSubclassOf shows a class picker limited to the training dummy and its children.
	TSubclassOf<ADojoF1TrainingDummy> DummyClass;

	/** Distance between the spawner and the first dummy, and between dummies. */
	UPROPERTY(EditAnywhere, Category = "Spawner")
	FVector SpawnSpacing = FVector(200.f, 0.f, 0.f);

	/** Spawns one dummy of DummyClass after the last one; returns nullptr when no class is set. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoF1TrainingDummy* SpawnDummy();

	/** How many dummies this spawner has made. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	int32 GetSpawnedCount() const;

private:
	/** Every dummy spawned so far; UPROPERTY so the garbage collector sees these references. */
	UPROPERTY(VisibleInstanceOnly, Category = "Spawner") // @explain: The array of pointers is reflected, so the garbage collector knows the spawner refers to these dummies.
	TArray<TObjectPtr<ADojoF1TrainingDummy>> SpawnedDummies;
};
```

## DojoF2DummySpawner.cpp

```cpp
#include "DojoF2DummySpawner.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h" // @explain: The header only forward declared the dummy; the source file needs the full class to spawn it.

ADojoF2DummySpawner::ADojoF2DummySpawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root")); // @explain: A scene root gives the spawner a location in the level to measure spacing from.

	DummyClass = ADojoF1TrainingDummy::StaticClass(); // @explain: StaticClass gives the C++ class itself as the default, so the spawner works before a designer picks anything.
}

ADojoF1TrainingDummy* ADojoF2DummySpawner::SpawnDummy()
{
	// Your code: return nullptr when no class is picked.
	// Your code: work out the location, spawn a dummy of DummyClass there, remember it, and return it.
	return nullptr;
}

int32 ADojoF2DummySpawner::GetSpawnedCount() const
{
	return SpawnedDummies.Num();
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f2-dummy-spawner/DojoF2DummySpawner.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_DummySpawner_SpawnsInALine, "Dojo.F2.DummySpawner.SpawnsInALine", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns two dummies and checks the class, the spacing, the count, and the dummies' own labels. */
bool FDojo_F2_DummySpawner_SpawnsInALine::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2DummySpawner* Spawner = TestWorld.SpawnActor<ADojoF2DummySpawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;

	TestTrue(TEXT("The default class is the training dummy"), Spawner->DummyClass == ADojoF1TrainingDummy::StaticClass());

	ADojoF1TrainingDummy* First = Spawner->SpawnDummy();
	ADojoF1TrainingDummy* Second = Spawner->SpawnDummy();
	if (!TestNotNull(TEXT("First dummy spawned"), First) || !TestNotNull(TEXT("Second dummy spawned"), Second)) return false;

	TestTrue(TEXT("Two different dummies"), First != Second);
	TestEqual(TEXT("Count is 2"), Spawner->GetSpawnedCount(), 2);
	TestEqual(TEXT("First dummy one spacing away"), First->GetActorLocation(), Spawner->GetActorLocation() + Spawner->SpawnSpacing);
	TestEqual(TEXT("Second dummy two spacings away"), Second->GetActorLocation(), Spawner->GetActorLocation() + Spawner->SpawnSpacing * 2.f);
	TestEqual(TEXT("A spawned dummy shows its own count"), Second->Label->Text.ToString(), FString(TEXT("3")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F2_DummySpawner_NoClassNoDummy, "Dojo.F2.DummySpawner.NoClassNoDummy", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Clears the class and checks that spawning returns nullptr and changes nothing. */
bool FDojo_F2_DummySpawner_NoClassNoDummy::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF2DummySpawner* Spawner = TestWorld.SpawnActor<ADojoF2DummySpawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;

	TestNotNull(TEXT("Spawns with the default class"), Spawner->SpawnDummy());

	Spawner->DummyClass = nullptr;
	TestNull(TEXT("No class, no dummy"), Spawner->SpawnDummy());
	TestEqual(TEXT("The count did not change"), Spawner->GetSpawnedCount(), 1);

	return true;
}

#endif
```

# Hints

- The function has three jobs in order: give up early, place one new actor, and keep track of it; the getter below shows which array holds the record.
- The world has a templated spawn function that takes a class as its first argument, then a location and a rotation; the spacing grows with how many dummies already exist.
- `UWorld::SpawnActor` is declared in `Engine/World.h`; the overload you want takes a `UClass*`, which a `TSubclassOf` converts to on its own.

# Rubric

- SpawnDummy returns nullptr without spawning when DummyClass is empty.
- The dummy is spawned from DummyClass, so a Blueprint child picked in Details is what appears.
- Each new dummy is one SpawnSpacing further along than the last, measured from the spawner.
- Spawned dummies are kept in the reflected array, so the garbage collector sees the references.
- The spawner holds the references; the dummy class from World 1 is reused without changes.

# Alternative

The spawner could hard-code the class with `ConstructorHelpers::FClassFinder` and a content path to `BP_SturdyDummy`. That needs no designer step, but the path breaks silently when someone renames or moves the asset, and the spawner can never make a different dummy without a code change. A `TSubclassOf` property costs one click in the Details panel and keeps the choice where designers expect it.

# Parsons

```yaml
- id: spawner-spawn-dummy
  prompt: Put SpawnDummy in order.
  lines:
    - "ADojoF1TrainingDummy* ADojoF2DummySpawner::SpawnDummy()"
    - "{"
    - "	if (!DummyClass) return nullptr;"
    - "	const FVector Location = GetActorLocation() + SpawnSpacing * (SpawnedDummies.Num() + 1);"
    - "	ADojoF1TrainingDummy* Dummy = GetWorld()->SpawnActor<ADojoF1TrainingDummy>(DummyClass, Location, GetActorRotation());"
    - "	if (!Dummy) return nullptr;"
    - "	SpawnedDummies.Add(Dummy);"
    - "	return Dummy;"
    - "}"
  distractors:
    - line: "	ADojoF1TrainingDummy* Dummy = NewObject<ADojoF1TrainingDummy>(this, DummyClass);"
      mistake: NewObject makes a UObject but never places an actor in a world; actors are created with SpawnActor.
- id: spawner-constructor
  prompt: Put the constructor in order.
  lines:
    - "ADojoF2DummySpawner::ADojoF2DummySpawner()"
    - "{"
    - "	PrimaryActorTick.bCanEverTick = false;"
    - "	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT(\"Root\"));"
    - "	DummyClass = ADojoF1TrainingDummy::StaticClass();"
    - "}"
  distractors:
    - line: "	SpawnDummy();"
      mistake: The constructor also builds the class default object, often with no world, so spawning belongs in BeginPlay or later.
```
