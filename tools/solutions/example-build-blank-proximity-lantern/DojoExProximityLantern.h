#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExProximityLantern.generated.h"

class UPointLightComponent;
class USphereComponent;

UCLASS()
class ADojoExProximityLantern : public AActor
{
	GENERATED_BODY()

public:
	ADojoExProximityLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<USphereComponent> Sphere;

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.0"))
	float Radius = 300.f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

	bool IsLit() const;

protected:
	virtual void BeginPlay() override;

private:
	UFUNCTION()
	void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	UFUNCTION()
	void HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex);

	void ApplyLight();

	int32 VisitorCount = 0;
};
