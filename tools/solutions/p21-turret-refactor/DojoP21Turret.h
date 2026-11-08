#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Quests/p21-launchers/DojoP21Bolt.h"
#include "DojoP21Turret.generated.h"

/** A range turret with three ways to fire: an ember bolt, a frost bolt, and a fan of three ember bolts. */
UCLASS()
class ADojoP21Turret : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the scene root and turns ticking off. */
	ADojoP21Turret();

	/** How far in front of the turret a bolt appears. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	float MuzzleDistance = 50.f;

	/** How many degrees to the left and right the outer bolts of a fan turn. */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Turret")
	float FanDegrees = 15.f;

	/** How many bolts this turret has fired in all. */
	UPROPERTY(BlueprintReadOnly, Category = "Turret")
	int32 ShotsFired = 0;

	/** Fires one ember bolt; nullptr when none could be made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	ADojoP21Bolt* FireEmber();

	/** Fires one frost bolt; nullptr when none could be made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	ADojoP21Bolt* FireFrost();

	/** Fires three ember bolts, the left one turned by FanDegrees, the middle one straight, and the right one turned the other way; returns the bolts that were made. */
	UFUNCTION(BlueprintCallable, Category = "Turret")
	TArray<ADojoP21Bolt*> FireSpread();

protected:
	/** Makes one bolt of BoltClass at the muzzle with the turret as its shooter, brought to life and counted; nullptr when none could be made. */
	virtual ADojoP21Bolt* MakeBolt(TSubclassOf<ADojoP21Bolt> BoltClass, const FTransform& Muzzle);
};
