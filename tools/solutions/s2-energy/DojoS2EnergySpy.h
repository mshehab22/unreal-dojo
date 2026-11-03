#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DojoS2EnergySpy.generated.h"

class UDojoS2EnergyComponent;

/** A listener that counts an energy pool's change notices and remembers the energy it read at the last one; it only subscribes. */
UCLASS()
class UDojoS2EnergySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the pool's changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Energy Spy")
	void Watch(UDojoS2EnergyComponent* Pool);

	/** How many notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Energy Spy")
	int32 GetNoticeCount() const;

	/** The energy read from the pool at the moment the last notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Energy Spy")
	int32 GetEnergyAtLastNotice() const;

private:
	/** Counts the notice and reads the energy from the pool that sent it. */
	UFUNCTION()
	void HandleChanged(UDojoS2EnergyComponent* EnergySource);

	int32 NoticeCount = 0;
	int32 EnergyAtLastNotice = 0;
};
