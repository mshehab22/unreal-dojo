#pragma once

#include "CoreMinimal.h"
#include "DojoP23ScriptedStrike.generated.h"

/** One blow of the night's script: on which turn, who strikes, who is struck, and for how much. */
USTRUCT(BlueprintType)
struct FDojoP23ScriptedStrike
{
	GENERATED_BODY()

	/** The turn the blow lands on, counting from 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Strike", meta = (ClampMin = "1"))
	int32 Turn = 1;

	/** The fighter who strikes; a blow from a fighter who is already out does nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Strike")
	FName Attacker = NAME_None;

	/** The fighter who is struck; a blow at a fighter who is already out does nothing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Strike")
	FName Target = NAME_None;

	/** The health the blow takes away. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Strike", meta = (ClampMin = "1.0"))
	float Damage = 10.f;
};
