#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoP12Charm.generated.h"

/** A small charm a challenger carries: one number saying how strong its bonus is. */
UCLASS(Blueprintable, BlueprintType)
class UDojoP12Charm : public UObject
{
	GENERATED_BODY()

public:
	/** How strong the charm's bonus is. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Charm")
	float Strength = 1.f;
};
