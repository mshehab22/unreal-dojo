#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoExProximityLantern.generated.h"

class UPointLightComponent;
class USphereComponent;

/** A lantern that lights while any actor with collision is inside its sphere. */
UCLASS()
class ADojoExProximityLantern : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the detection sphere and the light. */
	ADojoExProximityLantern();

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<USphereComponent> Sphere;

	UPROPERTY(VisibleAnywhere, Category = "Lantern")
	TObjectPtr<UPointLightComponent> Light;

	UPROPERTY(EditAnywhere, Category = "Lantern", meta = (ClampMin = "0.0"))
	float Radius = 300.f;

	UPROPERTY(EditAnywhere, Category = "Lantern")
	float Brightness = 8.f;

	/** Whether at least one visitor is inside the sphere. */
	bool IsLit() const;

protected:
	/** Applies the radius, binds the overlap events, and sets the starting light. */
	virtual void BeginPlay() override;

private:
	/** Counts a visitor coming in and updates the light. */
	UFUNCTION()
	void HandleBeginOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	/** Counts a visitor leaving and updates the light. */
	UFUNCTION()
	void HandleEndOverlap(UPrimitiveComponent* OverlappedComponent, AActor* OtherActor, UPrimitiveComponent* OtherComponent, int32 OtherBodyIndex);

	/** Turns the light on or off to match IsLit. */
	void ApplyLight();

	int32 VisitorCount = 0;
};
