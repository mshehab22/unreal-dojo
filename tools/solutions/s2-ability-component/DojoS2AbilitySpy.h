#pragma once

#include "CoreMinimal.h"
#include "GameplayTagContainer.h"
#include "UObject/Object.h"
#include "DojoS2AbilitySpy.generated.h"

class UDojoS2AbilityComponent;
class UDojoS2AbilityData;

/** A listener that counts an ability component's notices and records what the component reported when the last start arrived; it only subscribes. */
UCLASS()
class UDojoS2AbilitySpy : public UObject
{
	GENERATED_BODY()

public:
	/** Starts listening to the component's starts and cooldown changes, once however many times it is called. */
	UFUNCTION(BlueprintCallable, Category = "Ability Spy")
	void Watch(UDojoS2AbilityComponent* Abilities);

	/** How many start notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	int32 GetStartCount() const;

	/** How many cooldown notices have arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	int32 GetCooldownNoticeCount() const;

	/** The ability named by the last start notice. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	UDojoS2AbilityData* GetLastStarted() const;

	/** Whether that ability was already cooling down when its start notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	bool WasCoolingAtLastStart() const;

	/** The user's tags when the last start notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	FGameplayTagContainer GetTagsAtLastStart() const;

	/** The energy in the owner's pool when the last start notice arrived, or -1 when the owner has no pool. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	int32 GetEnergyAtLastStart() const;

	/** Whether the ability named by the last cooldown notice was cooling down when that notice arrived. */
	UFUNCTION(BlueprintPure, Category = "Ability Spy")
	bool WasCoolingAtLastCooldownNotice() const;

private:
	/** Counts the start and reads the component's state for that ability and the owner's energy. */
	UFUNCTION()
	void HandleStarted(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	/** Counts the cooldown notice and reads whether that ability is cooling down. */
	UFUNCTION()
	void HandleCooldown(UDojoS2AbilityComponent* Abilities, UDojoS2AbilityData* Ability);

	UPROPERTY()
	TObjectPtr<UDojoS2AbilityData> LastStarted = nullptr;

	FGameplayTagContainer TagsAtLastStart;
	int32 StartCount = 0;
	int32 CooldownNoticeCount = 0;
	int32 EnergyAtLastStart = -1;
	bool bWasCoolingAtLastStart = false;
	bool bWasCoolingAtLastCooldownNotice = false;
};
