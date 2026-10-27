#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "DojoF6TargetRow.generated.h"

/** One row of the target table: how tough one kind of target is and what it is worth. */
USTRUCT(BlueprintType)
struct FDojoF6TargetRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Damage it takes to knock the target down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "0.1"))
	float Health = 1.f;

	/** Points for knocking it down. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Target", meta = (ClampMin = "0"))
	int32 Points = 10;
};
