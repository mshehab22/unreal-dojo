#pragma once

#include "CoreMinimal.h"
#include "DojoP17GuardBuff.generated.h"

/** One temporary bonus to a fighter's guard, named by an id so it can be removed later. */
USTRUCT(BlueprintType)
struct FDojoP17GuardBuff
{
	GENERATED_BODY()

	/** The id the buff was given when it was added; never reused. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Buff")
	int32 BuffId = 0;

	/** How much guard the buff adds. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Buff")
	int32 Amount = 0;
};
