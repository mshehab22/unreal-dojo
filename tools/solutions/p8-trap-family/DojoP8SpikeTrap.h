#pragma once

#include "CoreMinimal.h"
#include "DojoP8TrapBase.h"
#include "DojoP8SpikeTrap.generated.h"

/** Spikes that jab every fighter standing close to the trap. */
UCLASS()
class ADojoP8SpikeTrap : public ADojoP8TrapBase
{
	GENERATED_BODY()

public:
	/** How close a fighter must stand to be jabbed. */
	UPROPERTY(EditAnywhere, Category = "Spikes", meta = (ClampMin = "0"))
	float SpikeRadius = 150.f;

	/** Damage each jab does. */
	UPROPERTY(EditAnywhere, Category = "Spikes", meta = (ClampMin = "0"))
	float SpikeDamage = 30.f;

protected:
	/** Raises the spikes: plays the cue and jabs everyone close. */
	virtual void Trigger() override;
};
