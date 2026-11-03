#pragma once

#include "CoreMinimal.h"
#include "DojoP13TrapStep.generated.h"

/** What one step of a dart trap's routine does. */
UENUM(BlueprintType)
enum class EDojoP13TrapStepKind : uint8
{
	/** Shoots one dart and goes on to the next step at once. */
	ETSK_Fire UMETA(DisplayName = "Fire"),
	/** Lets Seconds of play pass, then goes on to the next step on the following frame. */
	ETSK_Wait UMETA(DisplayName = "Wait"),
	/** Goes on from the step numbered Target. */
	ETSK_Jump UMETA(DisplayName = "Jump")
};

/** One step of a dart trap's routine: plain data that never changes during play, so many traps can share one routine. Bytecode pattern. */
USTRUCT(BlueprintType)
struct FDojoP13TrapStep
{
	GENERATED_BODY()

	/** What this step does. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine")
	EDojoP13TrapStepKind Kind = EDojoP13TrapStepKind::ETSK_Fire;

	/** How long a Wait step waits. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine", meta = (EditCondition = "Kind == EDojoP13TrapStepKind::ETSK_Wait", EditConditionHides, ClampMin = "0.0"))
	float Seconds = 0.5f;

	/** The step a Jump step goes on from, counting from 0. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Routine", meta = (EditCondition = "Kind == EDojoP13TrapStepKind::ETSK_Jump", EditConditionHides, ClampMin = "0"))
	int32 Target = 0;
};
