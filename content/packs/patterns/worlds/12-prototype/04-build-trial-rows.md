---
id: p12-trial-rows
title: Trials that borrow from other trials
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [prototype]
skills: [prototype, data-modeling]
terms: [ustruct, tarray, uproperty, data-table]
prerequisites: [p12-prototype-card]
xp: 110
estimatedMinutes: 30
concepts:
  - A trial row sets only the numbers that differ and names a parent row for the rest
  - A number the row leaves unset comes from the nearest row up the chain that sets it
  - A parent is looked up by name each time, so a change to a parent reaches its children
  - Resolving works on a copy and never changes the rows in the book
---

# Brief

When you press Play with the setup below, asking the trial book to resolve SwiftLong gives 3 blades, a swing speed of 150, a time limit of 120, and a reward of 10, though that row sets only its time limit.

`ADojoP12TrialBook` lists the hall's trials as `FDojoP12TrialRow` rows. A row has a name, the name of an optional parent row, and four numbers: `BladeCount`, `SwingSpeed`, `TimeLimit`, and `Reward`. A number below zero means this row does not set it. The designers write each trial as a small change to another: Swift is Basic with faster blades, SwiftLong is Swift with more time, and Heavy is Basic with more blades and a bigger reward.

The declarations, the constructor, and `FindRow` are given. Yours is `Resolve`, which fills `OutTrial` with a trial's final numbers:

- Each number is the row's own when it sets one; otherwise it comes from the nearest row up the chain of parents that sets it; a number no row on the way sets is 0.
- `OutTrial` keeps the row's own name and parent name.
- It returns false, leaving `OutTrial` untouched, for a name that has no row and for a chain that names a parent that does not exist.
- Parents are looked up by name every time `Resolve` runs, so editing a parent changes its children, and rows may be listed in any order.
- It never changes the rows in the book, and it does not run forever if rows name each other as parents: it gives up and returns false.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP12TrialBook`. In Details add four Rows, in this order: SwiftLong (Parent Name Swift, Time Limit 120, everything else -1), Swift (Parent Name Basic, Swing Speed 150, everything else -1), Heavy (Parent Name Basic, Blade Count 5, Reward 25, the rest -1), and Basic (no parent, Blade Count 3, Swing Speed 90, Time Limit 60, Reward 10). In the Level Blueprint, on Begin Play, call Resolve on the book with Trial Name SwiftLong, break the Out Trial struct, and print its four numbers: 3, 150, 120, and 10. Change Basic's Reward to 40 while playing, resolve Swift from a key press, and it prints 40; Heavy keeps its 25. One edit to a parent reaches every child that did not set the number itself.

# Files

## DojoP12TrialRow.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP12TrialRow.generated.h"

/** One trial in the hall's book: its own numbers, and the trial it borrows the rest from. A number below zero means this row does not set it. */
USTRUCT(BlueprintType)
struct FDojoP12TrialRow
{
	GENERATED_BODY()

	/** The trial's name, such as Swift. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial")
	FName TrialName = NAME_None;

	/** The trial this one borrows from; none for a trial that stands alone. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial")
	FName ParentName = NAME_None;

	/** Blades on the course, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1"))
	int32 BladeCount = -1;

	/** How fast the blades swing, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1.0"))
	float SwingSpeed = -1.f;

	/** Seconds allowed, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1.0"))
	float TimeLimit = -1.f;

	/** Reward for finishing, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1"))
	int32 Reward = -1;
};
```

## DojoP12TrialBook.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "DojoP12TrialRow.h"
#include "GameFramework/Actor.h"
#include "DojoP12TrialBook.generated.h"

/** The hall's book of trials: each row sets a few numbers and borrows the rest from its parent row. */
UCLASS()
class ADojoP12TrialBook : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoP12TrialBook();

	/** Every trial, in any order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trials")
	TArray<FDojoP12TrialRow> Rows;

	/** The row called TrialName, or nullptr when there is none. */
	const FDojoP12TrialRow* FindRow(FName TrialName) const;

	/** Fills OutTrial with the trial's final numbers, each taken from the nearest row up the chain that sets it, or 0 when none does; false, leaving OutTrial alone, for an unknown trial or a missing parent. */
	UFUNCTION(BlueprintCallable, Category = "Trials")
	bool Resolve(FName TrialName, FDojoP12TrialRow& OutTrial) const;
};
```

## DojoP12TrialBook.cpp

```cpp
#include "DojoP12TrialBook.h"

ADojoP12TrialBook::ADojoP12TrialBook()
{
	PrimaryActorTick.bCanEverTick = false;
}

const FDojoP12TrialRow* ADojoP12TrialBook::FindRow(FName TrialName) const
{
	return Rows.FindByPredicate([TrialName](const FDojoP12TrialRow& Candidate) { return Candidate.TrialName == TrialName; });
}

bool ADojoP12TrialBook::Resolve(FName TrialName, FDojoP12TrialRow& OutTrial) const
{
	return false;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p12-trial-rows/DojoP12TrialBook.h"
#include "Quests/p12-trial-rows/DojoP12TrialRow.h"
#include "Support/DojoTestWorld.h"

namespace DojoP12TrialTest
{
	/** A row with the given name, parent, and numbers; a number left at -1 is not set by the row. */
	FDojoP12TrialRow MakeRow(const TCHAR* TrialName, const TCHAR* ParentName, int32 BladeCount = -1, float SwingSpeed = -1.f, float TimeLimit = -1.f, int32 Reward = -1)
	{
		FDojoP12TrialRow Result;
		Result.TrialName = TrialName;
		Result.ParentName = ParentName;
		Result.BladeCount = BladeCount;
		Result.SwingSpeed = SwingSpeed;
		Result.TimeLimit = TimeLimit;
		Result.Reward = Reward;
		return Result;
	}

	/** Spawns a book whose children are listed before their parents, as a designer might write them. */
	ADojoP12TrialBook* SpawnBook(FDojoTestWorld& TestWorld)
	{
		ADojoP12TrialBook* Book = TestWorld.SpawnActor<ADojoP12TrialBook>();
		if (Book)
		{
			Book->Rows = {
				MakeRow(TEXT("SwiftLong"), TEXT("Swift"), -1, -1.f, 120.f, -1),
				MakeRow(TEXT("Swift"), TEXT("Basic"), -1, 150.f, -1.f, -1),
				MakeRow(TEXT("Heavy"), TEXT("Basic"), 5, -1.f, -1.f, 25),
				MakeRow(TEXT("Basic"), TEXT(""), 3, 90.f, 60.f, 10),
				MakeRow(TEXT("Bare"), TEXT("")),
				MakeRow(TEXT("Orphan"), TEXT("Nowhere"), 2),
			};
		}
		return Book;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_TrialRows_RowsStandAloneOrOverride, "Dojo.P12.TrialRows.RowsStandAloneOrOverride", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A row with no parent keeps its numbers, a number nobody sets is 0, a row's own number beats its parent's, and bad names are refused. */
bool FDojo_P12_TrialRows_RowsStandAloneOrOverride::RunTest(const FString& Parameters)
{
	using namespace DojoP12TrialTest;

	FDojoTestWorld TestWorld;

	ADojoP12TrialBook* Book = SpawnBook(TestWorld);
	if (!TestNotNull(TEXT("Book spawned"), Book)) return false;

	FDojoP12TrialRow Trial;
	TestTrue(TEXT("Basic resolves"), Book->Resolve(TEXT("Basic"), Trial));
	TestEqual(TEXT("Basic keeps its name"), Trial.TrialName, FName(TEXT("Basic")));
	TestEqual(TEXT("Basic blades"), Trial.BladeCount, 3);
	TestEqual(TEXT("Basic swing speed"), Trial.SwingSpeed, 90.f);
	TestEqual(TEXT("Basic time limit"), Trial.TimeLimit, 60.f);
	TestEqual(TEXT("Basic reward"), Trial.Reward, 10);

	TestTrue(TEXT("Heavy resolves"), Book->Resolve(TEXT("Heavy"), Trial));
	TestEqual(TEXT("Heavy keeps its parent's name"), Trial.ParentName, FName(TEXT("Basic")));
	TestEqual(TEXT("Heavy's own blades win"), Trial.BladeCount, 5);
	TestEqual(TEXT("Heavy's own reward wins"), Trial.Reward, 25);
	TestEqual(TEXT("Heavy borrows the swing speed"), Trial.SwingSpeed, 90.f);
	TestEqual(TEXT("Heavy borrows the time limit"), Trial.TimeLimit, 60.f);

	TestTrue(TEXT("Bare resolves"), Book->Resolve(TEXT("Bare"), Trial));
	TestTrue(TEXT("Numbers nobody sets are 0"), Trial.BladeCount == 0 && Trial.SwingSpeed == 0.f && Trial.TimeLimit == 0.f && Trial.Reward == 0);

	FDojoP12TrialRow Untouched;
	Untouched.Reward = 77;
	TestFalse(TEXT("An unknown trial is refused"), Book->Resolve(TEXT("Nothing"), Untouched));
	TestFalse(TEXT("A trial whose parent does not exist is refused"), Book->Resolve(TEXT("Orphan"), Untouched));
	TestEqual(TEXT("A refused call leaves the output alone"), Untouched.Reward, 77);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_TrialRows_ChildBorrowsFromParent, "Dojo.P12.TrialRows.ChildBorrowsFromParent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A row one step below Basic borrows what it does not set, even though the book lists the child before its parent. */
bool FDojo_P12_TrialRows_ChildBorrowsFromParent::RunTest(const FString& Parameters)
{
	using namespace DojoP12TrialTest;

	FDojoTestWorld TestWorld;

	ADojoP12TrialBook* Book = SpawnBook(TestWorld);
	if (!TestNotNull(TEXT("Book spawned"), Book)) return false;

	FDojoP12TrialRow Trial;
	TestTrue(TEXT("Swift resolves"), Book->Resolve(TEXT("Swift"), Trial));
	TestEqual(TEXT("Swift keeps its own name"), Trial.TrialName, FName(TEXT("Swift")));
	TestEqual(TEXT("Swift borrows the blades"), Trial.BladeCount, 3);
	TestEqual(TEXT("Swift's own swing speed wins"), Trial.SwingSpeed, 150.f);
	TestEqual(TEXT("Swift borrows the time limit"), Trial.TimeLimit, 60.f);
	TestEqual(TEXT("Swift borrows the reward"), Trial.Reward, 10);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_TrialRows_GrandchildBorrowsThroughItsParent, "Dojo.P12.TrialRows.GrandchildBorrowsThroughItsParent", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** SwiftLong borrows from Swift, which borrows from Basic: each number comes from wherever up the chain it is first set. */
bool FDojo_P12_TrialRows_GrandchildBorrowsThroughItsParent::RunTest(const FString& Parameters)
{
	using namespace DojoP12TrialTest;

	FDojoTestWorld TestWorld;

	ADojoP12TrialBook* Book = SpawnBook(TestWorld);
	if (!TestNotNull(TEXT("Book spawned"), Book)) return false;

	FDojoP12TrialRow Trial;
	TestTrue(TEXT("SwiftLong resolves"), Book->Resolve(TEXT("SwiftLong"), Trial));
	TestEqual(TEXT("SwiftLong's blades come from Basic, two rows up"), Trial.BladeCount, 3);
	TestEqual(TEXT("SwiftLong's swing speed comes from Swift, one row up"), Trial.SwingSpeed, 150.f);
	TestEqual(TEXT("SwiftLong's own time limit wins"), Trial.TimeLimit, 120.f);
	TestEqual(TEXT("SwiftLong's reward comes from Basic, two rows up"), Trial.Reward, 10);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P12_TrialRows_ParentEditsReachChildren, "Dojo.P12.TrialRows.ParentEditsReachChildren", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Editing Basic changes the children that borrow from it and leaves the ones that set their own number alone; the book itself is not rewritten. */
bool FDojo_P12_TrialRows_ParentEditsReachChildren::RunTest(const FString& Parameters)
{
	using namespace DojoP12TrialTest;

	FDojoTestWorld TestWorld;

	ADojoP12TrialBook* Book = SpawnBook(TestWorld);
	if (!TestNotNull(TEXT("Book spawned"), Book)) return false;

	FDojoP12TrialRow Trial;
	Book->Resolve(TEXT("Swift"), Trial);

	FDojoP12TrialRow* Basic = Book->Rows.FindByPredicate([](const FDojoP12TrialRow& Candidate) { return Candidate.TrialName == FName(TEXT("Basic")); });
	if (!TestNotNull(TEXT("Basic is in the book"), Basic)) return false;
	Basic->Reward = 40;
	Basic->BladeCount = 4;

	TestTrue(TEXT("Swift resolves again"), Book->Resolve(TEXT("Swift"), Trial));
	TestEqual(TEXT("Swift sees Basic's new reward"), Trial.Reward, 40);
	TestEqual(TEXT("Swift sees Basic's new blades"), Trial.BladeCount, 4);

	TestTrue(TEXT("Heavy resolves"), Book->Resolve(TEXT("Heavy"), Trial));
	TestEqual(TEXT("Heavy keeps its own reward"), Trial.Reward, 25);
	TestEqual(TEXT("Heavy keeps its own blades"), Trial.BladeCount, 5);

	const FDojoP12TrialRow* SwiftRow = Book->FindRow(TEXT("Swift"));
	TestTrue(TEXT("Resolving did not write the borrowed numbers into Swift's row"), SwiftRow && SwiftRow->Reward == -1 && SwiftRow->BladeCount == -1);

	return true;
}

#endif
```

# Hints

- The failing test names the trial that borrows from a trial that itself borrows. Read its message: which number is wrong, and in which row up the chain is that number set?
- Taking a number from a parent row as written gives you the parent's own setting, and that may be the same "not set here" the child had. What does a parent's final answer need before the child can borrow from it?
- Either keep climbing the chain until every number is set or you run out of parents, or work out the parent's final numbers first and borrow from those. Either way, stop climbing when the chain is longer than the number of rows.

# Rubric

- Resolve gives each number from the row's own setting when it has one, else from the nearest row up the chain of parents that sets it, else 0.
- A trial that borrows from a trial that borrows (three rows deep or more) gets each number from where it is set up the chain.
- Parents are looked up by name each time Resolve runs, so editing a parent changes its children, and the order of rows in the book does not matter.
- An unknown trial, or a chain naming a parent that does not exist, returns false and leaves OutTrial untouched; rows that loop through each other return false instead of running forever.
- Resolve works on a copy: the rows in the book are never changed.
- A row names its parent and the parent knows nothing about its children; the book only reads.

# Alternative

Resolve could be done once, when the game starts: walk every row, write its final numbers into a second array, and answer every later question from that array. Reads then cost nothing and there is no chain to climb, but an edit to a parent stops reaching its children until someone resolves again, and the copy doubles the rows in memory. Climbing the chain on every read, as here, keeps edits live at the cost of a short walk. The same rows could also be a Data Table with a parent column, which gives designers a spreadsheet to edit; the resolving code would be the same.

# Parsons

```yaml
- id: resolve
  prompt: Put Resolve in order.
  lines:
    - "bool ADojoP12TrialBook::Resolve(FName TrialName, FDojoP12TrialRow& OutTrial) const"
    - "{"
    - "	const FDojoP12TrialRow* Row = FindRow(TrialName);"
    - "	if (!Row) return false;"
    - "	FDojoP12TrialRow Result = *Row;"
    - "	for (int32 Step = 0; !Row->ParentName.IsNone(); Step++)"
    - "	{"
    - "		if (Step >= Rows.Num()) return false;"
    - "		Row = FindRow(Row->ParentName);"
    - "		if (!Row) return false;"
    - "		if (Result.BladeCount < 0) Result.BladeCount = Row->BladeCount;"
    - "		if (Result.SwingSpeed < 0.f) Result.SwingSpeed = Row->SwingSpeed;"
    - "		if (Result.TimeLimit < 0.f) Result.TimeLimit = Row->TimeLimit;"
    - "		if (Result.Reward < 0) Result.Reward = Row->Reward;"
    - "	}"
    - "	Result.BladeCount = FMath::Max(Result.BladeCount, 0);"
    - "	Result.SwingSpeed = FMath::Max(Result.SwingSpeed, 0.f);"
    - "	Result.TimeLimit = FMath::Max(Result.TimeLimit, 0.f);"
    - "	Result.Reward = FMath::Max(Result.Reward, 0);"
    - "	OutTrial = Result;"
    - "	return true;"
    - "}"
  distractors:
    - line: "		Result = *Row;"
      mistake: Copying the whole parent row over the result throws away the child's own numbers; the child keeps what it set and borrows only what it did not.
    - line: "	const_cast<FDojoP12TrialRow*>(Row)->Reward = Result.Reward;"
      mistake: Writing the resolved number back into the book's row rewrites the designers' data, so the row no longer says it borrows that number.
```
