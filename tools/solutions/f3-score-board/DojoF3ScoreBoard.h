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
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Board", meta = (ClampMin = "1"))
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
	UPROPERTY(VisibleInstanceOnly, Category = "Board")
	TArray<int32> Scores;
};
