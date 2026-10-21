#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExFlickerLantern.generated.h"

class UPointLightComponent;

/** A lantern that dips its light on a looping timer, like a flame in a draft. */
UCLASS()
class ADojoExFlickerLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the light component and turns ticking off. */
	ADojoExFlickerLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.1"))
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

protected:
	/** Lights the lantern and starts the flicker timer. */
	virtual void BeginPlay() override;
	/** Clears both timers before the actor leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Dims the light and schedules the return to full brightness. */
	void Flicker();
	/** Puts the light back to full brightness. */
	void Restore();

	FTimerHandle FlickerHandle;
	FTimerHandle RestoreHandle;
};
