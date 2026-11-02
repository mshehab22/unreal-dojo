#pragma once

#include "CoreMinimal.h"
#include "DojoP12TrialRow.h"
#include "GameFramework/Actor.h"
#include "DojoP12TrialBook.generated.h"

/** The hall's book of trials: each row sets a few numbers and borrows the rest from its parent row. Prototype pattern, data form. */
UCLASS()
class ADojoP12TrialBook : public AActor
{
	GENERATED_BODY()

public:
	/** Turns ticking off. */
	ADojoP12TrialBook();

	/** Every trial, in any order. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trials")
	TArray<FDojoP12TrialRow> Rows;

	/** The row called TrialName, or nullptr when there is none. */
	const FDojoP12TrialRow* FindRow(FName TrialName) const;

	/** Fills OutTrial with the trial's final numbers, the row's own where it sets them, the rest from its parent row, and 0 for any number nobody sets; false, leaving OutTrial alone, for an unknown trial or a missing parent. */
	UFUNCTION(BlueprintCallable, Category = "Trials")
	bool Resolve(FName TrialName, FDojoP12TrialRow& OutTrial) const;
};
