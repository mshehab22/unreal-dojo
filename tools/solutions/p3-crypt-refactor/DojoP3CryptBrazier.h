#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "DojoP3CryptBrazier.generated.h"

class UTextRenderComponent;

/** A brazier whose flame wavers up and down around a base height, updating itself every frame (Update Method: each object owns its per-frame behavior). */
UCLASS()
class ADojoP3CryptBrazier : public AActor
{
	GENERATED_BODY()

public:
	/** Creates the label and turns ticking on. */
	ADojoP3CryptBrazier();

	/** Floating text that shows the flame height. */
	UPROPERTY(VisibleAnywhere, Category = "Brazier")
	TObjectPtr<UTextRenderComponent> Label;

	/** Flame height the waver centers on, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Brazier")
	float BaseHeight = 50.f;

	/** How far above and below the base the flame reaches, in centimeters. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0"))
	float Waver = 10.f;

	/** How fast the flame wavers, in radians per second. */
	UPROPERTY(EditAnywhere, Category = "Brazier", meta = (ClampMin = "0"))
	float WaverSpeed = 3.f;

	/** Advances the waver by one frame and shows the new height. */
	virtual void Tick(float DeltaSeconds) override;

	/** Sets the flame height and shows it. */
	void SetFlameHeight(float NewHeight);

	/** The current flame height, in centimeters. */
	UFUNCTION(BlueprintPure, Category = "Brazier")
	float GetFlameHeight() const;

private:
	float FlameHeight = 0.f;
	float Phase = 0.f;
};
