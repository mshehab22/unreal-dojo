#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLantern.generated.h"

class UPointLightComponent;

UCLASS()
class ADojoExLantern : public AActor
{
	GENERATED_BODY()

public:
	ADojoExLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.0"))
	float Brightness = 8.f;

protected:
	virtual void BeginPlay() override;
};
