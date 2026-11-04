#include "DojoP17Ladder.h"

void UDojoP17Ladder::AddScore(int32 Score)
{
	Scores.Add(Score);
	bRatingDirty = true;
}

bool UDojoP17Ladder::RemoveScore(int32 Index)
{
	if (!Scores.IsValidIndex(Index)) return false;

	Scores.RemoveAt(Index);
	bRatingDirty = true;
	return true;
}

int32 UDojoP17Ladder::GetRating() const
{
	if (bRatingDirty) Recompute();

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

void UDojoP17Ladder::Recompute() const
{
	TArray<int32> Best = Scores;
	Best.Sort([](const int32& Left, const int32& Right) { return Left > Right; });

	int32 Total = 0;
	for (int32 Place = 0; Place < FMath::Min(3, Best.Num()); Place++) Total += Best[Place];

	Rating = Total;
	RecomputeCount++;
	bRatingDirty = false;
}
