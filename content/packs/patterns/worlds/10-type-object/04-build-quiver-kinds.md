---
id: p10-quiver-kinds
title: Quiver kinds as rows in a data table
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [type-object]
skills: [type-object, object-model]
terms: [data-table, table-row-base, tsubclassof, spawnactor, beginplay]
prerequisites: [p10-type-object-card]
xp: 110
estimatedMinutes: 30
concepts:
  - A quiver kind is a row of a data table whose struct derives from FTableRowBase
  - A quiver names its row with FDataTableRowHandle and reads the row each time it needs a shared number
  - Arrows left belong to each quiver; the row only says how many a full quiver holds
  - A spawning function hands out quivers of a kind, as the class the row names, already full
---

# Brief

When you press Play with the setup below, the quiver's label reads "Hunting: 6", and `ke * Draw` counts it down to "Hunting: 0". A quiver handed out by the range's spawning function is full from the moment it appears.

The archery range keeps its quiver kinds in a data table, DT_Quivers, whose rows are `FDojoP10QuiverRow`: a name, how many arrows a full quiver holds, each arrow's damage, and optionally the quiver class to hand out for that kind. A quiver, `ADojoP10Quiver`, names its row with an `FDataTableRowHandle` and keeps one number of its own, the arrows it has left. `FindKind` looks the row up every time, so a designer's change to the table reaches quivers already in play, and returns nullptr when the handle names no row.

The declarations, the constructor, the getters, `FindKind`, the label, and `BeginPlay` are given. Yours:

- `Refill` fills the quiver to its row's `ArrowCount`, or to zero without a kind.
- `Draw` takes one arrow and returns the row's `ArrowDamage`; an empty quiver, or one without a kind, returns zero. Refresh the label when the count changes.
- `SpawnOfKind` is how the range hands out quivers: given a world, a row handle, and a transform, it spawns a quiver of the row's `QuiverClass` (or the plain quiver when the row names none) at that transform, of that kind, and full. It returns nullptr without a world.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

In the Content Browser, right-click, choose Miscellaneous, Data Table, pick DojoP10QuiverRow as the row structure, and name it DT_Quivers. Add a row named Hunting (Display Name Hunting, 6 arrows, 12 damage) and a row named Barbed (Display Name Barbed, 3 arrows, 30 damage). Place a `DojoP10Quiver`, open its Kind, pick DT_Quivers and the Hunting row. Press Play: "Hunting: 6"; run `ke * Draw` a few times and watch it count down to "Hunting: 0". Make a Blueprint child of the quiver class, BP_BarbedQuiver, and set it as the Barbed row's Quiver Class: that is how a kind picks its own actor, and `SpawnOfKind`, called from C++ code such as a game mode, hands it out. Place a second quiver on the Hunting row and play: both read "Hunting: 6", and `ke * Draw` counts both down together because it draws from every quiver. To draw from one, add a key event for 1 in the level Blueprint that calls Draw on the first quiver (select it in the level, then right-click in the graph to get a reference): press it twice and the first reads "Hunting: 4" while the second keeps its six.

# Files

## DojoP10QuiverRow.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "DojoP10QuiverRow.generated.h"

class ADojoP10Quiver;

/** One kind of quiver as a data table row: the numbers every quiver of this kind shares. Type Object pattern. */
USTRUCT(BlueprintType)
struct FDojoP10QuiverRow : public FTableRowBase
{
	GENERATED_BODY()

	/** The name shown above quivers of this kind. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind")
	FText DisplayName = FText::FromString(TEXT("Hunting Quiver"));

	/** Arrows a full quiver of this kind holds. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind", meta = (ClampMin = "1"))
	int32 ArrowCount = 6;

	/** Damage of one arrow of this kind. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind", meta = (ClampMin = "0.0"))
	float ArrowDamage = 12.f;

	/** The quiver actor to hand out for this kind, such as a Blueprint child with its own mesh; empty means the plain quiver. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind")
	TSubclassOf<ADojoP10Quiver> QuiverClass;
};
```

## DojoP10Quiver.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "GameFramework/Actor.h"
#include "DojoP10Quiver.generated.h"

struct FDojoP10QuiverRow;
class UTextRenderComponent;

/** One quiver at the archery range: its own arrows left, and everything else read from its kind's data table row. Type Object pattern. */
UCLASS()
class ADojoP10Quiver : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP10Quiver();

	/** Shows the kind's name and the arrows left. */
	UPROPERTY(VisibleAnywhere, Category = "Quiver")
	TObjectPtr<UTextRenderComponent> Label;

	/** Which row of which quiver table this quiver is a kind of. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver", meta = (RowType = "/Script/Dojo.DojoP10QuiverRow"))
	FDataTableRowHandle Kind;

	/** Spawns a full quiver of Kind at Transform, as the row's QuiverClass or the plain quiver; returns nullptr without a world. */
	static ADojoP10Quiver* SpawnOfKind(UWorld* World, const FDataTableRowHandle& Kind, const FTransform& Transform);

	/** Takes one arrow and returns its damage; returns 0 when empty or without a kind. */
	UFUNCTION(BlueprintCallable, Category = "Quiver")
	float Draw();

	/** Fills this quiver back to its kind's ArrowCount. */
	UFUNCTION(BlueprintCallable, Category = "Quiver")
	void Refill();

	/** Arrows left in this quiver. */
	UFUNCTION(BlueprintPure, Category = "Quiver")
	int32 GetArrowsLeft() const;

	/** True when Kind names a row that exists. */
	UFUNCTION(BlueprintPure, Category = "Quiver")
	bool HasKind() const;

protected:
	/** Fills the quiver from its kind. */
	virtual void BeginPlay() override;

private:
	/** The kind's row, looked up each time so a retuned table reaches every quiver; nullptr when there is none. */
	const FDojoP10QuiverRow* FindKind() const;

	/** Writes the kind's name and the arrows left into the label. */
	void RefreshLabel();

	/** This quiver's own arrows; the only number that is not the kind's. */
	int32 ArrowsLeft = 0;
};
```

## DojoP10Quiver.cpp

```cpp
#include "DojoP10Quiver.h"

#include "Components/TextRenderComponent.h"
#include "DojoP10QuiverRow.h"
#include "Engine/World.h"

ADojoP10Quiver::ADojoP10Quiver()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

ADojoP10Quiver* ADojoP10Quiver::SpawnOfKind(UWorld* World, const FDataTableRowHandle& Kind, const FTransform& Transform)
{
	return nullptr;
}

void ADojoP10Quiver::BeginPlay()
{
	Super::BeginPlay();

	Refill();
}

float ADojoP10Quiver::Draw()
{
	return 0.f;
}

void ADojoP10Quiver::Refill()
{
}

int32 ADojoP10Quiver::GetArrowsLeft() const
{
	return ArrowsLeft;
}

bool ADojoP10Quiver::HasKind() const
{
	return FindKind() != nullptr;
}

const FDojoP10QuiverRow* ADojoP10Quiver::FindKind() const
{
	if (!Kind.DataTable) return nullptr;

	return Kind.DataTable->FindRow<FDojoP10QuiverRow>(Kind.RowName, TEXT("Quiver"), false);
}

void ADojoP10Quiver::RefreshLabel()
{
	const FDojoP10QuiverRow* Row = FindKind();
	const FString Name = Row ? Row->DisplayName.ToString() : TEXT("No kind");
	Label->SetText(FText::FromString(FString::Printf(TEXT("%s: %d"), *Name, ArrowsLeft)));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Engine/DataTable.h"
#include "Engine/World.h"
#include "Quests/p10-quiver-kinds/DojoP10Quiver.h"
#include "Quests/p10-quiver-kinds/DojoP10QuiverRow.h"
#include "Support/DojoTestWorld.h"

namespace DojoP10QuiverTest
{
	/** A quiver table with a Hunting row (6 arrows of 12) and a Barbed row (3 arrows of 30) that names the plain quiver class. */
	UDataTable* MakeQuiverTable()
	{
		UDataTable* Table = NewObject<UDataTable>();
		Table->RowStruct = FDojoP10QuiverRow::StaticStruct();

		FDojoP10QuiverRow Hunting;
		Hunting.DisplayName = FText::FromString(TEXT("Hunting"));
		Hunting.ArrowCount = 6;
		Hunting.ArrowDamage = 12.f;
		Table->AddRow(TEXT("Hunting"), Hunting);

		FDojoP10QuiverRow Barbed;
		Barbed.DisplayName = FText::FromString(TEXT("Barbed"));
		Barbed.ArrowCount = 3;
		Barbed.ArrowDamage = 30.f;
		Barbed.QuiverClass = ADojoP10Quiver::StaticClass();
		Table->AddRow(TEXT("Barbed"), Barbed);

		return Table;
	}

	/** A handle to RowName in Table. */
	FDataTableRowHandle Handle(UDataTable* Table, const TCHAR* RowName)
	{
		FDataTableRowHandle Result;
		Result.DataTable = Table;
		Result.RowName = RowName;
		return Result;
	}

	/** Places a quiver the way a level does: the kind is set before BeginPlay. */
	ADojoP10Quiver* PlaceQuiver(FDojoTestWorld& TestWorld, const FDataTableRowHandle& Kind)
	{
		ADojoP10Quiver* Quiver = TestWorld.GetWorld()->SpawnActorDeferred<ADojoP10Quiver>(ADojoP10Quiver::StaticClass(), FTransform::Identity);
		Quiver->Kind = Kind;
		Quiver->FinishSpawning(FTransform::Identity);
		return Quiver;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_QuiverKinds_DrawUntilEmpty, "Dojo.P10.QuiverKinds.DrawUntilEmpty", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A Hunting quiver gives six arrows of 12, then nothing, and a refill gives six again. */
bool FDojo_P10_QuiverKinds_DrawUntilEmpty::RunTest(const FString& Parameters)
{
	using namespace DojoP10QuiverTest;

	FDojoTestWorld TestWorld;

	ADojoP10Quiver* Quiver = PlaceQuiver(TestWorld, Handle(MakeQuiverTable(), TEXT("Hunting")));
	if (!TestNotNull(TEXT("Quiver placed"), Quiver)) return false;

	TestTrue(TEXT("The quiver has its kind"), Quiver->HasKind());
	TestEqual(TEXT("A placed quiver starts full"), Quiver->GetArrowsLeft(), 6);

	for (int32 Arrow = 0; Arrow < 6; Arrow++) TestEqual(TEXT("Each arrow deals the kind's damage"), Quiver->Draw(), 12.f);
	TestEqual(TEXT("An empty quiver gives nothing"), Quiver->Draw(), 0.f);
	TestEqual(TEXT("No arrows left"), Quiver->GetArrowsLeft(), 0);

	Quiver->Refill();
	TestEqual(TEXT("A refill gives the kind's count again"), Quiver->GetArrowsLeft(), 6);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_QuiverKinds_OneRowManyQuivers, "Dojo.P10.QuiverKinds.OneRowManyQuivers", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Two quivers of one row keep their own arrows, the row is never changed by a draw, and retuning the row reaches both. */
bool FDojo_P10_QuiverKinds_OneRowManyQuivers::RunTest(const FString& Parameters)
{
	using namespace DojoP10QuiverTest;

	FDojoTestWorld TestWorld;

	UDataTable* Table = MakeQuiverTable();
	ADojoP10Quiver* First = PlaceQuiver(TestWorld, Handle(Table, TEXT("Hunting")));
	ADojoP10Quiver* Second = PlaceQuiver(TestWorld, Handle(Table, TEXT("Hunting")));
	if (!TestNotNull(TEXT("First placed"), First) || !TestNotNull(TEXT("Second placed"), Second)) return false;

	First->Draw();
	First->Draw();
	TestEqual(TEXT("The first quiver has four left"), First->GetArrowsLeft(), 4);
	TestEqual(TEXT("The second still has six"), Second->GetArrowsLeft(), 6);

	FDojoP10QuiverRow* Row = Table->FindRow<FDojoP10QuiverRow>(TEXT("Hunting"), TEXT("Test"));
	if (!TestNotNull(TEXT("The row exists"), Row)) return false;
	TestEqual(TEXT("Drawing never changes the row"), Row->ArrowCount, 6);

	Row->ArrowDamage = 20.f;
	TestEqual(TEXT("A retuned row reaches the first quiver"), First->Draw(), 20.f);
	TestEqual(TEXT("And the second"), Second->Draw(), 20.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_QuiverKinds_UnknownRowDrawsNothing, "Dojo.P10.QuiverKinds.UnknownRowDrawsNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A quiver whose row does not exist, or that has no table, is empty and draws nothing. */
bool FDojo_P10_QuiverKinds_UnknownRowDrawsNothing::RunTest(const FString& Parameters)
{
	using namespace DojoP10QuiverTest;

	FDojoTestWorld TestWorld;

	ADojoP10Quiver* Misnamed = PlaceQuiver(TestWorld, Handle(MakeQuiverTable(), TEXT("Flaming")));
	ADojoP10Quiver* Tableless = PlaceQuiver(TestWorld, FDataTableRowHandle());
	if (!TestNotNull(TEXT("Misnamed placed"), Misnamed) || !TestNotNull(TEXT("Tableless placed"), Tableless)) return false;

	TestFalse(TEXT("A missing row is no kind"), Misnamed->HasKind());
	TestEqual(TEXT("And no arrows"), Misnamed->GetArrowsLeft(), 0);
	TestEqual(TEXT("And draws nothing"), Misnamed->Draw(), 0.f);
	TestFalse(TEXT("No table is no kind"), Tableless->HasKind());
	TestEqual(TEXT("And draws nothing"), Tableless->Draw(), 0.f);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P10_QuiverKinds_HandedOutQuiversAreFull, "Dojo.P10.QuiverKinds.HandedOutQuiversAreFull", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** SpawnOfKind hands out a full quiver of the row's kind, as the row's quiver class. */
bool FDojo_P10_QuiverKinds_HandedOutQuiversAreFull::RunTest(const FString& Parameters)
{
	using namespace DojoP10QuiverTest;

	FDojoTestWorld TestWorld;

	UDataTable* Table = MakeQuiverTable();
	ADojoP10Quiver* Hunting = ADojoP10Quiver::SpawnOfKind(TestWorld.GetWorld(), Handle(Table, TEXT("Hunting")), FTransform(FVector(100.f, 0.f, 0.f)));
	ADojoP10Quiver* Barbed = ADojoP10Quiver::SpawnOfKind(TestWorld.GetWorld(), Handle(Table, TEXT("Barbed")), FTransform::Identity);
	if (!TestNotNull(TEXT("Hunting handed out"), Hunting) || !TestNotNull(TEXT("Barbed handed out"), Barbed)) return false;

	TestTrue(TEXT("The quiver knows its kind"), Hunting->HasKind());
	TestEqual(TEXT("A handed-out Hunting quiver is full"), Hunting->GetArrowsLeft(), 6);
	TestEqual(TEXT("A handed-out Barbed quiver is full"), Barbed->GetArrowsLeft(), 3);
	TestTrue(TEXT("It stands where it was handed out"), Hunting->GetActorLocation().Equals(FVector(100.f, 0.f, 0.f)));
	TestNull(TEXT("No world, no quiver"), ADojoP10Quiver::SpawnOfKind(nullptr, Handle(Table, TEXT("Hunting")), FTransform::Identity));

	return true;
}

#endif
```

# Hints

- The failing test hands quivers out through SpawnOfKind and finds them empty. Look at the given BeginPlay, then ask what the quiver's Kind was at the moment SpawnActor ran it.
- `FindRow` on the row handle's table, with its last argument false, returns nullptr quietly for a missing row; `TSubclassOf::Get()` gives the class, or nullptr when the row names none.
- SpawnActor runs the new actor's BeginPlay before it returns. `SpawnActorDeferred` returns the actor before BeginPlay; set its Kind, then call `FinishSpawning(Transform)`.

# Rubric

- Each quiver keeps its own ArrowsLeft; no draw ever changes the table's row.
- Every shared number is read through the row when it is needed, so a retuned row reaches quivers already in play.
- A missing table or row means no kind: no arrows, nothing drawn, and no crash.
- SpawnOfKind hands out a quiver of the row's quiver class, or the plain quiver when the row names none, that already has its kind and is full when it appears.
- Draw, Refill, and the label agree on the count at every step.

# Alternative

Each quiver could copy its row into a member when it begins play and read the copy from then on. That is faster to read and keeps working if the table is unloaded, but a designer's change no longer reaches quivers already in play, and two copies of every number can drift. Reading through the handle keeps one source of truth; copying suits rows that are huge or read thousands of times a frame. A handed-out quiver is built in two steps that matter here: the actor is created, then its BeginPlay runs, and BeginPlay fills the quiver from its kind. SpawnOfKind therefore spawns the actor deferred, sets the kind, and only then finishes the spawn, so the kind is in place when BeginPlay reads it; a plain SpawnActor runs BeginPlay first and hands out an empty quiver. The kind could also be a `UPrimaryDataAsset` per quiver, as the weapons were; a table wins when there are many small kinds with the same flat fields that designers want to see side by side.

# Parsons

```yaml
- id: spawn-of-kind
  prompt: Put SpawnOfKind in order.
  lines:
    - "ADojoP10Quiver* ADojoP10Quiver::SpawnOfKind(UWorld* World, const FDataTableRowHandle& Kind, const FTransform& Transform)"
    - "{"
    - "	if (!World) return nullptr;"
    - "	const FDojoP10QuiverRow* Row = Kind.DataTable ? Kind.DataTable->FindRow<FDojoP10QuiverRow>(Kind.RowName, TEXT(\"SpawnOfKind\"), false) : nullptr;"
    - "	UClass* QuiverClass = Row && Row->QuiverClass ? Row->QuiverClass.Get() : ADojoP10Quiver::StaticClass();"
    - "	ADojoP10Quiver* Quiver = World->SpawnActorDeferred<ADojoP10Quiver>(QuiverClass, Transform);"
    - "	if (!Quiver) return nullptr;"
    - "	Quiver->Kind = Kind;"
    - "	Quiver->FinishSpawning(Transform);"
    - "	return Quiver;"
    - "}"
  distractors:
    - line: "	ADojoP10Quiver* Quiver = World->SpawnActor<ADojoP10Quiver>(QuiverClass, Transform);"
      mistake: SpawnActor runs BeginPlay before it returns, so the quiver fills itself while its Kind is still empty and is handed out with no arrows.
```
