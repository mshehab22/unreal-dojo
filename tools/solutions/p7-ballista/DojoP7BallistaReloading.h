#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaReloading.generated.h"

/** The crew winding the ballista back; it owns the time left and then returns to aiming, or to idle if the target is gone. */
UCLASS()
class UDojoP7BallistaReloading : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** Called each time a reload starts. */
	virtual void Enter(ADojoP7Ballista* Ballista) override;

	/** Counts the reload down, then aims again if a target is in view, or rests if not. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds) override;

	/** Shows "Reloading". */
	virtual FString GetLabelText() const override;

	/** Seconds until the reload is done. */
	float GetSecondsLeft() const;

private:
	float SecondsLeft = 0.f;
};
