#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "DojoF4TargetRegistry.generated.h"

/** One per world: keeps the actors that registered themselves and answers which one is nearest. */
UCLASS()
class UDojoF4TargetRegistry : public UWorldSubsystem
{
	GENERATED_BODY()

public:
	/** Adds Actor once; ignores invalid actors. */
	UFUNCTION(BlueprintCallable, Category = "Registry")
	void Register(AActor* Actor);

	/** Removes Actor if it is registered. */
	UFUNCTION(BlueprintCallable, Category = "Registry")
	void Unregister(AActor* Actor);

	/** True while Actor is registered. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	bool IsRegistered(const AActor* Actor) const;

	/** How many actors are registered. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	int32 GetRegisteredCount() const;

	/** The registered actor nearest to From within MaxRange; on equal distance the one registered first wins; nullptr when none is in range. */
	UFUNCTION(BlueprintPure, Category = "Registry")
	AActor* FindNearest(FVector From, float MaxRange) const;

private:
	/** Oldest registration first. */
	UPROPERTY()
	TArray<TObjectPtr<AActor>> Registered;
};
