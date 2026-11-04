#pragma once

#include "CoreMinimal.h"
#include "DojoP20Candidate.generated.h"

/** One practice dummy as a targeting rule sees it: its name, where it stands, and how much health it has left. */
USTRUCT(BlueprintType)
struct FDojoP20Candidate
{
	GENERATED_BODY()

	/** The dummy's name. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	FName Name = NAME_None;

	/** Where the dummy stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	FVector Location = FVector::ZeroVector;

	/** Health left; a dummy at 0 or below is down and is not a target. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Candidate")
	int32 Health = 30;
};
