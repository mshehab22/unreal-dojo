#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExFlickerLantern.generated.h"

class UPointLightComponent;

UCLASS()
class ADojoExFlickerLantern : public AActor
{
	GENERATED_BODY()

public:
	ADojoExFlickerLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.1"))
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	void Flicker();
	void Restore();

	FTimerHandle FlickerHandle;
	FTimerHandle RestoreHandle;
};
