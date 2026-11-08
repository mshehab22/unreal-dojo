#include "DojoP20WeakestRule.h"

int32 UDojoP20WeakestRule::ChooseTarget(const FVector& From, const TArray<FDojoP20Candidate>& Candidates) const
{
	int32 Best = INDEX_NONE;

	for (int32 Index = 0; Index < Candidates.Num(); Index++)
	{
		if (Candidates[Index].Health <= 0) continue;

		// Strictly weaker only, so on a tie the earlier dummy keeps its place.
		if (Best == INDEX_NONE || Candidates[Index].Health < Candidates[Best].Health) Best = Index;
	}

	return Best;
}
