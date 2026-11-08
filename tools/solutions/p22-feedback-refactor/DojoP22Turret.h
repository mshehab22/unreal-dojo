#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP22Turret.generated.h"

/** A training turret that shoots at a target and counts its shots. It reports how a shot looked and sounded through the hit feedback facade. */
UCLASS()
class ADojoP22Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP22Turret();

	/** A shot that hits Target for Damage: counts it and plays its feedback at the target. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	void FireAt(AActor* Target, float Damage);

	/** A shot that hits nothing, landing at Where: counts it and plays the miss feedback there. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	void FireAndMiss(FVector Where);

	/** Shots fired. */
	UFUNCTION(BlueprintPure, Category = "Turret")
	int32 GetShots() const;

private:
	/** Shots fired. */
	int32 Shots = 0;
};
