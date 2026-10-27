---
id: f6-target-table
title: Targets spawned from a data table
order: 5
kind: build
scaffold: faded
difficulty: 3
patterns: []
skills: [data, debugging]
terms: [data-table, table-row-base, ustruct, log-category, ue-log, fname]
prerequisites: [f6-logging, f6-weapon-data]
xp: 70
estimatedMinutes: 18
concepts:
  - A row name picks a row; the row struct gives its values
  - A missing row is a designer's mistake to report, not a crash
---

# Brief

When you make a target table from the target row struct with rows Tin and Steel, and call SpawnTarget with Steel, a target with 3 health and 30 points appears; asking for Ghost, a row that does not exist, spawns nothing and leaves one clear warning in the Output Log under the spawner's own log category.

The row struct, the target, and the spawner's header are written for you. Fill in `DojoF6TargetSpawner.cpp`:

1. Define this file's log category, `LogDojoF6Spawner`, so its warnings can be filtered on their own.
2. `SpawnTarget`: with no table, warn and return nullptr. Find the row by name without the table's own warning; with no row, warn with the row's name and return nullptr. Otherwise spawn a target at the location, give it the row, count it, and return it.
3. `HasRow`: true only when there is a table and it has that row.

Adding a new kind of target is now a new row in the table, made by a designer, with no code.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, then Data Table, and pick Dojo F6 Target Row as the row structure. Name it DT_Targets and add Tin (health 1, points 10) and Steel (health 3, points 30). Place a `DojoF6TargetSpawner` and set its Table. In the level Blueprint, on the 1 key, call SpawnTarget on the spawner with Steel and a location 300 units along Y, and on the 2 key with Ghost. Press Play and press 1: a target reading 3 appears. Press 2, open the Output Log, and type LogDojoF6Spawner in its search box: the one warning names Ghost.

# Files

## DojoF6TargetRow.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "DojoF6TargetRow.generated.h"

/** One row of the target table: how tough one kind of target is and what it is worth. */
USTRUCT(BlueprintType)
struct FDojoF6TargetRow : public FTableRowBase // @explain: A table row struct must derive from FTableRowBase, and USTRUCT makes its fields visible to the table editor.
{
	GENERATED_BODY()

	/** Damage it takes to knock the target down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "0.1"))
	float Health = 1.f;

	/** Points for knocking it down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "0"))
	int32 Points = 10;
};
```

## DojoF6Target.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoF6TargetRow.h"
#include "GameFramework/Actor.h"
#include "DojoF6Target.generated.h"

class UTextRenderComponent;

/** A range target that takes its health and points from a table row and falls when its health runs out. */
UCLASS()
class ADojoF6Target : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the health label and turns ticking off. */
	ADojoF6Target();

	/** Floating text that shows the health left. */
	UPROPERTY(VisibleAnywhere, Category = "Target")
	TObjectPtr<UTextRenderComponent> Label;

	/** Takes the kind's name, health, and points from a table row. */
	void ApplyRow(FName RowName, const FDojoF6TargetRow& Row);

	/** Takes Damage; returns true when that knocks the target down, and the target is then destroyed. */
	UFUNCTION(BlueprintCallable, Category = "Target")
	bool TakeShot(float Damage);

	/** The table row this target was made from. */
	UFUNCTION(BlueprintPure, Category = "Target")
	FName GetKind() const;

	/** Health left. */
	UFUNCTION(BlueprintPure, Category = "Target")
	float GetHealth() const;

	/** Points for knocking it down. */
	UFUNCTION(BlueprintPure, Category = "Target")
	int32 GetPoints() const;

private:
	/** Shows the health left on the label. */
	void ShowHealth();

	FName Kind;

	float Health = 1.f;

	int32 Points = 0;
};
```

## DojoF6Target.cpp

```cpp
#include "DojoF6Target.h"

#include "Components/TextRenderComponent.h"

ADojoF6Target::ADojoF6Target()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF6Target::ApplyRow(FName RowName, const FDojoF6TargetRow& Row)
{
	Kind = RowName;
	Health = Row.Health;
	Points = Row.Points;
	ShowHealth();
}

bool ADojoF6Target::TakeShot(float Damage)
{
	if (Health <= 0.f || Damage <= 0.f) return false;

	Health = FMath::Max(Health - Damage, 0.f);
	ShowHealth();
	if (Health > 0.f) return false;

	Destroy();
	return true;
}

FName ADojoF6Target::GetKind() const
{
	return Kind;
}

float ADojoF6Target::GetHealth() const
{
	return Health;
}

int32 ADojoF6Target::GetPoints() const
{
	return Points;
}

void ADojoF6Target::ShowHealth()
{
	Label->SetText(FText::AsNumber(Health));
}
```

## DojoF6TargetSpawner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF6TargetSpawner.generated.h"

class ADojoF6Target;
class UDataTable;

/** Spawns range targets by the name of their row in a target table, so new kinds of target need a new row and no code. */
UCLASS()
class ADojoF6TargetSpawner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoF6TargetSpawner();

	/** The target kinds; every row must be an FDojoF6TargetRow. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Spawner")
	TObjectPtr<UDataTable> Table; // @explain: The table is a plain UDataTable; which row struct it uses is set when the asset is made, so the code checks it by asking for rows of that struct.

	/** Spawns a target of the kind RowName names at Location; logs a warning and returns nullptr when there is no table or no such row. */
	UFUNCTION(BlueprintCallable, Category = "Spawner")
	ADojoF6Target* SpawnTarget(FName RowName, FVector Location);

	/** True when the table has a row named RowName. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	bool HasRow(FName RowName) const;

	/** Targets spawned so far. */
	UFUNCTION(BlueprintPure, Category = "Spawner")
	int32 GetSpawnedCount() const;

private:
	int32 SpawnedCount = 0;
};
```

## DojoF6TargetSpawner.cpp

```cpp
#include "DojoF6TargetSpawner.h"

#include "Components/SceneComponent.h"
#include "DojoF6Target.h"
#include "DojoF6TargetRow.h"
#include "Engine/DataTable.h"
#include "Engine/World.h"

// Your code: define this file's log category, LogDojoF6Spawner.

ADojoF6TargetSpawner::ADojoF6TargetSpawner()
{
	PrimaryActorTick.bCanEverTick = false;

	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

ADojoF6Target* ADojoF6TargetSpawner::SpawnTarget(FName RowName, FVector Location)
{
	// Your code: with no table, warn under LogDojoF6Spawner that this spawner has no target table, and return nullptr.
	// Your code: find the row without the table's own warning; with no row, warn that the target table has no row named RowName, and return nullptr.
	// Your code: spawn a target at Location, give it the row, count it, and return it.
	return nullptr;
}

bool ADojoF6TargetSpawner::HasRow(FName RowName) const
{
	// Your code: true only with a table that has this row.
	return false;
}

int32 ADojoF6TargetSpawner::GetSpawnedCount() const
{
	return SpawnedCount;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/DataTable.h"
#include "Quests/f6-target-table/DojoF6Target.h"
#include "Quests/f6-target-table/DojoF6TargetRow.h"
#include "Quests/f6-target-table/DojoF6TargetSpawner.h"
#include "Support/DojoTestWorld.h"

namespace DojoF6TargetTableTest
{
	/** Adds one target kind, the way a designer adds a row in the table editor. */
	void AddRow(UDataTable* Table, const TCHAR* Name, float Health, int32 Points)
	{
		FDojoF6TargetRow Row;
		Row.Health = Health;
		Row.Points = Points;
		Table->AddRow(FName(Name), Row);
	}

	/** Makes a target table with Tin and Steel. */
	UDataTable* MakeTable()
	{
		UDataTable* Table = NewObject<UDataTable>();
		Table->RowStruct = FDojoF6TargetRow::StaticStruct();
		AddRow(Table, TEXT("Tin"), 1.f, 10);
		AddRow(Table, TEXT("Steel"), 3.f, 30);
		return Table;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_TargetTable_SpawnsByRowName, "Dojo.F6.TargetTable.SpawnsByRowName", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Spawns targets by row name, asks for a missing row, and adds a row while playing. */
bool FDojo_F6_TargetTable_SpawnsByRowName::RunTest(const FString& Parameters)
{
	using namespace DojoF6TargetTableTest;

	AddExpectedMessage(TEXT("the target table has no row named Ghost"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);

	FDojoTestWorld TestWorld;

	UDataTable* Table = MakeTable();
	ADojoF6TargetSpawner* Spawner = TestWorld.SpawnActor<ADojoF6TargetSpawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;
	Spawner->Table = Table;

	ADojoF6Target* Steel = Spawner->SpawnTarget(TEXT("Steel"), FVector(0.f, 300.f, 0.f));
	if (!TestNotNull(TEXT("Steel spawns"), Steel)) return false;
	TestEqual(TEXT("Steel is the Steel kind"), Steel->GetKind(), FName(TEXT("Steel")));
	TestEqual(TEXT("Steel has 3 health from its row"), Steel->GetHealth(), 3.f);
	TestEqual(TEXT("Steel is worth 30 points from its row"), Steel->GetPoints(), 30);
	TestEqual(TEXT("Steel stands where it was asked to"), Steel->GetActorLocation().Y, 300.0, 0.01);

	ADojoF6Target* Tin = Spawner->SpawnTarget(TEXT("Tin"), FVector::ZeroVector);
	if (!TestNotNull(TEXT("Tin spawns"), Tin)) return false;
	TestEqual(TEXT("Tin has 1 health"), Tin->GetHealth(), 1.f);

	TestTrue(TEXT("The table has Tin"), Spawner->HasRow(TEXT("Tin")));
	TestFalse(TEXT("The table has no Ghost"), Spawner->HasRow(TEXT("Ghost")));
	TestNull(TEXT("A missing row spawns nothing"), Spawner->SpawnTarget(TEXT("Ghost"), FVector::ZeroVector));
	TestEqual(TEXT("Two targets spawned"), Spawner->GetSpawnedCount(), 2);

	AddRow(Table, TEXT("Gold"), 2.f, 50);
	ADojoF6Target* Gold = Spawner->SpawnTarget(TEXT("Gold"), FVector::ZeroVector);
	if (!TestNotNull(TEXT("A row added by a designer spawns with no code change"), Gold)) return false;
	TestEqual(TEXT("Gold is worth 50"), Gold->GetPoints(), 50);

	TestFalse(TEXT("One shot does not drop steel"), Steel->TakeShot(1.f));
	TestEqual(TEXT("Steel has 2 health left"), Steel->GetHealth(), 2.f);
	TestTrue(TEXT("One shot drops tin"), Tin->TakeShot(1.f));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F6_TargetTable_WarnsWithoutATable, "Dojo.F6.TargetTable.WarnsWithoutATable", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Asks a spawner with no table for a target and checks it warns once and spawns nothing. */
bool FDojo_F6_TargetTable_WarnsWithoutATable::RunTest(const FString& Parameters)
{
	AddExpectedMessage(TEXT("has no target table"), ELogVerbosity::Warning, EAutomationExpectedMessageFlags::Contains, 1);

	FDojoTestWorld TestWorld;

	ADojoF6TargetSpawner* Spawner = TestWorld.SpawnActor<ADojoF6TargetSpawner>();
	if (!TestNotNull(TEXT("Spawner spawned"), Spawner)) return false;

	TestNull(TEXT("No table, no target"), Spawner->SpawnTarget(TEXT("Tin"), FVector::ZeroVector));
	TestFalse(TEXT("No table, no rows"), Spawner->HasRow(TEXT("Tin")));
	TestEqual(TEXT("Nothing spawned"), Spawner->GetSpawnedCount(), 0);

	return true;
}

#endif
```

# Hints

- Three outcomes in SpawnTarget, each ending in a return: no table, no row, a target. HasRow is one line.
- The table's row lookup takes the row name and a context string for its own messages, and a third flag that turns off its built-in complaint when the row is missing; turn that off so your own warning is the only one. It hands back a pointer to the row, or nullptr when there is none. A log category for one file can be declared statically near the top of the source file, with a name, a default verbosity, and a compile-time maximum.
- `UDataTable::FindRow` is in `Engine/DataTable.h`; the log category macros and `UE_LOG` are in `Logging/LogMacros.h`.

# Rubric

- The file defines LogDojoF6Spawner and every warning uses it, not LogTemp.
- A missing table and a missing row each log one warning naming the problem and return nullptr.
- FindRow is called with the row struct type and with the table's own warning turned off.
- The target takes its health and points from the row through ApplyRow; no numbers are written in the spawner.
- The spawned count rises only for targets that were spawned.
- HasRow checks the table before using it.

# Alternative

Each kind of target could be its own data asset, like the weapons, and a spawner could hold an array of them. That suits a few kinds with many fields each, or kinds that need a mesh and a sound. A data table suits many kinds with the same few fields, edited side by side like a spreadsheet and importable from CSV, which is how designers balance fifty targets at once. `FDataTableRowHandle` is a third option for a single pick: a UPROPERTY that shows a table and a row-name dropdown in Details, so a designer cannot type a row that does not exist.

# Parsons

```yaml
- id: spawner-missing-row
  prompt: Put the row lookup in order.
  lines:
    - "const FDojoF6TargetRow* Row = Table->FindRow<FDojoF6TargetRow>(RowName, TEXT(\"SpawnTarget\"), false);"
    - "if (!Row)"
    - "{"
    - "	UE_LOG(LogDojoF6Spawner, Warning, TEXT(\"%s: the target table has no row named %s\"), *GetName(), *RowName.ToString());"
    - "	return nullptr;"
    - "}"
  distractors:
    - line: "	check(Row);"
      mistake: A missing row is a designer's typo, not a broken program; check would stop the whole editor for it.
```
