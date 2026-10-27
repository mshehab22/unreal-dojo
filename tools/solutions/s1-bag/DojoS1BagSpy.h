#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS1BagSpy.generated.h"

class UDojoS1InventoryComponent;

/** A listener that counts a bag's change notices and remembers what the bag weighed when the last one arrived; it only subscribes. */
UCLASS()
class UDojoS1BagSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the bag's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Bag Spy")
	void Watch(UDojoS1InventoryComponent* Bag);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Bag Spy")
	int32 GetNoticeCount() const;

	/** The bag's total weight, read at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Bag Spy")
	int32 GetWeightAtLastNotice() const;

private:
	/** Counts the notice and reads the weight from the bag that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS1InventoryComponent* Inventory);

	int32 NoticeCount = 0;
	int32 WeightAtLastNotice = 0;
};
