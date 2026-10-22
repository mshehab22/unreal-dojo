#pragma once

#include "CoreMinimal.h"
#include "DojoP8HazardBase.h"
#include "DojoP8NetLauncher.generated.h"

/** A launcher that throws a weighted net over fighters in a wide circle. */
UCLASS()
class ADojoP8NetLauncher : public ADojoP8HazardBase
{
	GENERATED_BODY()

public:
	/** Sets the launcher's cooldown. */
	ADojoP8NetLauncher();

	/** How far the net reaches. */
	UPROPERTY(EditAnywhere, Category = "Net", meta = (ClampMin = "0"))
	float NetRadius = 250.f;

	/** Damage the net's weights do. */
	UPROPERTY(EditAnywhere, Category = "Net", meta = (ClampMin = "0"))
	float NetDamage = 5.f;

protected:
	/** Throws the net over everyone in reach. */
	virtual void OnUnleash() override;
};
