#pragma once

#include "CoreMinimal.h"
#include "DojoP21Critter.h"
#include "DojoP21SpawnEntry.generated.h"

/** One row of a wave: which class of critter to make, and at what level. */
USTRUCT(BlueprintType)
struct FDojoP21SpawnEntry
{
	GENERATED_BODY()

	/** The class to spawn; a designer picks it from a list of critter classes in the Details panel. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawn")
	TSubclassOf<ADojoP21Critter> CritterClass; // @explain: TSubclassOf limits the picker to the critter base and its children, so the class is data that a designer chooses and the spawner's code never names a kind.

	/** The level the new critter starts with; anything below 1 is treated as 1. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Spawn")
	int32 Level = 1;
};
