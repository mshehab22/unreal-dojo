#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExTickLantern.generated.h"

class UPointLightComponent;

UCLASS()
class ADojoExTickLantern : public AActor
{
	GENERATED_BODY()

public:
	ADojoExTickLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float FlickerInterval = 1.5f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

	int32 GetFlickerCount() const { return FlickerCount; }

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
	void Flicker();

	FTimerHandle FlickerHandle;
	int32 FlickerCount = 0;
};
