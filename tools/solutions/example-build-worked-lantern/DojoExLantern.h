#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExLantern.generated.h"

class UPointLightComponent;

/** A lantern actor whose point light glows at an editable brightness. */
UCLASS()
class ADojoExLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the light component and turns ticking off. */
	ADojoExLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.0"))
	float Brightness = 8.f;

protected:
	/** Applies Brightness to the light when play starts. */
	virtual void BeginPlay() override;
};
