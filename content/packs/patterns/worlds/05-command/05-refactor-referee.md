---
id: p5-referee-refactor
title: Corrections that take back only themselves
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [command]
skills: [command, refactoring]
terms: [ustruct, tarray, ufunction]
prerequisites: [p5-course-planner]
xp: 90
estimatedMinutes: 20
concepts:
  - Undo by restoring a saved copy of everything also wipes changes made outside the history
  - A correction recorded as a value that knows its own change takes back only that change
  - The values are smaller than copies and say what happened, which a log or a replay can read
---

# Brief

When you press Play, a referee adds 2 points to the red team, then the blue team scores a goal, then the referee takes the correction back: red loses its 2 points, and blue keeps its goal.

The starter works for corrections in a quiet moment. Referees can correct a team's score (`AdjustScore`) and take corrections back (`UndoAdjustment`). Live play scores goals (`RecordGoal`), which no referee may undo. To make undo possible, the starter saves a full copy of both scores before every correction and restores the last copy on undo. Read it and find the problem a referee reported: a correction, then a goal, then an undo, and the goal disappears, because the saved copy was taken before the goal.

Refactor the corrections into Command:

- Each correction becomes a small recorded value, the team and the points it added, kept in a list of corrections not yet taken back.
- Undo takes the most recent one off the list and removes exactly the points it added from exactly its team.
- The saved copies of the scores go away entirely.
- Public names and defaults stay the same. Corrections of 0 points and teams that do not exist are still ignored and leave nothing to undo.

## See it in the editor

Place a `DojoP5RefereeDesk` in a map with no other desks, press Play, and open the console. Run `ke * AdjustScore 0 2` (label 2 : 0), `ke * RecordGoal 1` (2 : 3), then `ke * UndoAdjustment`. Before the refactor the label reads 0 : 0, the goal gone; after it, 0 : 3.

# Files

## DojoP5RefereeDesk.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP5RefereeDesk.generated.h"

class UTextRenderComponent;

/** The referees' desk: live play scores goals, and referees can correct a team's score and take the correction back. */
UCLASS()
class ADojoP5RefereeDesk : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP5RefereeDesk();

	/** Floating text that shows both teams' scores. */
	UPROPERTY(VisibleAnywhere, Category = "Referee")
	TObjectPtr<UTextRenderComponent> Label;

	/** Each team's score, in team order. */
	UPROPERTY(VisibleInstanceOnly, Category = "Referee")
	TArray<int32> Scores = { 0, 0 };

	/** Points a goal is worth. */
	UPROPERTY(EditAnywhere, Category = "Referee", meta = (ClampMin = "1"))
	int32 GoalPoints = 3;

	/** Live play: a team scores a goal. Not something a referee can take back. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void RecordGoal(int32 Team);

	/** A referee's correction: adds Points (negative to remove) to a team's score; it can be taken back. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void AdjustScore(int32 Team, int32 Points);

	/** Takes back the most recent correction that has not been taken back; does nothing when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Referee")
	void UndoAdjustment();

	/** One team's score; 0 for a team that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Referee")
	int32 GetScore(int32 Team) const;

protected:
	/** Shows the starting scores. */
	virtual void BeginPlay() override;

private:
	/** Writes both scores into the label. */
	void RefreshLabel();

	/** A full copy of the scores taken before each correction, newest last. */
	TArray<TArray<int32>> ScoresBeforeAdjustments;
};
```

## DojoP5RefereeDesk.cpp

```cpp
#include "DojoP5RefereeDesk.h"

#include "Components/TextRenderComponent.h"

ADojoP5RefereeDesk::ADojoP5RefereeDesk()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP5RefereeDesk::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP5RefereeDesk::RecordGoal(int32 Team)
{
	if (!Scores.IsValidIndex(Team)) return;

	Scores[Team] += GoalPoints;
	RefreshLabel();
}

void ADojoP5RefereeDesk::AdjustScore(int32 Team, int32 Points)
{
	if (!Scores.IsValidIndex(Team) || Points == 0) return;

	ScoresBeforeAdjustments.Add(Scores);
	Scores[Team] += Points;
	RefreshLabel();
}

void ADojoP5RefereeDesk::UndoAdjustment()
{
	if (ScoresBeforeAdjustments.Num() == 0) return;

	Scores = ScoresBeforeAdjustments.Pop();
	RefreshLabel();
}

int32 ADojoP5RefereeDesk::GetScore(int32 Team) const
{
	return Scores.IsValidIndex(Team) ? Scores[Team] : 0;
}

void ADojoP5RefereeDesk::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("%d : %d"), GetScore(0), GetScore(1))));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p5-referee-refactor/DojoP5RefereeDesk.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_RefereeRefactor_QuietCorrectionsUndo, "Dojo.P5.RefereeRefactor.QuietCorrectionsUndo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Corrections with no play in between undo newest first, exactly as the starter does. */
bool FDojo_P5_RefereeRefactor_QuietCorrectionsUndo::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5RefereeDesk* Desk = TestWorld.SpawnActor<ADojoP5RefereeDesk>();
	if (!TestNotNull(TEXT("Desk spawned"), Desk)) return false;

	Desk->AdjustScore(0, 3);
	Desk->AdjustScore(1, -2);
	Desk->AdjustScore(7, 5);
	Desk->AdjustScore(0, 0);
	TestEqual(TEXT("Red has 3"), Desk->GetScore(0), 3);
	TestEqual(TEXT("Blue has -2"), Desk->GetScore(1), -2);

	Desk->UndoAdjustment();
	TestEqual(TEXT("The newest correction is taken back first"), Desk->GetScore(1), 0);
	TestEqual(TEXT("Red is untouched by that undo"), Desk->GetScore(0), 3);

	Desk->UndoAdjustment();
	TestEqual(TEXT("Then the older one"), Desk->GetScore(0), 0);

	Desk->UndoAdjustment();
	TestEqual(TEXT("Nothing left to undo, and ignored corrections left nothing behind"), Desk->GetScore(0), 0);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_RefereeRefactor_GoalsSurviveUndo, "Dojo.P5.RefereeRefactor.GoalsSurviveUndo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A correction, then a goal, then an undo: the correction is gone and the goal stays. */
bool FDojo_P5_RefereeRefactor_GoalsSurviveUndo::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5RefereeDesk* Desk = TestWorld.SpawnActor<ADojoP5RefereeDesk>();
	if (!TestNotNull(TEXT("Desk spawned"), Desk) || !TestNotNull(TEXT("Desk has a label"), Desk->Label.Get())) return false;

	Desk->AdjustScore(0, 2);
	Desk->RecordGoal(1);
	Desk->UndoAdjustment();

	TestEqual(TEXT("Red loses the corrected points"), Desk->GetScore(0), 0);
	TestEqual(TEXT("Blue keeps its goal"), Desk->GetScore(1), 3);
	TestEqual(TEXT("The label shows it"), Desk->Label->Text.ToString(), FString(TEXT("0 : 3")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P5_RefereeRefactor_GoalsBetweenCorrections, "Dojo.P5.RefereeRefactor.GoalsBetweenCorrections", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Corrections and goals on the same team, interleaved: undoing both corrections leaves exactly the goals. */
bool FDojo_P5_RefereeRefactor_GoalsBetweenCorrections::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoP5RefereeDesk* Desk = TestWorld.SpawnActor<ADojoP5RefereeDesk>();
	if (!TestNotNull(TEXT("Desk spawned"), Desk)) return false;

	Desk->AdjustScore(0, 5);
	Desk->RecordGoal(0);
	Desk->AdjustScore(0, -1);
	Desk->RecordGoal(0);
	TestEqual(TEXT("5 plus two goals minus 1"), Desk->GetScore(0), 10);

	Desk->UndoAdjustment();
	TestEqual(TEXT("Undoing the -1 adds it back"), Desk->GetScore(0), 11);

	Desk->UndoAdjustment();
	TestEqual(TEXT("Undoing the +5 leaves exactly the two goals"), Desk->GetScore(0), 6);

	return true;
}

#endif
```

# Hints

- Ask what a saved copy of the scores contains that a correction did not cause. Everything in it that the correction did not change is what an undo should never touch.
- A correction can be remembered as just its team and its points, in a list; undo takes the newest off the list and subtracts its points from its team.
- `TArray::Pop` from `Containers/Array.h` removes and returns the last entry; a `USTRUCT` with two `UPROPERTY` ints holds a correction.

# Rubric

- Each correction is recorded as a value holding its team and its points, and the list of corrections replaces the saved copies of the scores.
- Undo removes exactly the points the newest correction added, from exactly its team, and nothing else.
- Goals and any other change made outside the corrections survive every undo.
- Corrections that change nothing or name a missing team leave nothing to undo.
- Public names, defaults, and the label are unchanged.

# Alternative

A full copy can still be the right tool when the change is too tangled to describe as a small value: a level generator that rewrites hundreds of cells, or a physics state with many coupled numbers. Then saving a snapshot and restoring it is the simple, safe undo, and it is what the editor's own transaction system does for objects that call `Modify()`. The price is the one the referees hit: a snapshot restores everything in it, including changes that came from elsewhere, so it suits state that nothing else touches between the save and the restore.
