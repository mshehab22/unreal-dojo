#pragma once

#include "CoreMinimal.h"
#include "Quests/p8-trap-family/DojoP8TrapBase.h"
#include "DojoP23FrostVent.generated.h"

/** A vent that bursts cold over everyone close to it. It is a new kind of trap that overrides one function and uses only the tools the trap base gives it. Subclass Sandbox pattern. */
UCLASS()
class ADojoP23FrostVent : public ADojoP8TrapBase
{
	GENERATED_BODY()

public:
	/** How close a fighter must stand to be chilled. */
	UPROPERTY(EditAnywhere, Category = "Frost", meta = (ClampMin = "0"))
	float FrostRadius = 120.f;

	/** Damage each burst does to a fighter in reach. */
	UPROPERTY(EditAnywhere, Category = "Frost", meta = (ClampMin = "0"))
	float FrostDamage = 10.f;

protected:
	/** Plays the cue and chills everyone close. */
	virtual void Trigger() override;
};
