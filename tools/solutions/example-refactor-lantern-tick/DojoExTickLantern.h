#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExTickLantern.generated.h"

class UPointLightComponent;

/** A lantern that flickers on a fixed rhythm. */
UCLASS()
class ADojoExTickLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the light component. */
	ADojoExTickLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

	/** How many times the lantern has flickered, read by the tests. */
	int32 GetFlickerCount() const { return FlickerCount; }

protected:
	/** Starts the looping flicker timer. */
	virtual void BeginPlay() override;
	/** Clears the flicker timer before the actor leaves play. */
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	/** Counts a flicker and alternates the light between dim and full. */
	void Flicker();

	FTimerHandle FlickerHandle;
	int32 FlickerCount = 0;
};
