#pragma once

#include "CoreMinimal.h"
#include "Quests/p8-trap-family/DojoP8TrapBase.h"
#include "DojoP23HallPlans.generated.h"

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

/** One fighter of the hall as the designer sets it up: where it stands and how much health it starts with. */
USTRUCT(BlueprintType)
struct FDojoP23HallFighterPlan
{
	GENERATED_BODY()

	/** Where the fighter stands. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter")
	FVector Location = FVector::ZeroVector;

	/** The health the fighter starts every round with. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Fighter", meta = (ClampMin = "1.0"))
	float StartHealth = 100.f;
};
