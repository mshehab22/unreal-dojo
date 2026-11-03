#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP22SpikeTrap.generated.h"

/** A floor trap that springs on whoever steps on it and counts how often it sprang. It reports how a spring looked and sounded through the hit feedback facade. */
UCLASS()
class ADojoP22SpikeTrap : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP22SpikeTrap();

	/** Springs on Victim for Damage: counts it and plays its feedback at the victim. */
	UFUNCTION(BlueprintCallable, Category = "Trap")
	void Spring(AActor* Victim, float Damage);

	/** Times the trap sprang. */
	UFUNCTION(BlueprintPure, Category = "Trap")
	int32 GetSprings() const;

private:
	/** Times the trap sprang. */
	int32 Springs = 0;
};
