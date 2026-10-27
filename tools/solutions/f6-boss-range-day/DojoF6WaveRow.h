#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "DojoF6WaveRow.generated.h"

/** One row of the wave table: which kind of target the wave uses and how many. Rows play in table order. */
USTRUCT(BlueprintType)
struct FDojoF6WaveRow : public FTableRowBase
{
	GENERATED_BODY()

	/** The target table row every target in this wave is made from. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave")
	FName TargetKind;

	/** Targets in the wave. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave", meta = (ClampMin = "1"))
	int32 Count = 1;
};
