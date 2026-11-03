#pragma once

#include "CoreMinimal.h"
#include "Quests/p13-potion-recipes/DojoP13Stats.h"
#include "DojoP13CheckStep.generated.h"

/** What one step of a door's condition does. Comparisons and logic put back 1 for true and 0 for false. */
UENUM(BlueprintType)
enum class EDojoP13CheckOp : uint8
{
	/** Puts Number on top of the stack. */
	ECO_PushNumber UMETA(DisplayName = "Push Number"),
	/** Puts the value of Stat on top of the stack. */
	ECO_ReadStat UMETA(DisplayName = "Read Stat"),
	/** Takes two values and puts back whether they are equal. */
	ECO_Equal UMETA(DisplayName = "Equal"),
	/** Takes two values and puts back whether the first written is less than the second. */
	ECO_Less UMETA(DisplayName = "Less"),
	/** Takes two values and puts back whether the first written is greater than the second. */
	ECO_Greater UMETA(DisplayName = "Greater"),
	/** Takes two values and puts back whether both are true. */
	ECO_And UMETA(DisplayName = "And"),
	/** Takes two values and puts back whether either is true. */
	ECO_Or UMETA(DisplayName = "Or"),
	/** Takes one value and puts back its opposite. */
	ECO_Not UMETA(DisplayName = "Not")
};

/** One step of a door's condition, edited as a row in the Details panel. */
USTRUCT(BlueprintType)
struct FDojoP13CheckStep
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition")
	EDojoP13CheckOp Op = EDojoP13CheckOp::ECO_PushNumber;

	/** The number PushNumber puts on the stack. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::ECO_PushNumber", EditConditionHides))
	int32 Number = 0;

	/** The stat ReadStat reads. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Condition", meta = (EditCondition = "Op == EDojoP13CheckOp::ECO_ReadStat", EditConditionHides))
	EDojoP13Stat Stat = EDojoP13Stat::ES_Health;
};
