---
id: p4-standings-refactor
title: Standings that do not depend on who is scored first
order: 5
kind: refactor
scaffold: stub
difficulty: 3
patterns: [double-buffer]
skills: [double-buffer, refactoring]
terms: [tarray, ufunction, editanywhere]
prerequisites: [p4-drum-pad]
xp: 90
estimatedMinutes: 20
concepts:
  - A rule that reads other entries while entries are being updated in place depends on the update order
  - Reading the finished standings and writing a second copy removes the order from the result
  - The order switch becomes a test of the claim, not a setting anyone needs
---

# Brief

When you press Play and score the round, the trailing team gets its catch-up bonus or not by the same rule whether the standings walk the teams first to last or last to first, and the label shows the same three numbers either way.

The starter works for most rounds. The rule: every team gets `PointsPerHit` for each of its hits this round, and a team that started the round at least `CatchUpGap` points behind the leader also gets `CatchUpBonus`. A designer found a round where the last-place team got the bonus or not depending on the order of the teams in the list. Read `ScoreRound` and find why: it updates scores in place, so by the time it reaches the third team, the second team's score has already grown, and "the leader" is no longer the leader the round began with.

Refactor it so a round reads only the standings as they were when it began:

- Keep every public name and default, including `bScoreInReverse`, which now only proves the point.
- Build the new scores in a second array and make it the standings with one swap at the end of the round.
- The leader, and every team's gap to it, come from the finished standings, never from a score already changed this round.

In rounds where nobody is near the catch-up gap, the standings come out exactly as before.

## See it in the editor

Place a `DojoP4Standings` and set Scores to 20, 10, 4 and Round Hits to 0, 6, 1 in its Details panel. In the Level Blueprint, call Score Round on it from Begin Play. Press Play: before the refactor the label reads 20 | 22 | 11; tick Score In Reverse and it reads 20 | 22 | 6. After the refactor it reads 20 | 22 | 6 both ways, because the third team started the round 16 behind the leader, short of the gap of 17.

# Files

## DojoP4Standings.h

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP4Standings.generated.h"

class UTextRenderComponent;

/** The arena's team standings: each round adds every team's hits, plus a catch-up bonus for any team far behind the leader. */
UCLASS()
class ADojoP4Standings : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoP4Standings();

	/** Floating text that shows every team's score. */
	UPROPERTY(VisibleAnywhere, Category = "Standings")
	TObjectPtr<UTextRenderComponent> Label;

	/** Each team's score, in team order. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	TArray<int32> Scores = { 0, 0, 0 };

	/** Each team's hits in the round being scored, in team order. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	TArray<int32> RoundHits = { 0, 0, 0 };

	/** Points for each hit. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "0"))
	int32 PointsPerHit = 2;

	/** How far behind the round's leader a team must start the round to earn the catch-up bonus. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "1"))
	int32 CatchUpGap = 17;

	/** Bonus points for a team that started the round at least CatchUpGap behind the leader. */
	UPROPERTY(EditAnywhere, Category = "Standings", meta = (ClampMin = "0"))
	int32 CatchUpBonus = 5;

	/** Which way ScoreRound walks the teams; scoring should not depend on it. */
	UPROPERTY(EditAnywhere, Category = "Standings")
	bool bScoreInReverse = false;

	/** Scores the round: every team gets its hits, and teams far behind the leader get the catch-up bonus. */
	UFUNCTION(BlueprintCallable, Category = "Standings")
	void ScoreRound();

	/** One team's score; 0 for a team that does not exist. */
	UFUNCTION(BlueprintPure, Category = "Standings")
	int32 GetScore(int32 Team) const;

protected:
	/** Shows the starting standings. */
	virtual void BeginPlay() override;

private:
	/** The highest score among all teams right now. */
	int32 HighestScore() const;

	/** Writes every team's score into the label. */
	void RefreshLabel();
};
```

## DojoP4Standings.cpp

```cpp
#include "DojoP4Standings.h"

#include "Components/TextRenderComponent.h"

ADojoP4Standings::ADojoP4Standings()
{
	PrimaryActorTick.bCanEverTick = false;

	Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Label"));
	RootComponent = Label;
	Label->SetHorizontalAlignment(EHTA_Center);
}

void ADojoP4Standings::BeginPlay()
{
	Super::BeginPlay();

	RefreshLabel();
}

void ADojoP4Standings::ScoreRound()
{
	for (int32 Visit = 0; Visit < Scores.Num(); ++Visit)
	{
		const int32 Team = bScoreInReverse ? Scores.Num() - 1 - Visit : Visit;
		const int32 Leader = HighestScore();
		const int32 Hits = RoundHits.IsValidIndex(Team) ? RoundHits[Team] : 0;
		const bool bFarBehind = Leader - Scores[Team] >= CatchUpGap;

		Scores[Team] += Hits * PointsPerHit + (bFarBehind ? CatchUpBonus : 0);
	}

	RefreshLabel();
}

int32 ADojoP4Standings::GetScore(int32 Team) const
{
	return Scores.IsValidIndex(Team) ? Scores[Team] : 0;
}

int32 ADojoP4Standings::HighestScore() const
{
	int32 Highest = 0;
	for (const int32 Score : Scores) Highest = FMath::Max(Highest, Score);
	return Highest;
}

void ADojoP4Standings::RefreshLabel()
{
	TArray<FString> Parts;
	for (const int32 Score : Scores) Parts.Add(FString::FromInt(Score));
	Label->SetText(FText::FromString(FString::Join(Parts, TEXT(" | "))));
}
```

# Tests

```cpp
#include "Misc/AutomationTest.h"

#if WITH_AUTOMATION_TESTS

#include "Components/TextRenderComponent.h"
#include "Quests/p4-standings-refactor/DojoP4Standings.h"
#include "Support/DojoTestWorld.h"

namespace DojoP4StandingsRefactorTest
{
	/** Spawns standings with the given scores and round hits. */
	ADojoP4Standings* SpawnStandings(FDojoTestWorld& TestWorld, const TArray<int32>& Scores, const TArray<int32>& RoundHits, bool bReverse)
	{
		ADojoP4Standings* Standings = TestWorld.SpawnActor<ADojoP4Standings>();
		if (!Standings) return nullptr;

		Standings->Scores = Scores;
		Standings->RoundHits = RoundHits;
		Standings->bScoreInReverse = bReverse;
		return Standings;
	}
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StandingsRefactor_PlainRoundsUnchanged, "Dojo.P4.StandingsRefactor.PlainRoundsUnchanged", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** Rounds where the order cannot matter score exactly as the starter does, walking either way. */
bool FDojo_P4_StandingsRefactor_PlainRoundsUnchanged::RunTest(const FString& Parameters)
{
	using namespace DojoP4StandingsRefactorTest;

	FDojoTestWorld TestWorld;

	for (const bool bReverse : { false, true })
	{
		ADojoP4Standings* Close = SpawnStandings(TestWorld, { 5, 5 }, { 1, 2 }, bReverse);
		ADojoP4Standings* Lopsided = SpawnStandings(TestWorld, { 30, 0 }, { 0, 0 }, bReverse);
		if (!TestNotNull(TEXT("Standings spawned"), Close) || !TestNotNull(TEXT("Standings spawned"), Lopsided)) return false;

		Close->ScoreRound();
		TestEqual(TEXT("Hits only: the first team gets 2"), Close->GetScore(0), 7);
		TestEqual(TEXT("Hits only: the second team gets 4"), Close->GetScore(1), 9);

		Lopsided->ScoreRound();
		TestEqual(TEXT("The leader gets no bonus"), Lopsided->GetScore(0), 30);
		TestEqual(TEXT("A team 30 behind gets the catch-up bonus"), Lopsided->GetScore(1), 5);
	}

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StandingsRefactor_SameStandingsEitherOrder, "Dojo.P4.StandingsRefactor.SameStandingsEitherOrder", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** The designer's round: the second team overtakes the leader, and the third team started 16 behind, short of the gap of 17. */
bool FDojo_P4_StandingsRefactor_SameStandingsEitherOrder::RunTest(const FString& Parameters)
{
	using namespace DojoP4StandingsRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP4Standings* Forward = SpawnStandings(TestWorld, { 20, 10, 4 }, { 0, 6, 1 }, false);
	ADojoP4Standings* Backward = SpawnStandings(TestWorld, { 20, 10, 4 }, { 0, 6, 1 }, true);
	if (!TestNotNull(TEXT("Standings spawned"), Forward) || !TestNotNull(TEXT("Standings spawned"), Backward)) return false;

	Forward->ScoreRound();
	Backward->ScoreRound();

	for (int32 Team = 0; Team < 3; ++Team)
	{
		TestEqual(FString::Printf(TEXT("Team %d scores the same walking either way"), Team), Forward->GetScore(Team), Backward->GetScore(Team));
	}

	TestEqual(TEXT("The second team overtakes with 12 points"), Forward->GetScore(1), 22);
	TestEqual(TEXT("The third team started 16 behind, short of the gap, so no bonus"), Forward->GetScore(2), 6);

	return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FDojo_P4_StandingsRefactor_TwoRoundsInARow, "Dojo.P4.StandingsRefactor.TwoRoundsInARow", EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter)

/** A second round reads the standings the first round left, and the label shows them. */
bool FDojo_P4_StandingsRefactor_TwoRoundsInARow::RunTest(const FString& Parameters)
{
	using namespace DojoP4StandingsRefactorTest;

	FDojoTestWorld TestWorld;

	ADojoP4Standings* Standings = SpawnStandings(TestWorld, { 20, 10, 4 }, { 0, 6, 1 }, false);
	if (!TestNotNull(TEXT("Standings spawned"), Standings) || !TestNotNull(TEXT("Standings have a label"), Standings->Label.Get())) return false;

	Standings->ScoreRound();
	Standings->RoundHits = { 1, 0, 0 };
	Standings->ScoreRound();

	// Round two starts from 20, 22, 6: the leader is 22, the third team is 16 behind (no bonus), the first team gets 2.
	TestEqual(TEXT("The first team gains its hit"), Standings->GetScore(0), 22);
	TestEqual(TEXT("The second team stands still"), Standings->GetScore(1), 22);
	TestEqual(TEXT("The third team stays 16 behind and gets no bonus"), Standings->GetScore(2), 6);
	TestEqual(TEXT("The label shows the standings"), Standings->Label->Text.ToString(), FString(TEXT("22 | 22 | 6")));

	return true;
}

#endif
```

# Hints

- Find the line in the loop that reads other teams' scores, then ask which of those scores have already been changed by the time it runs for the third team.
- The leader can be found once, before the loop, from scores nobody has touched yet; each team's new score goes into a second array, and the arrays trade places after the loop.
- No new engine API is needed beyond `Swap` from `Templates/UnrealTemplate.h`, used the same way as on the straw floor.

# Rubric

- Every rule in a round reads only the standings as they were when the round began.
- New scores are written into a second array, which becomes the standings with one swap after the round.
- The result is the same with bScoreInReverse on or off, and plain rounds score exactly as before.
- Public names and defaults are unchanged; the label shows the standings after the round.
- No score is written back into the array being read during the round.

# Alternative

For three teams, finding the leader once before the loop and keeping the in-place update would also fix this particular round, with no second array. That works only while the leader is the one shared fact the rules read. The first time a designer adds a rule that reads another team's score (a rivalry bonus, a "closest team" penalty), the in-place loop breaks again in a new way. Building a second copy settles the question for every rule at once, for the cost of one more small array.
