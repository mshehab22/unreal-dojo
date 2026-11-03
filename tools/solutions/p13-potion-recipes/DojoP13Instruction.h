#pragma once

#include "CoreMinimal.h"
#include "DojoP13Stats.h"
#include "DojoP13Instruction.generated.h"

/** What one step of a potion recipe does. */
UENUM(BlueprintType)
enum class EDojoP13Op : uint8
{
	/** Puts Number on top of the stack. */
	PushNumber,
	/** Puts the value of Stat on top of the stack. */
	ReadStat,
	/** Takes the top value off the stack and stores it in Stat. */
	WriteStat,
	/** Takes two values off the stack and puts back their sum. */
	Add,
	/** Takes two values off the stack and puts back their product. */
	Multiply
};

/** One step of a potion recipe, edited as a row in the Details panel. */
USTRUCT(BlueprintType)
struct FDojoP13Instruction
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe")
	EDojoP13Op Op = EDojoP13Op::PushNumber;

	/** The number PushNumber puts on the stack. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe", meta = (EditCondition = "Op == EDojoP13Op::PushNumber", EditConditionHides))
	int32 Number = 0;

	/** The stat ReadStat and WriteStat use. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Recipe", meta = (EditCondition = "Op == EDojoP13Op::ReadStat || Op == EDojoP13Op::WriteStat", EditConditionHides))
	EDojoP13Stat Stat = EDojoP13Stat::Health;
};
