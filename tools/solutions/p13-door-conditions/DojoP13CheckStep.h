#pragma once

#include "CoreMinimal.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13CheckStep.generated.h"

/** What one step of a door's condition does. Comparisons and logic put back 1 for true and 0 for false. */
UENUM(BlueprintType)
enum class EDojoP13CheckOp : uint8
{
	/** Puts Number on top of the stack. */
	PushNumber,
	/** Puts the value of Stat on top of the stack. */
	ReadStat,
	/** Takes two values and puts back whether they are equal. */
	Equal,
	/** Takes two values and puts back whether the first written is less than the second. */
	Less,
	/** Takes two values and puts back whether the first written is greater than the second. */
	Greater,
	/** Takes two values and puts back whether both are true. */
	And,
	/** Takes two values and puts back whether either is true. */
	Or,
	/** Takes one value and puts back its opposite. */
	Not
};

/** One step of a door's condition, edited as a row in the Details panel. */
USTRUCT(BlueprintType)
struct FDojoP13CheckStep
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition")
	EDojoP13CheckOp Op = EDojoP13CheckOp::PushNumber;

	/** The number PushNumber puts on the stack. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::PushNumber", EditConditionHides))
	int32 Number = 0;

	/** The stat ReadStat reads. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::ReadStat", EditConditionHides))
	EDojoP13Stat Stat = EDojoP13Stat::Health;
};
