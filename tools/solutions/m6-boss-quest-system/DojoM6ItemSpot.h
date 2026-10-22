#pragma once

#include "CoreMinimal.h"
#include "DojoM6ItemSpot.generated.h"

/** Where one quest item appears at the start of every round, and which kind it is. */
USTRUCT(BlueprintType)
struct FDojoM6ItemSpot
{
	GENERATED_BODY()

	/** The item's tag, such as Tool or Gem. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item Spot")
	FName ItemTag;

	/** Where the item appears, in world space. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Item Spot")
	FVector Location = FVector::ZeroVector;
};
