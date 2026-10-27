#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoP10LanternKind.generated.h"

/** One kind of arena lantern as an asset: the numbers every lantern of this kind shares. Type Object pattern. */
UCLASS(BlueprintType)
class UDojoP10LanternKind : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown above lanterns of this kind. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Lantern Kind")
	FText DisplayName = FText::FromString(TEXT("Oil Lantern"));

	/** Seconds a full lantern of this kind burns. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Lantern Kind", meta = (ClampMin = "0.1"))
	float FuelSeconds = 30.f;

	/** Color of the lantern's label while lit. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Lantern Kind")
	FColor GlowColor = FColor::Orange;
};
