#pragma once

#include "CoreMinimal.h"
#include "DojoS1ItemData.h"
#include "DojoS1ItemStack.generated.h"

/** A pile of one kind of item, as it sits in a bag slot. */
USTRUCT(BlueprintType)
struct FDojoS1ItemStack
{
	GENERATED_BODY()

	/** What kind of item the pile holds. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stack")
	TObjectPtr<UDojoS1ItemData> Item = nullptr;

	/** How many are in the pile. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stack")
	int32 Count = 0;

	/** True when the pile has no item or no count. */
	bool IsEmpty() const
	{
		return Item == nullptr || Count <= 0;
	}

	/** How many more of the same item this pile can take before its slot is full. */
	int32 SpaceLeft() const
	{
		return Item == nullptr ? 0 : FMath::Max(0, Item->GetStackLimit() - Count);
	}
};
