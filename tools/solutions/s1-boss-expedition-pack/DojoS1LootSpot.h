#pragma once

#include "CoreMinimal.h"
#include "Quests/s1-item-data/DojoS1ItemData.h"
#include "DojoS1LootSpot.generated.h"

/** One place where a pile of loose items waits at the start of every round. */
USTRUCT(BlueprintType)
struct FDojoS1LootSpot
{
	GENERATED_BODY()

	/** The kind of item in the pile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot")
	TObjectPtr<UDojoS1ItemData> Item = nullptr;

	/** How many items are in the pile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot", meta = (ClampMin = "1"))
	int32 Count = 1;

	/** Where the pile lies. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loot")
	FVector Location = FVector::ZeroVector;
};
