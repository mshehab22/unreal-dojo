#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS1EquipmentSpy.generated.h"

class UDojoS1EquipmentComponent;

/** A listener that counts an equipment component's change notices and remembers the power it read at the last one; it only subscribes. */
UCLASS()
class UDojoS1EquipmentSpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the equipment's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Equipment Spy")
	void Watch(UDojoS1EquipmentComponent* Wearer);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Equipment Spy")
	int32 GetNoticeCount() const;

	/** The total power read from the equipment at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Equipment Spy")
	int32 GetPowerAtLastNotice() const;

private:
	/** Counts the notice and reads the power from the equipment that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS1EquipmentComponent* Equipment);

	int32 NoticeCount = 0;
	int32 PowerAtLastNotice = 0;
};
