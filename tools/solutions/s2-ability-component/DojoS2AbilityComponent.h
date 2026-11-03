#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/TimerHandle.h"
#include "GameplayTagContainer.h"
#include "DojoS2AbilityComponent.generated.h"

class UDojoS2AbilityComponent;
class UDojoS2AbilityData;
class UDojoS2EnergyComponent;

/** Broadcast after an ability started, with the component and the ability that started. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS2OnAbilityActivated, UDojoS2AbilityComponent*, Abilities, UDojoS2AbilityData*, Ability);

/** Broadcast after an ability's cooldown started or ended, with the component and the ability. */
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FDojoS2OnCooldownChanged, UDojoS2AbilityComponent*, Abilities, UDojoS2AbilityData*, Ability);

/** The abilities an actor has been granted (the Component pattern): it decides whether one may start, pays its energy, runs its cooldown and its tags on timers, and announces each start and each cooldown change like the sender in the Observer pattern. */
UCLASS(ClassGroup = (Dojo), meta = (BlueprintSpawnableComponent))
class UDojoS2AbilityComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	/** Turns ticking off; cooldowns and runs end on timers. */
	UDojoS2AbilityComponent();

	/** Fires once for every ability that starts, after its energy, cooldown, and tags are in place. */
	UPROPERTY(BlueprintAssignable, Category = "Abilities")
	FDojoS2OnAbilityActivated OnAbilityActivated;

	/** Fires when an ability's cooldown starts and again when it ends. */
	UPROPERTY(BlueprintAssignable, Category = "Abilities")
	FDojoS2OnCooldownChanged OnCooldownChanged;

	/** Chooses the energy pool that ability costs are paid from. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	void UseEnergy(UDojoS2EnergyComponent* NewEnergy);

	/** Gives the user an ability; false for null or one it already has. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	bool Grant(UDojoS2AbilityData* Ability);

	/** True when the ability has been granted. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool HasAbility(UDojoS2AbilityData* Ability) const;

	/** True when the ability is granted, not cooling down, not running, not blocked by the user's tags, and affordable. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool CanActivate(UDojoS2AbilityData* Ability) const;

	/** Starts the ability if it can start: pays its energy, starts its cooldown, puts its tags on the user for its run, and announces it. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	bool TryActivate(UDojoS2AbilityData* Ability);

	/** True while the ability is cooling down. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool IsOnCooldown(UDojoS2AbilityData* Ability) const;

	/** Seconds until the ability may start again, or 0 when it is not cooling down. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	float GetCooldownRemaining(UDojoS2AbilityData* Ability) const;

	/** True while the ability's run has not ended. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	bool IsRunning(UDojoS2AbilityData* Ability) const;

	/** The tags the user carries now, from every ability that is running. */
	UFUNCTION(BlueprintPure, Category = "Abilities")
	FGameplayTagContainer GetActiveTags() const;

	/** Ends every cooldown and every run at once, for a new round, announcing each cooldown that ended. */
	UFUNCTION(BlueprintCallable, Category = "Abilities")
	void ResetAll();

protected:
	/** Stops every timer the component started. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** The cooldown of one ability is over. */
	void EndCooldown(UDojoS2AbilityData* Ability);

	/** The run of one ability is over, so its tags leave the user. */
	void EndRun(UDojoS2AbilityData* Ability);

	UPROPERTY()
	TObjectPtr<UDojoS2EnergyComponent> Energy = nullptr;

	UPROPERTY()
	TArray<TObjectPtr<UDojoS2AbilityData>> Granted;

	UPROPERTY()
	TMap<TObjectPtr<UDojoS2AbilityData>, FTimerHandle> CooldownTimers;

	UPROPERTY()
	TMap<TObjectPtr<UDojoS2AbilityData>, FTimerHandle> RunTimers;

	UPROPERTY()
	FGameplayTagContainer ActiveTags;
};
