#include "DojoP20FarthestRule.h"

int32 UDojoP20FarthestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	int32 Best = INDEX_NONE;
	double BestDistance = 0.0;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		// Strictly farther only, so on a tie the earlier dummy keeps its place.
		const double Distance = FVector::DistSquared(From, Candidates[Index].Location);
		if (Best == INDEX_NONE || Distance > BestDistance)
		{
			Best = Index;
			BestDistance = Distance;
		}
	}

	return Best;
}
