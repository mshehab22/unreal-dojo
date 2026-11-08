#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DojoS5WavePlan.generated.h"

class UCurveFloat;

/** The shape of one night in the pit, kept in an asset so designers make a harder night without code; the director reads every number from it. */
UCLASS(BlueprintType)
class UDojoS5WavePlan : public UDataAsset
{
	GENERATED_BODY()

public:
	/** How many beetles the first wave holds. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 BaseCount = 3;

	/** Multiplies the base count by wave number; 1 at wave 1 and 2 at wave 5 doubles the last wave. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves")
	TObjectPtr<UCurveFloat> CountScale = nullptr;

	/** Seconds between two spawn attempts while a wave runs. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "0.1"))
	float SpawnInterval = 1.f;

	/** The most beetles that may be loose at once. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 MaxAlive = 3;

	/** Seconds of rest between a cleared wave and the next one. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "0.0"))
	float RestSeconds = 3.f;

	/** The last wave of the night. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Waves", meta = (ClampMin = "1"))
	int32 FinalWave = 5;

	/** How many beetles this wave holds: the base count scaled by the curve and rounded, at least 1; 0 before wave 1. */
	UFUNCTION(BlueprintPure, Category = "Waves")
	int32 GetBeetleCount(int32 Wave) const;

	/** True when this wave is the last of the night. */
	UFUNCTION(BlueprintPure, Category = "Waves")
	bool IsFinalWave(int32 Wave) const;
};
