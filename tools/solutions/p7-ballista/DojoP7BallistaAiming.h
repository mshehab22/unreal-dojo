#pragma once

#include "CoreMinimal.h"
#include "DojoP7BallistaState.h"
#include "DojoP7BallistaAiming.generated.h"

/** The ballista swinging onto its target; it owns how far the aim has come and only fires once the aim is complete. */
UCLASS()
class UDojoP7BallistaAiming : public UDojoP7BallistaState
{
	GENERATED_BODY()

public:
	/** Called each time the ballista starts aiming. */
	virtual void Enter(ADojoP7Ballista* Ballista) override;

	/** Brings the aim closer, taking the ballista's AimSeconds for a full aim. */
	virtual void TickState(ADojoP7Ballista* Ballista, float DeltaSeconds) override;

	/** Losing the target drops back to idle. */
	virtual void OnTargetLost(ADojoP7Ballista* Ballista) override;

	/** With the aim complete, shoots a bolt and starts reloading; before that, the order is ignored. */
	virtual void OnFireOrder(ADojoP7Ballista* Ballista) override;

	/** Shows "Aiming" and the aim as a percentage. */
	virtual FString GetLabelText() const override;

	/** How far the aim has come, from 0 to 1. */
	float GetAimProgress() const;

private:
	float AimProgress = 0.f;
};
