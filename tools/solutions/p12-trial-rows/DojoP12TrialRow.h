#pragma once

#include "CoreMinimal.h"
#include "DojoP12TrialRow.generated.h"

/** One trial in the hall's book: its own numbers, and the trial it borrows the rest from. A number below zero means this row does not set it. */
USTRUCT(BlueprintType)
struct FDojoP12TrialRow
{
	GENERATED_BODY()

	/** The trial's name, such as Swift. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial")
	FName TrialName = NAME_None;

	/** The trial this one borrows from; none for a trial that stands alone. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial")
	FName ParentName = NAME_None;

	/** Blades on the course, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1"))
	int32 BladeCount = -1;

	/** How fast the blades swing, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1.0"))
	float SwingSpeed = -1.f;

	/** Seconds allowed, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1.0"))
	float TimeLimit = -1.f;

	/** Reward for finishing, or below zero when this row does not set it. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trial", meta = (ClampMin = "-1"))
	int32 Reward = -1;
};
