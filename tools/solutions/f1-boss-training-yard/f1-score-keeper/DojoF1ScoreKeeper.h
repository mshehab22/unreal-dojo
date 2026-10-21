#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoF1ScoreKeeper.generated.h"

class UTextRenderComponent;

/** Totals the yard's score from the targets a designer wired to it; the targets know nothing about the keeper. This boss version subtracts misses. */
UCLASS()
class ADojoF1ScoreKeeper : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking off. */
	ADojoF1ScoreKeeper();

	/** Floating text that shows the score after ShowScore. */
	UPROPERTY(VisibleAnywhere, Category = "Score")
	TObjectPtr<UTextRenderComponent> Label;

	/** Anything a designer picks in the level; only dummies and pop-up targets score. */
	UPROPERTY(EditAnywhere, Category = "Score")
	TArray<TObjectPtr<AActor>> Targets;

	/** Points for every strike a dummy has taken. */
	UPROPERTY(EditAnywhere, Category = "Score", meta = (ClampMin = "0"))
	int32 PointsPerDummyHit = 5;

	/** Points for every pop-up target that is broken. */
	UPROPERTY(EditAnywhere, Category = "Score", meta = (ClampMin = "0"))
	int32 PointsPerBrokenTarget = 25;

	/** Points lost for every miss on a pop-up target. */
	UPROPERTY(EditAnywhere, Category = "Score", meta = (ClampMin = "0"))
	int32 PointsPerMiss = 5;

	/** Adds up dummy strikes and broken targets, subtracts every miss, and never goes below 0; skips empty slots and every other kind of actor. */
	UFUNCTION(BlueprintPure, Category = "Score")
	int32 CountScore() const;

	/** How many entries are pop-up targets, in any state. */
	UFUNCTION(BlueprintPure, Category = "Score")
	int32 CountPopupTargets() const;

	/** Writes the current score into the label. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Score")
	void ShowScore();
};
