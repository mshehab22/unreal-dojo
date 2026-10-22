#pragma once

#include "CoreMinimal.h"
#include "DojoP8HazardBase.h"
#include "DojoP8BoulderDrop.generated.h"

/** A boulder that drops from the arena wall onto fighters standing right below it. */
UCLASS()
class ADojoP8BoulderDrop : public ADojoP8HazardBase
{
	GENERATED_BODY()

public:
	/** Sets the boulder's cooldown. */
	ADojoP8BoulderDrop();

	/** How close below the boulder a fighter must stand to be hit. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float DropRadius = 120.f;

	/** Damage the boulder does. */
	UPROPERTY(EditAnywhere, Category = "Boulder", meta = (ClampMin = "0"))
	float DropDamage = 40.f;

protected:
	/** Drops the boulder on everyone right below and rumbles. */
	virtual void OnUnleash() override;
};
