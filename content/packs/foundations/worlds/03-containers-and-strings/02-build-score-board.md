---
id: f3-score-board
title: A score board that keeps the last five rounds
order: 2
kind: build
scaffold: worked
difficulty: 2
patterns: []
skills: [containers]
terms: [tarray, uproperty, cast, fmath]
prerequisites: [f3-tarray, f1-score-keeper, f1-training-dummy]
xp: 50
estimatedMinutes: 12
concepts:
  - A TArray as an ordered history with a size limit
  - An average needs floating point division
---

# Brief

When you press Play and run `ke * AddScore 1` and then `ke * AddScore 2`, the board reads Best 2  Avg 1.5; after more than five scores, the oldest ones drop off and stop counting toward the best.

Most of `ADojoF3ScoreBoard` is written for you. Explain the marked lines, then fill the two gaps:

1. `AddScore`: add the score at the end of the array, drop the oldest scores while there are more than `MaxEntries`, and refresh the label.
2. `GetAverage`: the mean of the scores kept, or 0 when there are none.

The board also reads a total from your World 1 score keeper through `RecordFromKeeper`, which is written for you. It holds the keeper; the keeper knows nothing about the board.

Write `GetAverage` the obvious way first and run the tests. This one fails on purpose the first time for most people: read which assertion failed and why before you open the hints.

Compiles against earlier quests: f1-score-keeper (`Quests/f1-score-keeper/DojoF1ScoreKeeper.h`), and f1-training-dummy in the tests only (`Quests/f1-training-dummy/DojoF1TrainingDummy.h`).

## See it in the editor

Place a `DojoF3ScoreBoard` and press Play. Run `ke * AddScore 1`, then `ke * AddScore 2`: the label reads Best 2  Avg 1.5. Run `ke * AddScore 100`, then `ke * AddScore 10` five times: the 100 drops off the front and the best falls back to 10. To see the reuse, place a training dummy and a score keeper from World 1, wire the keeper to the board's Keeper field, strike the dummy, and run `ke * RecordFromKeeper`.

# Files

## DojoF3ScoreBoard.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF3ScoreBoard.generated.h"

class ADojoF1ScoreKeeper;
class UTextRenderComponent;

/** Keeps the latest round scores in order, drops the oldest past a limit, and shows the best and the average. */
UCLASS()
class ADojoF3ScoreBoard : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF3ScoreBoard();

	/** Floating text that shows the best and the average. */
	UPROPERTY(VisibleAnywhere, Category = "Board")
	TObjectPtr<UTextRenderComponent> Label;

	/** How many scores the board keeps; older ones drop off the front. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Board", meta = (ClampMin = "1")) // @explain: ClampMin of 1 means the trimming loop always leaves at least the newest score.
	int32 MaxEntries = 5;

	/** The World 1 score keeper whose total RecordFromKeeper reads. */
	UPROPERTY(EditAnywhere, Category = "Board")
	TObjectPtr<ADojoF1ScoreKeeper> Keeper;

	/** Adds a score at the end, drops the oldest beyond MaxEntries, and refreshes the label. */
	UFUNCTION(BlueprintCallable, Category = "Board")
	void AddScore(int32 Score);

	/** Adds the keeper's current total as a score; does nothing without a keeper. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Board")
	void RecordFromKeeper();

	/** Highest score kept, or 0 when there are none. */
	UFUNCTION(BlueprintPure, Category = "Board")
	int32 GetBest() const;

	/** Mean of the scores kept, or 0 when there are none. */
	UFUNCTION(BlueprintPure, Category = "Board")
	float GetAverage() const;

	/** How many scores are kept. */
	UFUNCTION(BlueprintPure, Category = "Board")
	int32 GetCount() const;

protected:
	/** Shows the empty board. */
	virtual void BeginPlay() override;

private:
	/** Writes the best and the average into the label. */
	void RefreshLabel();

	/** Oldest first. */
	UPROPERTY(VisibleInstanceOnly, Category = "Board") // @explain: A reflected array of plain values shows up in Details while playing, with every score in order.
	TArray<int32> Scores;
};
```

## DojoF3ScoreBoard.cpp

```cpp
#include "DojoF3ScoreBoard.h"

#include "Components/TextRenderComponent.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"

ADojoF3ScoreBoard::ADojoF3ScoreBoard()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoF3ScoreBoard::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoF3ScoreBoard::AddScore(int32 Score)
{
	// Your code: add Score at the end, drop the oldest while there are more than MaxEntries, then refresh the label.
}

void ADojoF3ScoreBoard::RecordFromKeeper()
{
	if (!IsValid(Keeper)) return; // @explain: The keeper is set by a designer and may be empty or destroyed, so it is checked with IsValid before use.

	AddScore(Keeper->CountScore());
}

int32 ADojoF3ScoreBoard::GetBest() const
{
	int32 Best = 0;

	for (const int32 Score : Scores) // @explain: A ranged for loop reads every score without changing the array, which is allowed.
	{
		Best = FMath::Max(Best, Score);
	}

	return Best;
}

float ADojoF3ScoreBoard::GetAverage() const
{
	// Your code: return 0 for an empty board, otherwise the total divided by how many scores there are.
	return 0.f;
}

int32 ADojoF3ScoreBoard::GetCount() const
{
	return Scores.Num();
}

void ADojoF3ScoreBoard::RefreshLabel()
{
	Label->SetText(FText::FromString(FString::Printf(TEXT("Best %d  Avg %.1f"), GetBest(), GetAverage()))); // @explain: The label is a debug readout, so a plain FString with Printf is enough; player-facing text would use FText.
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/f1-score-keeper/DojoF1ScoreKeeper.h"
#include "Quests/f1-training-dummy/DojoF1TrainingDummy.h"
#include "Quests/f3-score-board/DojoF3ScoreBoard.h"
#include "Support/DojoTestWorld.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_ScoreBoard_BestAndAverage, "Dojo.F3.ScoreBoard.BestAndAverage", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds a few scores and checks the best, an average that is not a whole number, and the label. */
bool FDojo_F3_ScoreBoard_BestAndAverage::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3ScoreBoard* Board = TestWorld.SpawnActor<ADojoF3ScoreBoard>();
	if (!TestNotNull(TEXT("Board spawned"), Board)) return false;

	TestEqual(TEXT("An empty board's best is 0"), Board->GetBest(), 0);
	TestEqual(TEXT("An empty board's average is 0"), Board->GetAverage(), 0.f);

	Board->AddScore(1);
	Board->AddScore(2);
	TestEqual(TEXT("The average of 1 and 2 is 1.5, not 1"), Board->GetAverage(), 1.5f);

	Board->AddScore(30);
	TestEqual(TEXT("Three scores kept"), Board->GetCount(), 3);
	TestEqual(TEXT("The best is 30"), Board->GetBest(), 30);
	TestEqual(TEXT("The label shows the best and the average"), Board->Label->Text.ToString(), FString(TEXT("Best 30  Avg 11.0")));

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_F3_ScoreBoard_DropsTheOldest, "Dojo.F3.ScoreBoard.DropsTheOldest", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Adds more scores than the board keeps and checks the oldest ones leave, best included; then records from a World 1 keeper. */
bool FDojo_F3_ScoreBoard_DropsTheOldest::RunTest(const FString& Parameters)
{
	FDojoTestWorld TestWorld;

	ADojoF3ScoreBoard* Board = TestWorld.SpawnActor<ADojoF3ScoreBoard>();
	if (!TestNotNull(TEXT("Board spawned"), Board)) return false;

	TestEqual(TEXT("MaxEntries defaults to 5"), Board->MaxEntries, 5);

	Board->AddScore(100);
	for (int32 Index = 0; Index < 5; ++Index) Board->AddScore(10);

	TestEqual(TEXT("Never more than 5 kept"), Board->GetCount(), 5);
	TestEqual(TEXT("The 100 was the oldest, so it dropped off"), Board->GetBest(), 10);

	ADojoF1ScoreKeeper* Keeper = TestWorld.SpawnActor<ADojoF1ScoreKeeper>();
	ADojoF1TrainingDummy* Dummy = TestWorld.SpawnActor<ADojoF1TrainingDummy>();
	if (!TestNotNull(TEXT("Keeper spawned"), Keeper) || !TestNotNull(TEXT("Dummy spawned"), Dummy)) return false;

	Keeper->Targets.Add(Dummy);
	Dummy->Strike();
	Dummy->Strike();

	Board->RecordFromKeeper();
	TestEqual(TEXT("Without a keeper set, nothing is recorded"), Board->GetBest(), 10);

	Board->Keeper = Keeper;
	Board->RecordFromKeeper();
	TestEqual(TEXT("The keeper's 10 points were recorded and the count stays at 5"), Board->GetCount(), 5);

	Dummy->Strike();
	Board->RecordFromKeeper();
	TestEqual(TEXT("The keeper's new total of 15 is the best"), Board->GetBest(), 15);

	return true;
}

#endif
```

# Hints

- The failing assertion is about 1 and 2; work out on paper what your division gives when both sides are whole numbers.
- Total the scores in an int32, then make one side of the division a float before dividing; for trimming, the array can remove its first element while it is longer than the limit.
- `TArray::RemoveAt` and `TArray::Num` are in `Containers/Array.h`; `static_cast<float>` is plain C++.

# Rubric

- AddScore appends, trims from the front while the array is longer than MaxEntries, and refreshes the label.
- GetAverage returns 0 for an empty board and divides as floating point, so 1 and 2 average to 1.5.
- The limit comes from the editable MaxEntries, never a number typed in the function.
- The array is a UPROPERTY and is changed only through AddScore.
- The board holds the keeper reference; the keeper from World 1 is reused unchanged.

# Alternative

A fixed-size ring buffer, an array of five slots with an index that wraps around, avoids moving four scores on every add once the board is full. For five scores the move costs nothing worth measuring and the plain array is far easier to read and debug in the Details panel. The ring buffer pays off for long histories updated every frame, such as the last few hundred positions of a moving target.

# Parsons

```yaml
- id: board-add-score
  prompt: Put AddScore in order.
  lines:
    - "void ADojoF3ScoreBoard::AddScore(int32 Score)"
    - "{"
    - "	Scores.Add(Score);"
    - "	while (Scores.Num() > MaxEntries)"
    - "	{"
    - "		Scores.RemoveAt(0);"
    - "	}"
    - "	RefreshLabel();"
    - "}"
  distractors:
    - line: "		Scores.RemoveAtSwap(0);"
      mistake: RemoveAtSwap moves the newest score into the front slot, so the order is lost and the wrong score drops next time.
- id: board-average
  prompt: Put GetAverage in order.
  lines:
    - "float ADojoF3ScoreBoard::GetAverage() const"
    - "{"
    - "	if (Scores.Num() == 0) return 0.f;"
    - "	int32 Total = 0;"
    - "	for (const int32 Score : Scores) Total += Score;"
    - "	return static_cast<float>(Total) / Scores.Num();"
    - "}"
  distractors:
    - line: "	return Total / Scores.Num();"
      mistake: Dividing two whole numbers throws the fraction away before it ever becomes a float.
```
