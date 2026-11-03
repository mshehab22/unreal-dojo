#pragma once

#include "CoreMinimal.h"
#include "Quests/s2-effects/DojoS2Effect.h"
#include "DojoS2RefillEffect.generated.h"

/** Fills the user's energy pool to the top; a third kind in the effect family, written with the same single hook. */
UCLASS()
class UDojoS2RefillEffect : public UDojoS2Effect
{
	GENERATED_BODY()

protected:
	/** Refills the energy component the user carries, if it has one. */
	virtual void OnApply(AActor* User) override;
};
