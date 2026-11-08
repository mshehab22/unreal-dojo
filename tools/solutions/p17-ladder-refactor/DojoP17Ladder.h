#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP17Ladder.generated.h"

/** The dojo ladder: every bout score is kept, and a fighter's rating is the sum of the best three, worked out only when it is asked for after a change. Dirty Flag pattern. */
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
	void Recompute() const;

	/** Every bout score, in the order they were recorded. */
	UPROPERTY()
	TArray<int32> Scores;

	/** The rating last worked out; only trusted while the ladder is not marked dirty. */
	mutable int32 Rating = 0;

	/** True when a score has been added or removed since the rating was worked out. */
	mutable bool bRatingDirty = true;

	/** Times the rating has been worked out. */
	mutable int32 RecomputeCount = 0;
};
