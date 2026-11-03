#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GameplayTagContainer.h"
#include "DojoS2AbilityData.generated.h"

class UDojoS2Effect;

/** One ability, kept in an asset so designers add and tune abilities without code; the ability component reads it and never copies its numbers (the Type Object pattern). */
UCLASS(BlueprintType)
class UDojoS2AbilityData : public UDataAsset
{
	GENERATED_BODY()

public:
	/** The name shown to the player. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FText DisplayName;

	/** Energy spent each time the ability starts; 0 means it is free. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0"))
	int32 EnergyCost = 0;

	/** Seconds after a start before the ability can start again; 0 means no wait. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0.0"))
	float Cooldown = 0.f;

	/** Seconds the ability runs after it starts; its granted tags stay on the user that long. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability", meta = (ClampMin = "0.0"))
	float Duration = 0.f;

	/** Tags the user carries while the ability runs. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FGameplayTagContainer GrantedTags;

	/** The ability cannot start while the user carries any of these tags, or a tag below one of them. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Ability")
	FGameplayTagContainer BlockedByTags;

	/** What happens when the ability starts, edited inside the asset; added for the sparring ring. */
	UPROPERTY(EditAnywhere, Instanced, BlueprintReadOnly, Category = "Ability")
	TArray<TObjectPtr<UDojoS2Effect>> Effects;

	/** The cooldown in seconds, never below 0, even when an old asset or code holds a negative number. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	float GetCooldownSeconds() const;

	/** The run time in seconds, never below 0. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	float GetDurationSeconds() const;

	/** True when a user carrying these tags may not start the ability. */
	UFUNCTION(BlueprintPure, Category = "Ability")
	bool IsBlockedBy(const FGameplayTagContainer& UserTags) const;
};
