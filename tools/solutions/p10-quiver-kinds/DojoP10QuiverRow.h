#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "DojoP10QuiverRow.generated.h"

class ADojoP10Quiver;

/** One kind of quiver as a data table row: the numbers every quiver of this kind shares. Type Object pattern. */
USTRUCT(BlueprintType)
struct FDojoP10QuiverRow : public FTableRowBase
{
	GENERATED_BODY()

	/** The name shown above quivers of this kind. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind")
	FText DisplayName = FText::FromString(TEXT("Hunting Quiver"));

	/** Arrows a full quiver of this kind holds. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind", meta = (ClampMin = "1"))
	int32 ArrowCount = 6;

	/** Damage of one arrow of this kind. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind", meta = (ClampMin = "0.0"))
	float ArrowDamage = 12.f;

	/** The quiver actor to hand out for this kind, such as a Blueprint child with its own mesh; empty means the plain quiver. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Quiver Kind")
	TSubclassOf<ADojoP10Quiver> QuiverClass;
};
