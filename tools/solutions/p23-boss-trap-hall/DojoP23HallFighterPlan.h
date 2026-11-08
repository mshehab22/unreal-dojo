#pragma once

#include "CoreMinimal.h"
#include "DojoP23HallFighterPlan.generated.h"

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
