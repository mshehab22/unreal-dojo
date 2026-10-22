#pragma once

#include "CoreMinimal.h"
#include "DojoP8TrapBase.h"
#include "DojoP8FlameJet.generated.h"

/** A jet of flame that singes fighters in a wide circle and drives them back; with nobody in reach it only sputters. */
UCLASS()
class ADojoP8FlameJet : public ADojoP8TrapBase
{
	GENERATED_BODY()

public:
	/** How far the flame reaches. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float FlameRadius = 300.f;

	/** Damage the flame does to each fighter in reach. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float FlameDamage = 10.f;

	/** How far the blast drives fighters back. */
	UPROPERTY(EditAnywhere, Category = "Flame", meta = (ClampMin = "0"))
	float PushDistance = 200.f;

protected:
	/** Roars, singes everyone in reach, and pushes them back; sputters when nobody was in reach. */
	virtual void Trigger() override;
};
