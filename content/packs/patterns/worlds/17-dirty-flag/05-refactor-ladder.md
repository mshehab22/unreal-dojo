---
id: p17-ladder-refactor
title: A ladder that re-sorts on every score
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [dirty-flag]
skills: [dirty-flag, refactoring]
terms: [mutable-member, uobject, tarray]
prerequisites: [p17-tower-rig]
xp: 100
estimatedMinutes: 20
concepts:
  - A rating worked out inside every setter is worked out again for answers nobody reads
  - A note set by each change, and checked by the reading function, moves the work to the read
  - A const reading function needs mutable members to refresh what it remembers
  - The ratings, the names, and the refusals stay exactly as they were
---

# Brief

After the refactor, the ladder gives the same ratings as before, recording a score works nothing out, and however many scores are added or removed before the next read, the rating is worked out once.

`UDojoP17Ladder` keeps every bout score, and a fighter's rating is the sum of the best three scores, or of all of them when there are fewer than three. It was written to keep `Rating` ready: `AddScore` and `RemoveScore` each call `Recompute`, which sorts a copy of every score. The ladder is read once a frame by the screen, scores arrive in bursts at the end of a bout, and a day of play keeps thousands of them, so the rating is worked out far more often than anyone looks at it.

Refactor the ladder to work the rating out only when it is read:

- `AddScore` and `RemoveScore` record the change and set a note that the rating is out of date. They work nothing out. A removal that is refused changes nothing and sets no note.
- `GetRating` works the rating out when the note is set, stores it, counts the work once, and clears the note. It stays `const`, so the stored rating, the note, and the count become `mutable`, and `Recompute` becomes `const`.
- Names, signatures, and the ratings keep their values. A ladder that is never read never works anything out.

Two of the three tests pass on the starter and must pass after; one does not. Read its message.

## See it in the editor

In the Level Blueprint, on Begin Play, make a ladder with Construct Object from Class (Dojo P17 Ladder). Call Add Score with 10, 30, 20, and 40, then print Get Recompute Count. Before the refactor it prints 4; after it prints 0. Print Get Rating: 90 both times. Print Get Recompute Count again: 4 before, 1 after.

# Files

## DojoP17Ladder.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP17Ladder.generated.h"

/** The dojo ladder: every bout score is kept, and a fighter's rating is the sum of the best three. */
UCLASS(BlueprintType)
class UDojoP17Ladder : public UObject
{
	GENERATED_BODY()

public:
	/** Records a bout score. */
	UFUNCTION(BlueprintCallable, Category = "Ladder")
	void AddScore(int32 Score);

	/** Removes the score at Index; returns false when there is none. */
	UFUNCTION(BlueprintCallable, Category = "Ladder")
	bool RemoveScore(int32 Index);

	/** The rating: the sum of the best three scores, or of all of them when there are fewer than three. */
	UFUNCTION(BlueprintPure, Category = "Ladder")
	int32 GetRating() const;

	/** How many scores are recorded. */
	UFUNCTION(BlueprintPure, Category = "Ladder")
	int32 GetScoreCount() const;

	/** How many times the rating has been worked out from the scores. */
	UFUNCTION(BlueprintPure, Category = "Ladder")
	int32 GetRecomputeCount() const;

private:
	/** Works the rating out from the scores and counts the work. */
	void Recompute();

	/** Every bout score, in the order they were recorded. */
	UPROPERTY()
	TArray<int32> Scores;

	/** The rating, kept up to date by every change to the scores. */
	int32 Rating = 0;

	/** Times the rating has been worked out. */
	int32 RecomputeCount = 0;
};
```

## DojoP17Ladder.cpp

```cpp
#include "DojoP17Ladder.h"

void UDojoP17Ladder::AddScore(int32 Score)
{
	Scores.Add(Score);
	Recompute();
}

bool UDojoP17Ladder::RemoveScore(int32 Index)
{
	if (!Scores.IsValidIndex(Index)) return false;

	Scores.RemoveAt(Index);
	Recompute();
	return true;
}

int32 UDojoP17Ladder::GetRating() const
{
	return Rating;
}

int32 UDojoP17Ladder::GetScoreCount() const
{
	return Scores.Num();
}

int32 UDojoP17Ladder::GetRecomputeCount() const
{
	return RecomputeCount;
}

void UDojoP17Ladder::Recompute()
{
	TArray<int32> Best = Scores;
	Best.Sort([](const int32& A, const int32& B) { return A > B; });

	int32 Total = 0;
	for (int32 Place = 0; Place < FMath::Min(3, Best.Num()); Place++) Total += Best[Place];

	Rating = Total;
	RecomputeCount++;
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Quests/p17-ladder-refactor/DojoP17Ladder.h"
#include "UObject/Package.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_LadderRefactor_RatingIsTheBestThree, "Dojo.P17.LadderRefactor.RatingIsTheBestThree", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The rating is the sum of the best three scores, or of all when there are fewer, and follows removals. */
bool FDojo_P17_LadderRefactor_RatingIsTheBestThree::RunTest(const FString& Parameters)
{
	UDojoP17Ladder* Ladder = NewObject<UDojoP17Ladder>(GetTransientPackage());

	TestEqual(TEXT("An empty ladder rates 0"), Ladder->GetRating(), 0);

	Ladder->AddScore(10);
	TestEqual(TEXT("One score is the rating"), Ladder->GetRating(), 10);

	Ladder->AddScore(30);
	Ladder->AddScore(20);
	TestEqual(TEXT("Three scores add up"), Ladder->GetRating(), 60);

	Ladder->AddScore(40);
	TestEqual(TEXT("A fourth score replaces the worst of the best three"), Ladder->GetRating(), 90);
	TestEqual(TEXT("All four scores are kept"), Ladder->GetScoreCount(), 4);

	TestTrue(TEXT("The 40 at index 3 is removed"), Ladder->RemoveScore(3));
	TestEqual(TEXT("The rating drops back"), Ladder->GetRating(), 60);

	TestTrue(TEXT("The 10 at index 0 is removed"), Ladder->RemoveScore(0));
	TestEqual(TEXT("Two scores add up"), Ladder->GetRating(), 50);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_LadderRefactor_RefusedRemovalsChangeNothing, "Dojo.P17.LadderRefactor.RefusedRemovalsChangeNothing", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A removal of a score that is not there is refused and leaves the scores and the rating alone. */
bool FDojo_P17_LadderRefactor_RefusedRemovalsChangeNothing::RunTest(const FString& Parameters)
{
	UDojoP17Ladder* Ladder = NewObject<UDojoP17Ladder>(GetTransientPackage());
	Ladder->AddScore(25);

	TestFalse(TEXT("No score at index 4"), Ladder->RemoveScore(4));
	TestFalse(TEXT("No score at index -1"), Ladder->RemoveScore(-1));
	TestEqual(TEXT("The score is still there"), Ladder->GetScoreCount(), 1);
	TestEqual(TEXT("And the rating is unchanged"), Ladder->GetRating(), 25);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P17_LadderRefactor_RecomputesOnlyWhenRead, "Dojo.P17.LadderRefactor.RecomputesOnlyWhenRead", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Recording scores works nothing out, many changes before a read cost one sum, and a read with no change costs none. */
bool FDojo_P17_LadderRefactor_RecomputesOnlyWhenRead::RunTest(const FString& Parameters)
{
	UDojoP17Ladder* Ladder = NewObject<UDojoP17Ladder>(GetTransientPackage());

	for (int32 Score = 1; Score <= 20; Score++) Ladder->AddScore(Score);
	TestEqual(TEXT("Twenty scores recorded, nothing worked out"), Ladder->GetRecomputeCount(), 0);

	TestEqual(TEXT("The best three of 1 to 20 are 20, 19, and 18"), Ladder->GetRating(), 57);
	TestEqual(TEXT("The first read worked it out once"), Ladder->GetRecomputeCount(), 1);

	for (int32 Read = 0; Read < 5; Read++) Ladder->GetRating();
	TestEqual(TEXT("Reads with no change work nothing out"), Ladder->GetRecomputeCount(), 1);

	Ladder->AddScore(100);
	Ladder->RemoveScore(0);
	Ladder->AddScore(50);
	TestEqual(TEXT("Three more changes work nothing out"), Ladder->GetRecomputeCount(), 1);

	TestEqual(TEXT("The best three are now 100, 50, and 20"), Ladder->GetRating(), 170);
	TestEqual(TEXT("They cost one more sum"), Ladder->GetRecomputeCount(), 2);

	return true;
}

#endif
```

# Hints

- `RecomputesOnlyWhenRead` is the one that says the refactor is done. Read its message: when did the count go up?
- A `const` function can call only `const` functions and can change only `mutable` members. `GetRating` stays `const`, so what has to change about `Recompute` and the members it writes?
- Set the note in both `AddScore` and `RemoveScore`, but only when something really changed.

# Rubric

- AddScore and RemoveScore only record the change and set the note; they work nothing out.
- GetRating works the rating out only when the note is set, stores it, counts the work once, and clears the note, and returns the stored rating every time.
- The ratings are exactly what they were: the sum of the best three scores, or of all of them when there are fewer than three.
- A refused removal changes nothing and does not set the note.
- GetRating stays const; the stored rating, the note, and the count are mutable, and Recompute is const.
- Names and signatures of the public functions are unchanged.

# Alternative

A ladder like this could keep its three best scores in a small sorted array and update it as scores arrive, which would make the rating free to read. Adding a score is then a short insert. Removing one is the trouble: if the removed score was among the best three, the next best has to be found by looking through all the scores again, so the removal needs the same full pass the note was avoiding. When removals are rare, the sorted three are a fine choice; when they are common, the note is simpler and just as quick.
