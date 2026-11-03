---
id: p21-wave-spawner
title: A wave a designer writes as a table
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [factory-method]
skills: [factory-method, spawning]
terms: [tsubclassof, spawn-actor-deferred, spawnactor, tobjectptr, ustruct, tarray]
prerequisites: [p21-factory-card]
xp: 70
estimatedMinutes: 25
concepts:
  - The kind of critter is a class chosen in data, so the spawner's code never names one
  - A critter's health comes from its level and its kind
  - An entry that names no class is refused and counted as nothing
  - A wave places only the critters it made, in order, with no gap for an entry it skipped
  - The spawner knows the critter base class and nothing about slimes or imps
---

# Brief

When you press Play with the spawner below, the wave Slime level 4, Imp level 2, Slime level 2 appears in a row 150 units apart, and the three critters show the health their own level and kind give them: 40, 30, and 20.

`ADojoP21Critter` is the base of every critter. It has a `Level`, a `HealthPerLevel`, and a `Health` worked out from them. `ADojoP21Slime` has 10 health per level and `ADojoP21Imp` has 15. `FDojoP21SpawnEntry` is one row of a wave: a `CritterClass` a designer picks from a list, and a `Level`. `ADojoP21Spawner` has a `Wave`, an array of those rows, a `Spacing`, and a count of everything it has made.

Most of the code is written. Fill the two gaps in `ADojoP21Spawner`:

- `Create` makes one critter of the entry's class at the place it is given, at the entry's level, and returns it. An entry with no class makes nothing: it returns `nullptr` and counts nothing. A level below 1 counts as level 1. Each critter made adds one to `SpawnedCount`. `Create` must not name `ADojoP21Slime` or `ADojoP21Imp`.
- `SpawnWave` makes the entries of `Wave` in order and returns the critters it made. The first stands `Spacing` units from the spawner along the world X axis, the next `Spacing` units further, and so on. An entry that makes nothing is skipped, and the next critter takes its place in the row.

The spawner depends on the critter base class and the entry; the critters know nothing of the spawner.

## See it in the editor

Place a `DojoP21Spawner`. In Details, add three rows to Wave: Slime with Level 4, Imp with Level 2, and Slime with Level 2. In the Level Blueprint, on Begin Play call Spawn Wave on the spawner, run a For Each over the critters it returns, and print each one's Health: 40, 30, and 20, in a row along the X axis. Add a fourth row and leave its class empty: the print is the same three numbers, and the row of critters has no gap. Make a Blueprint child of `DojoP21Imp` named `BP_FireImp`, pick it in a new row, and play again: the spawner makes your new kind with no change to any C++.

# Files

## DojoP21Critter.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP21Critter.generated.h"

/** A creature of the Ember Range: its health comes from its level and its kind. */
UCLASS()
class ADojoP21Critter : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Critter();

	/** How strong this critter is; its health is worked out from it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Critter", meta = (ExposeOnSpawn = true))
	int32 Level = 1;

	/** Health gained per level. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Critter")
	int32 HealthPerLevel = 10;

	/** Hit points: the level times the health per level. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 Health = 0;

	/** The level this critter saw at the moment it began play; zero until then. */
	UPROPERTY(BlueprintReadOnly, Category = "Critter")
	int32 LevelAtBeginPlay = 0;

protected:
	/** Works out health from the level. */
	virtual void BeginPlay() override;
};
```

## DojoP21Critter.cpp

```cpp
#include "DojoP21Critter.h"

#include "Components/SceneComponent.h"

ADojoP21Critter::ADojoP21Critter()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void ADojoP21Critter::BeginPlay()
{
	Super::BeginPlay();

	LevelAtBeginPlay = Level;
	Health = HealthPerLevel * Level;
}
```

## DojoP21Slime.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21Slime.generated.h"

/** A soft critter with 10 health per level. */
UCLASS()
class ADojoP21Slime : public ADojoP21Critter
{
	GENERATED_BODY()

public:
	/** Sets the slime's health per level. */
	ADojoP21Slime();
};
```

## DojoP21Slime.cpp

```cpp
#include "DojoP21Slime.h"

ADojoP21Slime::ADojoP21Slime()
{
	HealthPerLevel = 10;
}
```

## DojoP21Imp.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21Imp.generated.h"

/** A tougher critter with 15 health per level. */
UCLASS()
class ADojoP21Imp : public ADojoP21Critter
{
	GENERATED_BODY()

public:
	/** Sets the imp's health per level. */
	ADojoP21Imp();
};
```

## DojoP21Imp.cpp

```cpp
#include "DojoP21Imp.h"

ADojoP21Imp::ADojoP21Imp()
{
	HealthPerLevel = 15;
}
```

## DojoP21SpawnEntry.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21SpawnEntry.generated.h"

/** One row of a wave: which class of critter to make, and at what level. */
USTRUCT(BlueprintType)
struct FDojoP21SpawnEntry
{
	GENERATED_BODY()

	/** The class to spawn; a designer picks it from a list of critter classes in the Details panel. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawn")
	TSubclassOf<ADojoP21Critter> CritterClass;

	/** The level the new critter starts with; anything below 1 is treated as 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawn")
	int32 Level = 1;
};
```

## DojoP21Spawner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21SpawnEntry.h"
#include "GameFramework/Actor.h"
#include "DojoP21Spawner.generated.h"

/** The creator: it makes whatever critter a spawn entry names, ready to act, without ever naming a kind itself. */
UCLASS()
class ADojoP21Spawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Spawner();

	/** The critters one wave makes, in order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawner")
	TArray<FDojoP21SpawnEntry> Wave;

	/** The distance along the world X axis between neighbours in a wave, and from the spawner to the first. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawner")
	float Spacing = 150.f;

	/** How many critters this spawner has made in all. */
	UPROPERTY(BlueprintReadOnly, Category = "Spawner")
	int32 SpawnedCount = 0;

	/** Makes one critter of the entry's class at Where with the entry's level; nullptr, and nothing counted, when the entry names no class. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoP21Critter* Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where);

	/** Makes every critter of the wave in order along the X axis and returns the ones it made; an entry that cannot be made is skipped and leaves no gap. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	TArray<ADojoP21Critter*> SpawnWave();
};
```

## DojoP21Spawner.cpp

```cpp
#include "DojoP21Spawner.h"

#include "Components/SceneComponent.h"
#include "Engine/World.h"

ADojoP21Spawner::ADojoP21Spawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoP21Critter* ADojoP21Spawner::Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where)
{
	return nullptr;
}

TArray<ADojoP21Critter*> ADojoP21Spawner::SpawnWave()
{
	return {};
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "EngineUtils.h"
#include "Quests/p21-wave-spawner/DojoP21Critter.h"
#include "Quests/p21-wave-spawner/DojoP21Imp.h"
#include "Quests/p21-wave-spawner/DojoP21Slime.h"
#include "Quests/p21-wave-spawner/DojoP21SpawnEntry.h"
#include "Quests/p21-wave-spawner/DojoP21Spawner.h"
#include "Support/DojoTestWorld.h"

namespace DojoP21WaveTest
{
	/** An entry for this class at this level. */
	FDojoP21SpawnEntry MakeEntry(TSubclassOf<ADojoP21Critter> CritterClass, int32 Level)
	{
		FDojoP21SpawnEntry Result;
		Result.CritterClass = CritterClass;
		Result.Level = Level;
		return Result;
	}

	/** How many critters of any kind exist in the world. */
	int32 CountCritters(UWorld* World)
	{
		int32 Count = 0;
		for (TActorIterator<ADojoP21Critter> Iterator(World); Iterator; ++Iterator)
		{
			Count++;
		}
		return Count;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_WaveSpawner_CreateMakesTheChosenClass, "Dojo.P21.WaveSpawner.CreateMakesTheChosenClass", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Create makes exactly the class the entry names, where it is asked to, refuses an entry with no class, and raises a level below 1 to 1. */
bool FDojo_P21_WaveSpawner_CreateMakesTheChosenClass::RunTest(const FString& Parameters)
{
	using namespace DojoP21WaveTest;

	FDojoTestWorld TestWorld;

	ADojoP21Spawner* Spawner = TestWorld.SpawnActor<ADojoP21Spawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;

	ADojoP21Critter* Slime = Spawner->Create(MakeEntry(ADojoP21Slime::StaticClass(), 4), FTransform(FVector(300.f, 20.f, 0.f)));
	if (!TestNotNull(TEXT("A slime was made"), Slime)) return false;
	TestTrue(TEXT("It is a slime"), Slime->GetClass() == ADojoP21Slime::StaticClass());
	TestTrue(TEXT("It is where it was asked to be"), Slime->GetActorLocation().Equals(FVector(300.f, 20.f, 0.f), 0.1f));
	TestEqual(TEXT("Its level is the entry's"), Slime->Level, 4);

	ADojoP21Critter* Imp = Spawner->Create(MakeEntry(ADojoP21Imp::StaticClass(), 2), FTransform::Identity);
	if (!TestNotNull(TEXT("An imp was made"), Imp)) return false;
	TestTrue(TEXT("It is an imp"), Imp->GetClass() == ADojoP21Imp::StaticClass());

	ADojoP21Critter* Plain = Spawner->Create(MakeEntry(ADojoP21Critter::StaticClass(), 1), FTransform::Identity);
	if (!TestNotNull(TEXT("The base class can be named too"), Plain)) return false;
	TestTrue(TEXT("And that is what it makes"), Plain->GetClass() == ADojoP21Critter::StaticClass());

	ADojoP21Critter* Raised = Spawner->Create(MakeEntry(ADojoP21Slime::StaticClass(), 0), FTransform::Identity);
	if (!TestNotNull(TEXT("A level 0 entry still makes a critter"), Raised)) return false;
	TestEqual(TEXT("At level 1"), Raised->Level, 1);

	const int32 MadeBefore = CountCritters(TestWorld.GetWorld());
	TestTrue(TEXT("An entry with no class makes nothing"), Spawner->Create(MakeEntry(nullptr, 3), FTransform::Identity) == nullptr);
	TestEqual(TEXT("And no critter appeared"), CountCritters(TestWorld.GetWorld()), MadeBefore);
	TestEqual(TEXT("And only the four real ones were counted"), Spawner->SpawnedCount, 4);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_WaveSpawner_CritterWakesWithItsLevel, "Dojo.P21.WaveSpawner.CritterWakesWithItsLevel", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A critter has its level when it begins play, so its health is worked out from the entry's level and not from the default. */
bool FDojo_P21_WaveSpawner_CritterWakesWithItsLevel::RunTest(const FString& Parameters)
{
	using namespace DojoP21WaveTest;

	FDojoTestWorld TestWorld;

	ADojoP21Spawner* Spawner = TestWorld.SpawnActor<ADojoP21Spawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;

	ADojoP21Critter* Slime = Spawner->Create(MakeEntry(ADojoP21Slime::StaticClass(), 4), FTransform::Identity);
	ADojoP21Critter* Imp = Spawner->Create(MakeEntry(ADojoP21Imp::StaticClass(), 2), FTransform::Identity);
	if (!TestNotNull(TEXT("A slime was made"), Slime) || !TestNotNull(TEXT("An imp was made"), Imp)) return false;

	TestTrue(TEXT("The slime has begun play"), Slime->HasActorBegunPlay());
	TestEqual(TEXT("A level 4 slime saw level 4 as it woke"), Slime->LevelAtBeginPlay, 4);
	TestEqual(TEXT("And has 10 times 4 health"), Slime->Health, 40);
	TestEqual(TEXT("A level 2 imp saw level 2 as it woke"), Imp->LevelAtBeginPlay, 2);
	TestEqual(TEXT("And has 15 times 2 health"), Imp->Health, 30);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P21_WaveSpawner_WaveKeepsOrderAndSkipsBadEntries, "Dojo.P21.WaveSpawner.WaveKeepsOrderAndSkipsBadEntries", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A wave makes its entries in order along the X axis, skips an entry with no class without leaving a gap, and follows the data it is given. */
bool FDojo_P21_WaveSpawner_WaveKeepsOrderAndSkipsBadEntries::RunTest(const FString& Parameters)
{
	using namespace DojoP21WaveTest;

	FDojoTestWorld TestWorld;

	ADojoP21Spawner* Spawner = TestWorld.SpawnActor<ADojoP21Spawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;
	Spawner->SetActorLocation(FVector(0.f, 1000.f, 0.f));
	Spawner->Spacing = 150.f;
	Spawner->Wave = { MakeEntry(ADojoP21Slime::StaticClass(), 1), MakeEntry(nullptr, 5), MakeEntry(ADojoP21Imp::StaticClass(), 3), MakeEntry(ADojoP21Critter::StaticClass(), 2) };

	const TArray<ADojoP21Critter*> Made = Spawner->SpawnWave();
	if (!TestEqual(TEXT("Three of the four entries made a critter"), Made.Num(), 3)) return false;
	TestTrue(TEXT("The first is a slime"), Made[0]->GetClass() == ADojoP21Slime::StaticClass());
	TestTrue(TEXT("The second is an imp"), Made[1]->GetClass() == ADojoP21Imp::StaticClass());
	TestTrue(TEXT("The third is the plain critter"), Made[2]->GetClass() == ADojoP21Critter::StaticClass());
	TestTrue(TEXT("The first stands one spacing from the spawner"), Made[0]->GetActorLocation().Equals(FVector(150.f, 1000.f, 0.f), 0.1f));
	TestTrue(TEXT("The second stands two spacings away, with no gap left by the skipped entry"), Made[1]->GetActorLocation().Equals(FVector(300.f, 1000.f, 0.f), 0.1f));
	TestTrue(TEXT("The third stands three away"), Made[2]->GetActorLocation().Equals(FVector(450.f, 1000.f, 0.f), 0.1f));
	TestEqual(TEXT("The imp is level 3, so it has 45 health"), Made[1]->Health, 45);
	TestEqual(TEXT("Three were counted"), Spawner->SpawnedCount, 3);

	Spawner->Wave = { MakeEntry(ADojoP21Imp::StaticClass(), 1) };
	Spawner->Spacing = 80.f;
	const TArray<ADojoP21Critter*> Second = Spawner->SpawnWave();
	if (!TestEqual(TEXT("Changing the data changes the wave"), Second.Num(), 1)) return false;
	TestTrue(TEXT("Into an imp"), Second[0]->GetClass() == ADojoP21Imp::StaticClass());
	TestTrue(TEXT("At the new spacing"), Second[0]->GetActorLocation().Equals(FVector(80.f, 1000.f, 0.f), 0.1f));
	TestEqual(TEXT("Four critters exist in all"), CountCritters(TestWorld.GetWorld()), 4);
	TestEqual(TEXT("And four were counted"), Spawner->SpawnedCount, 4);

	return true;
}

#endif
```

# Hints

- A critter works out its health from its level at one particular moment of its life. Which moment is it, and what must already be true of the critter then?
- Spawning with a class normally builds the actor and starts its life in a single call. The glossary has a spawn that splits those two steps and leaves a window between them; what can you do to the critter inside that window?
- `SpawnWave` places each critter one spacing beyond the last critter it actually made. Which number gives the place of the next one: the count of entries it has looked at, or the count of critters it has made?

# Rubric

- Create makes one critter of exactly the class the entry names, at the place it is given, and returns it.
- An entry with no class makes nothing, returns nullptr, and is not counted; a level below 1 is treated as 1.
- Each critter's health matches its entry's level and its kind.
- SpawnWave makes the entries in order and returns only the critters it made, standing one spacing apart along the X axis with no gap for a skipped entry.
- Changing the wave in the Details panel changes what is made, with no change to the spawner's code.
- The spawner knows the critter base class and the entry, never a kind of critter, and the critters know nothing of the spawner.

# Alternative

A virtual creator per kind, as in the last quest, would work here too: a slime spawner and an imp spawner, each overriding a `CreateCritter` function. That is the better choice when making a kind takes more than choosing its class. Here every kind is made the same way and differs only in which class it is, so the class is data: a `TSubclassOf` the designer picks, and one spawner for all of them, including kinds that exist only as Blueprints. Setting the level before the critter begins play matters because this critter reads its level in `BeginPlay`. A plain spawn builds the critter and runs `BeginPlay` in one step, so a level assigned on the line after it is too late, and the critter has already worked out its health from the default level. A deferred spawn splits the two steps: build, give the critter what it needs, then finish. Blueprint's Spawn Actor from Class node does the same for every pin marked `ExposeOnSpawn`.

# Parsons

```yaml
- id: create-the-critter
  prompt: Put Create in order. Its first line inside the braces refuses an entry that names no class, and counting the critter is the last step before the return.
  lines:
    - "ADojoP21Critter* ADojoP21Spawner::Create(const FDojoP21SpawnEntry& Entry, const FTransform& Where)"
    - "{"
    - "	if (Entry.CritterClass.Get() == nullptr) return nullptr;"
    - "	ADojoP21Critter* Critter = GetWorld()->SpawnActorDeferred<ADojoP21Critter>(Entry.CritterClass, Where);"
    - "	if (Critter == nullptr) return nullptr;"
    - "	Critter->Level = FMath::Max(1, Entry.Level);"
    - "	Critter->FinishSpawning(Where);"
    - "	SpawnedCount++;"
    - "	return Critter;"
    - "}"
  distractors:
    - line: "	return GetWorld()->SpawnActor<ADojoP21Slime>(Where);"
      mistake: Naming the slime here makes every entry a slime and takes the choice of class away from the designer's table.
    - line: "	check(Entry.CritterClass.Get() != nullptr);"
      mistake: An empty row is ordinary input from a designer, and check stops the whole game when it is false; the row should be refused with nullptr instead.
```
