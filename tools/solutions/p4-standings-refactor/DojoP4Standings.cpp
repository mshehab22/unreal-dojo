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
	// Every rule reads Scores, which stays as it was when the round began; the new standings are built in NextScores.
	const int32 Leader = HighestScore();
	NextScores.SetNum(Scores.Num());

	for (int32 Visit = 0; Visit < Scores.Num(); ++Visit)
	{
		const int32 Team = bScoreInReverse ? Scores.Num() - 1 - Visit : Visit;
		const int32 Hits = RoundHits.IsValidIndex(Team) ? RoundHits[Team] : 0;
		const bool bFarBehind = Leader - Scores[Team] >= CatchUpGap;

		NextScores[Team] = Scores[Team] + Hits * PointsPerHit + (bFarBehind ? CatchUpBonus : 0);
	}

	Swap(Scores, NextScores);

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
