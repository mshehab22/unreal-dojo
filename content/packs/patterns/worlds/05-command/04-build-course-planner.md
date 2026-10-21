---
id: p5-course-planner
title: A course planner that can step back and forward
order: 4
kind: build
scaffold: stub
difficulty: 3
patterns: [command]
skills: [command]
terms: [ustruct, uenum, tarray, ufunction, blueprintcallable]
prerequisites: [p5-command-card]
xp: 100
estimatedMinutes: 25
concepts:
  - An edit that records what it changed from and to can be applied again and taken back
  - A history with a count of applied edits gives many levels of undo and redo
  - Only edits that go through the history can be undone, so every change to the course must
---

# Brief

When you press Play and edit the course from the console, the label above the planner shows it as a row of letters such as `H_W_____`, and `ke * Undo` and `ke * Redo` step back and forward through your edits one at a time.

Designers lay out the arena's obstacle course in eight slots, each empty or holding a hurdle, a wall, or a pit. They want to try things and back out of them. Every change therefore becomes an `FDojoP5CourseEdit`: the slot, what stood there before, and what the edit put there. That is enough to apply the edit again or take it back, without copying the whole course.

The planner keeps every edit in `History`, oldest first, and `AppliedCount` says how many of them are currently applied. Undo steps the count back and puts the slot's "before" back. Redo applies the next edit's "after" and steps the count forward. The declarations, the constructor, the getters, `Clear`, and the label are given. Yours:

- `Place` builds an edit for the slot and passes it to `Perform`. A slot off the course, or an obstacle that is already there, is ignored and leaves no edit behind.
- `Perform` records the edit in the history, applies it, and refreshes the label.
- `Undo` takes back the most recent applied edit, and does nothing when none is applied.
- `Redo` applies the edit most recently taken back, and does nothing when there is none.

Write the obvious version first and run the tests. One of them fails on purpose for most people. Read its name and message before you read the hints.

## See it in the editor

Place a `DojoP5CoursePlanner` in a map with no other planners, press Play, and open the console. Run `ke * Place 0 EO_Hurdle`, then `ke * Place 2 EO_Wall` (the console takes an enum value by its code name): the label reads `H_W_____`. Run `ke * Undo`: `H_______`. Run `ke * Redo`: `H_W_____` again. Now run `ke * Undo`, then `ke * Place 5 EO_Pit`, then `ke * Redo`: the label stays `H____P__`, because the wall's edit belonged to a line of history you left.

# Files

## DojoP5CoursePlanner.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5CoursePlanner.generated.h"

class UTextRenderComponent;

/** What can stand in one slot of the obstacle course. */
UENUM(BlueprintType)
enum class EDojoP5Obstacle : uint8
{
	EO_None UMETA(DisplayName = "Empty"),
	EO_Hurdle UMETA(DisplayName = "Hurdle"),
	EO_Wall UMETA(DisplayName = "Wall"),
	EO_Pit UMETA(DisplayName = "Pit")
};

/** One edit to the course: which slot, what was there, and what the edit put there, so it can be applied again or taken back. */
USTRUCT(BlueprintType)
struct FDojoP5CourseEdit
{
	GENERATED_BODY()

	/** The slot the edit changed. */
	UPROPERTY()
	int32 Slot = 0;

	/** What stood in the slot before the edit. */
	UPROPERTY()
	EDojoP5Obstacle Before = EDojoP5Obstacle::EO_None;

	/** What the edit put in the slot. */
	UPROPERTY()
	EDojoP5Obstacle After = EDojoP5Obstacle::EO_None;
};

/** A designer's planner for the arena's obstacle course, with undo and redo through a history of edits. */
UCLASS()
class ADojoP5CoursePlanner : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label, fills the course with empty slots, and turns ticking off. */
	ADojoP5CoursePlanner();

	/** Floating text that draws the course, one letter per slot. */
	UPROPERTY(VisibleAnywhere, Category = "Course")
	TObjectPtr<UTextRenderComponent> Label;

	/** Puts an obstacle in a slot as one undoable edit. Slots off the course, and edits that change nothing, are ignored. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Place(int32 Slot, EDojoP5Obstacle Obstacle);

	/** Empties a slot as one undoable edit. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Clear(int32 Slot);

	/** Takes back the most recent edit that has not been taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Undo();

	/** Applies again the edit most recently taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Course")
	void Redo();

	/** What stands in a slot; empty for slots off the course. */
	UFUNCTION(BlueprintPure, Category = "Course")
	EDojoP5Obstacle GetObstacle(int32 Slot) const;

	/** Edits kept in the history, including ones taken back that can still be redone. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetHistoryLength() const;

	/** How many edits in the history are currently applied. */
	UFUNCTION(BlueprintPure, Category = "Course")
	int32 GetAppliedCount() const;

	/** Slots on the course. */
	static constexpr int32 SlotCount = 8;

private:
	/** Records a new edit and applies it. */
	void Perform(const FDojoP5CourseEdit& Edit);

	/** Writes the course into the label. */
	void RefreshLabel();

	/** What stands in each slot. */
	UPROPERTY(VisibleInstanceOnly, Category = "Course")
	TArray<EDojoP5Obstacle> Slots;

	/** Every edit made, oldest first; those at AppliedCount and after have been taken back. */
	UPROPERTY(VisibleInstanceOnly, Category = "Course")
	TArray<FDojoP5CourseEdit> History;

	/** How many edits from the front of History are applied. */
	int32 AppliedCount = 0;
};
```

## DojoP5CoursePlanner.cpp

```cpp
#include "DojoP5CoursePlanner.h"

#include "Components/TextRenderComponent.h"

ADojoP5CoursePlanner::ADojoP5CoursePlanner()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);

	Slots.Init(EDojoP5Obstacle::EO_None, SlotCount);
	RefreshLabel();
}

void ADojoP5CoursePlanner::Place(int32 Slot, EDojoP5Obstacle Obstacle)
{
}

void ADojoP5CoursePlanner::Clear(int32 Slot)
{
	Place(Slot, EDojoP5Obstacle::EO_None);
}

void ADojoP5CoursePlanner::Perform(const FDojoP5CourseEdit& Edit)
{
}

void ADojoP5CoursePlanner::Undo()
{
}

void ADojoP5CoursePlanner::Redo()
{
}

EDojoP5Obstacle ADojoP5CoursePlanner::GetObstacle(int32 Slot) const
{
	return Slots.IsValidIndex(Slot) ? Slots[Slot] : EDojoP5Obstacle::EO_None;
}

int32 ADojoP5CoursePlanner::GetHistoryLength() const
{
	return History.Num();
}

int32 ADojoP5CoursePlanner::GetAppliedCount() const
{
	return AppliedCount;
}

void ADojoP5CoursePlanner::RefreshLabel()
{
	FString Course;
	for (const EDojoP5Obstacle Obstacle : Slots)
	{
		switch (Obstacle)
		{
		case EDojoP5Obstacle::EO_Hurdle:
			Course += TEXT("H");
			break;
		case EDojoP5Obstacle::EO_Wall:
			Course += TEXT("W");
			break;
		case EDojoP5Obstacle::EO_Pit:
			Course += TEXT("P");
			break;
		default:
			Course += TEXT("_");
			break;
		}
	}

	Label->SetText(FText::FromString(Course));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p5-course-planner/DojoP5CoursePlanner.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_CoursePlanner_UndoAndRedoWalkTheHistory, "Dojo.P5.CoursePlanner.UndoAndRedoWalkTheHistory", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Three edits, then undo twice and redo three times: each step takes back or reapplies exactly one edit. */
bool FDojo_P5_CoursePlanner_UndoAndRedoWalkTheHistory::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5CoursePlanner* Planner = TestWorld.SpawnActor<ADojoP5CoursePlanner>();
	if (!TestNotNull(TEXT("Planner spawned"), Planner) || !TestNotNull(TEXT("Planner has a label"), Planner->Label.Get())) return false;

	Planner->Place(0, EDojoP5Obstacle::EO_Hurdle);
	Planner->Place(1, EDojoP5Obstacle::EO_Wall);
	Planner->Place(0, EDojoP5Obstacle::EO_Pit);
	TestEqual(TEXT("The label draws the course"), Planner->Label->Text.ToString(), FString(TEXT("PW______")));

	Planner->Undo();
	TestEqual(TEXT("Undo puts the hurdle back where the pit was"), Planner->GetObstacle(0), EDojoP5Obstacle::EO_Hurdle);

	Planner->Undo();
	TestEqual(TEXT("A second undo empties slot 1"), Planner->GetObstacle(1), EDojoP5Obstacle::EO_None);
	TestEqual(TEXT("The hurdle is still there"), Planner->GetObstacle(0), EDojoP5Obstacle::EO_Hurdle);

	Planner->Redo();
	TestEqual(TEXT("Redo brings the wall back"), Planner->GetObstacle(1), EDojoP5Obstacle::EO_Wall);

	Planner->Redo();
	TestEqual(TEXT("A second redo brings the pit back"), Planner->GetObstacle(0), EDojoP5Obstacle::EO_Pit);

	Planner->Redo();
	TestEqual(TEXT("Nothing is left to redo"), Planner->GetAppliedCount(), 3);
	TestEqual(TEXT("The label shows the final course"), Planner->Label->Text.ToString(), FString(TEXT("PW______")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_CoursePlanner_NewEditEndsTheOldFuture, "Dojo.P5.CoursePlanner.NewEditEndsTheOldFuture", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** After an undo, a new edit replaces the edits that were taken back: redo finds nothing, and undo walks the new line. */
bool FDojo_P5_CoursePlanner_NewEditEndsTheOldFuture::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5CoursePlanner* Planner = TestWorld.SpawnActor<ADojoP5CoursePlanner>();
	if (!TestNotNull(TEXT("Planner spawned"), Planner)) return false;

	Planner->Place(0, EDojoP5Obstacle::EO_Hurdle);
	Planner->Place(2, EDojoP5Obstacle::EO_Wall);
	Planner->Undo();
	Planner->Place(5, EDojoP5Obstacle::EO_Pit);

	TestEqual(TEXT("The taken-back wall edit is gone from the history"), Planner->GetHistoryLength(), 2);

	Planner->Redo();
	TestEqual(TEXT("Redo cannot bring back the abandoned wall"), Planner->GetObstacle(2), EDojoP5Obstacle::EO_None);

	Planner->Undo();
	TestEqual(TEXT("Undo takes back the pit"), Planner->GetObstacle(5), EDojoP5Obstacle::EO_None);

	Planner->Undo();
	TestEqual(TEXT("A second undo takes back the hurdle"), Planner->GetObstacle(0), EDojoP5Obstacle::EO_None);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_CoursePlanner_OnlyRealEditsAreKept, "Dojo.P5.CoursePlanner.OnlyRealEditsAreKept", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Edits that change nothing, slots off the course, and undo on an empty history leave no trace. */
bool FDojo_P5_CoursePlanner_OnlyRealEditsAreKept::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5CoursePlanner* Planner = TestWorld.SpawnActor<ADojoP5CoursePlanner>();
	if (!TestNotNull(TEXT("Planner spawned"), Planner)) return false;

	Planner->Undo();
	Planner->Redo();
	TestEqual(TEXT("Undo and redo on nothing do nothing"), Planner->GetHistoryLength(), 0);

	Planner->Place(3, EDojoP5Obstacle::EO_Wall);
	Planner->Place(3, EDojoP5Obstacle::EO_Wall);
	Planner->Clear(6);
	Planner->Place(99, EDojoP5Obstacle::EO_Pit);
	Planner->Place(-1, EDojoP5Obstacle::EO_Pit);

	TestEqual(TEXT("Only the first wall is a real edit"), Planner->GetHistoryLength(), 1);

	Planner->Clear(3);
	TestEqual(TEXT("Clearing a slot is an edit too"), Planner->GetHistoryLength(), 2);

	Planner->Undo();
	TestEqual(TEXT("Undoing the clear brings the wall back"), Planner->GetObstacle(3), EDojoP5Obstacle::EO_Wall);

	return true;
}

#endif
```

# Hints

- The failing test undoes, makes a new edit, and then looks at the history. Ask what happens to the edits after AppliedCount when a new edit arrives.
- Before adding a new edit, cut the history back to the edits that are applied; then the new edit goes on the end and every applied count stays honest.
- `TArray::SetNum` shortens an array in place (`Containers/Array.h`); undo reads the edit at the new applied count, redo reads the one at the old count.

# Rubric

- Every change to the course goes through Perform, which records an edit with the slot, the before, and the after.
- Undo restores the before of the most recent applied edit and redo reapplies the after of the next one; both do nothing at the ends of the history.
- A new edit after an undo discards the taken-back edits, so redo never resurrects an abandoned line.
- Edits that change nothing and slots off the course leave no edit behind.
- Edits store only what changed, never a copy of the whole course.
- The label always shows the course as it stands.

# Alternative

The planner could keep a copy of the whole course before every edit and undo by restoring the last copy. With eight slots that is cheap and very simple. It stops being cheap when the course has hundreds of slots and long sessions, and it has a subtler cost: restoring a whole copy also throws away anything that changed the course from outside the history (a scripted event, another designer's edit), where an edit that records its own slot takes back only what it did. The referee desk later in this world runs into exactly that.
