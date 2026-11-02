#pragma once

#include "CoreMinimal.h"
#include "DojoP12TrialRow.generated.h"

/** One trial in the hall's book: its own numbers, and the trial it borrows the rest from. A number below zero means this row does not set it. Prototype pattern, data form. */
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

	/** Takes from Parent every number this row does not set. */
	void BorrowUnsetFrom(const FDojoP12TrialRow& Parent)
	{
		if (BladeCount < 0) BladeCount = Parent.BladeCount;
		if (SwingSpeed < 0.f) SwingSpeed = Parent.SwingSpeed;
		if (TimeLimit < 0.f) TimeLimit = Parent.TimeLimit;
		if (Reward < 0) Reward = Parent.Reward;
	}

	/** Turns every number that is still unset into 0. */
	void ZeroUnset()
	{
		BladeCount = FMath::Max(BladeCount, 0);
		SwingSpeed = FMath::Max(SwingSpeed, 0.f);
		TimeLimit = FMath::Max(TimeLimit, 0.f);
		Reward = FMath::Max(Reward, 0);
	}
};
