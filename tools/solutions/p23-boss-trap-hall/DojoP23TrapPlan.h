#pragma once

#include "CoreMinimal.h"
#include "Quests/p8-trap-family/DojoP8TrapBase.h"
#include "DojoP23TrapPlan.generated.h"

/** One trap of the hall as the designer sets it up: which kind, where it stands, and how long it rests after springing. */
USTRUCT(BlueprintType)
struct FDojoP23TrapPlan
{
	GENERATED_BODY()

	/** The class of the trap; any non-abstract child of the trap base will do. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trap")
	TSubclassOf<ADojoP8TrapBase> TrapClass;

	/** Where the trap stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trap")
	FVector Location = FVector::ZeroVector;

	/** Seconds the trap rests after springing. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Trap", meta = (ClampMin = "0.1"))
	float RestSeconds = 1.5f;
};
